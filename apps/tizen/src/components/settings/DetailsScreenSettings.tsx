import { SettingsCard } from "../SettingsCard";
import { SettingItem } from "../SettingItem";
import type { TizenSettings } from "../../services/settings";

export interface DetailsScreenSettingsProps {
  settings: TizenSettings;
  onChange: <K extends keyof TizenSettings>(key: K, value: TizenSettings[K]) => void;
}

export function DetailsScreenSettings({ settings, onChange }: DetailsScreenSettingsProps) {
  return (
    <>
      <SettingsCard title="Layout">
        <SettingItem
          label="Details Page Layout"
          description="How the details page content is organized"
          control={{
            type: "select",
            value: settings.detailsPageLayout ?? "tabbed",
            options: ["tabbed", "unified"],
            onChange: (v) => onChange("detailsPageLayout", v as "tabbed" | "unified"),
          }}
        />
      </SettingsCard>

      <SettingsCard title="Ratings">
        <SettingItem
          label="IMDb"
          description="Show IMDb ratings on details page"
          control={{
            type: "toggle",
            checked: settings.showImdb ?? true,
            onChange: (v) => onChange("showImdb", v),
          }}
        />
        <SettingItem
          label="Rotten Tomatoes Critics"
          description="Show RT Critics score on details page"
          control={{
            type: "toggle",
            checked: settings.showRtCritics ?? true,
            onChange: (v) => onChange("showRtCritics", v),
          }}
        />
        <SettingItem
          label="Rotten Tomatoes Audience"
          description="Show RT Audience score on details page"
          control={{
            type: "toggle",
            checked: settings.showRtAudience ?? true,
            onChange: (v) => onChange("showRtAudience", v),
          }}
        />
      </SettingsCard>

      <SettingsCard title="Episodes">
        <SettingItem
          label="Episode Layout"
          description="How episodes are displayed on the details page"
          control={{
            type: "select",
            value: settings.episodeLayout ?? "vertical",
            options: ["horizontal", "vertical"],
            onChange: (v) => onChange("episodeLayout", v as "horizontal" | "vertical"),
          }}
        />
      </SettingsCard>
    </>
  );
}
