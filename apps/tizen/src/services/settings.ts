export interface TizenSettings {
  // Discovery mode
  discoveryDisabled?: boolean;

  // Home screen
  showTrendingRows?: boolean;
  showTraktRows?: boolean;
  showContinueWatchingRow?: boolean;

  // Search
  includeTmdbInSearch?: boolean;

  // MDBList
  mdblistEnabled?: boolean;
  mdblistApiKey?: string;

  // Overseerr
  overseerrEnabled?: boolean;
  overseerrUrl?: string;
  overseerrApiKey?: string;

  // Player
  preferredQuality?: string;
  preferredResolution?: string;

  // Playback preferences
  episodeLayout?: "list" | "grid";
  autoPlayNext?: boolean;
  streamsBackdrop?: boolean;
}

const KEY = "flixor.tizen.settings";

export function loadSettings(): TizenSettings {
  try {
    const s = localStorage.getItem(KEY);
    return s ? JSON.parse(s) : {};
  } catch {
    return {};
  }
}

export function saveSettings(patch: Partial<TizenSettings>): TizenSettings {
  const curr = loadSettings();
  const next = { ...curr, ...patch };
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function setDiscoveryDisabled(disabled: boolean): TizenSettings {
  if (disabled) {
    return saveSettings({
      discoveryDisabled: true,
      showTrendingRows: false,
      showTraktRows: false,
      includeTmdbInSearch: false,
    });
  }
  return saveSettings({ discoveryDisabled: false });
}
