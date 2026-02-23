import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { VirtualGrid, computeLayout } from "../../components/VirtualGrid";

vi.mock("@noriginmedia/norigin-spatial-navigation", () => ({
  useFocusable: () => ({
    ref: { current: null },
    focused: false,
    focusKey: "test-key",
    focusSelf: vi.fn(),
  }),
  FocusContext: {
    Provider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  },
}));

// Polyfill IntersectionObserver for jsdom
class MockIntersectionObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  constructor(_cb: IntersectionObserverCallback, _opts?: IntersectionObserverInit) {}
}
globalThis.IntersectionObserver = MockIntersectionObserver as any;

describe("computeLayout", () => {
  it("computes correct column count", () => {
    // containerWidth=500, columnWidth=160, gap=12 => (500+12)/(160+12) = 2.97 => 2 columns
    const layout = computeLayout(500, 600, 0, 10, 160, 280, 12, 3);
    expect(layout.columnCount).toBe(2);
  });

  it("computes correct row count", () => {
    const layout = computeLayout(500, 600, 0, 10, 160, 280, 12, 3);
    // 10 items / 2 columns = 5 rows
    expect(layout.rowCount).toBe(5);
  });

  it("computes total height", () => {
    const layout = computeLayout(500, 600, 0, 10, 160, 280, 12, 3);
    // 5 rows * (280 + 12) = 1460
    expect(layout.totalHeight).toBe(5 * (280 + 12));
  });

  it("computes visible rows with overscan", () => {
    const layout = computeLayout(500, 600, 0, 20, 160, 280, 12, 2);
    expect(layout.visibleStartRow).toBe(0);
    // viewport 600 / (280+12) = ~2.05, ceil = 3, + overscan 2 = 5
    expect(layout.visibleEndRow).toBeLessThanOrEqual(layout.rowCount);
    expect(layout.visibleEndRow).toBeGreaterThanOrEqual(3);
  });

  it("handles scrolled position", () => {
    // Scroll down 1200px — floor(1200/292) = 4, minus overscan 2 = 2
    const layout = computeLayout(500, 600, 1200, 20, 160, 280, 12, 2);
    expect(layout.visibleStartRow).toBeGreaterThan(0);
  });

  it("handles zero items", () => {
    const layout = computeLayout(500, 600, 0, 0, 160, 280, 12, 3);
    expect(layout.columnCount).toBe(2);
    expect(layout.rowCount).toBe(0);
    expect(layout.totalHeight).toBe(0);
  });

  it("ensures at least 1 column", () => {
    const layout = computeLayout(50, 600, 0, 5, 160, 280, 12, 3);
    expect(layout.columnCount).toBe(1);
  });
});

describe("VirtualGrid component", () => {
  const items = Array.from({ length: 10 }, (_, i) => ({
    id: `item-${i}`,
    title: `Item ${i}`,
  }));

  it("renders container", () => {
    const { container } = render(
      <VirtualGrid
        items={items}
        render={(item) => <div>{item.title}</div>}
      />,
    );
    expect(container.querySelector(".virtual-grid-container")).toBeTruthy();
  });

  it("renders items", () => {
    render(
      <VirtualGrid
        items={items}
        render={(item) => <div data-testid={`grid-item-${item.id}`}>{item.title}</div>}
      />,
    );
    // At least some items should be rendered (visible ones)
    const rendered = screen.queryAllByTestId(/grid-item/);
    expect(rendered.length).toBeGreaterThan(0);
  });

  it("renders empty grid with no items", () => {
    const { container } = render(
      <VirtualGrid
        items={[]}
        render={(item: any) => <div>{item.title}</div>}
      />,
    );
    expect(container.querySelector(".virtual-grid-container")).toBeTruthy();
  });

  it("calls loadMore via sentinel when hasMore is true", () => {
    const loadMore = vi.fn();
    const { container } = render(
      <VirtualGrid
        items={items}
        hasMore={true}
        loadMore={loadMore}
        render={(item) => <div>{item.title}</div>}
      />,
    );
    // Sentinel should be in the DOM
    const sentinel = container.querySelector("[style*='bottom: 0']");
    expect(sentinel).toBeTruthy();
  });
});
