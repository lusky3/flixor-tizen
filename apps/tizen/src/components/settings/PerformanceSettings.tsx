import { SettingsCard } from "../SettingsCard";
import { SettingItem } from "../SettingItem";
import type { TizenSettings } from "../../services/settings";

export interface PerformanceSettingsProps {
  settings: TizenSettings;
  onChange: <K extends keyof TizenSettings>(key: K, value: TizenSettings[K]) => void;
}

export function PerformanceSettings({ settings, onChange }: PerformanceSettingsProps) {
  return (
    <>
      <SettingsCard title="Performance Mode">
        <SettingItem
          label="Enable Performance Mode"
          description="Disables backdrop blur, background transitions, and heavy animations for smoother playback on older TVs"
          control={{
            type: "toggle",
            checked: settings.performanceModeEnabled === true,
            onChange: (v) => onChange("performanceModeEnabled", v),
          }}
        />
      </SettingsCard>
    </>
  );
}
