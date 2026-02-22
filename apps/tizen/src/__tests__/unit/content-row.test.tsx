import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ContentRow } from "../../components/ContentRow";
import type { PlexMediaItem } from "@flixor/core";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

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

vi.mock("../../components/MediaCard", () => ({
  MediaCard: ({ item, onClick }: { item: PlexMediaItem; onClick: () => void }) => (
    <button data-testid={`card-${item.ratingKey}`} onClick={onClick}>
      {item.title}
    </button>
  ),
}));

const items: PlexMediaItem[] = [
  { ratingKey: "1", title: "Movie A", type: "movie" } as PlexMediaItem,
  { ratingKey: "2", title: "Movie B", type: "movie" } as PlexMediaItem,
];

describe("ContentRow", () => {
  it("renders nothing when items is empty", () => {
    const { container } = render(
      <ContentRow title="Test" items={[]} onItemClick={vi.fn()} />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders row title", () => {
    render(<ContentRow title="Trending" items={items} onItemClick={vi.fn()} />);
    expect(screen.getByText("Trending")).toBeInTheDocument();
  });

  it("renders all item cards", () => {
    render(<ContentRow title="Row" items={items} onItemClick={vi.fn()} />);
    expect(screen.getByText("Movie A")).toBeInTheDocument();
    expect(screen.getByText("Movie B")).toBeInTheDocument();
  });

  it("calls onItemClick when card is clicked", () => {
    const onClick = vi.fn();
    render(<ContentRow title="Row" items={items} onItemClick={onClick} />);
    fireEvent.click(screen.getByText("Movie A"));
    expect(onClick).toHaveBeenCalledWith(items[0]);
  });

  it("renders See All button when seeAllLink provided", () => {
    render(
      <ContentRow title="Row" items={items} onItemClick={vi.fn()} seeAllLink="/browse" />,
    );
    expect(screen.getByText("See All ›")).toBeInTheDocument();
  });

  it("navigates when See All is clicked", () => {
    render(
      <ContentRow title="Row" items={items} onItemClick={vi.fn()} seeAllLink="/browse" />,
    );
    fireEvent.click(screen.getByText("See All ›"));
    expect(mockNavigate).toHaveBeenCalledWith("/browse");
  });

  it("does not render See All when no seeAllLink", () => {
    render(<ContentRow title="Row" items={items} onItemClick={vi.fn()} />);
    expect(screen.queryByText("See All ›")).toBeNull();
  });
});
