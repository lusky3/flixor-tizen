import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  useFocusable,
  FocusContext,
} from "@noriginmedia/norigin-spatial-navigation";
import { flixor } from "../services/flixor";
import { cacheService } from "../services/cache";
import type { PlexHomeUser } from "@flixor/core";

/* ------------------------------------------------------------------ */
/*  PIN Dialog                                                         */
/* ------------------------------------------------------------------ */

interface PinDialogProps {
  user: PlexHomeUser;
  error: string | null;
  submitting: boolean;
  onSubmit: (pin: string) => void;
  onCancel: () => void;
}

function PinDialog({
  user,
  error,
  submitting,
  onSubmit,
  onCancel,
}: PinDialogProps) {
  const [pin, setPin] = useState("");

  const {
    ref: dialogRef,
    focusKey: dialogFocusKey,
    focusSelf,
  } = useFocusable({
    focusKey: "pin-dialog",
    trackChildren: true,
    isFocusBoundary: true,
  });

  const { ref: inputRef, focused: inputFocused } = useFocusable({
    onEnterPress: () => {
      // When Enter is pressed on the input, move browser focus to it for typing
      const el = inputRef.current as HTMLInputElement | null;
      el?.focus();
    },
    onArrowPress: (direction) => {
      // Allow spatial nav to handle up/down so focus can reach buttons below
      if (direction === "down" || direction === "up") return false;
      // Left/right stay in input for cursor movement
      return true;
    },
  });

  // Focus the dialog container on mount so spatial nav owns focus
  useEffect(() => {
    const timer = setTimeout(() => {
      focusSelf();
    }, 100);
    return () => clearTimeout(timer);
  }, [focusSelf]);

  // Sync browser focus with spatial nav focus for the input
  useEffect(() => {
    if (inputFocused) {
      const el = inputRef.current as HTMLInputElement | null;
      el?.focus();
    }
  }, [inputFocused, inputRef]);

  const handleSubmit = useCallback(() => {
    if (pin.length === 4 && !submitting) onSubmit(pin);
  }, [pin, submitting, onSubmit]);

  // Auto-submit when 4 digits are entered
  useEffect(() => {
    if (pin.length === 4 && !submitting) {
      onSubmit(pin);
    }
  }, [pin, submitting, onSubmit]);

  const { ref: submitRef, focused: submitFocused } = useFocusable({
    onEnterPress: handleSubmit,
  });

  const { ref: cancelRef, focused: cancelFocused } = useFocusable({
    onEnterPress: onCancel,
  });

  return (
    <div className="pin-overlay">
      <FocusContext.Provider value={dialogFocusKey}>
        <div ref={dialogRef} className="pin-dialog">
          <h2 className="pin-dialog-title">Enter PIN for {user.title}</h2>

          <input
            ref={inputRef}
            className={`pin-input${inputFocused ? " focused" : ""}`}
            type="password"
            inputMode="numeric"
            maxLength={4}
            placeholder="••••"
            value={pin}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, "").slice(0, 4);
              setPin(val);
            }}
          />

          {error && <p className="pin-error">{error}</p>}

          <div className="pin-actions">
            <button
              ref={cancelRef}
              className={`btn-secondary${cancelFocused ? " focused" : ""}`}
              onClick={onCancel}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              ref={submitRef}
              className={`btn-primary${submitFocused ? " focused" : ""}`}
              onClick={handleSubmit}
              disabled={pin.length !== 4 || submitting}
            >
              {submitting ? "Verifying…" : "Submit"}
            </button>
          </div>
        </div>
      </FocusContext.Provider>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Profile Card                                                       */
/* ------------------------------------------------------------------ */

interface ProfileCardProps {
  user: PlexHomeUser;
  disabled: boolean;
  onSelect: (user: PlexHomeUser) => void;
}

function ProfileCard({ user, disabled, onSelect }: ProfileCardProps) {
  const { ref, focused } = useFocusable({
    onEnterPress: () => {
      if (!disabled) onSelect(user);
    },
  });

  const initial = (user.title || user.username || "?").charAt(0).toUpperCase();

  return (
    <button
      ref={ref}
      className={`profile-card${focused ? " focused" : ""}${disabled ? " disabled" : ""}`}
      onClick={() => {
        if (!disabled) onSelect(user);
      }}
      disabled={disabled}
    >
      <div className="profile-avatar">
        {user.thumb ? (
          <img
            src={user.thumb}
            alt={user.title}
            className="profile-avatar-img"
          />
        ) : (
          <span className="profile-avatar-initial">{initial}</span>
        )}
      </div>
      <span className="profile-card-name">{user.title}</span>
      {user.admin && <span className="profile-badge admin">Admin</span>}
      {user.protected && <span className="profile-badge pin">🔒</span>}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  ProfileSelect Page                                                 */
/* ------------------------------------------------------------------ */

export function ProfileSelect() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<PlexHomeUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // PIN dialog state
  const [pinUser, setPinUser] = useState<PlexHomeUser | null>(null);
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinSubmitting, setPinSubmitting] = useState(false);

  const {
    ref: containerRef,
    focusKey: containerFocusKey,
    focusSelf,
  } = useFocusable({
    focusKey: "profile-select",
    trackChildren: true,
    isFocusBoundary: true,
  });

  const switchProfile = useCallback(
    async (user: PlexHomeUser, pin?: string) => {
      try {
        await flixor.switchToProfile(user, pin);
        // Clear all caches so Home loads fresh data for the new profile
        cacheService.clear();
        navigate("/");
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to switch profile";
        // If this was a PIN attempt, surface the error in the dialog
        if (pin !== undefined) {
          setPinError(message);
          setPinSubmitting(false);
        } else {
          setError(message);
        }
      }
    },
    [navigate],
  );

  const handleProfileSelect = useCallback(
    (user: PlexHomeUser) => {
      if (user.protected) {
        setPinUser(user);
        setPinError(null);
      } else {
        switchProfile(user);
      }
    },
    [switchProfile],
  );

  const handlePinSubmit = useCallback(
    (pin: string) => {
      if (!pinUser) return;
      setPinSubmitting(true);
      setPinError(null);
      switchProfile(pinUser, pin);
    },
    [pinUser, switchProfile],
  );

  const handlePinCancel = useCallback(() => {
    setPinUser(null);
    setPinError(null);
    setPinSubmitting(false);
  }, []);

  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await flixor.getHomeUsers();
      setUsers(list);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch profiles";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  // Restore focus into the profile grid once profiles are loaded
  useEffect(() => {
    if (!loading && users.length > 0) {
      // Small delay to let the DOM render profile cards before focusing
      const timer = setTimeout(() => focusSelf(), 100);
      return () => clearTimeout(timer);
    }
  }, [loading, users.length, focusSelf]);

  /* Loading state */
  if (loading) {
    return (
      <div className="tv-container profile-select-container loading-state">
        <h1 className="logo">FLIXOR</h1>
        <p>Loading profiles…</p>
        <div className="loading-spinner" />
      </div>
    );
  }

  return (
    <FocusContext.Provider value={containerFocusKey}>
      <div ref={containerRef} className="tv-container profile-select-container">
        <h1 className="logo">FLIXOR</h1>
        <h2>Who's Watching?</h2>

        {error && (
          <div className="server-error">
            <p className="error-message">{error}</p>
            <RetryButton onClick={fetchProfiles} />
          </div>
        )}

        {!error && users.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">👤</div>
            <h2>No Profiles Found</h2>
            <p>We couldn't find any profiles on your Plex Home.</p>
            <RetryButton onClick={fetchProfiles} />
          </div>
        )}

        {users.length > 0 && (
          <div className="profile-grid">
            {users.map((user) => (
              <ProfileCard
                key={user.id}
                user={user}
                disabled={pinUser !== null}
                onSelect={handleProfileSelect}
              />
            ))}
          </div>
        )}

        {pinUser && (
          <PinDialog
            user={pinUser}
            error={pinError}
            submitting={pinSubmitting}
            onSubmit={handlePinSubmit}
            onCancel={handlePinCancel}
          />
        )}
      </div>
    </FocusContext.Provider>
  );
}

function RetryButton({ onClick }: { onClick: () => void }) {
  const { ref, focused } = useFocusable({ onEnterPress: onClick });
  return (
    <button
      ref={ref}
      className={`btn-primary${focused ? " focused" : ""}`}
      onClick={onClick}
    >
      Retry
    </button>
  );
}
