import { SettingsCard } from "../SettingsCard";
import { SettingItem } from "../SettingItem";
import type { TizenSettings } from "../../services/settings";

export interface IntegrationSettingsProps {
  settings: TizenSettings;
  onChange: <K extends keyof TizenSettings>(key: K, value: TizenSettings[K]) => void;
}

export function IntegrationSettings({ settings, onChange }: IntegrationSettingsProps) {
  return (
    <>
      <SettingsCard title="MDBList">
        <SettingItem
          label="Enable MDBList Ratings"
          description="Show multi-source ratings from MDBList"
          control={{ type: "toggle", checked: settings.mdblistEnabled === true, onChange: (v) => onChange("mdblistEnabled", v) }}
        />
        <SettingItem
          label="API Key"
          description="Your MDBList API key"
          control={{ type: "text", value: settings.mdblistApiKey || "", placeholder: "Enter MDBList API key", onChange: (v) => onChange("mdblistApiKey", v) }}
          disabled={!settings.mdblistEnabled}
        />
      </SettingsCard>

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

      <SettingsCard title="TMDB">
        <SettingItem
          label="Enable TMDB"
          description="Use TMDB for metadata, images, and discovery"
          control={{ type: "toggle", checked: settings.tmdbEnabled !== false, onChange: (v) => onChange("tmdbEnabled", v) }}
          disabled={settings.discoveryDisabled}
        />
        <SettingItem
          label="Include TMDB in Search"
          description="Show TMDB results alongside Plex library search"
          control={{ type: "toggle", checked: settings.includeTmdbInSearch !== false, onChange: (v) => onChange("includeTmdbInSearch", v) }}
          disabled={settings.discoveryDisabled || !settings.tmdbEnabled}
        />
      </SettingsCard>
    </>
  );
}
