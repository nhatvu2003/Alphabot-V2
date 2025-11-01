/**
 * @fileoverview Dependency Injection Container for AlphaBot Core
 * @description Manages service lifecycle, dependencies, and provides service resolution
 * @author NhatCoder
 * @version 2.0.0
 */

/**
 * Service lifecycle states
 * @enum {string}
 */
const ServiceState = {
  REGISTERED: 'registered',
  INITIALIZING: 'initializing',
  INITIALIZED: 'initialized',
  ERROR: 'error'
};

/**
 * Service Container
 * Implements Dependency Injection pattern for managing services
 *
 * @class ServiceContainer
 * @example
 * const container = new ServiceContainer();
 * container.register('logger', LoggerService, true);
 * const logger = container.resolve('logger');
 */
class ServiceContainer {
  constructor() {
    /** @type {Map<string, Function>} Service constructors */
    this.services = new Map();

    /** @type {Map<string, any>} Instantiated singletons */
    this.instances = new Map();

    /** @type {Map<string, boolean>} Singleton flags */
    this.singletons = new Map();

    /** @type {Map<string, ServiceState>} Service states */
    this.states = new Map();

    /** @type {Map<string, Error>} Initialization errors */
    this.errors = new Map();

    /** @type {Map<string, Array<string>>} Service dependencies */
    this.dependencies = new Map();

    /** @type {Set<string>} Currently initializing services */
    this.initializing = new Set();
  }

  /**
   * Register a service in the container
   *
   * @param {string} name - Service identifier
   * @param {Function} implementation - Service constructor
   * @param {boolean} [singleton=true] - Whether service is singleton
   * @param {Array<string>} [deps=[]] - Service dependencies
   * @returns {ServiceContainer} Container instance for chaining
   *
   * @example
   * container.register('database', DatabaseService, true, ['config', 'logger']);
   */
  register(name, implementation, singleton = true, deps = []) {
    if (this.services.has(name)) {
      throw new Error(`Service "${name}" is already registered`);
    }

    this.services.set(name, implementation);
    this.singletons.set(name, singleton);
    this.dependencies.set(name, deps);
    this.states.set(name, ServiceState.REGISTERED);

    return this;
  }

  /**
   * Resolve a service by name
   * Creates instance if needed, manages dependencies
   *
   * @param {string} name - Service identifier
   * @returns {any} Service instance
   * @throws {Error} If service not found or circular dependency detected
   *
   * @example
   * const logger = container.resolve('logger');
   * logger.info('Service resolved');
   */
  resolve(name) {
    // Check if service is registered
    if (!this.services.has(name)) {
      throw new Error(`Service "${name}" not found. Did you forget to register it?`);
    }

    // Check for initialization errors
    if (this.errors.has(name)) {
      throw new Error(`Service "${name}" failed to initialize: ${this.errors.get(name).message}`);
    }

    // Return existing instance for singletons
    if (this.singletons.get(name) && this.instances.has(name)) {
      return this.instances.get(name);
    }

    // Detect circular dependencies
    if (this.initializing.has(name)) {
      throw new Error(`Circular dependency detected for service "${name}"`);
    }

    try {
      // Mark as initializing
      this.initializing.add(name);
      this.states.set(name, ServiceState.INITIALIZING);

      // Resolve dependencies first
      const deps = this.dependencies.get(name) || [];
      const resolvedDeps = {};

      for (const dep of deps) {
        resolvedDeps[dep] = this.resolve(dep);
      }

      // Create instance
      const ServiceClass = this.services.get(name);
      const instance = new ServiceClass(this, resolvedDeps);

      // Initialize if has initialize method
      if (typeof instance.initialize === 'function') {
        // Handle both sync and async initialize
        const initResult = instance.initialize();
        if (initResult instanceof Promise) {
          // Store promise for async initialization
          this.instances.set(name, initResult.then(() => {
            this.states.set(name, ServiceState.INITIALIZED);
            return instance;
          }));
        } else {
          this.states.set(name, ServiceState.INITIALIZED);
        }
      } else {
        this.states.set(name, ServiceState.INITIALIZED);
      }

      // Store instance for singletons
      if (this.singletons.get(name)) {
        this.instances.set(name, instance);
      }

      // Remove from initializing set
      this.initializing.delete(name);

      return instance;

    } catch (error) {
      // Store error
      this.errors.set(name, error);
      this.states.set(name, ServiceState.ERROR);
      this.initializing.delete(name);

      throw new Error(`Failed to resolve service "${name}": ${error.message}`);
    }
  }

  /**
   * Check if service is registered
   *
   * @param {string} name - Service identifier
   * @returns {boolean} True if service exists
   */
  has(name) {
    return this.services.has(name);
  }

  /**
   * Get service state
   *
   * @param {string} name - Service identifier
   * @returns {ServiceState} Service state
   */
  getState(name) {
    return this.states.get(name);
  }

  /**
   * Get all registered service names
   *
   * @returns {Array<string>} Service names
   */
  getServices() {
    return Array.from(this.services.keys());
  }

  /**
   * Unregister a service
   *
   * @param {string} name - Service identifier
   * @returns {boolean} True if service was removed
   */
  unregister(name) {
    if (!this.services.has(name)) {
      return false;
    }

    // Shutdown service if it has shutdown method
    const instance = this.instances.get(name);
    if (instance && typeof instance.shutdown === 'function') {
      try {
        instance.shutdown();
      } catch (error) {
        console.error(`Error shutting down service "${name}":`, error);
      }
    }

    // Remove from all maps
    this.services.delete(name);
    this.instances.delete(name);
    this.singletons.delete(name);
    this.states.delete(name);
    this.errors.delete(name);
    this.dependencies.delete(name);

    return true;
  }

  /**
   * Shutdown all services gracefully
   * Calls shutdown() on all services that implement it
   *
   * @returns {Promise<void>}
   */
  async shutdownAll() {
    const shutdownPromises = [];

    for (const [name, instance] of this.instances.entries()) {
      if (typeof instance.shutdown === 'function') {
        shutdownPromises.push(
          Promise.resolve(instance.shutdown())
            .catch(error => {
              console.error(`Error shutting down "${name}":`, error);
            })
        );
      }
    }

    await Promise.all(shutdownPromises);

    // Clear all maps
    this.services.clear();
    this.instances.clear();
    this.singletons.clear();
    this.states.clear();
    this.errors.clear();
    this.dependencies.clear();
    this.initializing.clear();
  }

  /**
   * Get container statistics
   *
   * @returns {Object} Container stats
   */
  getStats() {
    return {
      totalServices: this.services.size,
      initialized: Array.from(this.states.values())
        .filter(state => state === ServiceState.INITIALIZED).length,
      errors: this.errors.size,
      singletons: Array.from(this.singletons.values())
        .filter(Boolean).length
    };
  }

  /**
   * Validate all service dependencies
   * Checks if all declared dependencies are registered
   *
   * @throws {Error} If missing dependencies found
   */
  validateDependencies() {
    const missing = [];

    for (const [serviceName, deps] of this.dependencies.entries()) {
      for (const dep of deps) {
        if (!this.services.has(dep)) {
          missing.push({
            service: serviceName,
            missingDependency: dep
          });
        }
      }
    }

    if (missing.length > 0) {
      const errors = missing.map(m =>
        `  - Service "${m.service}" requires "${m.missingDependency}"`
      ).join('\n');

      throw new Error(`Missing service dependencies:\n${errors}`);
    }
  }

  /**
   * Create a child container
   * Inherits all parent services but maintains separate instances
   *
   * @returns {ServiceContainer} Child container
   */
  createChild() {
    const child = new ServiceContainer();

    // Copy service registrations
    for (const [name, service] of this.services.entries()) {
      child.register(
        name,
        service,
        this.singletons.get(name),
        this.dependencies.get(name)
      );
    }

    return child;
  }
}

/**
 * Export the container class
 */
export default ServiceContainer;

/**
 * Export service states enum
 */
export { ServiceState };
