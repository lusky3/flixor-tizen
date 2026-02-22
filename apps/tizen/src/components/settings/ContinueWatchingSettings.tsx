import { SettingsCard } from "../SettingsCard";
import { SettingItem } from "../SettingItem";
import type { TizenSettings } from "../../services/settings";

export interface ContinueWatchingSettingsProps {
  settings: TizenSettings;
  onChange: <K extends keyof TizenSettings>(key: K, value: TizenSettings[K]) => void;
}

const DURATION_OPTIONS: { label: string; minutes: number }[] = [
  { label: "15 min", minutes: 15 },
  { label: "30 min", minutes: 30 },
  { label: "1 hour", minutes: 60 },
  { label: "6 hours", minutes: 360 },
  { label: "12 hours", minutes: 720 },
  { label: "24 hours", minutes: 1440 },
];

const DURATION_LABELS = DURATION_OPTIONS.map((d) => d.label);

function minutesToLabel(minutes: number): string {
  return DURATION_OPTIONS.find((d) => d.minutes === minutes)?.label ?? "30 min";
}

function labelToMinutes(label: string): number {
  return DURATION_OPTIONS.find((d) => d.label === label)?.minutes ?? 30;
}

export function ContinueWatchingSettings({ settings, onChange }: ContinueWatchingSettingsProps) {
  const cachedStreams = settings.continueWatchingCachedStreams ?? false;

  return (
    <>
      <SettingsCard title="Display">
        <SettingItem
          label="Card Style"
          description="How continue watching items are displayed"
          control={{
            type: "select",
            value: settings.continueWatchingCardStyle ?? "landscape",
            options: ["landscape", "poster"],
            onChange: (v) => onChange("continueWatchingCardStyle", v as "landscape" | "poster"),
          }}
        />
      </SettingsCard>

      <SettingsCard title="Cached Streams">
        <SettingItem
          label="Cache Streams"
          description="Cache stream data for faster loading"
          control={{
            type: "toggle",
            checked: cachedStreams,
            onChange: (v) => onChange("continueWatchingCachedStreams", v),
          }}
        />
        <SettingItem
          label="Cache Duration"
          description="How long to keep cached stream data"
          disabled={!cachedStreams}
          control={{
            type: "select",
            value: minutesToLabel(settings.continueWatchingCacheDuration ?? 30),
            options: DURATION_LABELS,
            onChange: (v) => onChange("continueWatchingCacheDuration", labelToMinutes(v)),
          }}
        />
      </SettingsCard>
    </>
  );
}
