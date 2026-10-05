// L-shaped tiles. Inside a grid marked data-shape-grid, a tile with
// data-cut="2/3 1/2" has that grid cell (column lines 2-3, row lines 1-2)
// cut out of one of its corners, plus the gap around it, with every corner
// rounded. The cut size is also given to CSS as --cut-w and --cut-h.
// When the grid has fewer columns (phones), tiles go back to plain rectangles.

const SHAPE_RADIUS = 28;

// A point `distance` px along the line from point a toward point b
function toward(a, b, distance) {
  const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const d = Math.min(distance, length / 2);
  return [a[0] + (b[0] - a[0]) * d / length, a[1] + (b[1] - a[1]) * d / length];
}

// Turn a list of corner points into a clip-path shape with every corner rounded
function roundedShape(points) {
  const k = 0.55; // makes each curve close to a quarter circle
  let path = "";
  points.forEach((corner, i) => {
    const before = points[(i - 1 + points.length) % points.length];
    const after = points[(i + 1) % points.length];
    const start = toward(corner, before, SHAPE_RADIUS);
    const end = toward(corner, after, SHAPE_RADIUS);
    const c1 = [start[0] + (corner[0] - start[0]) * k, start[1] + (corner[1] - start[1]) * k];
    const c2 = [end[0] + (corner[0] - end[0]) * k, end[1] + (corner[1] - end[1]) * k];
    path += `${i === 0 ? "M" : "L"} ${start} C ${c1} ${c2} ${end} `;
  });
  return `path("${path}Z")`;
}

// Where each grid track starts, measured from the grid's content edge
function trackStarts(sizes, gap) {
  const starts = [];
  let position = 0;
  sizes.forEach((size) => {
    starts.push(position);
    position += size + gap;
  });
  return starts;
}

function shapeGrid(grid) {
  const style = getComputedStyle(grid);
  const cols = style.gridTemplateColumns.split(" ").map(parseFloat);
  const rows = style.gridTemplateRows.split(" ").map(parseFloat);
  const gapX = parseFloat(style.columnGap) || 0;
  const gapY = parseFloat(style.rowGap) || 0;
  const xStarts = trackStarts(cols, gapX);
  const yStarts = trackStarts(rows, gapY);

  grid.querySelectorAll("[data-cut]").forEach((tile) => {
    const [colPart, rowPart] = tile.dataset.cut.split(" ");
    const [c1, c2] = colPart.split("/").map(Number);
    const [r1, r2] = rowPart.split("/").map(Number);

    // Not enough columns or rows (phone layout): plain rectangle
    if (c2 > cols.length + 1 || r2 > rows.length + 1) {
      tile.style.clipPath = "";
      tile.style.setProperty("--cut-w", "0px");
      tile.style.setProperty("--cut-h", "0px");
      return;
    }

    const w = tile.offsetWidth;
    const h = tile.offsetHeight;
    const originX = parseFloat(style.paddingLeft) - tile.offsetLeft;
    const originY = parseFloat(style.paddingTop) - tile.offsetTop;

    // The cell's edges inside the tile: from the start of its first track
    // to the end of its last track
    let x1 = originX + xStarts[c1 - 1];
    let x2 = originX + xStarts[c2 - 2] + cols[c2 - 2];
    let y1 = originY + yStarts[r1 - 1];
    let y2 = originY + yStarts[r2 - 2] + rows[r2 - 2];

    const atLeft = x1 <= 1;
    const atRight = x2 >= w - 1;
    const atTop = y1 <= 1;
    const atBottom = y2 >= h - 1;
    // Widen the cut by one gap on the sides facing the inside of the tile
    if (!atLeft) x1 -= gapX;
    if (!atRight) x2 += gapX;
    if (!atTop) y1 -= gapY;
    if (!atBottom) y2 += gapY;
    x1 = Math.max(0, x1);
    y1 = Math.max(0, y1);
    x2 = Math.min(w, x2);
    y2 = Math.min(h, y2);

    let points;
    if (atRight && atBottom) points = [[0, 0], [w, 0], [w, y1], [x1, y1], [x1, h], [0, h]];
    else if (atLeft && atTop) points = [[x2, 0], [w, 0], [w, h], [0, h], [0, y2], [x2, y2]];
    else if (atRight && atTop) points = [[0, 0], [x1, 0], [x1, y2], [w, y2], [w, h], [0, h]];
    else points = [[0, 0], [w, 0], [w, h], [x2, h], [x2, y1], [0, y1]];

    tile.style.clipPath = roundedShape(points);
    tile.style.setProperty("--cut-w", `${x2 - x1}px`);
    tile.style.setProperty("--cut-h", `${y2 - y1}px`);
  });
}

// Redraw whenever a grid changes size (window resized, phone rotated)
document.querySelectorAll("[data-shape-grid]").forEach((grid) => {
  new ResizeObserver(() => shapeGrid(grid)).observe(grid);
});
