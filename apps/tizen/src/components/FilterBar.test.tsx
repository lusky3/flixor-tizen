import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FilterBar, type FilterOption } from "./FilterBar";

vi.mock("@noriginmedia/norigin-spatial-navigation", () => ({
  useFocusable: (opts?: { onEnterPress?: () => void }) => ({
    ref: { current: null },
    focused: false,
    focusSelf: vi.fn(),
    ...opts,
  }),
  FocusContext: {
    Provider: ({ children }: { children: React.ReactNode }) => children,
  },
}));

const genreOptions: FilterOption[] = [
  { id: "action", label: "Action" },
  { id: "comedy", label: "Comedy" },
  { id: "drama", label: "Drama" },
];

describe("FilterBar", () => {
  it("renders all filter options as buttons", () => {
    render(
      <FilterBar options={genreOptions} activeId={null} onSelect={vi.fn()} />
    );
    expect(screen.getByText("Action")).toBeInTheDocument();
    expect(screen.getByText("Comedy")).toBeInTheDocument();
    expect(screen.getByText("Drama")).toBeInTheDocument();
  });

  it("marks the active pill with the active class", () => {
    render(
      <FilterBar options={genreOptions} activeId="comedy" onSelect={vi.fn()} />
    );
    const comedyBtn = screen.getByText("Comedy");
    expect(comedyBtn.className).toContain("active");
    expect(screen.getByText("Action").className).not.toContain("active");
  });

  it("calls onSelect with the option id when clicked", () => {
    const onSelect = vi.fn();
    render(
      <FilterBar options={genreOptions} activeId={null} onSelect={onSelect} />
    );
    fireEvent.click(screen.getByText("Drama"));
    expect(onSelect).toHaveBeenCalledWith("drama");
  });

  it("deselects (calls onSelect with null) when clicking the active pill", () => {
    const onSelect = vi.fn();
    render(
      <FilterBar options={genreOptions} activeId="action" onSelect={onSelect} />
    );
    fireEvent.click(screen.getByText("Action"));
    expect(onSelect).toHaveBeenCalledWith(null);
  });

  it("does not deselect when allowDeselect is false", () => {
    const onSelect = vi.fn();
    render(
      <FilterBar
        options={genreOptions}
        activeId="action"
        onSelect={onSelect}
        allowDeselect={false}
      />
    );
    fireEvent.click(screen.getByText("Action"));
    expect(onSelect).toHaveBeenCalledWith("action");
  });

  it("renders empty when no options provided", () => {
    const { container } = render(
      <FilterBar options={[]} activeId={null} onSelect={vi.fn()} />
    );
    expect(container.querySelectorAll(".filter-bar-pill")).toHaveLength(0);
  });
});
