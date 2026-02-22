import { SettingsCard } from "../SettingsCard";
import { SettingItem } from "../SettingItem";
import type { TizenSettings } from "../../services/settings";

export interface PlaybackSettingsProps {
  settings: TizenSettings;
  onChange: <K extends keyof TizenSettings>(key: K, value: TizenSettings[K]) => void;
}

export function PlaybackSettings({ settings, onChange }: PlaybackSettingsProps) {
  return (
    <>
      <SettingsCard title="Episode Display">
        <SettingItem
          label="Episode Layout"
          description="How episodes are displayed on the details page"
          control={{ type: "select", value: settings.episodeLayout || "vertical", options: ["horizontal", "vertical"], onChange: (v) => onChange("episodeLayout", v as "horizontal" | "vertical") }}
        />
      </SettingsCard>

      <SettingsCard title="Behavior">
        <SettingItem
          label="Auto-play Next Episode"
          description="Automatically play the next episode when one ends"
          control={{ type: "toggle", checked: settings.autoPlayNext !== false, onChange: (v) => onChange("autoPlayNext", v) }}
        />
        <SettingItem
          label="Show Backdrop on Streams"
          description="Display backdrop image during stream loading"
          control={{ type: "toggle", checked: settings.streamsBackdrop !== false, onChange: (v) => onChange("streamsBackdrop", v) }}
        />
      </SettingsCard>

      <SettingsCard title="Quality">
        <SettingItem
          label="Preferred Resolution"
          description="Default video resolution preference"
          control={{ type: "select", value: settings.preferredResolution || "auto", options: ["auto", "1080p", "720p", "480p"], onChange: (v) => onChange("preferredResolution", v) }}
        />
        <SettingItem
          label="Preferred Quality"
          description="Default transcoding quality"
          control={{ type: "select", value: settings.preferredQuality || "auto", options: ["auto", "high", "medium", "low"], onChange: (v) => onChange("preferredQuality", v) }}
        />
      </SettingsCard>

      <SettingsCard title="Subtitles">
        <SettingItem
          label="Playback Stats HUD"
          description="Show codec, resolution, and bitrate overlay"
          control={{ type: "toggle", checked: settings.statsHudEnabled === true, onChange: (v) => onChange("statsHudEnabled", v) }}
        />
      </SettingsCard>
    </>
  );
}
