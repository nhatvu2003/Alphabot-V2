# 🏗️ AlphaBot Core Architecture

## 📖 Table of Contents

1. [Core Philosophy](#core-philosophy)
2. [Architecture Overview](#architecture-overview)
3. [Design Patterns](#design-patterns)
4. [Module Structure](#module-structure)
5. [Service Layer](#service-layer)
6. [Plugin System](#plugin-system)
7. [Error Handling](#error-handling)
8. [Performance Optimization](#performance-optimization)
9. [Testing Strategy](#testing-strategy)

---

## 🎯 Core Philosophy

AlphaBot Core follows these principles:

### 1. SOLID Principles

- **Single Responsibility**: Each module has one clear purpose
- **Open/Closed**: Open for extension, closed for modification
- **Liskov Substitution**: Derived classes must be substitutable
- **Interface Segregation**: Many specific interfaces better than one general
- **Dependency Inversion**: Depend on abstractions, not concretions

### 2. Clean Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Presentation Layer                   │
│              (UI, CLI, Dashboard, APIs)                 │
└─────────────────────────────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────┐
│                   Application Layer                     │
│        (Commands, Events, Handlers, Controllers)        │
└─────────────────────────────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────┐
│                    Business Layer                       │
│         (Services, Domain Logic, Use Cases)             │
└─────────────────────────────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────┐
│                  Infrastructure Layer                   │
│      (Database, Cache, External APIs, File System)      │
└─────────────────────────────────────────────────────────┘
```

### 3. Design Goals

- ✅ **Maintainability**: Easy to understand and modify
- ✅ **Testability**: Every component can be tested in isolation
- ✅ **Scalability**: Can handle growth in features and users
- ✅ **Performance**: Optimized for Termux and low-resource environments
- ✅ **Reliability**: Graceful error handling and recovery

---

## 📐 Architecture Overview

### Core Components

```
System/core/
├── bootstrap.js              # Core bootstrap & initialization
├── container.js              # Dependency Injection Container
├── _init.js                  # Legacy init (to be refactored)
├── _global_info.js          # Global state (to be minimized)
├── core-manager.js          # Core lifecycle manager
│
├── services/                # Service Layer
│   ├── CommandService.js    # Command management
│   ├── EventService.js      # Event system
│   ├── DatabaseService.js   # Database abstraction
│   ├── CacheService.js      # Caching layer
│   ├── PluginService.js     # Plugin management
│   ├── ConfigService.js     # Configuration management
│   └── LoggerService.js     # Logging service
│
├── interfaces/              # Service Interfaces (JSDoc)
│   ├── IService.js          # Base service interface
│   ├── ICommandService.js   # Command service interface
│   ├── IEventService.js     # Event service interface
│   └── IDatabaseService.js  # Database service interface
│
├── factories/               # Factory Pattern
│   ├── ServiceFactory.js    # Create services
│   ├── CommandFactory.js    # Create commands
│   └── EventFactory.js      # Create events
│
├── repositories/            # Repository Pattern
│   ├── UserRepository.js    # User data access
│   ├── ThreadRepository.js  # Thread data access
│   └── ConfigRepository.js  # config data access
│
├── helpers/                 # Utility Functions
│   ├── validator.js         # Input validation
│   ├── transformer.js       # Data transformation
│   ├── errorHandler.js      # Error handling
│   ├── logger.js            # Logging utility
│   ├── cache.js             # Cache helper
│   └── async.js             # Async utilities
│
├── middleware/              # Middleware Layer
│   ├── auth.js              # Authentication
│   ├── rateLimit.js         # Rate limiting
│   ├── errorHandler.js      # Error middleware
│   └── logger.js            # Logging middleware
│
├── models/                  # Data Models
│   ├── User.js              # User model
│   ├── Thread.js            # Thread model
│   ├── Command.js           # Command model
│   └── Event.js             # Event model
│
├── controllers/             # Controllers
│   ├── UserController.js    # User logic
│   ├── ThreadController.js  # Thread logic
│   └── CommandController.js # Command logic
│
├── events/                  # Event System
│   ├── EventEmitter.js      # Custom event emitter
│   ├── EventBus.js          # Event bus pattern
│   └── EventRegistry.js     # Event registration
│
├── plugins/                 # Plugin System
│   ├── PluginLoader.js      # Load plugins
│   ├── PluginManager.js     # Manage plugins
│   └── PluginContext.js     # Plugin context
│
└── exceptions/              # Custom Exceptions
    ├── CoreException.js     # Base exception
    ├── CommandException.js  # Command errors
    ├── DatabaseException.js # Database errors
    └── ValidationException.js # Validation errors
```

---

## 🎨 Design Patterns

### 1. Dependency Injection Container

```javascript
/**
 * Service Container for Dependency Injection
 * Manages service lifecycle and dependencies
 */
class ServiceContainer {
  constructor() {
    this.services = new Map();
    this.singletons = new Map();
    this.factories = new Map();
  }

  /**
   * Register a service
   * @param {string} name - Service name
   * @param {Function|Class} implementation - Service implementation
   * @param {boolean} singleton - Is singleton service
   */
  register(name, implementation, singleton = true) {
    if (singleton) {
      this.singletons.set(name, implementation);
    } else {
      this.factories.set(name, implementation);
    }
  }

  /**
   * Resolve a service
   * @param {string} name - Service name
   * @returns {*} Service instance
   */
  resolve(name) {
    // Check if already instantiated
    if (this.services.has(name)) {
      return this.services.get(name);
    }

    // Check singletons
    if (this.singletons.has(name)) {
      const ServiceClass = this.singletons.get(name);
      const instance = new ServiceClass(this);
      this.services.set(name, instance);
      return instance;
    }

    // Check factories
    if (this.factories.has(name)) {
      const Factory = this.factories.get(name);
      return new Factory(this);
    }

    throw new Error(`Service "${name}" not found`);
  }
}
```

### 2. Service Layer Pattern

```javascript
/**
 * Base Service Interface
 * All services must implement these methods
 */
class IService {
  /**
   * Initialize service
   * @returns {Promise<void>}
   */
  async initialize() {
    throw new Error('Method initialize() must be implemented');
  }

  /**
   * Shutdown service gracefully
   * @returns {Promise<void>}
   */
  async shutdown() {
    throw new Error('Method shutdown() must be implemented');
  }

  /**
   * Health check
   * @returns {Promise<boolean>}
   */
  async healthCheck() {
    throw new Error('Method healthCheck() must be implemented');
  }
}

/**
 * Command Service Implementation
 */
class CommandService extends IService {
  constructor(container) {
    super();
    this.container = container;
    this.commands = new Map();
    this.aliases = new Map();
    this.cooldowns = new Map();
  }

  async initialize() {
    // Load commands from filesystem
    await this.loadCommands();

    // Setup command middleware
    this.setupMiddleware();

    // Register event listeners
    this.registerListeners();
  }

  async loadCommands() {
    // Implementation
  }

  async executeCommand(commandName, context) {
    // Validate command exists
    if (!this.commands.has(commandName)) {
      throw new CommandException(`Command "${commandName}" not found`);
    }

    // Check cooldown
    if (this.isOnCooldown(context.userID, commandName)) {
      throw new CommandException('Command on cooldown');
    }

    // Execute command
    const command = this.commands.get(commandName);
    const result = await command.execute(context);

    // Set cooldown
    this.setCooldown(context.userID, commandName, command.config.cooldown);

    return result;
  }
}
```

### 3. Repository Pattern

```javascript
/**
 * Base Repository
 * Handles data access layer
 */
class BaseRepository {
  constructor(model, database) {
    this.model = model;
    this.database = database;
  }

  async findById(id) {
    return await this.database.findOne(this.model, { id });
  }

  async findAll(query = {}) {
    return await this.database.find(this.model, query);
  }

  async create(data) {
    return await this.database.insert(this.model, data);
  }

  async update(id, data) {
    return await this.database.update(this.model, { id }, data);
  }

  async delete(id) {
    return await this.database.delete(this.model, { id });
  }
}

/**
 * User Repository
 */
class UserRepository extends BaseRepository {
  constructor(database) {
    super('User', database);
  }

  async findByFacebookId(fbId) {
    return await this.database.findOne(this.model, { facebookId: fbId });
  }

  async updateExp(userId, exp) {
    const user = await this.findById(userId);
    user.exp += exp;
    return await this.update(userId, user);
  }
}
```

### 4. Factory Pattern

```javascript
/**
 * Command Factory
 * Creates command instances with dependencies
 */
class CommandFactory {
  constructor(container) {
    this.container = container;
  }

  /**
   * Create command instance
   * @param {Object} commandConfig - Command configuration
   * @returns {Object} Command instance
   */
  create(commandConfig) {
    const command = {
      config: commandConfig,

      execute: async (context) => {
        // Inject dependencies
        const services = this.injectDependencies(commandConfig.dependencies);

        // Execute command logic
        return await commandConfig.run(context, services);
      }
    };

    return command;
  }

  injectDependencies(deps = []) {
    const services = {};

    for (const dep of deps) {
      services[dep] = this.container.resolve(dep);
    }

    return services;
  }
}
```

### 5. Event Bus Pattern

```javascript
/**
 * Event Bus for loose coupling
 */
class EventBus {
  constructor() {
    this.listeners = new Map();
  }

  /**
   * Subscribe to event
   * @param {string} event - Event name
   * @param {Function} handler - Event handler
   */
  on(event, handler) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }

    this.listeners.get(event).push(handler);
  }

  /**
   * Emit event
   * @param {string} event - Event name
   * @param {*} data - Event data
   */
  async emit(event, data) {
    if (!this.listeners.has(event)) return;

    const handlers = this.listeners.get(event);

    // Execute all handlers
    await Promise.all(
      handlers.map(handler => handler(data))
    );
  }

  /**
   * Remove listener
   * @param {string} event - Event name
   * @param {Function} handler - Event handler
   */
  off(event, handler) {
    if (!this.listeners.has(event)) return;

    const handlers = this.listeners.get(event);
    const index = handlers.indexOf(handler);

    if (index > -1) {
      handlers.splice(index, 1);
    }
  }
}
```

---

## 🔧 Service Layer

### Service Interface Definition

```javascript
/**
 * @interface IService
 * @description Base interface for all services
 */

/**
 * Initialize service
 * @function
 * @name IService#initialize
 * @returns {Promise<void>}
 */

/**
 * Shutdown service gracefully
 * @function
 * @name IService#shutdown
 * @returns {Promise<void>}
 */

/**
 * Check service health
 * @function
 * @name IService#healthCheck
 * @returns {Promise<boolean>}
 */
```

### Core Services

1. **CommandService**: Command registration, execution, validation
2. **EventService**: Event handling, dispatching
3. **DatabaseService**: Data persistence abstraction
4. **CacheService**: Caching layer with TTL
5. **PluginService**: Plugin lifecycle management
6. **ConfigService**: Configuration management
7. **LoggerService**: Centralized logging

---

## 🔌 Plugin System

### Plugin Structure

```javascript
/**
 * Plugin Interface
 */
export default class Plugin {
  constructor(context) {
    this.name = 'plugin-name';
    this.version = '1.0.0';
    this.author = 'Author Name';
    this.dependencies = []; // Plugin dependencies
    this.context = context; // Access to services
  }

  /**
   * Plugin initialization
   */
  async onLoad() {
    // Called when plugin loads
  }

  /**
   * Plugin activation
   */
  async onEnable() {
    // Called when plugin activates
  }

  /**
   * Plugin deactivation
   */
  async onDisable() {
    // Called when plugin deactivates
  }

  /**
   * Plugin cleanup
   */
  async onUnload() {
    // Called when plugin unloads
  }
}
```

### Plugin Lifecycle

```
┌──────────┐
│  LOADED  │ ─┐
└──────────┘  │
              ▼
         ┌──────────┐
         │ ENABLED  │ ◄─┐
         └──────────┘   │
              │         │
              ▼         │
         ┌──────────┐   │
         │ DISABLED │ ──┘
         └──────────┘
              │
              ▼
         ┌──────────┐
         │ UNLOADED │
         └──────────┘
```

---

## ⚠️ Error Handling

### Exception Hierarchy

```javascript
/**
 * Base Exception
 */
class CoreException extends Error {
  constructor(message, code = 'CORE_ERROR') {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.timestamp = new Date();
  }
}

/**
 * Command Exception
 */
class CommandException extends CoreException {
  constructor(message, commandName) {
    super(message, 'COMMAND_ERROR');
    this.commandName = commandName;
  }
}

/**
 * Validation Exception
 */
class ValidationException extends CoreException {
  constructor(message, field, value) {
    super(message, 'VALIDATION_ERROR');
    this.field = field;
    this.value = value;
  }
}
```

### Error Handler Service

```javascript
class ErrorHandlerService {
  constructor(logger) {
    this.logger = logger;
    this.handlers = new Map();
  }

  /**
   * Register error handler
   */
  register(errorType, handler) {
    this.handlers.set(errorType, handler);
  }

  /**
   * Handle error
   */
  async handle(error, context = {}) {
    // Log error
    this.logger.error(error.message, {
      code: error.code,
      stack: error.stack,
      context
    });

    // Find handler
    const handler = this.handlers.get(error.constructor.name);

    if (handler) {
      return await handler(error, context);
    }

    // Default handler
    return this.defaultHandler(error, context);
  }

  defaultHandler(error, context) {
    // Send user-friendly message
    if (context.api && context.threadID) {
      context.api.sendMessage(
        `❌ Có lỗi xảy ra: ${error.message}`,
        context.threadID
      );
    }
  }
}
```

---

## ⚡ Performance Optimization

### 1. Caching Strategy

```javascript
/**
 * Multi-layer cache
 */
class CacheService {
  constructor() {
    this.memory = new Map(); // L1: Memory cache
    this.ttl = new Map();     // TTL tracking
  }

  async get(key) {
    // Check memory cache
    if (this.memory.has(key)) {
      const ttl = this.ttl.get(key);

      if (ttl > Date.now()) {
        return this.memory.get(key);
      }

      // Expired, remove
      this.memory.delete(key);
      this.ttl.delete(key);
    }

    return null;
  }

  async set(key, value, ttl = 3600000) {
    this.memory.set(key, value);
    this.ttl.set(key, Date.now() + ttl);
  }

  async invalidate(key) {
    this.memory.delete(key);
    this.ttl.delete(key);
  }
}
```

### 2. Lazy Loading

```javascript
/**
 * Lazy load commands on demand
 */
class LazyCommandLoader {
  constructor() {
    this.commandPaths = new Map();
    this.loadedCommands = new Map();
  }

  async loadCommand(name) {
    if (this.loadedCommands.has(name)) {
      return this.loadedCommands.get(name);
    }

    const path = this.commandPaths.get(name);
    const command = await import(path);

    this.loadedCommands.set(name, command);

    return command;
  }
}
```

### 3. Memory Management

```javascript
/**
 * Memory optimization for Termux
 */
class MemoryManager {
  constructor() {
    this.threshold = 0.8; // 80% memory threshold
  }

  checkMemory() {
    const usage = process.memoryUsage();
    const heapUsed = usage.heapUsed / usage.heapTotal;

    if (heapUsed > this.threshold) {
      this.cleanup();
    }
  }

  cleanup() {
    // Clear old caches
    global.client.cooldowns.clear();
    global.client.replies.clear();

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
  }
}
```

---

## 🧪 Testing Strategy

### Unit Testing

```javascript
/**
 * Example unit test for CommandService
 */
import { describe, it, expect } from 'vitest';
import CommandService from './services/CommandService.js';

describe('CommandService', () => {
  it('should register command', async () => {
    const service = new CommandService();
    await service.initialize();

    const command = {
      name: 'test',
      execute: async () => 'ok'
    };

    service.registerCommand(command);

    expect(service.commands.has('test')).toBe(true);
  });

  it('should execute command', async () => {
    const service = new CommandService();
    const result = await service.executeCommand('test', {});

    expect(result).toBe('ok');
  });
});
```

### Integration Testing

```javascript
/**
 * Integration test
 */
describe('Core System Integration', () => {
  it('should bootstrap core successfully', async () => {
    const core = await bootstrap();

    expect(core.isReady()).toBe(true);
    expect(core.services.size).toBeGreaterThan(0);
  });
});
```

---

## 📚 Best Practices

### 1. Code Organization

- One class/module per file
- Clear naming conventions
- Group related functionality
- Minimize global state

### 2. Documentation

- JSDoc for all public APIs
- README for each major module
- Examples in documentation
- Architecture decisions recorded

### 3. Error Handling

- Always use try-catch for async
- Custom exceptions for clarity
- User-friendly error messages
- Proper error logging

### 4. Testing

- Test critical paths
- Mock external dependencies
- Integration tests for workflows
- Performance benchmarks

---

## 🎯 Migration Path

### Phase 1: Foundation (Week 1)
- ✅ Create service container
- ✅ Implement base services
- ✅ Setup exception system

### Phase 2: Services (Week 2)
- ✅ CommandService
- ✅ EventService
- ✅ DatabaseService
- ✅ CacheService

### Phase 3: Integration (Week 3)
- ✅ Integrate with existing code
- ✅ Migrate commands to new system
- ✅ Migrate events to new system

### Phase 4: Optimization (Week 4)
- ✅ Performance testing
- ✅ Memory optimization
- ✅ Documentation
- ✅ Testing infrastructure

---

## 📖 References

- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [SOLID Principles](https://en.wikipedia.org/wiki/SOLID)
- [Design Patterns](https://refactoring.guru/design-patterns)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)

---

**Last Updated**: October 26, 2025
**Version**: 2.0.0
**Status**: 🚧 In Development
