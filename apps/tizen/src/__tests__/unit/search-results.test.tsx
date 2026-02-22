import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SearchResults } from "../../components/SearchResults";
import type { SearchResult } from "../../types";

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

const mockResults: SearchResult[] = [
  { id: "1", title: "Inception", type: "movie", year: "2010", available: true, image: "https://img.com/1.jpg" },
  { id: "2", title: "Breaking Bad", type: "tv", year: "2008", available: false },
];

describe("SearchResults", () => {
  it("renders nothing when results are empty", () => {
    const { container } = render(<SearchResults results={[]} onSelect={vi.fn()} />);
    expect(container.innerHTML).toBe("");
  });

  it("shows loading state", () => {
    render(<SearchResults results={[]} onSelect={vi.fn()} loading />);
    expect(screen.getByText("Searching...")).toBeInTheDocument();
  });

  it("renders result titles", () => {
    render(<SearchResults results={mockResults} onSelect={vi.fn()} />);
    expect(screen.getByText("Inception")).toBeInTheDocument();
    expect(screen.getByText("Breaking Bad")).toBeInTheDocument();
  });

  it("renders section title when provided", () => {
    render(<SearchResults results={mockResults} onSelect={vi.fn()} title="Movies" />);
    expect(screen.getByText("Movies")).toBeInTheDocument();
  });

  it("shows 'In Library' badge for available items in grid variant", () => {
    render(<SearchResults results={mockResults} onSelect={vi.fn()} />);
    expect(screen.getByText("In Library")).toBeInTheDocument();
  });

  it("shows TMDB label for unavailable items in grid variant", () => {
    render(<SearchResults results={mockResults} onSelect={vi.fn()} />);
    expect(screen.getByText("2008 · TMDB")).toBeInTheDocument();
  });

  it("calls onSelect when a result card is clicked", () => {
    const onSelect = vi.fn();
    render(<SearchResults results={mockResults} onSelect={onSelect} />);
    fireEvent.click(screen.getByText("Inception"));
    expect(onSelect).toHaveBeenCalledWith(mockResults[0]);
  });

  it("renders image when provided", () => {
    render(<SearchResults results={mockResults} onSelect={vi.fn()} />);
    const img = screen.getByAltText("Inception");
    expect(img).toBeInTheDocument();
    expect(img.getAttribute("src")).toBe("https://img.com/1.jpg");
  });

  it("renders trending variant with type labels", () => {
    render(<SearchResults results={mockResults} onSelect={vi.fn()} variant="trending" />);
    expect(screen.getByText("2010 · Movie")).toBeInTheDocument();
    expect(screen.getByText("2008 · TV Show")).toBeInTheDocument();
  });
});
