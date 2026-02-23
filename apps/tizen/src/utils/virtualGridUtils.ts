export interface GridLayout {
  columnCount: number;
  rowCount: number;
  totalHeight: number;
  visibleStartRow: number;
  visibleEndRow: number;
}

export function computeLayout(
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
