import { useState } from "react";
import { flixor } from "../services/flixor";
import { TopNav } from "../components/TopNav";

export function SettingsPage() {
  const [traktAuth, setTraktAuth] = useState(flixor.trakt.isAuthenticated());
  const [traktPin, setTraktPin] = useState<{
    user_code: string;
    verification_url: string;
  } | null>(null);
  const [loadingTrakt, setLoadingTrakt] = useState(false);

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
        onPoll: () => {
          console.log("Polling Trakt...");
        },
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
                  <p>
                    Go to <strong>{traktPin.verification_url}</strong> and
                    enter:
                  </p>
                  <div className="pin-display small">{traktPin.user_code}</div>
                </div>
              ) : (
                <button
                  className="btn-primary"
                  onClick={handleTraktLogin}
                  disabled={loadingTrakt}
                >
                  {loadingTrakt ? "Initializing..." : "Link Trakt Account"}
                </button>
              )}
            </div>
          )}
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
