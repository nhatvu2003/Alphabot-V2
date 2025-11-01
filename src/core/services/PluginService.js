/**
 * @fileoverview Plugin Service
 * @description Plugin lifecycle management with dependency resolution
 * @author NhatCoder
 * @version 2.0.0
 */

import { readdirSync, existsSync } from 'fs';
import { resolve as resolvePath } from 'path';
import { pathToFileURL } from 'url';
import IService from '../interfaces/IService.js';
import { PluginException } from '../exceptions/CoreException.js';

/**
 * Plugin Service
 * Manages plugin lifecycle, dependencies, and API access
 *
 * @class PluginService
 * @extends IService
 */
class PluginService extends IService {
  constructor(container, dependencies = {}) {
    super(container, dependencies);

    this.config = dependencies.config;
    this.logger = dependencies.logger;
    this.eventService = dependencies.events;

    /** @type {Map<string, Object>} Registered plugins */
    this.plugins = new Map();

    /** @type {Map<string, string>} Plugin states */
    this.states = new Map();

    /** @type {Set<string>} Enabled plugins */
    this.enabled = new Set();

    /** @type {Object} Plugin statistics */
    this.stats = {
      total: 0,
      loaded: 0,
      enabled: 0,
      failed: 0
    };

    /** @type {string} Plugins directory */
    this.pluginsPath = resolvePath(process.cwd(), 'config', 'plugins');
  }

  /**
   * Initialize plugin service
   */
  async initialize() {
    try {
      this.logger?.info('Initializing plugin service...');

      // Load plugin configuration
      const enabledPlugins = this.config?.get('PLUGINS.ENABLED', []);

      // Load all available plugins
      await this.loadPlugins();

      // Enable configured plugins
      for (const name of enabledPlugins) {
        try {
          await this.enable(name);
        } catch (error) {
          this.logger?.error(`Failed to enable plugin ${name}:`, error);
        }
      }

      this.logger?.info(
        `Plugin service initialized (${this.enabled.size}/${this.plugins.size} enabled)`
      );
      this.isInitialized = true;
    } catch (error) {
      throw new PluginException(
        `Failed to initialize plugin service: ${error.message}`,
        'init'
      );
    }
  }

  /**
   * Load all plugins from filesystem
   * @private
   */
  async loadPlugins() {
    if (!existsSync(this.pluginsPath)) {
      this.logger?.warn(`Plugins directory not found: ${this.pluginsPath}`);
      return;
    }

    try {
      const directories = readdirSync(this.pluginsPath, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

      for (const dir of directories) {
        try {
          await this.loadPlugin(dir);
        } catch (error) {
          this.stats.failed++;
          this.logger?.error(`Failed to load plugin ${dir}:`, error);
        }
      }

      this.stats.total = this.plugins.size;
      this.stats.loaded = this.plugins.size;
    } catch (error) {
      throw new PluginException(
        `Failed to load plugins: ${error.message}`,
        'load'
      );
    }
  }

  /**
   * Load single plugin
   * @private
   * @param {string} name - Plugin directory name
   */
  async loadPlugin(name) {
    const pluginPath = resolvePath(this.pluginsPath, name);
    const indexPath = resolvePath(pluginPath, 'index.js');

    if (!existsSync(indexPath)) {
      throw new Error(`Plugin ${name} missing index.js`);
    }

    try {
      const pluginURL = pathToFileURL(indexPath);
      const module = await import(pluginURL.href);
      const plugin = module.default || module;

      // Validate plugin structure
      this.validatePlugin(plugin, name);

      // Store plugin
      this.plugins.set(name, plugin);
      this.states.set(name, 'loaded');

      this.logger?.debug(`Loaded plugin: ${name}`);
    } catch (error) {
      throw new PluginException(
        `Failed to load plugin ${name}: ${error.message}`,
        name
      );
    }
  }

  /**
   * Validate plugin structure
   * @private
   */
  validatePlugin(plugin, name) {
    if (!plugin.name) {
      throw new Error('Plugin must have name property');
    }

    if (!plugin.version) {
      throw new Error('Plugin must have version property');
    }

    // Optional but recommended
    const requiredMethods = ['onLoad', 'onEnable', 'onDisable'];
    const missing = requiredMethods.filter(method => !plugin[method]);

    if (missing.length > 0) {
      this.logger?.warn(
        `Plugin ${name} missing optional methods: ${missing.join(', ')}`
      );
    }
  }

  /**
   * Enable a plugin
   * @param {string} name - Plugin name
   */
  async enable(name) {
    if (!this.plugins.has(name)) {
      throw new PluginException('Plugin not found', name);
    }

    if (this.enabled.has(name)) {
      this.logger?.debug(`Plugin ${name} already enabled`);
      return;
    }

    const plugin = this.plugins.get(name);

    try {
      // Check dependencies
      if (plugin.dependencies) {
        await this.checkDependencies(name, plugin.dependencies);
      }

      // Call onLoad if exists
      if (typeof plugin.onLoad === 'function') {
        await plugin.onLoad(this.createPluginContext(name));
      }

      // Call onEnable if exists
      if (typeof plugin.onEnable === 'function') {
        await plugin.onEnable(this.createPluginContext(name));
      }

      this.enabled.add(name);
      this.states.set(name, 'enabled');
      this.stats.enabled = this.enabled.size;

      this.logger?.info(`Plugin enabled: ${name}`);

      // Emit event
      this.eventService?.emitAsync('plugin:enabled', { name, plugin });
    } catch (error) {
      this.states.set(name, 'error');
      throw new PluginException(
        `Failed to enable plugin ${name}: ${error.message}`,
        name
      );
    }
  }

  /**
   * Disable a plugin
   * @param {string} name - Plugin name
   */
  async disable(name) {
    if (!this.plugins.has(name)) {
      throw new PluginException('Plugin not found', name);
    }

    if (!this.enabled.has(name)) {
      this.logger?.debug(`Plugin ${name} not enabled`);
      return;
    }

    const plugin = this.plugins.get(name);

    try {
      // Call onDisable if exists
      if (typeof plugin.onDisable === 'function') {
        await plugin.onDisable(this.createPluginContext(name));
      }

      this.enabled.delete(name);
      this.states.set(name, 'disabled');
      this.stats.enabled = this.enabled.size;

      this.logger?.info(`Plugin disabled: ${name}`);

      // Emit event
      this.eventService?.emitAsync('plugin:disabled', { name, plugin });
    } catch (error) {
      throw new PluginException(
        `Failed to disable plugin ${name}: ${error.message}`,
        name
      );
    }
  }

  /**
   * Reload a plugin
   * @param {string} name - Plugin name
   */
  async reload(name) {
    const wasEnabled = this.enabled.has(name);

    // Disable if enabled
    if (wasEnabled) {
      await this.disable(name);
    }

    // Unload
    this.plugins.delete(name);
    this.states.delete(name);

    // Reload
    await this.loadPlugin(name);

    // Re-enable if was enabled
    if (wasEnabled) {
      await this.enable(name);
    }

    this.logger?.info(`Plugin reloaded: ${name}`);
  }

  /**
   * Check plugin dependencies
   * @private
   */
  async checkDependencies(name, dependencies) {
    for (const dep of dependencies) {
      if (!this.plugins.has(dep)) {
        throw new Error(`Missing dependency: ${dep}`);
      }

      if (!this.enabled.has(dep)) {
        // Auto-enable dependency
        this.logger?.debug(`Auto-enabling dependency ${dep} for ${name}`);
        await this.enable(dep);
      }
    }
  }

  /**
   * Create plugin context
   * @private
   * @returns {Object} Plugin API context
   */
  createPluginContext(name) {
    return {
      name,
      logger: this.logger,
      config: this.config,
      events: this.eventService,
      container: this.container,

      // Plugin-specific methods
      getPlugin: (pluginName) => this.get(pluginName),
      isEnabled: (pluginName) => this.isEnabled(pluginName),

      // Emit plugin events
      emit: (event, data) => {
        return this.eventService?.emit(`plugin:${name}:${event}`, data);
      }
    };
  }

  /**
   * Get plugin
   * @param {string} name - Plugin name
   * @returns {Object|null} Plugin object
   */
  get(name) {
    return this.plugins.get(name) || null;
  }

  /**
   * Check if plugin is enabled
   * @param {string} name - Plugin name
   * @returns {boolean} True if enabled
   */
  isEnabled(name) {
    return this.enabled.has(name);
  }

  /**
   * Get all plugins
   * @returns {Array} Array of plugin info
   */
  getAll() {
    const plugins = [];

    for (const [name, plugin] of this.plugins.entries()) {
      plugins.push({
        name,
        version: plugin.version,
        description: plugin.description || '',
        author: plugin.author || 'Unknown',
        state: this.states.get(name),
        enabled: this.enabled.has(name),
        dependencies: plugin.dependencies || []
      });
    }

    return plugins;
  }

  /**
   * Get enabled plugins
   * @returns {Array<string>} Array of enabled plugin names
   */
  getEnabled() {
    return Array.from(this.enabled);
  }

  /**
   * Get plugin state
   * @param {string} name - Plugin name
   * @returns {string} Plugin state
   */
  getState(name) {
    return this.states.get(name) || 'unknown';
  }

  /**
   * Get service statistics
   * @returns {Object} Plugin statistics
   */
  getStats() {
    return { ...this.stats };
  }

  /**
   * Shutdown plugin service
   */
  async shutdown() {
    this.logger?.info('Plugin service shutting down', this.getStats());

    // Disable all enabled plugins
    for (const name of Array.from(this.enabled)) {
      try {
        await this.disable(name);
      } catch (error) {
        this.logger?.error(`Error disabling plugin ${name}:`, error);
      }
    }

    // Call onUnload for all plugins
    for (const [name, plugin] of this.plugins.entries()) {
      try {
        if (typeof plugin.onUnload === 'function') {
          await plugin.onUnload(this.createPluginContext(name));
        }
      } catch (error) {
        this.logger?.error(`Error unloading plugin ${name}:`, error);
      }
    }

    this.plugins.clear();
    this.enabled.clear();
    this.states.clear();

    this.isShutdown = true;
  }

  /**
   * Health check
   * @returns {boolean} True if service is healthy
   */
  async healthCheck() {
    return this.isInitialized && !this.isShutdown;
  }
}

export default PluginService;
