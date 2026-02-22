import { useState, useEffect } from "react";
import { flixor } from "../services/flixor";
import type { PlexPin } from "@flixor/core";

export function Login({ onLogin }: { onLogin: () => void }) {
  const [pin, setPin] = useState<PlexPin | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let polling = true;

    const startLogin = async () => {
      try {
        const newPin = await flixor.createPlexPin();
        setPin(newPin);

        const token = await flixor.waitForPlexPin(newPin.id, {
          onPoll: () => {
            if (!polling) throw new Error("Stopped");
          },
        });

        if (token) {
          onLogin();
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.message !== "Stopped") {
          setError(err.message);
        }
      }
    };

    startLogin();
    return () => {
      polling = false;
    };
  }, [onLogin]);

  return (
    <div className="login-container">
      <div className="login-glass-card">
        <h1 className="logo">FLIXOR</h1>
        <h2>Link your Plex Account</h2>
        <p>Go to the URL below on your phone or computer and enter the code:</p>

        <div className="plex-url-box">plex.tv/link</div>

        {pin ? (
          <div className="pin-display">{pin.code}</div>
        ) : (
          <div className="loading-spinner"></div>
        )}

        {error && <div className="error-message">{error}</div>}

        <p className="login-footer">Waiting for authorization...</p>
      </div>
    </div>
  );
}
