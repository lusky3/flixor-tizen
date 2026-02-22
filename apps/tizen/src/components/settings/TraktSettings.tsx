import { useState, useCallback } from "react";
import { SettingsCard } from "../SettingsCard";
import { SettingItem } from "../SettingItem";
import type { TizenSettings } from "../../services/settings";
import { flixor } from "../../services/flixor";

export interface TraktSettingsProps {
  settings: TizenSettings;
  onChange: <K extends keyof TizenSettings>(key: K, value: TizenSettings[K]) => void;
}

export function TraktSettings({ settings, onChange }: TraktSettingsProps) {
  const [traktAuth, setTraktAuth] = useState(flixor.trakt.isAuthenticated());
  const [traktPin, setTraktPin] = useState<{ user_code: string; verification_url: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = useCallback(async () => {
    setLoading(true);
    try {
      const code = await flixor.trakt.generateDeviceCode();
      setTraktPin(code);
      const tokens = await flixor.trakt.waitForDeviceCode(code, {
        onPoll: () => console.log("Polling Trakt..."),
      });
      if (tokens) {
        setTraktAuth(true);
        setTraktPin(null);
      }
    } catch (err) {
      console.error("Trakt login failed:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSignOut = useCallback(async () => {
    await flixor.trakt.signOut();
    setTraktAuth(false);
  }, []);

  return (
    <>
      <SettingsCard title="Connection">
        {traktAuth ? (
          <>
            <SettingItem
              label="Status"
              description="Connected"
              control={{ type: "button", buttonLabel: "Sign Out", onPress: handleSignOut }}
            />
          </>
        ) : traktPin ? (
          <div className="trakt-pin-box">
            <p>
              Go to <strong>{traktPin.verification_url}</strong> and enter:
            </p>
            <div className="pin-display small">{traktPin.user_code}</div>
            <p style={{ opacity: 0.6, fontSize: "0.85rem" }}>Waiting for authorization…</p>
          </div>
        ) : (
          <SettingItem
            label="Status"
            description="Not Connected"
            control={{
              type: "button",
              buttonLabel: loading ? "Initializing..." : "Link Trakt Account",
              onPress: handleLogin,
            }}
            disabled={loading}
          />
        )}
      </SettingsCard>

      <SettingsCard title="Scrobbling">
        <SettingItem
          label="Trakt Scrobbling"
          description="Automatically track what you watch on Trakt"
          control={{
            type: "toggle",
            checked: settings.traktScrobblingEnabled !== false,
            onChange: (v) => onChange("traktScrobblingEnabled", v),
          }}
          disabled={!traktAuth}
        />
      </SettingsCard>
    </>
  );
}
