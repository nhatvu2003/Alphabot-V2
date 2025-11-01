/**
 * @fileoverview Event Service
 * @description Event-driven architecture with pub/sub pattern
 * @author NhatCoder
 * @version 2.0.0
 */

import { readdirSync } from 'fs';
import { resolve as resolvePath } from 'path';
import { pathToFileURL } from 'url';
import IService from '../interfaces/IService.js';
import { EventException } from '../exceptions/CoreException.js';

/**
 * Event Service
 * Implements event bus pattern for loose coupling between components
 *
 * @class EventService
 * @extends IService
 */
class EventService extends IService {
  constructor(container, dependencies = {}) {
    super(container, dependencies);

    this.logger = dependencies.logger;

    /** @type {Map<string, Set<Function>>} Event listeners */
    this.listeners = new Map();

    /** @type {Map<string, Object>} Registered events */
    this.events = new Map();

    /** @type {Array<Object>} Event history (for debugging) */
    this.history = [];

    /** @type {number} Max history size */
    this.maxHistorySize = 100;

    /** @type {Object} Event statistics */
    this.stats = {
      totalEvents: 0,
      totalEmissions: 0,
      totalErrors: 0
    };

    /** @type {string} Events directory */
    this.eventsPath = resolvePath(process.cwd(), 'src', 'events');
  }

  /**
   * Initialize event service
   */
  async initialize() {
    try {
      this.logger?.info('Initializing event service...');

      // Load all events
      await this.loadEvents();

      this.logger?.info(`Event service initialized with ${this.events.size} events`);
      this.isInitialized = true;
    } catch (error) {
      throw new EventException(`Failed to initialize event service: ${error.message}`, 'init');
    }
  }

  /**
   * Load all events from filesystem
   * @private
   */
  async loadEvents() {
    try {
      const files = readdirSync(this.eventsPath)
        .filter(file => file.endsWith('.js'));

      for (const file of files) {
        try {
          await this.loadEvent(file);
        } catch (error) {
          this.logger?.error(`Failed to load event ${file}:`, error);
        }
      }

      this.stats.totalEvents = this.events.size;
    } catch (error) {
      throw new EventException(`Failed to load events: ${error.message}`, 'load');
    }
  }

  /**
   * Load single event file
   * @private
   * @param {string} file - Event file name
   */
  async loadEvent(file) {
    const eventPath = resolvePath(this.eventsPath, file);
    const eventURL = pathToFileURL(eventPath);

    try {
      const module = await import(eventURL.href);
      const event = module.default || module;

      // BACKWARD COMPATIBILITY: Support old format
      let config, runFunction;

      // Case 1: Function-based event (old format)
      if (typeof event === 'function') {
        // Event name from filename (without .js)
        const eventName = file.replace('.js', '');
        config = {
          name: eventName,
          file: file
        };
        runFunction = event;
      }
      // Case 2: Object with config (new format)
      else if (event.config && event.config.name) {
        config = event.config;
        config.file = file;
        runFunction = event.run;
      }
      // Case 3: Invalid format
      else {
        this.logger?.debug(`Skipping ${file}: Missing config.name or not a function`);
        return;
      }

      if (!runFunction || typeof runFunction !== 'function') {
        this.logger?.debug(`Skipping ${file}: Missing run() function`);
        return;
      }

      // Register event
      const name = config.name;
      this.events.set(name, {
        config,
        run: runFunction
      });

      this.logger?.debug(`Loaded event: ${name}`);
    } catch (error) {
      throw new EventException(
        `Failed to load event ${file}: ${error.message}`,
        file
      );
    }
  }  /**
   * Subscribe to an event
   * @param {string} eventName - Event name
   * @param {Function} handler - Event handler function
   * @returns {Function} Unsubscribe function
   */
  on(eventName, handler) {
    if (typeof handler !== 'function') {
      throw new EventException('Handler must be a function', eventName);
    }

    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, new Set());
    }

    this.listeners.get(eventName).add(handler);

    // Return unsubscribe function
    return () => this.off(eventName, handler);
  }

  /**
   * Subscribe to event (fires only once)
   * @param {string} eventName - Event name
   * @param {Function} handler - Event handler function
   */
  once(eventName, handler) {
    const wrapper = async (...args) => {
      this.off(eventName, wrapper);
      return await handler(...args);
    };

    this.on(eventName, wrapper);
  }

  /**
   * Unsubscribe from an event
   * @param {string} eventName - Event name
   * @param {Function} handler - Event handler function
   */
  off(eventName, handler) {
    if (!this.listeners.has(eventName)) return;

    const handlers = this.listeners.get(eventName);
    handlers.delete(handler);

    // Clean up empty listener sets
    if (handlers.size === 0) {
      this.listeners.delete(eventName);
    }
  }

  /**
   * Emit an event
   * @param {string} eventName - Event name
   * @param {*} data - Event data
   * @returns {Promise<Array>} Results from all handlers
   */
  async emit(eventName, data = {}) {
    const startTime = Date.now();
    const results = [];

    try {
      // Add to history
      this.addToHistory(eventName, data);
      this.stats.totalEmissions++;

      // Get event handler
      const event = this.events.get(eventName);

      // Execute registered event if exists
      if (event) {
        try {
          const result = await event.run(data);
          results.push({ handler: 'event', result });
        } catch (error) {
          this.stats.totalErrors++;
          this.logger?.error(`Error in event ${eventName}:`, error);
          results.push({ handler: 'event', error: error.message });
        }
      }

      // Execute all subscribed listeners
      if (this.listeners.has(eventName)) {
        const handlers = Array.from(this.listeners.get(eventName));

        await Promise.all(
          handlers.map(async (handler, index) => {
            try {
              const result = await handler(data);
              results.push({ handler: `listener-${index}`, result });
            } catch (error) {
              this.stats.totalErrors++;
              this.logger?.error(`Error in listener for ${eventName}:`, error);
              results.push({ handler: `listener-${index}`, error: error.message });
            }
          })
        );
      }

      const duration = Date.now() - startTime;
      this.logger?.debug(`Event ${eventName} emitted in ${duration}ms`);

      return results;
    } catch (error) {
      this.stats.totalErrors++;
      throw new EventException(
        `Failed to emit event: ${error.message}`,
        eventName,
        { originalError: error.message }
      );
    }
  }

  /**
   * Emit event without waiting for handlers
   * @param {string} eventName - Event name
   * @param {*} data - Event data
   */
  emitAsync(eventName, data = {}) {
    // Fire and forget
    this.emit(eventName, data).catch(error => {
      this.logger?.error(`Async event ${eventName} error:`, error);
    });
  }

  /**
   * Add event to history
   * @private
   */
  addToHistory(eventName, data) {
    this.history.push({
      event: eventName,
      data,
      timestamp: new Date()
    });

    // Keep history size limited
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }
  }

  /**
   * Get event history
   * @param {number} [limit=10] - Number of events to return
   * @returns {Array} Recent events
   */
  getHistory(limit = 10) {
    return this.history.slice(-limit);
  }

  /**
   * Clear event history
   */
  clearHistory() {
    this.history = [];
  }

  /**
   * Get all registered events
   * @returns {Array<string>} Event names
   */
  getEvents() {
    return Array.from(this.events.keys());
  }

  /**
   * Get listener count for event
   * @param {string} eventName - Event name
   * @returns {number} Number of listeners
   */
  listenerCount(eventName) {
    if (!this.listeners.has(eventName)) return 0;
    return this.listeners.get(eventName).size;
  }

  /**
   * Get all listener counts
   * @returns {Object} Event names with listener counts
   */
  getAllListenerCounts() {
    const counts = {};

    for (const [eventName, handlers] of this.listeners.entries()) {
      counts[eventName] = handlers.size;
    }

    return counts;
  }

  /**
   * Get service statistics
   * @returns {Object} Event statistics
   */
  getStats() {
    return {
      ...this.stats,
      registeredEvents: this.events.size,
      activeListeners: Array.from(this.listeners.values())
        .reduce((sum, set) => sum + set.size, 0),
      historySize: this.history.length
    };
  }

  /**
   * Remove all listeners for an event
   * @param {string} eventName - Event name
   */
  removeAllListeners(eventName) {
    if (eventName) {
      this.listeners.delete(eventName);
    } else {
      this.listeners.clear();
    }
  }

  /**
   * Reload an event
   * @param {string} name - Event name
   */
  async reload(name) {
    const event = this.events.get(name);
    if (!event) {
      throw new EventException('Event not found', name);
    }

    // Remove from cache
    this.events.delete(name);

    // Reload
    await this.loadEvent(event.config.file);

    this.logger?.info(`Event ${name} reloaded`);
  }

  /**
   * Shutdown event service
   */
  async shutdown() {
    this.logger?.info('Event service shutting down', this.getStats());

    this.events.clear();
    this.listeners.clear();
    this.history = [];

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

export default EventService;
