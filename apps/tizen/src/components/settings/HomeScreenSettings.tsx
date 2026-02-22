import { SettingsCard } from "../SettingsCard";
import { SettingItem } from "../SettingItem";
import type { TizenSettings } from "../../services/settings";

export interface HomeScreenSettingsProps {
  settings: TizenSettings;
  onChange: <K extends keyof TizenSettings>(key: K, value: TizenSettings[K]) => void;
}

const HERO_LAYOUT_OPTIONS: { label: string; value: TizenSettings["heroLayout"] }[] = [
  { label: "Carousel", value: "carousel" },
  { label: "Static Hero with Trailer", value: "static" },
  { label: "Hidden", value: "hidden" },
];

const HERO_LAYOUT_LABELS = HERO_LAYOUT_OPTIONS.map((o) => o.label);

function heroLayoutToLabel(value: TizenSettings["heroLayout"]): string {
  return HERO_LAYOUT_OPTIONS.find((o) => o.value === value)?.label ?? "Carousel";
}

function labelToHeroLayout(label: string): TizenSettings["heroLayout"] {
  return HERO_LAYOUT_OPTIONS.find((o) => o.label === label)?.value ?? "carousel";
}

export function HomeScreenSettings({ settings, onChange }: HomeScreenSettingsProps) {
  return (
    <SettingsCard title="Row Visibility">
      <SettingItem
        label="Hero Layout"
        description="Choose how the hero section is displayed"
        control={{
          type: "select",
          value: heroLayoutToLabel(settings.heroLayout),
          options: HERO_LAYOUT_LABELS,
          onChange: (v) => onChange("heroLayout", labelToHeroLayout(v)),
        }}
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
