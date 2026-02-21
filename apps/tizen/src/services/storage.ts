import type { IStorage, ISecureStorage, ICache } from '@flixor/core';

export class TizenStorage implements IStorage {
  async get(key: string): Promise<string | null> {
    return localStorage.getItem(key);
  }
  async set(key: string, value: string): Promise<void> {
    localStorage.setItem(key, value);
  }
  async remove(key: string): Promise<void> {
    localStorage.removeItem(key);
  }
  async clear(): Promise<void> {
    localStorage.clear();
  }
}

export class TizenSecureStorage implements ISecureStorage {
  async get<T>(key: string): Promise<T | null> {
    const val = localStorage.getItem(`secure_${key}`);
    return val ? JSON.parse(val) : null;
  }
  async set<T>(key: string, value: T): Promise<void> {
    localStorage.setItem(`secure_${key}`, JSON.stringify(value));
  }
  async remove(key: string): Promise<void> {
    localStorage.removeItem(`secure_${key}`);
  }
}

export class TizenCache implements ICache {
  private cache = new Map<string, { value: unknown; expiry: number }>();

  async get<T>(key: string): Promise<T | null> {
    const item = this.cache.get(key);
    if (!item) return null;
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    return item.value as T;
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    const expiry = Date.now() + ttlSeconds * 1000;
    this.cache.set(key, { value, expiry });
  }

  async remove(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  async invalidatePattern(pattern: string): Promise<void> {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }
}
