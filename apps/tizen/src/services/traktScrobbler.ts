import type { PlexMediaItem } from '@flixor/core';
import {
  scrobbleStart,
  scrobbleStop,
  scrobbleProgress,
  isAuthenticated,
} from './trakt';
import type { ScrobbleItem } from './trakt';
import { loadSettings } from './settings';

/**
 * Trakt media identifiers used for scrobble API calls.
 */
export interface TraktMediaIdentifiers {
  type: 'movie' | 'episode';
  imdb?: string;
  tmdb?: number;
  tvdb?: number;
  show?: { imdb?: string; tmdb?: number };
  episode?: { season: number; number: number };
}

/**
 * Stateful Trakt scrobbler managing the full start/pause/resume/stop lifecycle.
 *
 * State machine:
 *   Idle → Active: start()
 *   Active → Paused: pause()
 *   Paused → Active: resume()
 *   Active → Idle: stop()
 *   Paused → Idle: stop()
 *   Active → Active: start() [stops existing first]
 */
export class TraktScrobbler {
  private active = false;
  private paused = false;
  private currentMedia: TraktMediaIdentifiers | null = null;
  private lastProgress = 0;
  private startTimestamp: number | null = null;

  /**
   * Start scrobbling a media item. If already active, stops the current
   * scrobble first before starting the new one.
   */
  async start(
    media: TraktMediaIdentifiers,
    progress: number,
  ): Promise<boolean> {
    if (!this.canScrobble()) return false;

    // If already active, stop existing scrobble first
    if (this.active) {
      await this.stopInternal(this.lastProgress);
    }

    const item = toScrobbleItem(media);
    try {
      const ok = await scrobbleStart(item, progress);
      if (ok) {
        this.active = true;
        this.paused = false;
        this.currentMedia = media;
        this.lastProgress = progress;
        this.startTimestamp = Date.now();
      }
      return ok;
    } catch (err) {
      console.error('[TraktScrobbler] start failed:', err);
      return false;
    }
  }

  /**
   * Pause the current scrobble. Only valid when active and not already paused.
   */
  async pause(progress: number): Promise<boolean> {
    if (!this.canScrobble()) return false;
    if (!this.active || !this.currentMedia) return false;

    const item = toScrobbleItem(this.currentMedia);
    try {
      const ok = await scrobbleProgress(item, progress);
      if (ok) {
        this.paused = true;
        this.lastProgress = progress;
      }
      return ok;
    } catch (err) {
      console.error('[TraktScrobbler] pause failed:', err);
      return false;
    }
  }

  /**
   * Resume a paused scrobble. Only valid when paused.
   */
  async resume(progress: number): Promise<boolean> {
    if (!this.canScrobble()) return false;
    if (!this.active || !this.currentMedia) return false;

    const item = toScrobbleItem(this.currentMedia);
    try {
      const ok = await scrobbleStart(item, progress);
      if (ok) {
        this.paused = false;
        this.lastProgress = progress;
      }
      return ok;
    } catch (err) {
      console.error('[TraktScrobbler] resume failed:', err);
      return false;
    }
  }

  /**
   * Stop the current scrobble and reset state to idle.
   * Double stop is a no-op (already idle).
   */
  async stop(progress: number): Promise<boolean> {
    if (!this.canScrobble()) return false;
    if (!this.active) return false; // already idle — no-op

    return this.stopInternal(progress);
  }

  // ── Query methods ──────────────────────────────────────────

  isCurrentlyScrobbling(): boolean {
    return this.active;
  }

  isPaused(): boolean {
    return this.paused;
  }

  getCurrentProgress(): number {
    return this.lastProgress;
  }

  getCurrentMedia(): TraktMediaIdentifiers | null {
    return this.currentMedia;
  }

  getStartTimestamp(): number | null {
    return this.startTimestamp;
  }

  // ── Static helpers ─────────────────────────────────────────

  /**
   * Convert a Plex media item to Trakt media identifiers by extracting
   * IMDB, TMDB, and TVDB IDs from the Guid array.
   *
   * Returns null if no recognised GUIDs are found.
   */
  static convertPlexToTraktMedia(
    item: PlexMediaItem,
  ): TraktMediaIdentifiers | null {
    const guids = item.Guid;
    if (!guids || guids.length === 0) return null;

    let imdb: string | undefined;
    let tmdb: number | undefined;
    let tvdb: number | undefined;

    for (const g of guids) {
      const id = g.id;
      if (id.startsWith('imdb://')) {
        imdb = id.slice('imdb://'.length);
      } else if (id.startsWith('tmdb://')) {
        const parsed = parseInt(id.slice('tmdb://'.length), 10);
        if (!isNaN(parsed)) tmdb = parsed;
      } else if (id.startsWith('tvdb://')) {
        const parsed = parseInt(id.slice('tvdb://'.length), 10);
        if (!isNaN(parsed)) tvdb = parsed;
      }
    }

    // Must have at least one recognised ID
    if (!imdb && tmdb === undefined && tvdb === undefined) return null;

    if (item.type === 'episode') {
      return {
        type: 'episode',
        imdb,
        tmdb,
        tvdb,
        show: { imdb, tmdb },
        episode: {
          season: item.parentIndex ?? 0,
          number: item.index ?? 0,
        },
      };
    }

    // Default to movie for 'movie' type (and any other type falls through)
    return {
      type: 'movie',
      imdb,
      tmdb,
      tvdb,
    };
  }

  // ── Private helpers ────────────────────────────────────────

  /**
   * Check auth + settings guards. Returns false if scrobbling should be skipped.
   */
  private canScrobble(): boolean {
    if (!isAuthenticated()) return false;
    const settings = loadSettings();
    // Default to true when the field is undefined (authenticated = scrobbling on)
    if (settings.traktScrobblingEnabled === false) return false;
    return true;
  }

  /**
   * Internal stop that sends the API call and resets state.
   */
  private async stopInternal(progress: number): Promise<boolean> {
    if (!this.currentMedia) return false;

    const item = toScrobbleItem(this.currentMedia);
    try {
      const ok = await scrobbleStop(item, progress);
      this.reset();
      return ok;
    } catch (err) {
      console.error('[TraktScrobbler] stop failed:', err);
      this.reset();
      return false;
    }
  }

  /**
   * Reset all internal state to idle.
   */
  private reset(): void {
    this.active = false;
    this.paused = false;
    this.currentMedia = null;
    this.lastProgress = 0;
    this.startTimestamp = null;
  }
}

// ── Module-level helpers ───────────────────────────────────────

/**
 * Convert TraktMediaIdentifiers to the ScrobbleItem shape expected
 * by the existing trakt.ts service functions.
 */
function toScrobbleItem(media: TraktMediaIdentifiers): ScrobbleItem {
  const ids: { tmdb?: number; imdb?: string } = {};
  if (media.imdb) ids.imdb = media.imdb;
  if (media.tmdb !== undefined) ids.tmdb = media.tmdb;

  if (media.type === 'episode') {
    return {
      type: 'episode',
      ids,
      show: media.show
        ? { ids: { imdb: media.show.imdb, tmdb: media.show.tmdb } }
        : undefined,
      episode: media.episode,
    };
  }

  return { type: 'movie', ids };
}
