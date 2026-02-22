import { describe, it, expect, vi } from 'vitest';
import { compareSemver, checkForUpdate } from './version';

describe('compareSemver', () => {
  it('returns 0 for equal versions', () => {
    expect(compareSemver('1.2.3', '1.2.3')).toBe(0);
  });

  it('returns positive when a > b (major)', () => {
    expect(compareSemver('2.0.0', '1.0.0')).toBeGreaterThan(0);
  });

  it('returns negative when a < b (major)', () => {
    expect(compareSemver('1.0.0', '2.0.0')).toBeLessThan(0);
  });

  it('compares minor versions', () => {
    expect(compareSemver('1.2.0', '1.1.0')).toBeGreaterThan(0);
    expect(compareSemver('1.1.0', '1.2.0')).toBeLessThan(0);
  });

  it('compares patch versions', () => {
    expect(compareSemver('1.0.2', '1.0.1')).toBeGreaterThan(0);
    expect(compareSemver('1.0.1', '1.0.2')).toBeLessThan(0);
  });

  it('handles missing parts as 0', () => {
    expect(compareSemver('1.0', '1.0.0')).toBe(0);
    expect(compareSemver('1', '1.0.0')).toBe(0);
  });
});

describe('checkForUpdate', () => {
  it('detects available update', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ version: '2.0.0', url: 'https://example.com/release' }),
    }));

    const result = await checkForUpdate('1.0.0', 'https://example.com/version');
    expect(result.hasUpdate).toBe(true);
    expect(result.latestVersion).toBe('2.0.0');
    expect(result.releaseUrl).toBe('https://example.com/release');
    expect(result.currentVersion).toBe('1.0.0');

    vi.unstubAllGlobals();
  });

  it('reports no update when current is latest', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ version: '1.0.0' }),
    }));

    const result = await checkForUpdate('1.0.0', 'https://example.com/version');
    expect(result.hasUpdate).toBe(false);

    vi.unstubAllGlobals();
  });

  it('reports no update when current is newer', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ version: '0.9.0' }),
    }));

    const result = await checkForUpdate('1.0.0', 'https://example.com/version');
    expect(result.hasUpdate).toBe(false);

    vi.unstubAllGlobals();
  });

  it('returns graceful fallback on fetch error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));

    const result = await checkForUpdate('1.0.0', 'https://example.com/version');
    expect(result.hasUpdate).toBe(false);
    expect(result.latestVersion).toBe('1.0.0');

    vi.unstubAllGlobals();
  });
});
