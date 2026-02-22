import { describe, it, expect, beforeEach } from 'vitest';
import { loadSettings, saveSettings, setDiscoveryDisabled, DEFAULT_SETTINGS } from './settings';

const KEY = 'flixor.tizen.settings';

beforeEach(() => {
  localStorage.clear();
});

describe('loadSettings', () => {
  it('returns defaults when nothing stored', () => {
    const settings = loadSettings();
    expect(settings).toEqual(DEFAULT_SETTINGS);
  });

  it('merges stored values with defaults', () => {
    localStorage.setItem(KEY, JSON.stringify({ tmdbEnabled: false }));
    const settings = loadSettings();
    expect(settings.tmdbEnabled).toBe(false);
    expect(settings.showHeroSection).toBe(true); // default preserved
  });

  it('handles corrupted JSON gracefully', () => {
    localStorage.setItem(KEY, '{invalid json');
    const settings = loadSettings();
    expect(settings).toEqual(DEFAULT_SETTINGS);
  });
});

describe('saveSettings', () => {
  it('saves a partial patch and returns merged settings', () => {
    const result = saveSettings({ statsHudEnabled: true });
    expect(result.statsHudEnabled).toBe(true);
    expect(result.showHeroSection).toBe(true); // default preserved

    const stored = JSON.parse(localStorage.getItem(KEY)!);
    expect(stored.statsHudEnabled).toBe(true);
  });

  it('overwrites previous values', () => {
    saveSettings({ tmdbEnabled: false });
    const result = saveSettings({ tmdbEnabled: true });
    expect(result.tmdbEnabled).toBe(true);
  });
});

describe('setDiscoveryDisabled', () => {
  it('disables discovery-related settings when true', () => {
    const result = setDiscoveryDisabled(true);
    expect(result.discoveryDisabled).toBe(true);
    expect(result.libraryOnlyMode).toBe(true);
    expect(result.tmdbEnabled).toBe(false);
    expect(result.showTrendingRows).toBe(false);
    expect(result.showTraktRows).toBe(false);
    expect(result.includeTmdbInSearch).toBe(false);
  });

  it('re-enables discovery when false', () => {
    setDiscoveryDisabled(true);
    const result = setDiscoveryDisabled(false);
    expect(result.discoveryDisabled).toBe(false);
    expect(result.libraryOnlyMode).toBe(false);
  });
});
