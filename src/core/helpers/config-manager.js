/**
 * Enhanced Configuration Loader with Validation
 * @author Alphabot Team
 * @version 2.0.0
 */

import { readFileSync, existsSync } from 'fs';
import { resolve as resolvePath } from 'path';

class ConfigManager {
  constructor() {
    this.config = null;
    this.configPath = resolvePath(process.cwd(), 'config', 'config.main.json');
  }

  /**
   * Load and validate configuration
   * @returns {Object} Configuration object
   */
  load() {
    if (!existsSync(this.configPath)) {
      throw new Error(`Configuration file not found: ${this.configPath}`);
    }

    try {
      const configData = readFileSync(this.configPath, 'utf8');
      this.config = JSON.parse(configData);
      
      // Validate required fields
      this.validate();
      
      return this.config;
    } catch (error) {
      throw new Error(`Failed to load configuration: ${error.message}`);
    }
  }

  /**
   * Validate configuration structure
   */
  validate() {
    const required = ['GBOTWAR_OPTIONS', 'DATABASE'];
    
    for (const field of required) {
      if (!this.config[field]) {
        throw new Error(`Missing required configuration field: ${field}`);
      }
    }
  }

  /**
   * Get configuration value with default
   * @param {string} path - Configuration path (e.g., 'GBOTWAR_OPTIONS.PREFIX')
   * @param {*} defaultValue - Default value if not found
   * @returns {*} Configuration value
   */
  get(path, defaultValue = null) {
    const keys = path.split('.');
    let value = this.config;

    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return defaultValue;
      }
    }

    return value;
  }
}

export default new ConfigManager();