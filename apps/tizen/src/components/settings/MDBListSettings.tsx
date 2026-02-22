import { SettingsCard } from "../SettingsCard";
import { SettingItem } from "../SettingItem";
import type { TizenSettings } from "../../services/settings";

export interface MDBListSettingsProps {
  settings: TizenSettings;
  onChange: <K extends keyof TizenSettings>(key: K, value: TizenSettings[K]) => void;
}

export function MDBListSettings({ settings, onChange }: MDBListSettingsProps) {
  return (
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
  );
}
