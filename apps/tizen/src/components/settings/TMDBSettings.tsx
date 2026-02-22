import { SettingsCard } from "../SettingsCard";
import { SettingItem } from "../SettingItem";
import type { TizenSettings } from "../../services/settings";

export interface TMDBSettingsProps {
  settings: TizenSettings;
  onChange: <K extends keyof TizenSettings>(key: K, value: TizenSettings[K]) => void;
}

export function TMDBSettings({ settings, onChange }: TMDBSettingsProps) {
  return (
    <SettingsCard title="TMDB">
      <SettingItem
        label="Enable TMDB"
        description="Use TMDB for metadata, images, and discovery"
        control={{ type: "toggle", checked: settings.tmdbEnabled !== false, onChange: (v) => onChange("tmdbEnabled", v) }}
        disabled={settings.discoveryDisabled}
      />
      <SettingItem
        label="Bearer Token"
        description="TMDB API bearer token for authenticated requests"
        control={{ type: "text", value: settings.tmdbBearerToken || "", placeholder: "Enter TMDB bearer token", onChange: (v) => onChange("tmdbBearerToken", v) }}
        disabled={settings.tmdbEnabled === false}
      />
    </SettingsCard>
  );
}
