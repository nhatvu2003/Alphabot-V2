/**
 * @fileoverview Base Service Interface
 * @description Defines the contract that all services must implement
 * @author NhatCoder
 * @version 2.0.0
 */

/**
 * Base Service Interface
 * All services in the system must implement this interface
 *
 * @interface IService
 * @example
 * class MyService extends IService {
 *   async initialize() {
 *     // Initialize service
 *   }
 * }
 */
class IService {
  /**
   * Service constructor
   * @param {ServiceContainer} container - DI container
   * @param {Object} dependencies - Resolved dependencies
   */
  constructor(container, dependencies = {}) {
    if (new.target === IService) {
      throw new Error('Cannot instantiate interface directly');
    }

    this.container = container;
    this.dependencies = dependencies;
    this.isInitialized = false;
    this.isShutdown = false;
  }

  /**
   * Initialize the service
   * Called automatically by the container after instantiation
   * Can be async or sync
   *
   * @returns {Promise<void>|void}
   * @abstract
   */
  async initialize() {
    throw new Error('Method initialize() must be implemented');
  }

  /**
   * Shutdown the service gracefully
   * Called during application shutdown
   * Should clean up resources (connections, timers, etc.)
   *
   * @returns {Promise<void>|void}
   * @abstract
   */
  async shutdown() {
    throw new Error('Method shutdown() must be implemented');
  }

  /**
   * Health check for the service
   * Returns true if service is healthy and ready
   *
   * @returns {Promise<boolean>|boolean}
   * @abstract
   */
  async healthCheck() {
    throw new Error('Method healthCheck() must be implemented');
  }

  /**
   * Get service name
   * @returns {string} Service name
   */
  getName() {
    return this.constructor.name;
  }

  /**
   * Get service version
   * @returns {string} Service version
   */
  getVersion() {
    return '1.0.0';
  }

  /**
   * Get service status
   * @returns {Object} Service status
   */
  getStatus() {
    return {
      name: this.getName(),
      version: this.getVersion(),
      initialized: this.isInitialized,
      shutdown: this.isShutdown,
      healthy: this.healthCheck()
    };
  }
}

export default IService;
