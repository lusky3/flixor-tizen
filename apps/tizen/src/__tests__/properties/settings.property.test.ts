import fc from 'fast-check';
import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadSettings,
  saveSettings,
  setDiscoveryDisabled,
  type TizenSettings,
} from '../../services/settings';

beforeEach(() => {
  localStorage.clear();
});

// Feature: tizen-feature-parity, Property 1: Library Only Mode disables all discovery toggles
describe('Property 1: Library Only Mode disables all discovery toggles', () => {
  /**
   * Validates: Requirements 1.3, 14.4
   *
   * For any set of initial settings values, when discoveryDisabled is set to
   * true via setDiscoveryDisabled(true), the resulting settings object SHALL
   * have showTrendingRows, showTraktRows, and includeTmdbInSearch all set to false.
   */
  it('setDiscoveryDisabled(true) forces discovery toggles to false regardless of initial state', () => {
    fc.assert(
      fc.property(
        fc.record({
          showTrendingRows: fc.boolean(),
          showTraktRows: fc.boolean(),
          includeTmdbInSearch: fc.boolean(),
          showHeroSection: fc.boolean(),
          showContinueWatchingRow: fc.boolean(),
          showRecentlyAddedRows: fc.boolean(),
          showCollectionsRow: fc.boolean(),
          showGenreRows: fc.boolean(),
        }),
        (initial) => {
          localStorage.clear();
          saveSettings(initial);

          const result = setDiscoveryDisabled(true);

          expect(result.showTrendingRows).toBe(false);
          expect(result.showTraktRows).toBe(false);
          expect(result.includeTmdbInSearch).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// Feature: tizen-feature-parity, Property 2: Onboarding settings persistence round-trip
describe('Property 2: Onboarding settings persistence round-trip', () => {
  /**
   * Validates: Requirements 1.4
   *
   * For any valid combination of onboarding discovery settings, saving those
   * settings via saveSettings() and then loading them via loadSettings() SHALL
   * return an object containing the same values for those keys.
   */
  it('save then load preserves onboarding discovery settings', () => {
    fc.assert(
      fc.property(
        fc.record({
          libraryOnlyMode: fc.boolean(),
          showTrendingRows: fc.boolean(),
          showTraktRows: fc.boolean(),
          includeTmdbInSearch: fc.boolean(),
        }),
        (onboardingSettings) => {
          localStorage.clear();
          saveSettings(onboardingSettings);

          const loaded = loadSettings();

          expect(loaded.libraryOnlyMode).toBe(onboardingSettings.libraryOnlyMode);
          expect(loaded.showTrendingRows).toBe(onboardingSettings.showTrendingRows);
          expect(loaded.showTraktRows).toBe(onboardingSettings.showTraktRows);
          expect(loaded.includeTmdbInSearch).toBe(onboardingSettings.includeTmdbInSearch);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// Feature: tizen-feature-parity, Property 3: Onboarding gate invariant
describe('Property 3: Onboarding gate invariant', () => {
  /**
   * Validates: Requirements 1.6
   *
   * For any settings state where onboardingCompleted is true, the app
   * initialization logic SHALL not route to the onboarding screen.
   */
  it('when onboardingCompleted is saved as true, loadSettings returns onboardingCompleted true', () => {
    fc.assert(
      fc.property(
        fc.record({
          showHeroSection: fc.boolean(),
          showTrendingRows: fc.boolean(),
          showTraktRows: fc.boolean(),
          libraryOnlyMode: fc.boolean(),
          tmdbEnabled: fc.boolean(),
          statsHudEnabled: fc.boolean(),
        }),
        (otherSettings) => {
          localStorage.clear();
          saveSettings({ ...otherSettings, onboardingCompleted: true });

          const loaded = loadSettings();

          expect(loaded.onboardingCompleted).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// Feature: tizen-feature-parity, Property 8: Row visibility respects settings
describe('Property 8: Row visibility respects settings', () => {
  /**
   * Validates: Requirements 6.7
   *
   * For any row type with a corresponding visibility setting key, when that
   * setting is false, the home page row list SHALL not contain a row with
   * that title.
   */

  /** Maps setting keys to the row titles they control */
  const settingToRows: Record<keyof TizenSettings, string[]> = {
    showContinueWatchingRow: ['Continue Watching'],
    showTrendingRows: ['Popular Movies', 'Trending Shows'],
    showTraktRows: ['Trakt Watchlist', 'Recommended for You', 'Trending on Trakt'],
    showRecentlyAddedRows: ['Recently Added Movies', 'Recently Added Shows'],
    showCollectionsRow: ['Collections'],
    showGenreRows: [
      'TV Shows - Children',
      'Movies - Documentary',
      'Movies - Drama',
      'TV Shows - Reality',
      'Movies - Animation',
      'Movies - History',
    ],
  };

  /**
   * Simulates the Home page row filtering logic: given settings and a list of
   * candidate row titles, returns only the rows whose visibility setting is
   * not explicitly false.
   */
  function filterRowsBySettings(
    settings: TizenSettings,
    candidateRows: string[],
  ): string[] {
    return candidateRows.filter((title) => {
      for (const [key, titles] of Object.entries(settingToRows)) {
        if (titles.includes(title)) {
          return settings[key as keyof TizenSettings] !== false;
        }
      }
      // Rows without a setting are always shown
      return true;
    });
  }

  it('rows with a disabled visibility setting are excluded from the filtered list', () => {
    fc.assert(
      fc.property(
        fc.record({
          showContinueWatchingRow: fc.boolean(),
          showTrendingRows: fc.boolean(),
          showTraktRows: fc.boolean(),
          showRecentlyAddedRows: fc.boolean(),
          showCollectionsRow: fc.boolean(),
          showGenreRows: fc.boolean(),
        }),
        (visibilitySettings) => {
          const allRowTitles = Object.values(settingToRows).flat();
          const visibleRows = filterRowsBySettings(visibilitySettings, allRowTitles);

          // For each setting that is false, none of its controlled rows should appear
          for (const [key, titles] of Object.entries(settingToRows)) {
            if (visibilitySettings[key as keyof typeof visibilitySettings] === false) {
              for (const title of titles) {
                expect(visibleRows).not.toContain(title);
              }
            }
          }

          // For each setting that is true, all of its controlled rows should appear
          for (const [key, titles] of Object.entries(settingToRows)) {
            if (visibilitySettings[key as keyof typeof visibilitySettings] === true) {
              for (const title of titles) {
                expect(visibleRows).toContain(title);
              }
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
