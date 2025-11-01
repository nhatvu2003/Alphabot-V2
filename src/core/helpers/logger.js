/**
 * Professional Logger Service
 * @author Alphabot Team
 * @version 2.0.0  
 */

import { createWriteStream, existsSync, mkdirSync } from 'fs';
import { resolve as resolvePath } from 'path';
import { format } from 'util';

class Logger {
  constructor() {
    this.logDir = resolvePath(process.cwd(), 'logs');
    this.ensureLogDir();
    
    this.levels = {
      ERROR: 0,
      WARN: 1,
      INFO: 2,
      DEBUG: 3
    };
    
    this.currentLevel = process.env.LOG_LEVEL 
      ? this.levels[process.env.LOG_LEVEL.toUpperCase()] || 2 
      : 2;
    
    this.streams = {
      error: createWriteStream(resolvePath(this.logDir, 'error.log'), { flags: 'a' }),
      combined: createWriteStream(resolvePath(this.logDir, 'combined.log'), { flags: 'a' })
    };
  }

  ensureLogDir() {
    if (!existsSync(this.logDir)) {
      mkdirSync(this.logDir, { recursive: true });
    }
  }

  formatMessage(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const pid = process.pid;
    const formatted = typeof message === 'object' ? JSON.stringify(message) : message;
    
    return `[${timestamp}] [${level}] [PID:${pid}] ${formatted} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}\n`;
  }

  log(level, message, meta = {}) {
    const levelNum = this.levels[level.toUpperCase()];
    
    if (levelNum <= this.currentLevel) {
      const formattedMessage = this.formatMessage(level, message, meta);
      
      // Console output with colors
      const colors = {
        ERROR: '\x1b[31m', // Red
        WARN: '\x1b[33m',  // Yellow  
        INFO: '\x1b[32m',  // Green
        DEBUG: '\x1b[36m'  // Cyan
      };
      
      console.log(`${colors[level.toUpperCase()]}${formattedMessage.trim()}\x1b[0m`);
      
      // File output
      this.streams.combined.write(formattedMessage);
      
      if (level === 'ERROR') {
        this.streams.error.write(formattedMessage);
      }
    }
  }

  error(message, meta = {}) {
    this.log('ERROR', message, meta);
  }

  warn(message, meta = {}) {
    this.log('WARN', message, meta);
  }

  info(message, meta = {}) {
    this.log('INFO', message, meta);
  }

  debug(message, meta = {}) {
    this.log('DEBUG', message, meta);
  }

  // Structured logging for events
  logEvent(eventType, data = {}) {
    this.info(`EVENT: ${eventType}`, {
      event: eventType,
      timestamp: new Date().toISOString(),
      ...data
    });
  }

  // Performance logging
  logPerformance(operation, duration, meta = {}) {
    this.info(`PERFORMANCE: ${operation}`, {
      operation,
      duration: `${duration}ms`,
      ...meta
    });
  }

  // Security logging
  logSecurity(action, details = {}) {
    this.warn(`SECURITY: ${action}`, {
      action,
      timestamp: new Date().toISOString(),
      ...details
    });
  }

  close() {
    Object.values(this.streams).forEach(stream => stream.end());
  }
}

export default new Logger();