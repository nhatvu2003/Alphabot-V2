/**
 * @fileoverview Core Exception Classes
 * @description Custom exception hierarchy for AlphaBot Core
 * @author NhatCoder
 * @version 2.0.0
 */

/**
 * Base Core Exception
 * All custom exceptions inherit from this
 *
 * @class CoreException
 * @extends Error
 */
class CoreException extends Error {
  /**
   * @param {string} message - Error message
   * @param {string} [code='CORE_ERROR'] - Error code
   * @param {Object} [context={}] - Additional context
   */
  constructor(message, code = 'CORE_ERROR', context = {}) {
    super(message);

    this.name = this.constructor.name;
    this.code = code;
    this.context = context;
    this.timestamp = new Date();

    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Convert exception to JSON
   * @returns {Object} JSON representation
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      context: this.context,
      timestamp: this.timestamp,
      stack: this.stack
    };
  }

  /**
   * Convert exception to string
   * @returns {string} String representation
   */
  toString() {
    return `${this.name} [${this.code}]: ${this.message}`;
  }
}

/**
 * Command Exception
 * Thrown when command execution fails
 */
class CommandException extends CoreException {
  constructor(message, commandName, context = {}) {
    super(message, 'COMMAND_ERROR', { ...context, commandName });
    this.commandName = commandName;
  }
}

/**
 * Event Exception
 * Thrown when event handling fails
 */
class EventException extends CoreException {
  constructor(message, eventName, context = {}) {
    super(message, 'EVENT_ERROR', { ...context, eventName });
    this.eventName = eventName;
  }
}

/**
 * Database Exception
 * Thrown when database operations fail
 */
class DatabaseException extends CoreException {
  constructor(message, operation, context = {}) {
    super(message, 'DATABASE_ERROR', { ...context, operation });
    this.operation = operation;
  }
}

/**
 * Validation Exception
 * Thrown when input validation fails
 */
class ValidationException extends CoreException {
  constructor(message, field, value, context = {}) {
    super(message, 'VALIDATION_ERROR', { ...context, field, value });
    this.field = field;
    this.value = value;
  }
}

/**
 * Configuration Exception
 * Thrown when configuration is invalid
 */
class ConfigException extends CoreException {
  constructor(message, configKey, context = {}) {
    super(message, 'CONFIG_ERROR', { ...context, configKey });
    this.configKey = configKey;
  }
}

/**
 * Plugin Exception
 * Thrown when plugin loading/execution fails
 */
class PluginException extends CoreException {
  constructor(message, pluginName, context = {}) {
    super(message, 'PLUGIN_ERROR', { ...context, pluginName });
    this.pluginName = pluginName;
  }
}

/**
 * Cache Exception
 * Thrown when cache operations fail
 */
class CacheException extends CoreException {
  constructor(message, key, context = {}) {
    super(message, 'CACHE_ERROR', { ...context, key });
    this.key = key;
  }
}

/**
 * Network Exception
 * Thrown when network operations fail
 */
class NetworkException extends CoreException {
  constructor(message, url, context = {}) {
    super(message, 'NETWORK_ERROR', { ...context, url });
    this.url = url;
  }
}

/**
 * Authentication Exception
 * Thrown when authentication fails
 */
class AuthException extends CoreException {
  constructor(message, userID, context = {}) {
    super(message, 'AUTH_ERROR', { ...context, userID });
    this.userID = userID;
  }
}

/**
 * Permission Exception
 * Thrown when user lacks required permissions
 */
class PermissionException extends CoreException {
  constructor(message, userID, requiredPermission, context = {}) {
    super(message, 'PERMISSION_ERROR', { ...context, userID, requiredPermission });
    this.userID = userID;
    this.requiredPermission = requiredPermission;
  }
}

// Export all exceptions
export {
  CoreException,
  CommandException,
  EventException,
  DatabaseException,
  ValidationException,
  ConfigException,
  PluginException,
  CacheException,
  NetworkException,
  AuthException,
  PermissionException
};

export default CoreException;
