/**
 * @fileoverview Configuration Service
 * @description Manages application configuration with validation and hot-reload
 * @author NhatCoder
 * @version 2.0.0
 */

import { readFileSync, writeFileSync, watch } from 'fs';
import { resolve as resolvePath } from 'path';
import IService from '../interfaces/IService.js';
import { ConfigException } from '../exceptions/CoreException.js';

/**
 * Configuration Service
 * Handles loading, validation, and management of bot configuration
 *
 * @class ConfigService
 * @extends IService
 */
class ConfigService extends IService {
  constructor(container, dependencies = {}) {
    super(container, dependencies);

    this.config = {};
    this.configPath = resolvePath(process.cwd(), 'config', 'config.main.json');
    this.watcher = null;
    this.listeners = new Set();
  }

  /**
   * Initialize configuration service
   */
  async initialize() {
    try {
      // Load configuration
      await this.load();

      // Validate configuration
      this.validate();

      // Setup hot-reload if not in production
      if (process.env.NODE_ENV !== 'production') {
        this.setupHotReload();
      }

      this.isInitialized = true;
    } catch (error) {
      throw new ConfigException(`Failed to initialize config: ${error.message}`, 'init');
    }
  }

  /**
   * Load configuration from file
   */
  async load() {
    try {
      const content = readFileSync(this.configPath, 'utf8');
      this.config = JSON.parse(content);

      // Set defaults for missing values
      this.setDefaults();

      return this.config;
    } catch (error) {
      throw new ConfigException(`Failed to load config: ${error.message}`, 'load');
    }
  }

  /**
   * Set default values for missing configuration
   * @private
   */
  setDefaults() {
    const defaults = {
      PREFIX: '!',
      NAME: 'AlphaBot',
      MODERATORS: [],
      ABSOLUTES: [],
      REFRESH: '43200000',
      TERMUX_OPTIMIZED: true,
      FCA_OPTIONS: {
        forceLogin: true,
        listenEvents: true,
        autoMarkDelivery: true,
        autoMarkRead: false,
        selfListen: false,
        logLevel: 'silent'
      }
    };

    for (const [key, value] of Object.entries(defaults)) {
      if (!this.config.hasOwnProperty(key)) {
        this.config[key] = value;
      }
    }
  }

  /**
   * Validate configuration
   * @private
   */
  validate() {
    const required = ['PREFIX', 'NAME'];

    for (const key of required) {
      if (!this.config.hasOwnProperty(key)) {
        throw new ConfigException(`Missing required config: ${key}`, key);
      }
    }

    // Validate types
    if (typeof this.config.PREFIX !== 'string') {
      throw new ConfigException('PREFIX must be a string', 'PREFIX');
    }

    if (!Array.isArray(this.config.MODERATORS)) {
      throw new ConfigException('MODERATORS must be an array', 'MODERATORS');
    }

    if (!Array.isArray(this.config.ABSOLUTES)) {
      throw new ConfigException('ABSOLUTES must be an array', 'ABSOLUTES');
    }
  }

  /**
   * Setup hot-reload for configuration
   * @private
   */
  setupHotReload() {
    this.watcher = watch(this.configPath, async (eventType) => {
      if (eventType === 'change') {
        try {
          const oldConfig = { ...this.config };
          await this.load();
          this.validate();

          // Notify listeners
          this.notifyListeners(oldConfig, this.config);
        } catch (error) {
          console.error('Error reloading config:', error);
        }
      }
    });
  }

  /**
   * Get configuration value
   * @param {string} key - Configuration key (supports dot notation)
   * @param {*} defaultValue - Default value if key not found
   * @returns {*} Configuration value
   */
  get(key, defaultValue = null) {
    const keys = key.split('.');
    let value = this.config;

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return defaultValue;
      }
    }

    return value;
  }

  /**
   * Set configuration value
   * @param {string} key - Configuration key (supports dot notation)
   * @param {*} value - Value to set
   */
  set(key, value) {
    const keys = key.split('.');
    const lastKey = keys.pop();
    let target = this.config;

    for (const k of keys) {
      if (!(k in target)) {
        target[k] = {};
      }
      target = target[k];
    }

    target[lastKey] = value;
  }

  /**
   * Save configuration to file
   */
  async save() {
    try {
      const content = JSON.stringify(this.config, null, 2);
      writeFileSync(this.configPath, content, 'utf8');
    } catch (error) {
      throw new ConfigException(`Failed to save config: ${error.message}`, 'save');
    }
  }

  /**
   * Get all configuration
   * @returns {Object} Full configuration object
   */
  getAll() {
    return { ...this.config };
  }

  /**
   * Check if key exists
   * @param {string} key - Configuration key
   * @returns {boolean} True if key exists
   */
  has(key) {
    return this.get(key) !== null;
  }

  /**
   * Add listener for configuration changes
   * @param {Function} listener - Listener function
   */
  onChange(listener) {
    this.listeners.add(listener);
  }

  /**
   * Remove listener
   * @param {Function} listener - Listener function
   */
  offChange(listener) {
    this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of config change
   * @private
   * @param {Object} oldConfig - Old configuration
   * @param {Object} newConfig - New configuration
   */
  notifyListeners(oldConfig, newConfig) {
    for (const listener of this.listeners) {
      try {
        listener(oldConfig, newConfig);
      } catch (error) {
        console.error('Error in config listener:', error);
      }
    }
  }

  /**
   * Shutdown configuration service
   */
  async shutdown() {
    if (this.watcher) {
      this.watcher.close();
    }

    this.listeners.clear();
    this.isShutdown = true;
  }

  /**
   * Health check
   * @returns {boolean} True if service is healthy
   */
  async healthCheck() {
    return this.isInitialized && !this.isShutdown && Object.keys(this.config).length > 0;
  }
}

export default ConfigService;
