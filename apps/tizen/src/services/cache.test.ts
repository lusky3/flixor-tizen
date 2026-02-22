import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CacheService } from './cache';

describe('CacheService', () => {
  let cache: CacheService;

  beforeEach(() => {
    vi.useFakeTimers();
    cache = new CacheService();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('get/set basic operations', () => {
    it('stores and retrieves a string value', () => {
      cache.set('key', 'hello');
      expect(cache.get<string>('key')).toBe('hello');
    });

    it('stores and retrieves an object value', () => {
      const obj = { name: 'test', count: 42 };
      cache.set('obj', obj);
      expect(cache.get<typeof obj>('obj')).toEqual(obj);
    });

    it('returns null for a missing key', () => {
      expect(cache.get('missing')).toBeNull();
    });

    it('overwrites an existing key', () => {
      cache.set('key', 'first');
      cache.set('key', 'second');
      expect(cache.get<string>('key')).toBe('second');
    });
  });

  describe('TTL expiration', () => {
    it('returns value before TTL expires', () => {
      cache.set('key', 'value', 10_000);
      vi.advanceTimersByTime(9_999);
      expect(cache.get<string>('key')).toBe('value');
    });

    it('returns null after TTL expires', () => {
      cache.set('key', 'value', 10_000);
      vi.advanceTimersByTime(10_001);
      expect(cache.get('key')).toBeNull();
    });

    it('cleans up expired entry from store on get', () => {
      cache.set('key', 'value', 5_000);
      vi.advanceTimersByTime(5_001);
      cache.get('key');
      expect(cache.size).toBe(0);
    });

    it('uses default TTL of 5 minutes when not specified', () => {
      cache.set('key', 'value');
      vi.advanceTimersByTime(5 * 60 * 1000 - 1);
      expect(cache.get<string>('key')).toBe('value');

      vi.advanceTimersByTime(2);
      expect(cache.get('key')).toBeNull();
    });

    it('supports custom TTL per entry', () => {
      cache.set('short', 'a', 1_000);
      cache.set('long', 'b', 60_000);

      vi.advanceTimersByTime(1_001);
      expect(cache.get('short')).toBeNull();
      expect(cache.get<string>('long')).toBe('b');
    });
  });

  describe('has()', () => {
    it('returns true for an existing non-expired entry', () => {
      cache.set('key', 'value');
      expect(cache.has('key')).toBe(true);
    });

    it('returns false for a missing key', () => {
      expect(cache.has('missing')).toBe(false);
    });

    it('returns false for an expired entry', () => {
      cache.set('key', 'value', 1_000);
      vi.advanceTimersByTime(1_001);
      expect(cache.has('key')).toBe(false);
    });

    it('cleans up expired entry from store on has', () => {
      cache.set('key', 'value', 1_000);
      vi.advanceTimersByTime(1_001);
      cache.has('key');
      expect(cache.size).toBe(0);
    });
  });

  describe('invalidate()', () => {
    it('removes an existing entry', () => {
      cache.set('key', 'value');
      cache.invalidate('key');
      expect(cache.get('key')).toBeNull();
    });

    it('does not throw when invalidating a missing key', () => {
      expect(() => cache.invalidate('missing')).not.toThrow();
    });

    it('only removes the targeted key', () => {
      cache.set('a', 1);
      cache.set('b', 2);
      cache.invalidate('a');
      expect(cache.get('a')).toBeNull();
      expect(cache.get<number>('b')).toBe(2);
    });
  });

  describe('clear()', () => {
    it('removes all entries', () => {
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);
      cache.clear();
      expect(cache.size).toBe(0);
      expect(cache.get('a')).toBeNull();
      expect(cache.get('b')).toBeNull();
      expect(cache.get('c')).toBeNull();
    });

    it('works on an already empty cache', () => {
      expect(() => cache.clear()).not.toThrow();
      expect(cache.size).toBe(0);
    });
  });

  describe('size', () => {
    it('returns 0 for an empty cache', () => {
      expect(cache.size).toBe(0);
    });

    it('reflects the number of stored entries', () => {
      cache.set('a', 1);
      cache.set('b', 2);
      expect(cache.size).toBe(2);
    });

    it('includes expired entries that have not been accessed', () => {
      cache.set('key', 'value', 1_000);
      vi.advanceTimersByTime(1_001);
      // size reflects raw Map size; expired entries are only pruned on access
      expect(cache.size).toBe(1);
    });
  });

  describe('concurrent access patterns', () => {
    it('handles rapid set/get on the same key', () => {
      for (let i = 0; i < 100; i++) {
        cache.set('counter', i);
      }
      expect(cache.get<number>('counter')).toBe(99);
    });

    it('handles many distinct keys', () => {
      for (let i = 0; i < 200; i++) {
        cache.set(`key-${i}`, i);
      }
      expect(cache.size).toBe(200);
      expect(cache.get<number>('key-0')).toBe(0);
      expect(cache.get<number>('key-199')).toBe(199);
    });

    it('handles interleaved set and invalidate', () => {
      cache.set('a', 1);
      cache.set('b', 2);
      cache.invalidate('a');
      cache.set('c', 3);
      cache.invalidate('b');
      expect(cache.get('a')).toBeNull();
      expect(cache.get('b')).toBeNull();
      expect(cache.get<number>('c')).toBe(3);
      expect(cache.size).toBe(1);
    });

    it('handles set after clear', () => {
      cache.set('a', 1);
      cache.clear();
      cache.set('b', 2);
      expect(cache.get('a')).toBeNull();
      expect(cache.get<number>('b')).toBe(2);
      expect(cache.size).toBe(1);
    });
  });
});
