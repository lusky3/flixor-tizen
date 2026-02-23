import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { PlexMedia } from "@flixor/core";
import {
  formatResolution,
  formatBitrate,
  formatFileSize,
  formatAudioChannels,
} from "../../utils/media";

// ── Mocks ──────────────────────────────────────────────────────────────

vi.mock("@noriginmedia/norigin-spatial-navigation", () => ({
  useFocusable: vi.fn(() => ({
    ref: vi.fn(),
    focusKey: "mock-key",
    focused: false,
    focusSelf: vi.fn(),
  })),
  FocusContext: {
    Provider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  },
}));

vi.mock("../../components/Modal", () => ({
  Modal: ({
    children,
    onClose,
    title,
  }: {
    children: React.ReactNode;
    onClose: () => void;
    title?: string;
  }) => (
    <div data-testid="modal" data-title={title}>
      <button data-testid="modal-close" onClick={onClose}>
        Close
      </button>
      {children}
    </div>
  ),
}));

import { VersionSelector } from "../../components/VersionSelector";


// ── Helpers ─────────────────────────────────────────────────────────────

function makeMedia(overrides: Partial<PlexMedia> = {}, index = 0): PlexMedia {
  return {
    id: 100 + index,
    duration: 7200000,
    bitrate: 8000,
    width: 1920,
    height: 1080,
    audioChannels: 6,
    audioCodec: "aac",
    videoCodec: "h264",
    videoResolution: "1080",
    Part: [
      {
        id: 200 + index,
        key: `/library/parts/${200 + index}/file.mkv`,
        duration: 7200000,
        size: 4_294_967_296, // ~4 GB
        Stream: [
          { id: 1, streamType: 1, codec: "h264" },
          { id: 2, streamType: 2, codec: "aac" },
        ],
      },
    ],
    ...overrides,
  };
}

function make4kMedia(index = 1): PlexMedia {
  return makeMedia(
    {
      width: 3840,
      height: 2160,
      bitrate: 20000,
      videoCodec: "hevc",
      audioCodec: "eac3",
      audioChannels: 8,
      editionTitle: "Director's Cut",
      Part: [
        {
          id: 300 + index,
          key: `/library/parts/${300 + index}/file.mkv`,
          duration: 7200000,
          size: 42_949_672_960, // ~40 GB
          Stream: [
            { id: 10, streamType: 1, codec: "hevc" },
            { id: 11, streamType: 2, codec: "eac3" },
          ],
        },
      ],
    },
    index,
  );
}

// ── Tests: Formatting helpers ──────────────────────────────────────────

describe("formatResolution", () => {
  it("returns '4K' for height >= 2100", () => {
    expect(formatResolution(2160)).toBe("4K");
    expect(formatResolution(2100)).toBe("4K");
  });

  it("returns '1080p' for height >= 1000", () => {
    expect(formatResolution(1080)).toBe("1080p");
    expect(formatResolution(1000)).toBe("1080p");
  });

  it("returns '720p' for height >= 700", () => {
    expect(formatResolution(720)).toBe("720p");
    expect(formatResolution(700)).toBe("720p");
  });

  it("returns '480p' for height >= 400", () => {
    expect(formatResolution(480)).toBe("480p");
    expect(formatResolution(400)).toBe("480p");
  });

  it("returns 'SD' for low height or undefined", () => {
    expect(formatResolution(360)).toBe("SD");
    expect(formatResolution(0)).toBe("SD");
    expect(formatResolution(undefined)).toBe("SD");
  });
});

describe("formatBitrate", () => {
  it("returns Mbps for bitrate >= 1000 Kbps", () => {
    expect(formatBitrate(8000)).toBe("8.0 Mbps");
    expect(formatBitrate(1000)).toBe("1.0 Mbps");
    expect(formatBitrate(20500)).toBe("20.5 Mbps");
  });

  it("returns Kbps for bitrate < 1000", () => {
    expect(formatBitrate(500)).toBe("500 Kbps");
    expect(formatBitrate(128)).toBe("128 Kbps");
  });

  it("returns empty string for 0 or undefined", () => {
    expect(formatBitrate(0)).toBe("");
    expect(formatBitrate(undefined)).toBe("");
  });
});

describe("formatFileSize", () => {
  it("returns GB for size >= 1 GB", () => {
    expect(formatFileSize(1_073_741_824)).toBe("1.0 GB");
    expect(formatFileSize(4_294_967_296)).toBe("4.0 GB");
  });

  it("returns MB for size < 1 GB", () => {
    expect(formatFileSize(524_288_000)).toBe("500 MB");
    expect(formatFileSize(104_857_600)).toBe("100 MB");
  });

  it("returns empty string for 0 or undefined", () => {
    expect(formatFileSize(0)).toBe("");
    expect(formatFileSize(undefined)).toBe("");
  });
});

describe("formatAudioChannels", () => {
  it("returns 'Stereo' for channels <= 2", () => {
    expect(formatAudioChannels(1)).toBe("Stereo");
    expect(formatAudioChannels(2)).toBe("Stereo");
  });

  it("returns '5.1' for channels <= 6", () => {
    expect(formatAudioChannels(6)).toBe("5.1");
    expect(formatAudioChannels(3)).toBe("5.1");
  });

  it("returns '7.1' for channels <= 8", () => {
    expect(formatAudioChannels(7)).toBe("7.1");
    expect(formatAudioChannels(8)).toBe("7.1");
  });

  it("returns 'Nch' for channels > 8", () => {
    expect(formatAudioChannels(10)).toBe("10ch");
  });

  it("returns empty string for 0 or undefined", () => {
    expect(formatAudioChannels(0)).toBe("");
    expect(formatAudioChannels(undefined)).toBe("");
  });
});


// ── Tests: VersionSelector component ───────────────────────────────────

describe("VersionSelector", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── 1. Single version renders correctly ────────────────────────────

  describe("single version", () => {
    it("renders one version row with correct label", () => {
      const media = makeMedia();

      render(
        <VersionSelector
          versions={[media]}
          selectedIndex={0}
          onSelect={vi.fn()}
          onClose={vi.fn()}
        />,
      );

      expect(screen.getByText(/Version 1/)).toBeInTheDocument();
      expect(screen.getByText(/1080p/)).toBeInTheDocument();
    });
  });

  // ── 2. Multiple versions displayed ─────────────────────────────────

  describe("multiple versions", () => {
    it("renders all version rows with tech details", () => {
      const versions = [makeMedia({}, 0), make4kMedia(1)];

      render(
        <VersionSelector
          versions={versions}
          selectedIndex={0}
          onSelect={vi.fn()}
          onClose={vi.fn()}
        />,
      );

      // Version 1 — 1080p
      expect(screen.getByText(/Version 1 — 1080p/)).toBeInTheDocument();
      // Director's Cut — 4K (uses editionTitle)
      expect(screen.getByText(/Director's Cut — 4K/)).toBeInTheDocument();
    });

    it("shows tech detail chips for each version", () => {
      const versions = [makeMedia({}, 0), make4kMedia(1)];

      render(
        <VersionSelector
          versions={versions}
          selectedIndex={0}
          onSelect={vi.fn()}
          onClose={vi.fn()}
        />,
      );

      // Version 1 details: H264 · 8.0 Mbps · AAC · 5.1 · 4.0 GB
      expect(screen.getByText(/H264 · 8\.0 Mbps · AAC · 5\.1 · 4\.0 GB/)).toBeInTheDocument();
      // Version 2 details: HEVC · 20.0 Mbps · EAC3 · 7.1 · 40.0 GB
      expect(screen.getByText(/HEVC · 20\.0 Mbps · EAC3 · 7\.1 · 40\.0 GB/)).toBeInTheDocument();
    });
  });

  // ── 3. Selection callback ──────────────────────────────────────────

  describe("selection callback", () => {
    it("calls onSelect and onClose when a version row is clicked", () => {
      const onSelect = vi.fn();
      const onClose = vi.fn();
      const versions = [makeMedia({}, 0), make4kMedia(1)];

      render(
        <VersionSelector
          versions={versions}
          selectedIndex={0}
          onSelect={onSelect}
          onClose={onClose}
        />,
      );

      // Click the second version row (skip the modal-close button)
      const versionRows = screen
        .getAllByRole("button")
        .filter((r) => r.classList.contains("version-selector-row"));
      fireEvent.click(versionRows[1]);

      expect(onSelect).toHaveBeenCalledWith(1);
      expect(onClose).toHaveBeenCalled();
    });
  });

  // ── 4. Selected version highlighted ────────────────────────────────

  describe("selected version highlighted", () => {
    it("applies 'selected' class to the selected version row", () => {
      const versions = [makeMedia({}, 0), make4kMedia(1)];

      render(
        <VersionSelector
          versions={versions}
          selectedIndex={1}
          onSelect={vi.fn()}
          onClose={vi.fn()}
        />,
      );

      const rows = screen
        .getAllByRole("button")
        .filter((r) => r.classList.contains("version-selector-row"));

      expect(rows[0]).not.toHaveClass("selected");
      expect(rows[1]).toHaveClass("selected");
    });

    it("shows checkmark on selected version", () => {
      const versions = [makeMedia({}, 0), make4kMedia(1)];

      render(
        <VersionSelector
          versions={versions}
          selectedIndex={0}
          onSelect={vi.fn()}
          onClose={vi.fn()}
        />,
      );

      expect(screen.getByText("✓")).toBeInTheDocument();
    });
  });

  // ── 5. Close behavior ──────────────────────────────────────────────

  describe("close behavior", () => {
    it("calls onClose when modal close button is clicked", () => {
      const onClose = vi.fn();

      render(
        <VersionSelector
          versions={[makeMedia()]}
          selectedIndex={0}
          onSelect={vi.fn()}
          onClose={onClose}
        />,
      );

      fireEvent.click(screen.getByTestId("modal-close"));
      expect(onClose).toHaveBeenCalledOnce();
    });
  });

  // ── 6. Modal title ─────────────────────────────────────────────────

  describe("modal title", () => {
    it("passes 'Select Version' as the modal title", () => {
      render(
        <VersionSelector
          versions={[makeMedia()]}
          selectedIndex={0}
          onSelect={vi.fn()}
          onClose={vi.fn()}
        />,
      );

      expect(screen.getByTestId("modal")).toHaveAttribute(
        "data-title",
        "Select Version",
      );
    });
  });

  // ── 7. Edition title in label ──────────────────────────────────────

  describe("edition title", () => {
    it("uses editionTitle in label when present", () => {
      const media = makeMedia({ editionTitle: "Theatrical Cut", height: 1080 });

      render(
        <VersionSelector
          versions={[media]}
          selectedIndex={0}
          onSelect={vi.fn()}
          onClose={vi.fn()}
        />,
      );

      expect(screen.getByText("Theatrical Cut — 1080p")).toBeInTheDocument();
    });

    it("uses 'Version N' when no editionTitle", () => {
      const media = makeMedia({ editionTitle: undefined, height: 720 });

      render(
        <VersionSelector
          versions={[media]}
          selectedIndex={0}
          onSelect={vi.fn()}
          onClose={vi.fn()}
        />,
      );

      expect(screen.getByText("Version 1 — 720p")).toBeInTheDocument();
    });
  });

  // ── 8. Audio stream extraction ─────────────────────────────────────

  describe("audio stream extraction", () => {
    it("uses audio stream codec from Part.Stream when available", () => {
      const media = makeMedia({
        audioCodec: "aac",
        Part: [
          {
            id: 200,
            key: "/library/parts/200/file.mkv",
            duration: 7200000,
            size: 1_073_741_824,
            Stream: [
              { id: 1, streamType: 1, codec: "h264" },
              { id: 2, streamType: 2, codec: "truehd" },
            ],
          },
        ],
      });

      render(
        <VersionSelector
          versions={[media]}
          selectedIndex={0}
          onSelect={vi.fn()}
          onClose={vi.fn()}
        />,
      );

      // Should use TRUEHD from stream, not AAC from media-level audioCodec
      expect(screen.getByText(/TRUEHD/)).toBeInTheDocument();
    });

    it("falls back to media-level audioCodec when no audio stream", () => {
      const media = makeMedia({
        audioCodec: "flac",
        Part: [
          {
            id: 200,
            key: "/library/parts/200/file.mkv",
            duration: 7200000,
            size: 1_073_741_824,
            Stream: [{ id: 1, streamType: 1, codec: "h264" }],
          },
        ],
      });

      render(
        <VersionSelector
          versions={[media]}
          selectedIndex={0}
          onSelect={vi.fn()}
          onClose={vi.fn()}
        />,
      );

      expect(screen.getByText(/FLAC/)).toBeInTheDocument();
    });
  });
});
