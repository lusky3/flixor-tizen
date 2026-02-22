import { SettingsCard } from "../SettingsCard";
import { SettingItem } from "../SettingItem";
import type { TizenSettings } from "../../services/settings";

export interface OverseerrSettingsProps {
  settings: TizenSettings;
  onChange: <K extends keyof TizenSettings>(key: K, value: TizenSettings[K]) => void;
}

export function OverseerrSettings({ settings, onChange }: OverseerrSettingsProps) {
  return (
    <SettingsCard title="Overseerr">
      <SettingItem
        label="Enable Overseerr"
        description="Allow media requests via Overseerr"
        control={{ type: "toggle", checked: settings.overseerrEnabled === true, onChange: (v) => onChange("overseerrEnabled", v) }}
      />
      <SettingItem
        label="Server URL"
        description="Overseerr server address"
        control={{ type: "text", value: settings.overseerrUrl || "", placeholder: "https://overseerr.example.com", onChange: (v) => onChange("overseerrUrl", v) }}
        disabled={!settings.overseerrEnabled}
      />
      <SettingItem
        label="API Key"
        description="Your Overseerr API key"
        control={{ type: "text", value: settings.overseerrApiKey || "", placeholder: "Enter Overseerr API key", onChange: (v) => onChange("overseerrApiKey", v) }}
        disabled={!settings.overseerrEnabled}
      />
    </SettingsCard>
  );
}
