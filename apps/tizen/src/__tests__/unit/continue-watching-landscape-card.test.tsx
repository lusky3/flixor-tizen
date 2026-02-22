import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { PlexMediaItem } from "@flixor/core";

vi.mock("@noriginmedia/norigin-spatial-navigation", () => ({
  useFocusable: (opts?: { onEnterPress?: () => void }) => ({
    ref: { current: null },
    focused: false,
    focusSelf: vi.fn(),
    ...opts,
  }),
}));

vi.mock("../../services/flixor", () => ({
  flixor: {
    plexServer: {
      getImageUrl: vi.fn((path: string) => `https://plex.test${path}`),
    },
  },
}));

vi.mock("../../components/SmartImage", () => ({
  SmartImage: ({ src, alt }: { src: string; alt: string }) => (
    <img src={src} alt={alt} />
  ),
}));

import { ContinueWatchingLandscapeCard } from "../../components/ContinueWatchingLandscapeCard";

function makeItem(overrides: Partial<PlexMediaItem> = {}): PlexMediaItem {
  return {
    ratingKey: "123",
    key: "/library/metadata/123",
    type: "movie",
    title: "Test Movie",
    thumb: "/thumb/123",
    duration: 7200000, // 2 hours
    viewOffset: 3600000, // 1 hour in
    ...overrides,
  } as PlexMediaItem;
}

describe("ContinueWatchingLandscapeCard", () => {
  it("renders the item title", () => {
    render(
      <ContinueWatchingLandscapeCard item={makeItem()} onSelect={vi.fn()} />,
    );
    expect(screen.getByText("Test Movie")).toBeInTheDocument();
  });

  it("renders thumbnail image via flixor", () => {
    render(
      <ContinueWatchingLandscapeCard item={makeItem()} onSelect={vi.fn()} />,
    );
    const img = screen.getByRole("img", { name: "Test Movie" });
    expect(img).toHaveAttribute("src", "https://plex.test/thumb/123");
  });

  it("shows progress bar with correct percentage", () => {
    const { container } = render(
      <ContinueWatchingLandscapeCard
        item={makeItem({ viewOffset: 3600000, duration: 7200000 })}
        onSelect={vi.fn()}
      />,
    );
    const bar = container.querySelector('[style*="width: 50%"]');
    expect(bar).toBeTruthy();
  });

  it("shows duration remaining label", () => {
    render(
      <ContinueWatchingLandscapeCard
        item={makeItem({ viewOffset: 3600000, duration: 7200000 })}
        onSelect={vi.fn()}
      />,
    );
    expect(screen.getByText("1h 0m left")).toBeInTheDocument();
  });

  it("shows episode info for TV episodes", () => {
    render(
      <ContinueWatchingLandscapeCard
        item={makeItem({
          type: "episode",
          title: "The One Where...",
          grandparentTitle: "Friends",
          parentIndex: 1,
          index: 5,
        })}
        onSelect={vi.fn()}
      />,
    );
    expect(screen.getByText("S01E05")).toBeInTheDocument();
    expect(screen.getByText("Friends")).toBeInTheDocument();
    expect(screen.getByText("The One Where...")).toBeInTheDocument();
  });

  it("does not show episode info for movies", () => {
    const { container } = render(
      <ContinueWatchingLandscapeCard
        item={makeItem({ type: "movie" })}
        onSelect={vi.fn()}
      />,
    );
    expect(container.textContent).not.toMatch(/S\d+E\d+/);
  });

  it("calls onSelect with ratingKey on click", () => {
    const onSelect = vi.fn();
    render(
      <ContinueWatchingLandscapeCard
        item={makeItem({ ratingKey: "456" })}
        onSelect={onSelect}
      />,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(onSelect).toHaveBeenCalledWith("456");
  });

  it("hides progress bar when no viewOffset", () => {
    const { container } = render(
      <ContinueWatchingLandscapeCard
        item={makeItem({ viewOffset: undefined, duration: 7200000 })}
        onSelect={vi.fn()}
      />,
    );
    const bar = container.querySelector('[style*="background: rgb(229, 9, 20)"]');
    expect(bar).toBeNull();
  });
});
