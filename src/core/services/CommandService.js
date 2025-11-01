/**
 * @fileoverview Command Service
 * @description Manages command registration, execution, and lifecycle
 * @author NhatCoder
 * @version 2.0.0
 */

import { readdirSync, statSync } from 'fs';
import { resolve as resolvePath } from 'path';
import { pathToFileURL } from 'url';
import IService from '../interfaces/IService.js';
import { CommandException } from '../exceptions/CoreException.js';

/**
 * Command Service
 * Handles command loading, registration, validation, and execution
 *
 * @class CommandService
 * @extends IService
 */
class CommandService extends IService {
  constructor(container, dependencies = {}) {
    super(container, dependencies);

    this.logger = dependencies.logger;
    this.cache = dependencies.cache;

    /** @type {Map<string, Object>} Registered commands */
    this.commands = new Map();

    /** @type {Map<string, string>} Command aliases */
    this.aliases = new Map();

    /** @type {Map<string, Object>} Command configurations */
    this.configs = new Map();

    /** @type {Map<string, Map<string, number>>} User cooldowns */
    this.cooldowns = new Map();

    /** @type {Object} Command statistics */
    this.stats = {
      totalCommands: 0,
      totalExecutions: 0,
      totalErrors: 0,
      categories: {}
    };

    /** @type {string} Commands directory */
    this.commandsPath = resolvePath(process.cwd(), 'src', 'commands');
  }

  /**
   * Initialize command service
   */
  async initialize() {
    try {
      this.logger?.info('Initializing command service...');

      // Load all commands
      await this.loadCommands();

      // Setup cooldown cleanup (every minute)
      setInterval(() => this.cleanupCooldowns(), 60000);

      this.logger?.info(`Command service initialized with ${this.commands.size} commands`);
      this.isInitialized = true;
    } catch (error) {
      throw new CommandException(`Failed to initialize command service: ${error.message}`, 'init');
    }
  }

  /**
   * Load all commands from filesystem
   * @private
   */
  async loadCommands() {
    try {
      // Get all category folders
      const categories = readdirSync(this.commandsPath, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

      for (const category of categories) {
        const categoryPath = resolvePath(this.commandsPath, category);
        const files = readdirSync(categoryPath)
          .filter(file => file.endsWith('.js'));

        for (const file of files) {
          try {
            await this.loadCommand(category, file);
          } catch (error) {
            this.logger?.error(`Failed to load command ${file}:`, error);
          }
        }

        // Update category stats
        this.stats.categories[category] = this.stats.categories[category] || 0;
      }

      this.stats.totalCommands = this.commands.size;
    } catch (error) {
      throw new CommandException(`Failed to load commands: ${error.message}`, 'load');
    }
  }

  /**
   * Load single command file
   * @private
   * @param {string} category - Category name
   * @param {string} file - Command file name
   */
  async loadCommand(category, file) {
    const commandPath = resolvePath(this.commandsPath, category, file);
    const commandURL = pathToFileURL(commandPath);

    try {
      const module = await import(`${commandURL.href}?update=${Date.now()}`);
      const command = module.default || module;

      // BACKWARD COMPATIBILITY: Support multiple old formats
      let config, runFunction;

      // Case 1: export default { config, Running } (AlphaBot format)
      if (command.config && typeof command.Running === 'function') {
        config = command.config;
        runFunction = command.Running;
      }
      // Case 2: export default { config, onStart }
      else if (command.config && typeof command.onStart === 'function') {
        config = command.config;
        runFunction = command.onStart;
      }
      // Case 3: export default { config, run }
      else if (command.config && typeof command.run === 'function') {
        config = command.config;
        runFunction = command.run;
      }
      // Case 4: Separate exports (module.config, module.onStart/run/Running)
      else if (typeof command === 'object' && !command.config) {
        if (command.name || command._name) {
          config = command;
          runFunction = module.onStart || module.run || module.Running;
        }
      }

      // Validate we found both config and run function
      if (!config || !config.name) {
        this.logger?.debug(`Skipping ${file}: Missing config.name`);
        return;
      }

      if (!runFunction || typeof runFunction !== 'function') {
        this.logger?.debug(`Skipping ${file}: Missing run/onStart/Running function`);
        return;
      }

      // Add category to config
      config.category = category;
      config.file = file;

      // Normalize config
      if (!config.permissions) config.permissions = [0, 1, 2]; // Default: all can use
      if (!config.cooldown) config.cooldown = 3; // Default: 3 seconds
      if (!config.aliases) config.aliases = [];

      // Register command with all possible function names for compatibility
      const name = config.name;
      this.commands.set(name, {
        config,
        run: runFunction,
        onStart: runFunction, // Alias for compatibility
        Running: runFunction, // Alias for AlphaBot format
        langData: command.langData, // Preserve langData if exists
        handleEvent: command.handleEvent,
        handleReaction: command.handleReaction,
        handleReply: command.handleReply
      });

      this.configs.set(name, config);

      // Register aliases
      for (const alias of config.aliases) {
        this.aliases.set(alias, name);
      }

      this.logger?.debug(`Loaded command: ${name} (${category})`);
    } catch (error) {
      throw new CommandException(
        `Failed to load command ${file}: ${error.message}`,
        file
      );
    }
  }  /**
   * Execute a command
   * @param {string} commandName - Command name or alias
   * @param {Object} context - Execution context
   * @returns {Promise<*>} Command result
   */
  async execute(commandName, context) {
    const startTime = Date.now();

    try {
      // Resolve alias
      const name = this.resolveAlias(commandName.toLowerCase());

      if (!name) {
        throw new CommandException('Command not found', commandName);
      }

      const command = this.commands.get(name);
      const config = this.configs.get(name);

      // Check permissions
      await this.checkPermissions(config, context);

      // Check cooldown
      await this.checkCooldown(name, context.senderID, config);

      // Execute command
      const result = await this.runCommand(command, context);

      // Set cooldown
      this.setCooldown(name, context.senderID, config.cooldown || 3);

      // Update stats
      this.stats.totalExecutions++;

      const duration = Date.now() - startTime;
      this.logger?.debug(`Command ${name} executed in ${duration}ms`);

      return result;
    } catch (error) {
      this.stats.totalErrors++;

      if (error instanceof CommandException) {
        throw error;
      }

      throw new CommandException(
        `Command execution failed: ${error.message}`,
        commandName,
        { originalError: error.message }
      );
    }
  }

  /**
   * Run command with proper method
   * @private
   */
  async runCommand(command, context) {
    // Try run() first, then onStart()
    if (typeof command.run === 'function') {
      return await command.run(context);
    } else if (typeof command.onStart === 'function') {
      return await command.onStart(context);
    }

    throw new Error('Command has no executable method');
  }

  /**
   * Resolve command alias to actual name
   * @param {string} nameOrAlias - Command name or alias
   * @returns {string|null} Actual command name
   */
  resolveAlias(nameOrAlias) {
    // Check if it's a direct command name
    if (this.commands.has(nameOrAlias)) {
      return nameOrAlias;
    }

    // Check if it's an alias
    return this.aliases.get(nameOrAlias) || null;
  }

  /**
   * Check user permissions for command
   * @private
   */
  async checkPermissions(config, context) {
    // Admin only commands
    if (config.role === 2 && !global.config?.ABSOLUTES?.includes(context.senderID)) {
      throw new CommandException('This command requires admin permissions', config.name);
    }

    // Moderator commands
    if (config.role === 1) {
      const isMod = global.config?.MODERATORS?.includes(context.senderID);
      const isAdmin = global.config?.ABSOLUTES?.includes(context.senderID);

      if (!isMod && !isAdmin) {
        throw new CommandException('This command requires moderator permissions', config.name);
      }
    }
  }

  /**
   * Check command cooldown for user
   * @private
   */
  async checkCooldown(commandName, userID, config) {
    if (!config.cooldown || config.cooldown === 0) return;

    if (!this.cooldowns.has(commandName)) {
      this.cooldowns.set(commandName, new Map());
    }

    const commandCooldowns = this.cooldowns.get(commandName);
    const userCooldown = commandCooldowns.get(userID);

    if (userCooldown && Date.now() < userCooldown) {
      const remaining = Math.ceil((userCooldown - Date.now()) / 1000);
      throw new CommandException(
        `Command on cooldown. Wait ${remaining}s`,
        commandName,
        { remaining }
      );
    }
  }

  /**
   * Set cooldown for user
   * @private
   */
  setCooldown(commandName, userID, cooldownSeconds) {
    if (!cooldownSeconds || cooldownSeconds === 0) return;

    if (!this.cooldowns.has(commandName)) {
      this.cooldowns.set(commandName, new Map());
    }

    const commandCooldowns = this.cooldowns.get(commandName);
    const expires = Date.now() + (cooldownSeconds * 1000);
    commandCooldowns.set(userID, expires);
  }

  /**
   * Cleanup expired cooldowns
   * @private
   */
  cleanupCooldowns() {
    const now = Date.now();
    let cleaned = 0;

    for (const [commandName, userCooldowns] of this.cooldowns.entries()) {
      for (const [userID, expires] of userCooldowns.entries()) {
        if (now > expires) {
          userCooldowns.delete(userID);
          cleaned++;
        }
      }

      // Remove empty command cooldowns
      if (userCooldowns.size === 0) {
        this.cooldowns.delete(commandName);
      }
    }

    if (cleaned > 0) {
      this.logger?.debug(`Cleaned ${cleaned} expired cooldowns`);
    }
  }

  /**
   * Get command by name
   * @param {string} name - Command name
   * @returns {Object|null} Command object
   */
  get(name) {
    const resolvedName = this.resolveAlias(name.toLowerCase());
    return this.commands.get(resolvedName);
  }

  /**
   * Get all commands (for backward compatibility)
   * @returns {Map} Commands map
   */
  getAll() {
    return this.commands;
  }

  /**
   * Get command config
   * @param {string} name - Command name
   * @returns {Object|null} Command config
   */
  getConfig(name) {
    const resolvedName = this.resolveAlias(name.toLowerCase());
    return this.configs.get(resolvedName);
  }

  /**
   * Get all commands in category
   * @param {string} category - Category name
   * @returns {Array<Object>} Commands in category
   */
  getByCategory(category) {
    return Array.from(this.commands.values())
      .filter(cmd => cmd.config.category === category);
  }

  /**
   * Get all categories
   * @returns {Array<string>} Category names
   */
  getCategories() {
    return Object.keys(this.stats.categories);
  }

  /**
   * Get service statistics
   * @returns {Object} Command statistics
   */
  getStats() {
    return {
      ...this.stats,
      aliases: this.aliases.size,
      cooldowns: Array.from(this.cooldowns.values())
        .reduce((sum, map) => sum + map.size, 0)
    };
  }

  /**
   * Reload a command
   * @param {string} name - Command name
   */
  async reload(name) {
    const config = this.getConfig(name);
    if (!config) {
      throw new CommandException('Command not found', name);
    }

    // Remove from cache
    this.commands.delete(name);
    this.configs.delete(name);

    // Remove aliases
    for (const [alias, cmdName] of this.aliases.entries()) {
      if (cmdName === name) {
        this.aliases.delete(alias);
      }
    }

    // Reload
    await this.loadCommand(config.category, config.file);

    this.logger?.info(`Command ${name} reloaded`);
  }

  /**
   * Shutdown command service
   */
  async shutdown() {
    this.logger?.info('Command service shutting down', this.getStats());

    this.commands.clear();
    this.aliases.clear();
    this.configs.clear();
    this.cooldowns.clear();

    this.isShutdown = true;
  }

  /**
   * Health check
   * @returns {boolean} True if service is healthy
   */
  async healthCheck() {
    return this.isInitialized && !this.isShutdown && this.commands.size > 0;
  }
}

export default CommandService;
