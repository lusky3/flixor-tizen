import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { EpisodeItem } from "../../components/EpisodeItem";

vi.mock("@noriginmedia/norigin-spatial-navigation", () => ({
  useFocusable: (opts?: { onEnterPress?: () => void }) => ({
    ref: { current: null },
    focused: false,
    onEnterPress: opts?.onEnterPress,
  }),
}));

vi.mock("../../components/SmartImage", () => ({
  SmartImage: ({ alt }: { alt: string }) => <img data-testid="thumb" alt={alt} />,
}));

describe("EpisodeItem", () => {
  const baseProps = {
    title: "Pilot",
    episodeNumber: 1,
    seasonNumber: 1,
    onClick: vi.fn(),
  };

  it("renders episode title", () => {
    render(<EpisodeItem {...baseProps} />);
    expect(screen.getByText("Pilot")).toBeInTheDocument();
  });

  it("renders season and episode number", () => {
    render(<EpisodeItem {...baseProps} />);
    expect(screen.getByText(/S1:E1/)).toBeInTheDocument();
  });

  it("renders duration when provided", () => {
    render(<EpisodeItem {...baseProps} duration={3600000} />);
    expect(screen.getByText(/60m/)).toBeInTheDocument();
  });

  it("renders summary when provided", () => {
    render(<EpisodeItem {...baseProps} summary="The beginning" />);
    expect(screen.getByText("The beginning")).toBeInTheDocument();
  });

  it("renders thumbnail when thumbUrl provided", () => {
    render(<EpisodeItem {...baseProps} thumbUrl="https://img.com/ep.jpg" />);
    expect(screen.getByTestId("thumb")).toBeInTheDocument();
  });

  it("renders placeholder when no thumbUrl", () => {
    const { container } = render(<EpisodeItem {...baseProps} />);
    expect(container.querySelector(".episode-thumb-placeholder")).not.toBeNull();
  });

  it("shows watched indicator when watched", () => {
    const { container } = render(<EpisodeItem {...baseProps} watched />);
    expect(container.querySelector(".episode-watched-indicator")).not.toBeNull();
  });

  it("calls onClick when clicked", () => {
    const onClick = vi.fn();
    render(<EpisodeItem {...baseProps} onClick={onClick} />);
    fireEvent.click(screen.getByText("Pilot"));
    expect(onClick).toHaveBeenCalled();
  });

  it("has play overlay", () => {
    const { container } = render(<EpisodeItem {...baseProps} />);
    expect(container.querySelector(".episode-play-overlay")).not.toBeNull();
  });
});
