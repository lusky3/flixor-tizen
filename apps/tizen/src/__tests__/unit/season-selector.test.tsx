import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SeasonSelector } from "../../components/SeasonSelector";

vi.mock("@noriginmedia/norigin-spatial-navigation", () => ({
  useFocusable: (opts?: { onEnterPress?: () => void }) => ({
    ref: { current: null },
    focused: false,
    focusKey: "test",
    onEnterPress: opts?.onEnterPress,
  }),
  FocusContext: {
    Provider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  },
}));

const seasons = [
  { key: "1", title: "Season 1" },
  { key: "2", title: "Season 2" },
  { key: "3", title: "Season 3" },
];

describe("SeasonSelector", () => {
  it("renders all season pills", () => {
    render(<SeasonSelector seasons={seasons} activeSeason="1" onSeasonChange={vi.fn()} />);
    expect(screen.getByText("Season 1")).toBeInTheDocument();
    expect(screen.getByText("Season 2")).toBeInTheDocument();
    expect(screen.getByText("Season 3")).toBeInTheDocument();
  });

  it("marks active season", () => {
    render(<SeasonSelector seasons={seasons} activeSeason="2" onSeasonChange={vi.fn()} />);
    const btn = screen.getByText("Season 2");
    expect(btn.classList.contains("active")).toBe(true);
  });

  it("calls onSeasonChange when pill is clicked", () => {
    const onChange = vi.fn();
    render(<SeasonSelector seasons={seasons} activeSeason="1" onSeasonChange={onChange} />);
    fireEvent.click(screen.getByText("Season 3"));
    expect(onChange).toHaveBeenCalledWith("3");
  });

  it("non-active seasons do not have active class", () => {
    render(<SeasonSelector seasons={seasons} activeSeason="1" onSeasonChange={vi.fn()} />);
    const btn = screen.getByText("Season 2");
    expect(btn.classList.contains("active")).toBe(false);
  });
});
