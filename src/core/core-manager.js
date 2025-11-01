/**
 * Core Manager - Quản lý core system của Alphabot
 * Tích hợp với Core Services mới (CommandService, EventService)
 * @version 2.0.0
 */

import fs from 'fs';
import path from 'path';
import terminalUI from './UI/terminal-ui.js';
import ServiceContainer from './container.js';
import ConfigService from './services/ConfigService.js';
import LoggerService from './services/LoggerService.js';
import CacheService from './services/CacheService.js';
import CommandService from './services/CommandService.js';
import EventService from './services/EventService.js';
import DatabaseService from './services/DatabaseService.js';
import PluginService from './services/PluginService.js';

class CoreManager {
  constructor() {
    this.modules = new Map();
    this.stats = {
      commands: 0,
      events: 0,
      customs: 0,
      botID: null,
      startTime: Date.now()
    };

    this.paths = {
      core: './src/core',
      commands: './src/commands',
      events: './src/events',
      customs: './src/customs',
      config: './config'
    };

    // Core Services Container
    this.container = null;
    this.services = {};
  }

  /**
   * Khởi tạo core system với Core Services
   */
  async initialize() {
    terminalUI.clearAndShowHeader();

    terminalUI.showLoading('Khởi tạo Core Services Container');
    await this.initializeCoreServices();
    console.log();

    terminalUI.showLoading('Khởi tạo Core System');
    await this.loadCoreModules();
    console.log();

    terminalUI.showLoading('Tải Commands qua CommandService');
    await this.loadCommandsViaService();
    console.log();

    terminalUI.showLoading('Tải Events qua EventService');
    await this.loadEventsViaService();
    console.log();

    terminalUI.showLoading('Tải Custom Modules');
    await this.loadCustoms();
    console.log();

    terminalUI.showSuccess('Core System đã sẵn sàng!');
    terminalUI.showSeparator();

    return this.stats;
  }

  /**
   * Khởi tạo Core Services (DI Container)
   */
  async initializeCoreServices() {
    try {
      this.container = new ServiceContainer();

      // Register services
      this.container.register('config', ConfigService, true);
      this.container.register('logger', LoggerService, true, ['config']);
      this.container.register('cache', CacheService, true, ['logger']);
      this.container.register('database', DatabaseService, true, ['config', 'logger']);
      this.container.register('events', EventService, true, ['logger']);
      this.container.register('commands', CommandService, true, ['logger', 'cache']);
      this.container.register('plugins', PluginService, true, ['config', 'logger', 'events']);

      // Initialize services
      this.services.config = await this.container.resolve('config');
      await this.services.config.initialize();

      this.services.logger = await this.container.resolve('logger');
      await this.services.logger.initialize();

      this.services.cache = await this.container.resolve('cache');
      await this.services.cache.initialize();

      this.services.database = await this.container.resolve('database');
      await this.services.database.initialize();

      this.services.events = await this.container.resolve('events');
      await this.services.events.initialize();

      this.services.commands = await this.container.resolve('commands');
      await this.services.commands.initialize();

      this.services.plugins = await this.container.resolve('plugins');
      await this.services.plugins.initialize();

      // Expose services globally
      global.services = this.services;
      global.container = this.container;

      terminalUI.showSuccess('Core Services đã khởi tạo!');
    } catch (error) {
      terminalUI.showError(`Lỗi khởi tạo Core Services: ${error.message}`);
      throw error;
    }
  }

  /**
   * Load core modules
   */
  async loadCoreModules() {
    try {
      // Load essential core modules
      const coreModules = [
        'helpers/console.js',
        'helpers/environments.get.js',
        '_init.js',
        '_global_info.js'
      ];

      let loaded = 0;
      for (const modulePath of coreModules) {
        try {
          const fullPath = path.join(this.paths.core, modulePath);
          if (fs.existsSync(fullPath)) {
            const module = await import(fullPath);
            this.modules.set(modulePath, module);
            loaded++;
          }
        } catch (error) {
          // Silent fail for optional modules
        }
        terminalUI.showProgress(loaded, coreModules.length, 'Core Modules');
      }
    } catch (error) {
      terminalUI.showError(`Lỗi tải Core: ${error.message}`);
    }
  }

  /**
   * Load commands qua CommandService (NEW)
   */
  async loadCommandsViaService() {
    try {
      // CommandService đã tự động load tất cả commands trong initialize()
      const commandStats = this.services.commands.getStats();
      this.stats.commands = commandStats.totalCommands;

      // Show progress
      terminalUI.showProgress(this.stats.commands, this.stats.commands, 'Commands');

      // Expose commands globally để backward compatibility với old system
      if (!global.plugins) global.plugins = {};

      // Convert CommandService format to old format
      global.plugins.commands = new Map();
      global.plugins.commandsConfig = new Map();
      global.plugins.commandsAliases = new Map();

      const allCommands = this.services.commands.getAll();

      for (const [name, command] of allCommands.entries()) {
        // Old format expects function directly
        const commandFunction = command.Running || command.onStart || command.run;
        global.plugins.commands.set(name, commandFunction);

        // config
        global.plugins.commandsConfig.set(name, command.config);

        // Aliases - store as array not map
        if (command.config.aliases && command.config.aliases.length > 0) {
          global.plugins.commandsAliases.set(name, command.config.aliases);
        }
      }

      console.log(`✅ Exposed ${global.plugins.commands.size} commands to global.plugins`);
      console.log(`📋 Command names: ${Array.from(global.plugins.commands.keys()).join(', ')}`);

      // Also expose modern interface
      global.handleCommand = async (commandName, context) => {
        return await this.services.commands.execute(commandName, context);
      };

    } catch (error) {
      terminalUI.showError(`Lỗi tải Commands: ${error.message}`);
      // Fallback to old method
      await this.loadCommandsLegacy();
    }
  }  /**
   * Load commands (Legacy fallback)
   */
  async loadCommandsLegacy() {
    try {
      const commandsPath = this.paths.commands;
      if (!fs.existsSync(commandsPath)) return;

      const categories = fs.readdirSync(commandsPath, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

      let totalCommands = 0;
      let loadedCommands = 0;

      // Count total commands first
      for (const category of categories) {
        const categoryPath = path.join(commandsPath, category);
        const commands = fs.readdirSync(categoryPath)
          .filter(file => file.endsWith('.js'));
        totalCommands += commands.length;
      }

      // Load commands
      for (const category of categories) {
        const categoryPath = path.join(commandsPath, category);
        const commands = fs.readdirSync(categoryPath)
          .filter(file => file.endsWith('.js'));

        for (const command of commands) {
          try {
            const commandPath = path.join(categoryPath, command);
            const module = await import(commandPath);
            this.modules.set(`command:${category}:${command}`, module);
            loadedCommands++;
            terminalUI.showProgress(loadedCommands, totalCommands, 'Commands');
          } catch (error) {
            // Silent fail for broken commands
          }
        }
      }

      this.stats.commands = loadedCommands;
    } catch (error) {
      terminalUI.showError(`Lỗi tải Commands: ${error.message}`);
    }
  }

  /**
   * Load events qua EventService (NEW)
   */
  async loadEventsViaService() {
    try {
      // EventService đã tự động load tất cả events trong initialize()
      const eventStats = this.services.events.getStats();
      this.stats.events = eventStats.registeredEvents;

      // Show progress
      terminalUI.showProgress(this.stats.events, this.stats.events, 'Events');

      // Expose events globally để backward compatibility
      global.handleEvent = async (eventName, data) => {
        return await this.services.events.emit(eventName, data);
      };

      // Expose events list
      global.events = this.services.events.getEvents();

    } catch (error) {
      terminalUI.showError(`Lỗi tải Events: ${error.message}`);
      // Fallback to old method
      await this.loadEventsLegacy();
    }
  }

  /**
   * Load events (Legacy fallback)
   */
  async loadEventsLegacy() {
    try {
      const eventsPath = this.paths.events;
      if (!fs.existsSync(eventsPath)) return;

      const events = fs.readdirSync(eventsPath)
        .filter(file => file.endsWith('.js'));

      let loaded = 0;
      for (const event of events) {
        try {
          const eventPath = path.join(eventsPath, event);
          const module = await import(eventPath);
          this.modules.set(`event:${event}`, module);
          loaded++;
        } catch (error) {
          // Silent fail for broken events
        }
        terminalUI.showProgress(loaded, events.length, 'Events');
      }

      this.stats.events = loaded;
    } catch (error) {
      terminalUI.showError(`Lỗi tải Events: ${error.message}`);
    }
  }

  /**
   * Load custom modules
   */
  async loadCustoms() {
    try {
      const customsPath = this.paths.customs;
      if (!fs.existsSync(customsPath)) return;

      const customs = fs.readdirSync(customsPath)
        .filter(file => file.endsWith('.js'));

      let loaded = 0;
      for (const custom of customs) {
        try {
          const customPath = path.join(customsPath, custom);
          const module = await import(customPath);
          this.modules.set(`custom:${custom}`, module);
          loaded++;
        } catch (error) {
          // Silent fail for broken customs
        }
        terminalUI.showProgress(loaded, customs.length, 'Customs');
      }

      this.stats.customs = loaded;
    } catch (error) {
      terminalUI.showError(`Lỗi tải Customs: ${error.message}`);
    }
  }

  /**
   * Set bot ID
   */
  setBotID(id) {
    this.stats.botID = id;
  }

  /**
   * Get module
   */
  getModule(name) {
    return this.modules.get(name);
  }

  /**
   * Get all modules
   */
  getAllModules() {
    return this.modules;
  }

  /**
   * Get stats
   */
  getStats() {
    return { ...this.stats };
  }

  /**
   * Show final status
   */
  /**
   * Show final status
   */
  showStatus() {
    // Update stats from services if available
    if (this.services.commands) {
      const cmdStats = this.services.commands.getStats();
      this.stats.commands = cmdStats.totalCommands;
    }

    if (this.services.events) {
      const evtStats = this.services.events.getStats();
      this.stats.events = evtStats.registeredEvents;
    }

    terminalUI.showStats(this.stats);
    terminalUI.showFooter();
  }

  /**
   * Get command count for UI display
   */
  getCommandCount() {
    return this.stats.commands || 0;
  }

  /**
   * Get event count for UI display
   */
  getEventCount() {
    return this.stats.events || 0;
  }

  /**
   * Set bot ID
   */
  setBotID(botID) {
    this.stats.botID = botID;
  }

  /**
   * Shutdown all services gracefully
   */
  async shutdown() {
    try {
      terminalUI.showLoading('Đang tắt Core Services...');

      // Shutdown all services through container
      if (this.container) {
        await this.container.shutdownAll();
      }

      // Clear modules
      this.modules.clear();

      terminalUI.showSuccess('Core System đã tắt an toàn!');
    } catch (error) {
      terminalUI.showError(`Lỗi khi tắt Core: ${error.message}`);
    }
  }
}

export default new CoreManager();
