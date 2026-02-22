interface CacheEntry<T> {
  value: T;
  expiry: number;
}

const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes

export class CacheService {
  private store = new Map<string, CacheEntry<unknown>>();

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiry) {
      this.store.delete(key);
      return null;
    }
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlMs: number = DEFAULT_TTL_MS): void {
    this.store.set(key, {
      value,
      expiry: Date.now() + ttlMs,
    });
  }

  has(key: string): boolean {
    const entry = this.store.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiry) {
      this.store.delete(key);
      return false;
    }
    return true;
  }

  invalidate(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  get size(): number {
    return this.store.size;
  }
}

export const cacheService = new CacheService();
