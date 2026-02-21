import { useState } from "react";
import { flixor } from "../services/flixor";
import { loadSettings, saveSettings, setDiscoveryDisabled, type TizenSettings } from "../services/settings";
import { TopNav } from "../components/TopNav";

type SettingsScreen = "main" | "homeScreen" | "integrations" | "mdblist" | "overseerr" | "playback";

export function SettingsPage() {
  const [traktAuth, setTraktAuth] = useState(flixor.trakt.isAuthenticated());
  const [traktPin, setTraktPin] = useState<{ user_code: string; verification_url: string } | null>(null);
  const [loadingTrakt, setLoadingTrakt] = useState(false);
  const [settings, setSettings] = useState<TizenSettings>(loadSettings);
  const [screen, setScreen] = useState<SettingsScreen>("main");

  const updateSetting = <K extends keyof TizenSettings>(key: K, value: TizenSettings[K]) => {
    const next = saveSettings({ [key]: value });
    setSettings(next);
  };

  const handleLogout = async () => {
    await flixor.signOutPlex();
    globalThis.location.href = "/";
  };

  const handleTraktLogin = async () => {
    setLoadingTrakt(true);
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
      setLoadingTrakt(false);
    }
  };

  const handleTraktSignOut = async () => {
    await flixor.trakt.signOut();
    setTraktAuth(false);
  };

  const handleClearCache = async () => {
    await flixor.clearAllCaches();
    alert("All caches cleared.");
  };

  // Sub-screens
  if (screen === "homeScreen") {
    return (
      <div className="tv-container pt-nav">
        <TopNav />
        <div className="settings-content">
          <button className="btn-back" onClick={() => setScreen("main")}>&larr; Back</button>
          <h1 className="settings-title">Home Screen</h1>

          <div className="settings-section">
            <h2>Row Visibility</h2>
            <ToggleItem
              label="Continue Watching"
              checked={settings.showContinueWatchingRow !== false}
              onChange={(v) => updateSetting("showContinueWatchingRow", v)}
            />
            <ToggleItem
              label="Trending Rows"
              checked={settings.showTrendingRows !== false}
              onChange={(v) => updateSetting("showTrendingRows", v)}
            />
            <ToggleItem
              label="Trakt Rows"
              checked={settings.showTraktRows !== false}
              onChange={(v) => updateSetting("showTraktRows", v)}
            />
          </div>
        </div>
      </div>
    );
  }

  if (screen === "mdblist") {
    return (
      <div className="tv-container pt-nav">
        <TopNav />
        <div className="settings-content">
          <button className="btn-back" onClick={() => setScreen("integrations")}>&larr; Back</button>
          <h1 className="settings-title">MDBList</h1>

          <div className="settings-section">
            <ToggleItem
              label="Enable MDBList Ratings"
              checked={settings.mdblistEnabled === true}
              onChange={(v) => updateSetting("mdblistEnabled", v)}
            />
            <div className="settings-input-group">
              <label>API Key</label>
              <input
                type="text"
                className="settings-input"
                value={settings.mdblistApiKey || ""}
                placeholder="Enter MDBList API key"
                onChange={(e) => updateSetting("mdblistApiKey", e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (screen === "overseerr") {
    return (
      <div className="tv-container pt-nav">
        <TopNav />
        <div className="settings-content">
          <button className="btn-back" onClick={() => setScreen("integrations")}>&larr; Back</button>
          <h1 className="settings-title">Overseerr</h1>

          <div className="settings-section">
            <ToggleItem
              label="Enable Overseerr"
              checked={settings.overseerrEnabled === true}
              onChange={(v) => updateSetting("overseerrEnabled", v)}
            />
            <div className="settings-input-group">
              <label>Server URL</label>
              <input
                type="text"
                className="settings-input"
                value={settings.overseerrUrl || ""}
                placeholder="https://overseerr.example.com"
                onChange={(e) => updateSetting("overseerrUrl", e.target.value)}
              />
            </div>
            <div className="settings-input-group">
              <label>API Key</label>
              <input
                type="text"
                className="settings-input"
                value={settings.overseerrApiKey || ""}
                placeholder="Enter Overseerr API key"
                onChange={(e) => updateSetting("overseerrApiKey", e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (screen === "playback") {
    return (
      <div className="tv-container pt-nav">
        <TopNav />
        <div className="settings-content">
          <button className="btn-back" onClick={() => setScreen("main")}>&larr; Back</button>
          <h1 className="settings-title">Playback</h1>

          <div className="settings-section">
            <h2>Episode Display</h2>
            <button
              className="settings-nav-item"
              onClick={() => updateSetting("episodeLayout", settings.episodeLayout === "list" ? "grid" : "list")}
            >
              <span>Episode Layout</span>
              <span className="settings-nav-status">
                {settings.episodeLayout === "list" ? "List" : "Grid"}
              </span>
            </button>
          </div>

          <div className="settings-section">
            <h2>Behavior</h2>
            <ToggleItem
              label="Auto-play Next Episode"
              checked={settings.autoPlayNext !== false}
              onChange={(v) => updateSetting("autoPlayNext", v)}
            />
            <ToggleItem
              label="Show Backdrop on Streams"
              checked={settings.streamsBackdrop !== false}
              onChange={(v) => updateSetting("streamsBackdrop", v)}
            />
          </div>

          <div className="settings-section">
            <h2>Quality</h2>
            <button
              className="settings-nav-item"
              onClick={() => {
                const opts = ["auto", "1080p", "720p", "480p"];
                const idx = opts.indexOf(settings.preferredResolution || "auto");
                updateSetting("preferredResolution", opts[(idx + 1) % opts.length]);
              }}
            >
              <span>Preferred Resolution</span>
              <span className="settings-nav-status">{settings.preferredResolution || "Auto"}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (screen === "integrations") {
    return (
      <div className="tv-container pt-nav">
        <TopNav />
        <div className="settings-content">
          <button className="btn-back" onClick={() => setScreen("main")}>&larr; Back</button>
          <h1 className="settings-title">Integrations</h1>

          <div className="settings-section">
            <button className="settings-nav-item" onClick={() => setScreen("mdblist")}>
              <span>MDBList (Multi-source Ratings)</span>
              <span className="settings-nav-status">
                {settings.mdblistEnabled ? "Enabled" : "Disabled"} &rsaquo;
              </span>
            </button>
            <button className="settings-nav-item" onClick={() => setScreen("overseerr")}>
              <span>Overseerr (Media Requests)</span>
              <span className="settings-nav-status">
                {settings.overseerrEnabled ? "Enabled" : "Disabled"} &rsaquo;
              </span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main settings screen
  return (
    <div className="tv-container pt-nav">
      <TopNav />
      <div className="settings-content">
        <h1 className="settings-title">Settings</h1>

        <div className="settings-section">
          <h2>Plex Account</h2>
          <div className="settings-item">
            <span>Server</span>
            <span>{flixor.server?.name || "None"}</span>
          </div>
          <button className="btn-secondary" onClick={handleLogout}>
            Sign Out of Plex
          </button>
        </div>

        <div className="settings-section">
          <h2>Trakt Integration</h2>
          <div className="settings-item">
            <span>Status</span>
            <span>{traktAuth ? "Connected" : "Not Connected"}</span>
          </div>
          {traktAuth ? (
            <button className="btn-secondary" onClick={handleTraktSignOut}>
              Sign Out of Trakt
            </button>
          ) : (
            <div className="trakt-login-area">
              {traktPin ? (
                <div className="trakt-pin-box">
                  <p>Go to <strong>{traktPin.verification_url}</strong> and enter:</p>
                  <div className="pin-display small">{traktPin.user_code}</div>
                </div>
              ) : (
                <button className="btn-primary" onClick={handleTraktLogin} disabled={loadingTrakt}>
                  {loadingTrakt ? "Initializing..." : "Link Trakt Account"}
                </button>
              )}
            </div>
          )}
        </div>

        <div className="settings-section">
          <h2>Discovery</h2>
          <ToggleItem
            label="Library Only Mode (disable discovery)"
            checked={settings.discoveryDisabled === true}
            onChange={(v) => {
              setDiscoveryDisabled(v);
              setSettings(loadSettings());
            }}
          />
          <ToggleItem
            label="Include TMDB in Search"
            checked={settings.includeTmdbInSearch !== false && !settings.discoveryDisabled}
            onChange={(v) => updateSetting("includeTmdbInSearch", v)}
          />
        </div>

        <div className="settings-section">
          <h2>Content & Display</h2>
          <button className="settings-nav-item" onClick={() => setScreen("homeScreen")}>
            <span>Home Screen</span>
            <span className="settings-nav-status">&rsaquo;</span>
          </button>
          <button className="settings-nav-item" onClick={() => setScreen("playback")}>
            <span>Playback</span>
            <span className="settings-nav-status">&rsaquo;</span>
          </button>
          <button className="settings-nav-item" onClick={() => setScreen("integrations")}>
            <span>Integrations</span>
            <span className="settings-nav-status">&rsaquo;</span>
          </button>
        </div>

        <div className="settings-section">
          <h2>Cache</h2>
          <button className="btn-secondary" onClick={handleClearCache}>
            Clear All Caches
          </button>
        </div>

        <div className="settings-section">
          <h2>About</h2>
          <div className="settings-item">
            <span>Version</span>
            <span>1.0.0-tizen</span>
          </div>
          <div className="settings-item">
            <span>Platform</span>
            <span>Tizen OS</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ToggleItem({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (val: boolean) => void;
}) {
  return (
    <button
      className="settings-toggle-item"
      onClick={() => onChange(!checked)}
    >
      <span>{label}</span>
      <span className={`toggle-indicator ${checked ? "on" : "off"}`}>
        {checked ? "ON" : "OFF"}
      </span>
    </button>
  );
}
