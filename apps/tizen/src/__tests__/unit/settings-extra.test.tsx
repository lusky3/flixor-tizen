import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { ContinueWatchingSettings } from "../../components/settings/ContinueWatchingSettings";
import { DetailsScreenSettings } from "../../components/settings/DetailsScreenSettings";
import { MDBListSettings } from "../../components/settings/MDBListSettings";
import { OverseerrSettings } from "../../components/settings/OverseerrSettings";
import { TMDBSettings } from "../../components/settings/TMDBSettings";
import { TraktSettings } from "../../components/settings/TraktSettings";
import { PlexSettings } from "../../components/settings/PlexSettings";
import { CatalogSettings } from "../../components/settings/CatalogSettings";
import { DEFAULT_SETTINGS, type TizenSettings } from "../../services/settings";

vi.mock("@noriginmedia/norigin-spatial-navigation", () => ({
  useFocusable: (opts?: { onEnterPress?: () => void }) => ({
    ref: { current: null },
    focused: false,
    focusKey: "test-key",
    focusSelf: vi.fn(),
    ...opts,
  }),
  FocusContext: {
    Provider: ({ children }: { children: React.ReactNode }) => children,
  },
}));

const mockGetLibraries = vi.fn();
const mockSignOutPlex = vi.fn();
const mockTraktIsAuth = vi.fn(() => false);
const mockTraktGenerateCode = vi.fn();
const mockTraktWaitForCode = vi.fn();
const mockTraktSignOut = vi.fn();

vi.mock("../../services/flixor", () => ({
  flixor: {
    plexServer: { getLibraries: (...a: unknown[]) => mockGetLibraries(...a) },
    server: { name: "TestServer" },
    currentProfile: { title: "TestUser" },
    signOutPlex: (...a: unknown[]) => mockSignOutPlex(...a),
    trakt: {
      isAuthenticated: () => mockTraktIsAuth(),
      generateDeviceCode: (...a: unknown[]) => mockTraktGenerateCode(...a),
      waitForDeviceCode: (...a: unknown[]) => mockTraktWaitForCode(...a),
      signOut: (...a: unknown[]) => mockTraktSignOut(...a),
    },
  },
}));

function s(overrides: Partial<TizenSettings> = {}): TizenSettings {
  return { ...DEFAULT_SETTINGS, ...overrides };
}
