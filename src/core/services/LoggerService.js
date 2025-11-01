/**
 * @fileoverview Logger Service
 * @description Professional logging service with multiple levels and outputs
 * @author NhatCoder
 * @version 2.0.0
 */

import { writeFileSync, appendFileSync, existsSync, mkdirSync } from 'fs';
import { resolve as resolvePath } from 'path';
import IService from '../interfaces/IService.js';
import code from '../helpers/code.js';

/**
 * Log levels
 * @enum {number}
 */
const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  FATAL: 4
};

/**
 * Logger Service
 * Provides structured logging with multiple outputs and log levels
 *
 * @class LoggerService
 * @extends IService
 */
class LoggerService extends IService {
  constructor(container, dependencies = {}) {
    super(container, dependencies);

    this.config = dependencies.config;
    this.logLevel = LogLevel.INFO;
    this.logPath = resolvePath(process.cwd(), 'logs');
    this.currentLogFile = null;
    this.logToFile = true;
    this.logToConsole = true;
  }

  /**
   * Initialize logger service
   */
  async initialize() {
    // Create logs directory if not exists
    if (!existsSync(this.logPath)) {
      mkdirSync(this.logPath, { recursive: true });
    }

    // Set current log file
    const date = new Date().toISOString().split('T')[0];
    this.currentLogFile = resolvePath(this.logPath, `alphabot-${date}.log`);

    // Get log level from config
    const configLevel = this.config?.get('LOG_LEVEL', 'INFO');
    this.logLevel = LogLevel[configLevel] || LogLevel.INFO;

    this.isInitialized = true;
  }

  /**
   * Format log message
   * @private
   */
  formatMessage(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const metaStr = Object.keys(meta).length > 0 ? JSON.stringify(meta) : '';

    return `[${timestamp}] [${level}] ${message} ${metaStr}`.trim();
  }

  /**
   * Write log to file
   * @private
   */
  writeToFile(level, message, meta) {
    if (!this.logToFile) return;

    try {
      const formatted = this.formatMessage(level, message, meta);
      appendFileSync(this.currentLogFile, formatted + '\n', 'utf8');
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  /**
   * Write log to console with colors
   * @private
   */
  writeToConsole(level, message, meta) {
    if (!this.logToConsole) return;

    const timestamp = new Date().toTimeString().split(' ')[0];
    let prefix, colorFn;

    switch (level) {
      case 'DEBUG':
        prefix = '🔍';
        colorFn = code.gray;
        break;
      case 'INFO':
        prefix = 'ℹ️';
        colorFn = code.blue;
        break;
      case 'WARN':
        prefix = '⚠️';
        colorFn = code.yellow;
        break;
      case 'ERROR':
        prefix = '❌';
        colorFn = code.red;
        break;
      case 'FATAL':
        prefix = '💀';
        colorFn = code.bgRed;
        break;
      default:
        prefix = '•';
        colorFn = code.white;
    }

    const formatted = `${code.gray(timestamp)} ${prefix} ${colorFn(message)}`;
    console.log(formatted);

    if (Object.keys(meta).length > 0) {
      console.log(code.gray(JSON.stringify(meta, null, 2)));
    }
  }

  /**
   * Log at specified level
   * @private
   */
  log(level, levelName, message, meta = {}) {
    if (level < this.logLevel) return;

    this.writeToConsole(levelName, message, meta);
    this.writeToFile(levelName, message, meta);
  }

  /**
   * Debug log
   * @param {string} message - Log message
   * @param {Object} [meta={}] - Additional metadata
   */
  debug(message, meta = {}) {
    this.log(LogLevel.DEBUG, 'DEBUG', message, meta);
  }

  /**
   * Info log
   * @param {string} message - Log message
   * @param {Object} [meta={}] - Additional metadata
   */
  info(message, meta = {}) {
    this.log(LogLevel.INFO, 'INFO', message, meta);
  }

  /**
   * Warning log
   * @param {string} message - Log message
   * @param {Object} [meta={}] - Additional metadata
   */
  warn(message, meta = {}) {
    this.log(LogLevel.WARN, 'WARN', message, meta);
  }

  /**
   * Error log
   * @param {string} message - Log message
   * @param {Object} [meta={}] - Additional metadata
   */
  error(message, meta = {}) {
    if (meta instanceof Error) {
      meta = {
        error: meta.message,
        stack: meta.stack
      };
    }

    this.log(LogLevel.ERROR, 'ERROR', message, meta);
  }

  /**
   * Fatal error log
   * @param {string} message - Log message
   * @param {Object} [meta={}] - Additional metadata
   */
  fatal(message, meta = {}) {
    this.log(LogLevel.FATAL, 'FATAL', message, meta);
  }

  /**
   * System log (always shown)
   * @param {string} message - Log message
   */
  system(message) {
    const formatted = `${code.cyan('[')}${code.bold('SYSTEM')}${code.cyan(']')} ${code.green(message)}`;
    console.log(formatted);
    this.writeToFile('SYSTEM', message, {});
  }

  /**
   * Set log level
   * @param {string} level - Log level name
   */
  setLevel(level) {
    if (LogLevel.hasOwnProperty(level)) {
      this.logLevel = LogLevel[level];
    }
  }

  /**
   * Enable/disable file logging
   * @param {boolean} enabled - Enable file logging
   */
  setFileLogging(enabled) {
    this.logToFile = enabled;
  }

  /**
   * Enable/disable console logging
   * @param {boolean} enabled - Enable console logging
   */
  setConsoleLogging(enabled) {
    this.logToConsole = enabled;
  }

  /**
   * Shutdown logger service
   */
  async shutdown() {
    this.info('Logger service shutting down');
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

export default LoggerService;
export { LogLevel };
