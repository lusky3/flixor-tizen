import { useCallback } from "react";
import { SettingsCard } from "../SettingsCard";
import { SettingItem } from "../SettingItem";
import type { TizenSettings } from "../../services/settings";
import { flixor } from "../../services/flixor";

export interface PlexSettingsProps {
  settings: TizenSettings;
  onChange: <K extends keyof TizenSettings>(key: K, value: TizenSettings[K]) => void;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function PlexSettings(_: PlexSettingsProps) {
  const serverName = flixor.server?.name ?? "Not connected";
  const profileName = flixor.currentProfile?.title ?? "Main Account";

  const handleSignOut = useCallback(async () => {
    await flixor.signOutPlex();
    globalThis.location.href = "/";
  }, []);

  return (
    <>
      <SettingsCard title="Server">
        <SettingItem
          label="Server Name"
          description={serverName}
          control={{ type: "button", buttonLabel: "", onPress: () => {} }}
        />
      </SettingsCard>

      <SettingsCard title="Account">
        <SettingItem
          label="Profile"
          description={profileName}
          control={{ type: "button", buttonLabel: "", onPress: () => {} }}
        />
        <SettingItem
          label="Sign Out"
          description="Disconnect from Plex and return to login"
          control={{ type: "button", buttonLabel: "Sign Out", onPress: handleSignOut }}
        />
      </SettingsCard>
    </>
  );
}
