import { SettingsCard } from "../SettingsCard";
import { SettingItem } from "../SettingItem";
import type { TizenSettings } from "../../services/settings";

export interface HomeScreenSettingsProps {
  settings: TizenSettings;
  onChange: <K extends keyof TizenSettings>(key: K, value: TizenSettings[K]) => void;
}

export function HomeScreenSettings({ settings, onChange }: HomeScreenSettingsProps) {
  return (
    <SettingsCard title="Row Visibility">
      <SettingItem
        label="Hero Section"
        description="Featured content carousel at the top"
        control={{ type: "toggle", checked: settings.showHeroSection !== false, onChange: (v) => onChange("showHeroSection", v) }}
      />
      <SettingItem
        label="Continue Watching"
        description="Resume in-progress media"
        control={{ type: "toggle", checked: settings.showContinueWatchingRow !== false, onChange: (v) => onChange("showContinueWatchingRow", v) }}
      />
      <SettingItem
        label="Trending Rows"
        description="Popular movies and shows from TMDB"
        control={{ type: "toggle", checked: settings.showTrendingRows !== false, onChange: (v) => onChange("showTrendingRows", v) }}
        disabled={settings.discoveryDisabled}
      />
      <SettingItem
        label="Trakt Rows"
        description="Watchlist, recommended, and trending from Trakt"
        control={{ type: "toggle", checked: settings.showTraktRows !== false, onChange: (v) => onChange("showTraktRows", v) }}
        disabled={settings.discoveryDisabled}
      />
      <SettingItem
        label="Recently Added"
        description="New content added to your Plex server"
        control={{ type: "toggle", checked: settings.showRecentlyAddedRows !== false, onChange: (v) => onChange("showRecentlyAddedRows", v) }}
      />
      <SettingItem
        label="Collections"
        description="Plex collections row"
        control={{ type: "toggle", checked: settings.showCollectionsRow !== false, onChange: (v) => onChange("showCollectionsRow", v) }}
      />
      <SettingItem
        label="Genre Rows"
        description="Content organized by genre"
        control={{ type: "toggle", checked: settings.showGenreRows !== false, onChange: (v) => onChange("showGenreRows", v) }}
      />
    </SettingsCard>
  );
}
