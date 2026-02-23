import {
  useMemo,
  useRef,
  useState,
  useEffect,
  useCallback,
  type JSX,
} from "react";
import {
  useFocusable,
  FocusContext,
} from "@noriginmedia/norigin-spatial-navigation";

export interface VirtualGridItem {
  id: string;
  [key: string]: unknown;
}

export interface VirtualGridProps<T extends VirtualGridItem> {
  items: T[];
  rowHeight?: number;
  columnWidth?: number;
  gap?: number;
  overscan?: number;
  render: (item: T) => JSX.Element;
  hasMore?: boolean;
  loadMore?: () => void;
}

interface GridLayout {
  columnCount: number;
  rowCount: number;
  totalHeight: number;
  visibleStartRow: number;
  visibleEndRow: number;
}

function computeLayout(
  containerWidth: number,
  viewportHeight: number,
  scrollTop: number,
  itemCount: number,
  columnWidth: number,
  rowHeight: number,
  gap: number,
  overscan: number,
): GridLayout {
  const columnCount = Math.max(
    1,
    Math.floor((containerWidth + gap) / (columnWidth + gap)),
  );
  const rowCount = itemCount > 0 ? Math.ceil(itemCount / columnCount) : 0;
  const totalHeight = rowCount > 0 ? rowCount * (rowHeight + gap) : 0;
  const visibleStartRow = Math.max(
    0,
    Math.floor(scrollTop / (rowHeight + gap)) - overscan,
  );
  const visibleEndRow = Math.min(
    rowCount,
    Math.ceil((scrollTop + viewportHeight) / (rowHeight + gap)) + overscan,
  );
  return { columnCount, rowCount, totalHeight, visibleStartRow, visibleEndRow };
}

function FocusableGridItem<T extends VirtualGridItem>({
  item,
  style,
  render,
}: {
  item: T;
  style: React.CSSProperties;
  render: (item: T) => JSX.Element;
}) {
  const { ref, focused } = useFocusable({
    focusKey: `virtual-grid-item-${item.id}`,
    onFocus: () => {
      const el = ref.current;
      const container = el?.closest(".virtual-grid-container");
      if (el && container) {
        const rect = el.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();

        if (rect.bottom > containerRect.bottom - 40) {
          container.scrollBy({
            top: rect.bottom - containerRect.bottom + 100,
            behavior: "smooth",
          });
        } else if (rect.top < containerRect.top + 40) {
          container.scrollBy({
            top: rect.top - containerRect.top - 100,
            behavior: "smooth",
          });
        }
      }
    },
  });

  return (
    <div
      ref={ref}
      style={style}
      className={`virtual-grid-item${focused ? " spatial-focused" : ""}`}
    >
      {render(item)}
    </div>
  );
}

function InfiniteSentinel({
  onVisible,
  rootRef,
}: {
  onVisible: () => void;
  rootRef: React.RefObject<HTMLElement | null>;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const onVisibleRef = useRef(onVisible);

  useEffect(() => {
    onVisibleRef.current = onVisible;
  }, [onVisible]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const rootEl = rootRef.current as Element | null;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) onVisibleRef.current();
        }
      },
      { root: rootEl || undefined, rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [rootRef]);

  return (
    <div
      ref={ref}
      style={{ position: "absolute", bottom: 0, height: 1, width: "100%" }}
    />
  );
}

export function VirtualGrid<T extends VirtualGridItem>({
  items,
  rowHeight = 360,
  columnWidth = 240,
  gap = 25,
  overscan = 5,
  render,
  hasMore,
  loadMore,
}: VirtualGridProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(600);
  const [containerWidth, setContainerWidth] = useState(0);
  const rafRef = useRef<number | null>(null);
  const lastScrollTopRef = useRef(0);

  // Measure container and attach scroll/resize listeners
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const measure = () => {
      setViewportHeight(el.clientHeight);
      setContainerWidth(el.clientWidth);
    };
    measure();

    // RAF-throttled scroll handler
    const onScroll = () => {
      lastScrollTopRef.current = el.scrollTop;
      if (rafRef.current == null) {
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = null;
          setScrollTop(lastScrollTopRef.current);
        });
      }
    };

    el.addEventListener("scroll", onScroll, { passive: true });

    // ResizeObserver with fallback to window.resize
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => measure());
      ro.observe(el);
    } else {
      window.addEventListener("resize", measure);
    }

    return () => {
      el.removeEventListener("scroll", onScroll);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      if (ro) {
        ro.disconnect();
      } else {
        window.removeEventListener("resize", measure);
      }
    };
  }, []);

  const layout = useMemo(
    () =>
      computeLayout(
        containerWidth,
        viewportHeight,
        scrollTop,
        items.length,
        columnWidth,
        rowHeight,
        gap,
        overscan,
      ),
    [
      containerWidth,
      viewportHeight,
      scrollTop,
      items.length,
      columnWidth,
      rowHeight,
      gap,
      overscan,
    ],
  );

  const visibleItems = useMemo(() => {
    const out: Array<{ item: T; style: React.CSSProperties; key: string }> = [];
    for (let r = layout.visibleStartRow; r < layout.visibleEndRow; r++) {
      for (let c = 0; c < layout.columnCount; c++) {
        const idx = r * layout.columnCount + c;
        const item = items[idx];
        if (!item) break;
        out.push({
          item,
          key: item.id,
          style: {
            position: "absolute",
            top: r * (rowHeight + gap),
            left: c * (columnWidth + gap),
            width: columnWidth,
            height: rowHeight,
          },
        });
      }
    }
    return out;
  }, [items, layout, rowHeight, gap, columnWidth]);

  const handleLoadMore = useCallback(() => {
    loadMore?.();
  }, [loadMore]);

  const { ref: focusRef, focusKey } = useFocusable({
    trackChildren: true,
    isFocusBoundary: true,
  });

  // Sync containerRef with focusRef if needed (containerRef is used by InfiniteSentinel)
  useEffect(() => {
    if (focusRef.current) {
      (containerRef as React.MutableRefObject<HTMLDivElement | null>).current =
        focusRef.current;
    }
  }, [focusRef]);

  return (
    <FocusContext.Provider value={focusKey}>
      <div
        ref={focusRef}
        className="virtual-grid-container"
        style={{
          height: "calc(100vh - 200px)",
          overflow: "auto",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "relative",
            height: layout.totalHeight,
            margin: gap / 2,
          }}
        >
          {visibleItems.map(({ item, style, key }) => (
            <FocusableGridItem
              key={key}
              item={item}
              style={style}
              render={render}
            />
          ))}
        </div>
        {hasMore && (
          <InfiniteSentinel rootRef={containerRef} onVisible={handleLoadMore} />
        )}
      </div>
    </FocusContext.Provider>
  );
}
