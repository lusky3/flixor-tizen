import { useState, useEffect } from "react";
import { SettingsCard } from "../SettingsCard";
import { SettingItem } from "../SettingItem";
import type { TizenSettings } from "../../services/settings";
import { flixor } from "../../services/flixor";

export interface CatalogSettingsProps {
  settings: TizenSettings;
  onChange: <K extends keyof TizenSettings>(key: K, value: TizenSettings[K]) => void;
}

interface LibraryInfo {
  key: string;
  title: string;
  type: string;
}

export function CatalogSettings({ settings, onChange }: CatalogSettingsProps) {
  const [libraries, setLibraries] = useState<LibraryInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function fetchLibraries() {
      try {
        const libs = await flixor.plexServer.getLibraries();
        if (!cancelled) {
          setLibraries(
            libs
              .filter((l) => l.type === "movie" || l.type === "show")
              .map((l) => ({ key: l.key, title: l.title, type: l.type })),
          );
        }
      } catch (err) {
        console.error("Failed to fetch libraries:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchLibraries();
    return () => { cancelled = true; };
  }, []);

  const disabledKeys = settings.catalogDisabledLibraries ?? [];

  const toggleLibrary = (key: string, enabled: boolean) => {
    const next = enabled
      ? disabledKeys.filter((k) => k !== key)
      : [...disabledKeys, key];
    onChange("catalogDisabledLibraries", next);
  };

  return (
    <SettingsCard title="Catalog Libraries">
      {loading ? (
        <div className="setting-item" style={{ opacity: 0.5 }}>
          Loading libraries…
        </div>
      ) : libraries.length === 0 ? (
        <div className="setting-item" style={{ opacity: 0.5 }}>
          No libraries found. Connect to a Plex server first.
        </div>
      ) : (
        libraries.map((lib) => (
          <SettingItem
            key={lib.key}
            label={lib.title}
            description={lib.type === "movie" ? "Movies" : "TV Shows"}
            control={{
              type: "toggle",
              checked: !disabledKeys.includes(lib.key),
              onChange: (v) => toggleLibrary(lib.key, v),
            }}
          />
        ))
      )}
    </SettingsCard>
  );
}
