// ai.worker.ts

type WallData = {
  x: number;
  y: number;
  w: number;
  h: number;
  glue?: boolean;
  invisible?: boolean;
};

let walls: WallData[] = [];
let worldW = 3000;
let worldH = 3000;

function pointInWall(x: number, y: number, size: number): boolean {
  for (const w of walls) {
    if (w.glue || w.invisible) continue;
    if (x + size < w.x || x - size > w.x + w.w || y + size < w.y || y - size > w.y + w.h) continue;
    if (
      x > w.x - size &&
      x < w.x + w.w + size &&
      y > w.y - size &&
      y < w.y + w.h + size
    )
      return true;
  }
  return false;
}

function rayAabb(ox: number, oy: number, dx: number, dy: number, w: WallData): number {
  let tmin = 0;
  let tmax = Infinity;
  if (Math.abs(dx) < 1e-9) {
    if (ox < w.x || ox > w.x + w.w) return -1;
  } else {
    const t1 = (w.x - ox) / dx;
    const t2 = (w.x + w.w - ox) / dx;
    tmin = Math.max(tmin, Math.min(t1, t2));
    tmax = Math.min(tmax, Math.max(t1, t2));
  }
  if (Math.abs(dy) < 1e-9) {
    if (oy < w.y || oy > w.y + w.h) return -1;
  } else {
    const t1 = (w.y - oy) / dy;
    const t2 = (w.y + w.h - oy) / dy;
    tmin = Math.max(tmin, Math.min(t1, t2));
    tmax = Math.min(tmax, Math.max(t1, t2));
  }
  return tmax >= Math.max(0, tmin) ? Math.max(0, tmin) : -1;
}

function botLOS(x0: number, y0: number, x1: number, y1: number): boolean {
  const dx = x1 - x0, dy = y1 - y0;
  const dist = Math.hypot(dx, dy);
  if (dist < 1) return true;
  const nx = dx / dist, ny = dy / dist;
  const minX = Math.min(x0, x1);
  const maxX = Math.max(x0, x1);
  const minY = Math.min(y0, y1);
  const maxY = Math.max(y0, y1);
  for (const w of walls) {
    if (w.glue || w.invisible) continue;
    if (w.x + w.w < minX || w.x > maxX || w.y + w.h < minY || w.y > maxY) continue;
    const t = rayAabb(x0, y0, nx, ny, w);
    if (t >= 0 && t <= dist) return false;
  }
  return true;
}

let _gScore = new Float32Array(0);
let _fScore = new Float32Array(0);
let _cameFrom = new Int32Array(0);
let _inOpen = new Uint8Array(0);
let _lastCells = 0;

function findBotPath(startX: number, startY: number, targetX: number, targetY: number, pSize: number): { x: number; y: number } {
  if (botLOS(startX, startY, targetX, targetY)) {
    const ang = Math.atan2(targetY - startY, targetX - startX);
    return { x: Math.cos(ang), y: Math.sin(ang) };
  }

  const CELL = 60;
  const cols = Math.ceil(worldW / CELL);
  const rows = Math.ceil(worldH / CELL);

  const startCol = Math.max(0, Math.min(cols - 1, Math.floor(startX / CELL)));
  const startRow = Math.max(0, Math.min(rows - 1, Math.floor(startY / CELL)));
  const targetCol = Math.max(0, Math.min(cols - 1, Math.floor(targetX / CELL)));
  const targetRow = Math.max(0, Math.min(rows - 1, Math.floor(targetY / CELL)));

  if (startCol === targetCol && startRow === targetRow) {
    const ang = Math.atan2(targetY - startY, targetX - startX);
    return { x: Math.cos(ang), y: Math.sin(ang) };
  }

  const isCellBlocked = (c: number, r: number): boolean => {
    if (c < 0 || c >= cols || r < 0 || r >= rows) return true;
    const cx = (c + 0.5) * CELL;
    const cy = (r + 0.5) * CELL;
    return pointInWall(cx, cy, pSize + 10);
  };

  const totalCells = cols * rows;
  if (totalCells > _lastCells) {
    _gScore = new Float32Array(totalCells);
    _fScore = new Float32Array(totalCells);
    _cameFrom = new Int32Array(totalCells);
    _inOpen = new Uint8Array(totalCells);
    _lastCells = totalCells;
  }
  _gScore.fill(Infinity, 0, totalCells);
  _fScore.fill(Infinity, 0, totalCells);
  _cameFrom.fill(-1, 0, totalCells);
  _inOpen.fill(0, 0, totalCells);
  const openSet: number[] = [];
  const gScore = _gScore;
  const fScore = _fScore;
  const cameFrom = _cameFrom;
  const inOpen = _inOpen;

  const startIdx = startRow * cols + startCol;
  const targetIdx = targetRow * cols + targetCol;

  gScore[startIdx] = 0;
  fScore[startIdx] = Math.hypot(startCol - targetCol, startRow - targetRow);
  openSet.push(startIdx);
  inOpen[startIdx] = 1;

  let steps = 0;
  const maxSteps = 250;

  while (openSet.length > 0 && steps++ < maxSteps) {
    let bestIdx = 0;
    let minF = fScore[openSet[0]];
    for (let i = 1; i < openSet.length; i++) {
      if (fScore[openSet[i]] < minF) {
        minF = fScore[openSet[i]];
        bestIdx = i;
      }
    }

    const current = openSet[bestIdx];
    if (current === targetIdx) break;

    openSet[bestIdx] = openSet[openSet.length - 1];
    openSet.pop();
    inOpen[current] = 0;

    const curR = Math.floor(current / cols);
    const curC = current % cols;

    const neighbors = [
      [curC + 1, curR, 1], [curC - 1, curR, 1],
      [curC, curR + 1, 1], [curC, curR - 1, 1],
      [curC + 1, curR + 1, 1.414], [curC - 1, curR + 1, 1.414],
      [curC + 1, curR - 1, 1.414], [curC - 1, curR - 1, 1.414]
    ];

    for (const [nc, nr, dist] of neighbors) {
      if (isCellBlocked(nc, nr)) continue;
      const nIdx = nr * cols + nc;
      const tentativeG = gScore[current] + dist;

      if (tentativeG < gScore[nIdx]) {
        cameFrom[nIdx] = current;
        gScore[nIdx] = tentativeG;
        fScore[nIdx] = tentativeG + Math.hypot(nc - targetCol, nr - targetRow);
        if (!inOpen[nIdx]) {
          openSet.push(nIdx);
          inOpen[nIdx] = 1;
        }
      }
    }
  }

  let curr = targetIdx;
  if (cameFrom[curr] === -1 && curr !== startIdx) {
    let closestIdx = startIdx;
    let minH = Infinity;
    for (let i = 0; i < totalCells; i++) {
      if (gScore[i] < Infinity && fScore[i] < minH) {
        minH = fScore[i];
        closestIdx = i;
      }
    }
    curr = closestIdx;
  }

  if (curr === startIdx) {
    const ang = Math.atan2(targetY - startY, targetX - startX);
    return { x: Math.cos(ang), y: Math.sin(ang) };
  }

  let traceLimit = 350;
  while (cameFrom[curr] !== -1 && cameFrom[curr] !== startIdx && traceLimit-- > 0) {
    curr = cameFrom[curr];
  }

  const wayR = Math.floor(curr / cols);
  const wayC = curr % cols;
  const wayX = (wayC + 0.5) * CELL;
  const wayY = (wayR + 0.5) * CELL;

  const ang = Math.atan2(wayY - startY, wayX - startX);
  return { x: Math.cos(ang), y: Math.sin(ang) };
}

self.onmessage = (e) => {
  const msg = e.data;
  if (msg.type === "init") {
    walls = msg.walls;
    worldW = msg.worldW;
    worldH = msg.worldH;
  } else if (msg.type === "path") {
    const res = findBotPath(msg.startX, msg.startY, msg.targetX, msg.targetY, msg.pSize);
    self.postMessage({
      type: "pathRes",
      reqId: msg.reqId,
      botId: msg.botId,
      dx: res.x,
      dy: res.y
    });
  }
};
