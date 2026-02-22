import { describe, it, expect, beforeEach } from 'vitest';
import { TizenStorage, TizenSecureStorage, TizenCache } from './storage';

describe('TizenStorage', () => {
  let storage: TizenStorage;

  beforeEach(() => {
    localStorage.clear();
    storage = new TizenStorage();
  });

  it('stores and retrieves a value', async () => {
    await storage.set('key', 'value');
    expect(await storage.get('key')).toBe('value');
  });

  it('returns null for missing key', async () => {
    expect(await storage.get('missing')).toBeNull();
  });

  it('removes a key', async () => {
    await storage.set('key', 'value');
    await storage.remove('key');
    expect(await storage.get('key')).toBeNull();
  });

  it('clears all keys', async () => {
    await storage.set('a', '1');
    await storage.set('b', '2');
    await storage.clear();
    expect(await storage.get('a')).toBeNull();
    expect(await storage.get('b')).toBeNull();
  });
});

describe('TizenSecureStorage', () => {
  let storage: TizenSecureStorage;

  beforeEach(() => {
    localStorage.clear();
    storage = new TizenSecureStorage();
  });

  it('stores and retrieves typed values', async () => {
    await storage.set('token', { access: 'abc', refresh: 'def' });
    const val = await storage.get<{ access: string; refresh: string }>('token');
    expect(val).toEqual({ access: 'abc', refresh: 'def' });
  });

  it('returns null for missing key', async () => {
    expect(await storage.get('missing')).toBeNull();
  });

  it('uses secure_ prefix in localStorage', async () => {
    await storage.set('key', 'value');
    expect(localStorage.getItem('secure_key')).toBe('"value"');
  });

  it('removes a key', async () => {
    await storage.set('key', 'value');
    await storage.remove('key');
    expect(await storage.get('key')).toBeNull();
  });
});

describe('TizenCache', () => {
  let cache: TizenCache;

  beforeEach(() => {
    cache = new TizenCache();
  });

  it('stores and retrieves a cached value', async () => {
    await cache.set('key', { data: 42 }, 60);
    expect(await cache.get('key')).toEqual({ data: 42 });
  });

  it('returns null for missing key', async () => {
    expect(await cache.get('missing')).toBeNull();
  });

  it('returns null for expired entry', async () => {
    await cache.set('key', 'value', 0); // 0 second TTL — already expired
    // Advance time slightly to ensure expiry
    await new Promise(r => setTimeout(r, 5));
    expect(await cache.get('key')).toBeNull();
  });

  it('removes a key', async () => {
    await cache.set('key', 'value', 60);
    await cache.remove('key');
    expect(await cache.get('key')).toBeNull();
  });

  it('clears all entries', async () => {
    await cache.set('a', 1, 60);
    await cache.set('b', 2, 60);
    await cache.clear();
    expect(await cache.get('a')).toBeNull();
    expect(await cache.get('b')).toBeNull();
  });

  it('invalidates entries matching a pattern', async () => {
    await cache.set('user:1:profile', 'p1', 60);
    await cache.set('user:2:profile', 'p2', 60);
    await cache.set('settings', 's', 60);
    await cache.invalidatePattern('user:*:profile');
    expect(await cache.get('user:1:profile')).toBeNull();
    expect(await cache.get('user:2:profile')).toBeNull();
    expect(await cache.get('settings')).toEqual('s');
  });
});
