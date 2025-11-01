/**
 * @fileoverview Cache Service
 * @description Multi-layer caching service with TTL and memory management
 * @author NhatCoder
 * @version 2.0.0
 */

import IService from '../interfaces/IService.js';
import { CacheException } from '../exceptions/CoreException.js';

/**
 * Cache entry structure
 * @typedef {Object} CacheEntry
 * @property {*} value - Cached value
 * @property {number} expires - Expiration timestamp
 * @property {number} hits - Number of cache hits
 * @property {number} size - Approximate size in bytes
 */

/**
 * Cache Service
 * Provides multi-layer caching with TTL, LRU eviction, and memory management
 *
 * @class CacheService
 * @extends IService
 */
class CacheService extends IService {
  constructor(container, dependencies = {}) {
    super(container, dependencies);

    this.config = dependencies.config;
    this.logger = dependencies.logger;

    /** @type {Map<string, CacheEntry>} Memory cache */
    this.cache = new Map();

    /** @type {Map<string, number>} Access time tracking for LRU */
    this.accessTimes = new Map();

    /** @type {number} Default TTL in milliseconds */
    this.defaultTTL = 3600000; // 1 hour

    /** @type {number} Max cache size in MB */
    this.maxSize = 50;

    /** @type {number} Current cache size in bytes */
    this.currentSize = 0;

    /** @type {Object} Cache statistics */
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0
    };

    /** @type {NodeJS.Timeout} Cleanup interval */
    this.cleanupInterval = null;
  }

  /**
   * Initialize cache service
   */
  async initialize() {
    try {
      // Load config
      this.defaultTTL = this.config?.get('CACHE.TTL', this.defaultTTL);
      this.maxSize = this.config?.get('CACHE.MAX_SIZE_MB', this.maxSize);

      // Start cleanup interval (every 5 minutes)
      this.cleanupInterval = setInterval(() => {
        this.cleanup();
      }, 300000);

      this.logger?.debug('Cache service initialized', {
        defaultTTL: this.defaultTTL,
        maxSize: this.maxSize
      });

      this.isInitialized = true;
    } catch (error) {
      throw new CacheException(`Failed to initialize cache: ${error.message}`, 'init');
    }
  }

  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @returns {*} Cached value or null
   */
  get(key) {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expires) {
      this.delete(key);
      this.stats.misses++;
      return null;
    }

    // Update access time and hit count
    entry.hits++;
    this.accessTimes.set(key, Date.now());
    this.stats.hits++;

    return entry.value;
  }

  /**
   * Set value in cache
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   * @param {number} [ttl] - Time to live in milliseconds
   */
  set(key, value, ttl = null) {
    try {
      const expires = Date.now() + (ttl || this.defaultTTL);
      const size = this.estimateSize(value);

      // Check if we need to evict entries
      while (this.currentSize + size > this.maxSize * 1024 * 1024 && this.cache.size > 0) {
        this.evictLRU();
      }

      // Delete old entry if exists
      if (this.cache.has(key)) {
        const oldEntry = this.cache.get(key);
        this.currentSize -= oldEntry.size;
      }

      // Add new entry
      this.cache.set(key, {
        value,
        expires,
        hits: 0,
        size
      });

      this.accessTimes.set(key, Date.now());
      this.currentSize += size;
      this.stats.sets++;

    } catch (error) {
      throw new CacheException(`Failed to set cache: ${error.message}`, key);
    }
  }

  /**
   * Check if key exists in cache
   * @param {string} key - Cache key
   * @returns {boolean} True if key exists and not expired
   */
  has(key) {
    const entry = this.cache.get(key);

    if (!entry) return false;

    if (Date.now() > entry.expires) {
      this.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete entry from cache
   * @param {string} key - Cache key
   * @returns {boolean} True if entry was deleted
   */
  delete(key) {
    const entry = this.cache.get(key);

    if (!entry) return false;

    this.currentSize -= entry.size;
    this.cache.delete(key);
    this.accessTimes.delete(key);
    this.stats.deletes++;

    return true;
  }

  /**
   * Clear all cache entries
   */
  clear() {
    this.cache.clear();
    this.accessTimes.clear();
    this.currentSize = 0;

    this.logger?.info('Cache cleared');
  }

  /**
   * Get or set with callback
   * @param {string} key - Cache key
   * @param {Function} callback - Function to get value if not cached
   * @param {number} [ttl] - Time to live
   * @returns {Promise<*>} Cached or fetched value
   */
  async remember(key, callback, ttl = null) {
    // Check cache first
    const cached = this.get(key);
    if (cached !== null) {
      return cached;
    }

    // Get fresh value
    const value = await callback();

    // Cache it
    this.set(key, value, ttl);

    return value;
  }

  /**
   * Set multiple entries at once
   * @param {Object} entries - Key-value pairs
   * @param {number} [ttl] - Time to live
   */
  setMany(entries, ttl = null) {
    for (const [key, value] of Object.entries(entries)) {
      this.set(key, value, ttl);
    }
  }

  /**
   * Get multiple entries at once
   * @param {Array<string>} keys - Cache keys
   * @returns {Object} Key-value pairs
   */
  getMany(keys) {
    const result = {};

    for (const key of keys) {
      const value = this.get(key);
      if (value !== null) {
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * Delete multiple entries at once
   * @param {Array<string>} keys - Cache keys
   */
  deleteMany(keys) {
    for (const key of keys) {
      this.delete(key);
    }
  }

  /**
   * Evict least recently used entry
   * @private
   */
  evictLRU() {
    let oldestKey = null;
    let oldestTime = Infinity;

    // Find least recently used
    for (const [key, time] of this.accessTimes.entries()) {
      if (time < oldestTime) {
        oldestTime = time;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.delete(oldestKey);
      this.stats.evictions++;
    }
  }

  /**
   * Cleanup expired entries
   * @private
   */
  cleanup() {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expires) {
        this.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger?.debug(`Cache cleanup: removed ${cleaned} expired entries`);
    }
  }

  /**
   * Estimate size of value in bytes
   * @private
   * @param {*} value - Value to estimate
   * @returns {number} Size in bytes
   */
  estimateSize(value) {
    if (value === null || value === undefined) return 0;

    const type = typeof value;

    if (type === 'boolean') return 4;
    if (type === 'number') return 8;
    if (type === 'string') return value.length * 2;

    // For objects/arrays, use JSON stringification
    try {
      return JSON.stringify(value).length * 2;
    } catch {
      return 100; // Default estimate
    }
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache stats
   */
  getStats() {
    const hitRate = this.stats.hits + this.stats.misses > 0
      ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(2)
      : 0;

    return {
      ...this.stats,
      hitRate: `${hitRate}%`,
      entries: this.cache.size,
      sizeKB: (this.currentSize / 1024).toFixed(2),
      sizeMB: (this.currentSize / 1024 / 1024).toFixed(2),
      maxSizeMB: this.maxSize
    };
  }

  /**
   * Get top cached items by hits
   * @param {number} [limit=10] - Number of items to return
   * @returns {Array} Top items
   */
  getTopItems(limit = 10) {
    const items = Array.from(this.cache.entries())
      .map(([key, entry]) => ({
        key,
        hits: entry.hits,
        size: entry.size,
        expires: new Date(entry.expires)
      }))
      .sort((a, b) => b.hits - a.hits)
      .slice(0, limit);

    return items;
  }

  /**
   * Shutdown cache service
   */
  async shutdown() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.logger?.info('Cache service shutting down', this.getStats());
    this.clear();
    this.isShutdown = true;
  }

  /**
   * Health check
   * @returns {boolean} True if service is healthy
   */
  async healthCheck() {
    return this.isInitialized
      && !this.isShutdown
      && this.currentSize < this.maxSize * 1024 * 1024;
  }
}

export default CacheService;
