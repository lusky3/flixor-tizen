import { SettingsCard } from "../SettingsCard";
import { SettingItem } from "../SettingItem";
import type { TizenSettings } from "../../services/settings";

export interface AppearanceSettingsProps {
  settings: TizenSettings;
  onChange: <K extends keyof TizenSettings>(key: K, value: TizenSettings[K]) => void;
}

export function AppearanceSettings({ settings, onChange }: AppearanceSettingsProps) {
  return (
    <>
      <SettingsCard title="Hero Layout">
        <SettingItem
          label="Hero Section"
          description="Show or hide the hero carousel on the home screen"
          control={{ type: "toggle", checked: settings.showHeroSection !== false, onChange: (v) => onChange("showHeroSection", v) }}
        />
      </SettingsCard>

      <SettingsCard title="Theme">
        <SettingItem
          label="Discovery Mode"
          description="Enable external content sources (TMDB, Trakt)"
          control={{ type: "toggle", checked: !settings.discoveryDisabled, onChange: (v) => onChange("discoveryDisabled", !v) }}
        />
      </SettingsCard>
    </>
  );
}
