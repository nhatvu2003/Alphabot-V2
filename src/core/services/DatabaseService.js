/**
 * @fileoverview Database Service
 * @description Abstraction layer for data persistence with JSON/MongoDB support
 * @author NhatCoder
 * @version 2.0.0
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve as resolvePath } from 'path';
import IService from '../interfaces/IService.js';
import { DatabaseException } from '../exceptions/CoreException.js';

/**
 * Database Service
 * Provides unified interface for data persistence
 * Supports both JSON files and MongoDB
 *
 * @class DatabaseService
 * @extends IService
 */
class DatabaseService extends IService {
  constructor(container, dependencies = {}) {
    super(container, dependencies);

    this.config = dependencies.config;
    this.logger = dependencies.logger;

    /** @type {string} Database type */
    this.type = 'json'; // 'json' or 'mongodb'

    /** @type {string} Data directory */
    this.dataPath = resolvePath(process.cwd(), 'data', 'logs', 'database');

    /** @type {Map<string, any>} In-memory cache */
    this.cache = new Map();

    /** @type {Object} Database statistics */
    this.stats = {
      reads: 0,
      writes: 0,
      cacheHits: 0,
      cacheMisses: 0
    };

    /** @type {Object} MongoDB connection (if using MongoDB) */
    this.mongoClient = null;
    this.mongoDb = null;
  }

  /**
   * Initialize database service
   */
  async initialize() {
    try {
      this.logger?.info('Initializing database service...');

      // Get database type from config
      this.type = this.config?.get('DATABASE.TYPE', 'json');

      if (this.type === 'json') {
        await this.initializeJSON();
      } else if (this.type === 'mongodb') {
        await this.initializeMongoDB();
      }

      this.logger?.info(`Database service initialized (${this.type})`);
      this.isInitialized = true;
    } catch (error) {
      throw new DatabaseException(
        `Failed to initialize database: ${error.message}`,
        'init'
      );
    }
  }

  /**
   * Initialize JSON database
   * @private
   */
  async initializeJSON() {
    // Create data directory if not exists
    if (!existsSync(this.dataPath)) {
      mkdirSync(this.dataPath, { recursive: true });
    }

    // Initialize default collections
    const collections = ['users', 'threads'];

    for (const collection of collections) {
      const filePath = resolvePath(this.dataPath, `${collection}.json`);

      if (!existsSync(filePath)) {
        writeFileSync(filePath, '{}', 'utf8');
      }
    }
  }

  /**
   * Initialize MongoDB connection
   * @private
   */
  async initializeMongoDB() {
    const mongoUrl = this.config?.get('DATABASE.MONGO_URL');

    if (!mongoUrl) {
      throw new DatabaseException('MongoDB URL not configured', 'init');
    }

    try {
      const { MongoClient } = await import('mongodb');

      this.mongoClient = new MongoClient(mongoUrl);
      await this.mongoClient.connect();

      this.mongoDb = this.mongoClient.db();

      this.logger?.info('Connected to MongoDB');
    } catch (error) {
      throw new DatabaseException(
        `Failed to connect to MongoDB: ${error.message}`,
        'init'
      );
    }
  }

  /**
   * Find one document
   * @param {string} collection - Collection name
   * @param {Object} query - Query object
   * @returns {Promise<Object|null>} Found document or null
   */
  async findOne(collection, query = {}) {
    this.stats.reads++;

    try {
      if (this.type === 'json') {
        const data = await this.loadCollection(collection);

        // Simple query matching
        for (const [key, doc] of Object.entries(data)) {
          if (this.matchQuery(doc, query)) {
            return doc;
          }
        }

        return null;
      } else {
        return await this.mongoDb.collection(collection).findOne(query);
      }
    } catch (error) {
      throw new DatabaseException(
        `Failed to find document: ${error.message}`,
        'findOne',
        { collection, query }
      );
    }
  }

  /**
   * Find many documents
   * @param {string} collection - Collection name
   * @param {Object} query - Query object
   * @returns {Promise<Array>} Array of documents
   */
  async find(collection, query = {}) {
    this.stats.reads++;

    try {
      if (this.type === 'json') {
        const data = await this.loadCollection(collection);
        const results = [];

        for (const [key, doc] of Object.entries(data)) {
          if (this.matchQuery(doc, query)) {
            results.push(doc);
          }
        }

        return results;
      } else {
        return await this.mongoDb.collection(collection).find(query).toArray();
      }
    } catch (error) {
      throw new DatabaseException(
        `Failed to find documents: ${error.message}`,
        'find',
        { collection, query }
      );
    }
  }

  /**
   * Insert document
   * @param {string} collection - Collection name
   * @param {Object} document - Document to insert
   * @returns {Promise<Object>} Inserted document with ID
   */
  async insert(collection, document) {
    this.stats.writes++;

    try {
      if (this.type === 'json') {
        const data = await this.loadCollection(collection);

        // Generate ID if not exists
        if (!document.id) {
          document.id = this.generateID();
        }

        data[document.id] = document;

        await this.saveCollection(collection, data);

        return document;
      } else {
        const result = await this.mongoDb.collection(collection).insertOne(document);
        return { ...document, _id: result.insertedId };
      }
    } catch (error) {
      throw new DatabaseException(
        `Failed to insert document: ${error.message}`,
        'insert',
        { collection }
      );
    }
  }

  /**
   * Update document
   * @param {string} collection - Collection name
   * @param {Object} query - Query to find document
   * @param {Object} update - Update data
   * @returns {Promise<Object>} Updated document
   */
  async update(collection, query, update) {
    this.stats.writes++;

    try {
      if (this.type === 'json') {
        const data = await this.loadCollection(collection);

        for (const [key, doc] of Object.entries(data)) {
          if (this.matchQuery(doc, query)) {
            data[key] = { ...doc, ...update };
            await this.saveCollection(collection, data);
            return data[key];
          }
        }

        return null;
      } else {
        const result = await this.mongoDb.collection(collection)
          .findOneAndUpdate(query, { $set: update }, { returnDocument: 'after' });
        return result.value;
      }
    } catch (error) {
      throw new DatabaseException(
        `Failed to update document: ${error.message}`,
        'update',
        { collection, query }
      );
    }
  }

  /**
   * Delete document
   * @param {string} collection - Collection name
   * @param {Object} query - Query to find document
   * @returns {Promise<boolean>} True if deleted
   */
  async delete(collection, query) {
    this.stats.writes++;

    try {
      if (this.type === 'json') {
        const data = await this.loadCollection(collection);
        let deleted = false;

        for (const [key, doc] of Object.entries(data)) {
          if (this.matchQuery(doc, query)) {
            delete data[key];
            deleted = true;
            break;
          }
        }

        if (deleted) {
          await this.saveCollection(collection, data);
        }

        return deleted;
      } else {
        const result = await this.mongoDb.collection(collection).deleteOne(query);
        return result.deletedCount > 0;
      }
    } catch (error) {
      throw new DatabaseException(
        `Failed to delete document: ${error.message}`,
        'delete',
        { collection, query }
      );
    }
  }

  /**
   * Load JSON collection from file
   * @private
   */
  async loadCollection(collection) {
    const cacheKey = `collection:${collection}`;

    // Check cache
    if (this.cache.has(cacheKey)) {
      this.stats.cacheHits++;
      return this.cache.get(cacheKey);
    }

    this.stats.cacheMisses++;

    const filePath = resolvePath(this.dataPath, `${collection}.json`);

    if (!existsSync(filePath)) {
      const emptyData = {};
      this.cache.set(cacheKey, emptyData);
      return emptyData;
    }

    try {
      const content = readFileSync(filePath, 'utf8');
      const data = JSON.parse(content);

      // Cache the data
      this.cache.set(cacheKey, data);

      return data;
    } catch (error) {
      throw new DatabaseException(
        `Failed to load collection ${collection}: ${error.message}`,
        'load'
      );
    }
  }

  /**
   * Save JSON collection to file
   * @private
   */
  async saveCollection(collection, data) {
    const filePath = resolvePath(this.dataPath, `${collection}.json`);
    const cacheKey = `collection:${collection}`;

    try {
      const content = JSON.stringify(data, null, 2);
      writeFileSync(filePath, content, 'utf8');

      // Update cache
      this.cache.set(cacheKey, data);
    } catch (error) {
      throw new DatabaseException(
        `Failed to save collection ${collection}: ${error.message}`,
        'save'
      );
    }
  }

  /**
   * Match document against query
   * @private
   */
  matchQuery(document, query) {
    for (const [key, value] of Object.entries(query)) {
      if (document[key] !== value) {
        return false;
      }
    }
    return true;
  }

  /**
   * Generate unique ID
   * @private
   */
  generateID() {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
    this.logger?.debug('Database cache cleared');
  }

  /**
   * Get service statistics
   * @returns {Object} Database statistics
   */
  getStats() {
    const cacheTotal = this.stats.cacheHits + this.stats.cacheMisses;
    const hitRate = cacheTotal > 0
      ? (this.stats.cacheHits / cacheTotal * 100).toFixed(2)
      : 0;

    return {
      ...this.stats,
      type: this.type,
      cacheSize: this.cache.size,
      cacheHitRate: `${hitRate}%`
    };
  }

  /**
   * Shutdown database service
   */
  async shutdown() {
    this.logger?.info('Database service shutting down', this.getStats());

    // Close MongoDB connection if exists
    if (this.mongoClient) {
      await this.mongoClient.close();
    }

    this.cache.clear();
    this.isShutdown = true;
  }

  /**
   * Health check
   * @returns {boolean} True if service is healthy
   */
  async healthCheck() {
    if (!this.isInitialized || this.isShutdown) {
      return false;
    }

    // Check MongoDB connection if applicable
    if (this.type === 'mongodb' && this.mongoClient) {
      try {
        await this.mongoDb.admin().ping();
        return true;
      } catch {
        return false;
      }
    }

    return true;
  }
}

export default DatabaseService;
