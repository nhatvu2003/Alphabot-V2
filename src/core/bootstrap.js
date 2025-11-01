/**
 * @fileoverview Core Bootstrap System
 * @description Professional initialization system for AlphaBot Core
 * @author NhatCoder
 * @version 2.0.0
 */

import { resolve as resolvePath } from 'path';
import ServiceContainer from './container.js';
import terminalUI from './UI/terminal-ui.js';

/**
 * Bootstrap the AlphaBot Core system
 * Initializes services, loads plugins, sets up error handling
 *
 * @class CoreBootstrap
 */
class CoreBootstrap {
  constructor() {
    /** @type {ServiceContainer} Service container instance */
    this.container = new ServiceContainer();

    /** @type {boolean} Bootstrap state */
    this.isBooted = false;

    /** @type {Date} Boot start time */
    this.bootStartTime = null;

    /** @type {Object} Boot statistics */
    this.stats = {
      bootTime: 0,
      servicesLoaded: 0,
      commandsLoaded: 0,
      eventsLoaded: 0,
      errors: []
    };
  }

  /**
   * Main bootstrap method
   * Orchestrates the entire initialization process
   *
   * @returns {Promise<ServiceContainer>} Initialized container
   * @throws {Error} If bootstrap fails
   */
  async boot() {
    if (this.isBooted) {
      throw new Error('Core already booted');
    }

    this.bootStartTime = Date.now();

    try {
      terminalUI.clearAndShowHeader();
      terminalUI.showInfo('🚀 Starting AlphaBot Core v2.0...');
      console.log();

      // Phase 1: Setup global paths
      await this.setupPaths();

      // Phase 2: Register core services
      await this.registerCoreServices();

      // Phase 3: Initialize services
      await this.initializeServices();

      // Phase 4: Load plugins
      await this.loadPlugins();

      // Phase 5: Setup error handlers
      this.setupErrorHandlers();

      // Phase 6: Setup graceful shutdown
      this.setupGracefulShutdown();

      this.isBooted = true;
      this.stats.bootTime = Date.now() - this.bootStartTime;

      this.showBootSummary();

      return this.container;

    } catch (error) {
      terminalUI.showError(`Bootstrap failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Setup global paths
   * @private
   */
  async setupPaths() {
    terminalUI.showLoading('Setting up paths');

    global.mainPath = resolvePath(process.cwd());
    global.CorePath = resolvePath(process.cwd(), 'src');
    global.cachePath = resolvePath(process.cwd(), 'data', 'cache');
    global.assetsPath = resolvePath(process.cwd(), 'assets');
    global.pluginsPath = resolvePath(process.cwd(), 'src', 'plugins');

    terminalUI.showSuccess('Paths configured');
    console.log();
  }

  /**
   * Register all core services
   * @private
   */
  async registerCoreServices() {
    terminalUI.showLoading('Registering core services');

    // Import service classes
    const { default: ConfigService } = await import('./services/ConfigService.js');
    const { default: LoggerService } = await import('./services/LoggerService.js');
    const { default: CacheService } = await import('./services/CacheService.js');
    const { default: DatabaseService } = await import('./services/DatabaseService.js');
    const { default: CommandService } = await import('./services/CommandService.js');
    const { default: EventService } = await import('./services/EventService.js');
    const { default: PluginService } = await import('./services/PluginService.js');

    // Register services with dependencies
    this.container.register('config', ConfigService, true, []);
    this.container.register('logger', LoggerService, true, ['config']);
    this.container.register('cache', CacheService, true, ['config', 'logger']);
    this.container.register('database', DatabaseService, true, ['config', 'logger']);
    this.container.register('commands', CommandService, true, ['logger', 'cache']);
    this.container.register('events', EventService, true, ['logger']);
    this.container.register('plugins', PluginService, true, ['logger', 'commands', 'events']);

    // Validate dependencies
    this.container.validateDependencies();

    this.stats.servicesLoaded = this.container.getServices().length;

    terminalUI.showSuccess(`Registered ${this.stats.servicesLoaded} services`);
    console.log();
  }

  /**
   * Initialize all services
   * @private
   */
  async initializeServices() {
    terminalUI.showLoading('Initializing services');

    const services = this.container.getServices();
    let initialized = 0;

    for (const serviceName of services) {
      try {
        const service = this.container.resolve(serviceName);

        // Handle async initialization
        if (service instanceof Promise) {
          await service;
        }

        initialized++;
        terminalUI.showProgress(initialized, services.length, 'Services');
      } catch (error) {
        this.stats.errors.push({
          service: serviceName,
          error: error.message
        });
        terminalUI.showError(`Failed to initialize ${serviceName}: ${error.message}`);
      }
    }

    console.log();
    terminalUI.showSuccess(`Initialized ${initialized}/${services.length} services`);
    console.log();
  }

  /**
   * Load all plugins (commands, events, customs)
   * @private
   */
  async loadPlugins() {
    terminalUI.showLoading('Loading plugins');

    try {
      const pluginService = this.container.resolve('plugins');
      const result = await pluginService.loadAll();

      this.stats.commandsLoaded = result.commands;
      this.stats.eventsLoaded = result.events;

      terminalUI.showSuccess(`Loaded ${result.commands} commands, ${result.events} events`);
    } catch (error) {
      this.stats.errors.push({
        service: 'plugins',
        error: error.message
      });
      terminalUI.showError(`Plugin loading failed: ${error.message}`);
    }

    console.log();
  }

  /**
   * Setup global error handlers
   * @private
   */
  setupErrorHandlers() {
    const logger = this.container.resolve('logger');

    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      terminalUI.showError(`Uncaught Exception: ${error.message}`);

      // Try to recover
      this.attemptRecovery(error);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection:', reason);
      terminalUI.showError(`Unhandled Rejection: ${reason}`);
    });

    process.on('warning', (warning) => {
      logger.warn('Process Warning:', warning);
    });
  }

  /**
   * Setup graceful shutdown handlers
   * @private
   */
  setupGracefulShutdown() {
    const shutdown = async (signal) => {
      const logger = this.container.resolve('logger');

      logger.info(`Received ${signal}, shutting down gracefully...`);
      terminalUI.showInfo(`\n🛑 Shutting down gracefully...`);

      try {
        // Shutdown all services
        await this.container.shutdownAll();

        terminalUI.showSuccess('All services shut down successfully');
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown:', error);
        terminalUI.showError(`Shutdown error: ${error.message}`);
        process.exit(1);
      }
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  }

  /**
   * Attempt to recover from critical errors
   * @private
   * @param {Error} error - The error that occurred
   */
  async attemptRecovery(error) {
    const logger = this.container.resolve('logger');

    logger.info('Attempting recovery...');

    // Add recovery logic here
    // For example: reconnect to Facebook, reload failed plugins, etc.
  }

  /**
   * Show boot summary
   * @private
   */
  showBootSummary() {
    console.log();
    terminalUI.showSeparator();
    terminalUI.showSuccess('✨ AlphaBot Core initialized successfully!');
    console.log();

    terminalUI.showInfo(`⏱️  Boot time: ${this.stats.bootTime}ms`);
    terminalUI.showInfo(`🔧 Services: ${this.stats.servicesLoaded} loaded`);
    terminalUI.showInfo(`⚡ Commands: ${this.stats.commandsLoaded} loaded`);
    terminalUI.showInfo(`📢 Events: ${this.stats.eventsLoaded} loaded`);

    if (this.stats.errors.length > 0) {
      console.log();
      terminalUI.showWarning(`⚠️  ${this.stats.errors.length} errors occurred during boot`);
    }

    terminalUI.showSeparator();
    console.log();
  }

  /**
   * Get bootstrap statistics
   * @returns {Object} Boot stats
   */
  getStats() {
    return { ...this.stats };
  }

  /**
   * Get service container
   * @returns {ServiceContainer} Container instance
   */
  getContainer() {
    return this.container;
  }
}

/**
 * Create and export bootstrap instance
 */
const bootstrap = new CoreBootstrap();

/**
 * Main bootstrap function
 * @returns {Promise<ServiceContainer>} Initialized container
 */
export async function boot() {
  return await bootstrap.boot();
}

/**
 * Get container directly
 * @returns {ServiceContainer} Container instance
 */
export function getContainer() {
  return bootstrap.getContainer();
}

/**
 * Export bootstrap class
 */
export default CoreBootstrap;
