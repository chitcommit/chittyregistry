// Redis Service for ChittyRegistry

import { createClient, RedisClientType } from 'redis';
import { logger } from '../utils/logger';

export class RedisService {
  private client: RedisClientType;
  private connected = false;

  constructor(private redisUrl: string) {
    this.client = createClient({
      url: redisUrl,
      socket: {
        connectTimeout: 5000
      }
    });

    this.client.on('error', (err) => {
      logger.error('Redis client error', { error: err.message });
    });

    this.client.on('connect', () => {
      logger.info('Redis client connected');
      this.connected = true;
    });

    this.client.on('disconnect', () => {
      logger.warn('Redis client disconnected');
      this.connected = false;
    });
  }

  async connect(): Promise<void> {
    try {
      await this.client.connect();
    } catch (error) {
      logger.error('Failed to connect to Redis', { error: error.message });
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.client.disconnect();
    } catch (error) {
      logger.error('Failed to disconnect from Redis', { error: error.message });
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  // String operations
  async set(key: string, value: string, ttl?: number): Promise<void> {
    try {
      if (ttl) {
        await this.client.setEx(key, ttl, value);
      } else {
        await this.client.set(key, value);
      }
    } catch (error) {
      logger.error('Redis SET failed', { error: error.message, key });
      throw error;
    }
  }

  async get(key: string): Promise<string | null> {
    try {
      return await this.client.get(key);
    } catch (error) {
      logger.error('Redis GET failed', { error: error.message, key });
      throw error;
    }
  }

  async del(key: string): Promise<number> {
    try {
      return await this.client.del(key);
    } catch (error) {
      logger.error('Redis DEL failed', { error: error.message, key });
      throw error;
    }
  }

  async exists(key: string): Promise<number> {
    try {
      return await this.client.exists(key);
    } catch (error) {
      logger.error('Redis EXISTS failed', { error: error.message, key });
      throw error;
    }
  }

  // JSON operations
  async setJSON(key: string, value: any, ttl?: number): Promise<void> {
    const jsonValue = JSON.stringify(value);
    await this.set(key, jsonValue, ttl);
  }

  async getJSON<T = any>(key: string): Promise<T | null> {
    const value = await this.get(key);
    if (!value) return null;

    try {
      return JSON.parse(value);
    } catch (error) {
      logger.error('Failed to parse JSON from Redis', { error: error.message, key });
      return null;
    }
  }

  // Set operations
  async sadd(key: string, ...members: string[]): Promise<number> {
    try {
      return await this.client.sAdd(key, members);
    } catch (error) {
      logger.error('Redis SADD failed', { error: error.message, key });
      throw error;
    }
  }

  async srem(key: string, ...members: string[]): Promise<number> {
    try {
      return await this.client.sRem(key, members);
    } catch (error) {
      logger.error('Redis SREM failed', { error: error.message, key });
      throw error;
    }
  }

  async smembers(key: string): Promise<string[]> {
    try {
      return await this.client.sMembers(key);
    } catch (error) {
      logger.error('Redis SMEMBERS failed', { error: error.message, key });
      throw error;
    }
  }

  async sismember(key: string, member: string): Promise<boolean> {
    try {
      return await this.client.sIsMember(key, member);
    } catch (error) {
      logger.error('Redis SISMEMBER failed', { error: error.message, key });
      throw error;
    }
  }

  // Hash operations
  async hset(key: string, field: string, value: string): Promise<number> {
    try {
      return await this.client.hSet(key, field, value);
    } catch (error) {
      logger.error('Redis HSET failed', { error: error.message, key, field });
      throw error;
    }
  }

  async hget(key: string, field: string): Promise<string | undefined> {
    try {
      return await this.client.hGet(key, field);
    } catch (error) {
      logger.error('Redis HGET failed', { error: error.message, key, field });
      throw error;
    }
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    try {
      return await this.client.hGetAll(key);
    } catch (error) {
      logger.error('Redis HGETALL failed', { error: error.message, key });
      throw error;
    }
  }

  async hdel(key: string, ...fields: string[]): Promise<number> {
    try {
      return await this.client.hDel(key, fields);
    } catch (error) {
      logger.error('Redis HDEL failed', { error: error.message, key });
      throw error;
    }
  }

  // TTL operations
  async expire(key: string, seconds: number): Promise<boolean> {
    try {
      return await this.client.expire(key, seconds);
    } catch (error) {
      logger.error('Redis EXPIRE failed', { error: error.message, key });
      throw error;
    }
  }

  async ttl(key: string): Promise<number> {
    try {
      return await this.client.ttl(key);
    } catch (error) {
      logger.error('Redis TTL failed', { error: error.message, key });
      throw error;
    }
  }

  // Utility methods
  async ping(): Promise<string> {
    try {
      return await this.client.ping();
    } catch (error) {
      logger.error('Redis PING failed', { error: error.message });
      throw error;
    }
  }

  async flushdb(): Promise<string> {
    try {
      return await this.client.flushDb();
    } catch (error) {
      logger.error('Redis FLUSHDB failed', { error: error.message });
      throw error;
    }
  }

  async keys(pattern: string): Promise<string[]> {
    try {
      return await this.client.keys(pattern);
    } catch (error) {
      logger.error('Redis KEYS failed', { error: error.message, pattern });
      throw error;
    }
  }
}