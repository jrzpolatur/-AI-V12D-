// ===========================================================================
// PIXEL SPRITES — Pure Grid-Based Retro Pixel Art Sprites & Frame Animations
// ===========================================================================

export interface PixelDecoration {
  x: number;
  y: number;
  kind: "bamboo" | "sakura" | "pine";
  height?: number;
  scale?: number;
}

/**
 * 🎋 像素竹林 (Bamboo Sprite)
 * 参考示例 1：深绿硬边缘、墨绿/翠绿竹节、白/淡绿竹环、顶部带 4 帧微风摇摆的分叉竹叶。
 */
export function drawPixelBamboo(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  height = 90,
  t = 0,
  scale = 2
) {
  ctx.save();
  const px = Math.round(x);
  const py = Math.round(y);
  const p = scale; // 1 pixel unit = p screen pixels

  // 4-frame cyclic wind sway
  const frame = Math.floor((t * 4) % 4);
  const sway = (frame === 0 ? 0 : frame === 1 ? 1 : frame === 2 ? 0 : -1) * p;

  const C_DARK = "#1a331e";      // 竹干深色黑绿边框
  const C_MAIN = "#2f5c2f";      // 竹节主绿色
  const C_LIGHT = "#5c964a";     // 竹身向阳高光
  const C_NODE = "#e8f5e9";      // 竹节白色横线
  const C_NODE_DARK = "#122615"; // 竹节下方暗线
  const C_LEAF = "#3d7338";      // 竹叶深绿
  const C_LEAF_HI = "#73b562";   // 竹叶亮绿

  // 1. 竹竿主体 (由若干段竹节组成)
  const segmentH = 16 * p;
  const numSegments = Math.max(3, Math.floor(height / (16 * p)));
  const stemW = 5 * p;

  for (let s = 0; s < numSegments; s++) {
    const segY = py - (s + 1) * segmentH;
    // 左暗边
    ctx.fillStyle = C_DARK;
    ctx.fillRect(px, segY, p, segmentH);
    // 右暗边
    ctx.fillRect(px + 4 * p, segY, p, segmentH);
    // 主色
    ctx.fillStyle = C_MAIN;
    ctx.fillRect(px + p, segY, 2 * p, segmentH);
    // 高光
    ctx.fillStyle = C_LIGHT;
    ctx.fillRect(px + 3 * p, segY, p, segmentH);

    // 竹节环 (横向环绕)
    ctx.fillStyle = C_NODE_DARK;
    ctx.fillRect(px, segY + segmentH - p, stemW, p);
    ctx.fillStyle = C_NODE;
    ctx.fillRect(px + p, segY + segmentH - 2 * p, 3 * p, p);
  }

  // 2. 顶部竹叶簇 (4 帧摇曳)
  const topY = py - numSegments * segmentH;
  const leafBaseX = px + 2 * p + sway;

  // 顶部竹尖
  ctx.fillStyle = C_DARK;
  ctx.fillRect(leafBaseX - p, topY - 2 * p, 3 * p, 2 * p);
  ctx.fillStyle = C_LIGHT;
  ctx.fillRect(leafBaseX, topY - 2 * p, p, 2 * p);

  // 左侧竹叶枝条
  ctx.fillStyle = C_LEAF;
  ctx.fillRect(leafBaseX - 4 * p, topY - 5 * p, 3 * p, 2 * p);
  ctx.fillRect(leafBaseX - 7 * p, topY - 3 * p, 4 * p, 2 * p);
  ctx.fillStyle = C_LEAF_HI;
  ctx.fillRect(leafBaseX - 6 * p, topY - 5 * p, 2 * p, p);
  ctx.fillRect(leafBaseX - 9 * p + sway, topY - p, 3 * p, 2 * p);

  // 右侧竹叶枝条
  ctx.fillStyle = C_LEAF;
  ctx.fillRect(leafBaseX + 2 * p, topY - 6 * p, 4 * p, 2 * p);
  ctx.fillRect(leafBaseX + 5 * p, topY - 4 * p, 4 * p, 2 * p);
  ctx.fillStyle = C_LEAF_HI;
  ctx.fillRect(leafBaseX + 3 * p, topY - 6 * p, 2 * p, p);
  ctx.fillRect(leafBaseX + 8 * p + sway, topY - 2 * p, 3 * p, 2 * p);

  ctx.restore();
}

/**
 * 🌸 像素樱花树 (Sakura Tree Sprite)
 * 参考示例 2：棕色像素树干与根须、层叠粉色方块树冠、阴影深粉底块、黄色花蕊与 6 帧掉落花瓣。
 */
export function drawPixelSakuraTree(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  t = 0,
  scale = 2
) {
  ctx.save();
  const px = Math.round(x);
  const py = Math.round(y);
  const p = scale;

  const C_TRUNK = "#6d411e";     // 树干棕色
  const C_TRUNK_D = "#45250c";   // 树干暗部
  const C_GRASS = "#4d7c2a";     // 树根草地
  const C_PINK_LIGHT = "#fed7e2";// 树冠亮粉
  const C_PINK_MID = "#f472b6";  // 树冠中粉
  const C_PINK_DARK = "#be185d"; // 树冠阴影暗粉
  const C_POLLEN = "#fef08a";    // 黄色花粉/花蕊点
  const C_BLUE_LEAF = "#1e3a8a"; // 蓝黑色缀叶

  // 1. 地面草须根基
  ctx.fillStyle = C_GRASS;
  for (let i = -10; i <= 10; i += 2) {
    ctx.fillRect(px + i * p, py - p, p, 2 * p);
  }

  // 2. 树干 (Z字型台阶状像素木质)
  ctx.fillStyle = C_TRUNK_D;
  ctx.fillRect(px - 2 * p, py - 6 * p, 5 * p, 6 * p);
  ctx.fillRect(px - p, py - 12 * p, 4 * p, 7 * p);
  ctx.fillStyle = C_TRUNK;
  ctx.fillRect(px - p, py - 6 * p, 3 * p, 5 * p);
  ctx.fillRect(px, py - 12 * p, 2 * p, 6 * p);

  // 3. 树冠多层粉色像素块群
  const crownY = py - 16 * p;

  // 树冠大方块团簇辅助函数
  const drawPinkCluster = (cx: number, cy: number, w: number, h: number, dark = false) => {
    ctx.fillStyle = dark ? C_PINK_DARK : C_PINK_MID;
    ctx.fillRect(px + cx * p, crownY + cy * p, w * p, h * p);
    ctx.fillStyle = dark ? C_PINK_MID : C_PINK_LIGHT;
    ctx.fillRect(px + (cx + 1) * p, crownY + (cy + 1) * p, (w - 2) * p, (h - 2) * p);
  };

  // 底层深粉暗块
  drawPinkCluster(-12, -4, 8, 7, true);
  drawPinkCluster(-4, -2, 9, 8, true);
  drawPinkCluster(5, -4, 8, 7, true);

  // 中层主树冠块
  drawPinkCluster(-14, -14, 10, 10);
  drawPinkCluster(-6, -18, 12, 12);
  drawPinkCluster(4, -14, 11, 10);
  drawPinkCluster(-10, -8, 9, 9);
  drawPinkCluster(1, -9, 10, 9);

  // 顶层小亮块
  drawPinkCluster(-4, -24, 8, 8);
  drawPinkCluster(3, -20, 7, 7);

  // 蓝黑横向缀叶装饰
  ctx.fillStyle = C_BLUE_LEAF;
  ctx.fillRect(px - 11 * p, crownY - 17 * p, 6 * p, p);
  ctx.fillRect(px - 2 * p, crownY - 20 * p, 7 * p, p);
  ctx.fillRect(px + 6 * p, crownY - 17 * p, 5 * p, p);

  // 黄色花蕊像素点
  ctx.fillStyle = C_POLLEN;
  ctx.fillRect(px - 8 * p, crownY - 10 * p, p, p);
  ctx.fillRect(px + 4 * p, crownY - 12 * p, p, p);
  ctx.fillRect(px - 1 * p, crownY - 15 * p, p, p);
  ctx.fillRect(px + 7 * p, crownY - 6 * p, p, p);
  ctx.fillRect(px - 11 * p, crownY - 3 * p, p, p);

  // 4. 6 帧掉落花瓣循环动画 (Falling Petals)
  const petalFrame = (t * 6) % 6;
  const petals = [
    { x: -14, y: -2, speed: 1.2, drift: -1 },
    { x: -6, y: 4, speed: 1.5, drift: 1 },
    { x: 2, y: 8, speed: 1.1, drift: 0 },
    { x: 10, y: -6, speed: 1.4, drift: 1 },
    { x: 14, y: 2, speed: 1.3, drift: -1 },
    { x: -2, y: 12, speed: 1.6, drift: 1 },
  ];

  ctx.fillStyle = C_PINK_MID;
  for (let i = 0; i < petals.length; i++) {
    const pt = petals[i];
    const dropY = ((petalFrame * pt.speed * 4 + i * 8) % 36) * p;
    const swayX = Math.sin((petalFrame + i) * 1.05) * 3 * p * pt.drift;
    const fx = px + pt.x * p + swayX;
    const fy = crownY + pt.y * p + dropY;
    if (fy <= py) {
      ctx.fillRect(Math.round(fx), Math.round(fy), 2 * p, 2 * p);
    }
  }

  ctx.restore();
}

/**
 * 🌲 像素常青松树 (Pine Tree Sprite - 4 帧微风)
 */
export function drawPixelPineTree(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  t = 0,
  scale = 2,
  snowy = false
) {
  ctx.save();
  const px = Math.round(x);
  const py = Math.round(y);
  const p = scale;
  const frame = Math.floor((t * 4) % 4);
  const sway = (frame === 1 ? 1 : frame === 3 ? -1 : 0) * p;

  const C_TRUNK = "#54381e";
  const C_DARK = "#0f381e";
  const C_PINE = "#1b5e20";
  const C_PINE_L = "#4caf50";

  // 树干
  ctx.fillStyle = C_TRUNK;
  ctx.fillRect(px - p, py - 6 * p, 3 * p, 6 * p);

  // 3 层塔形针叶
  const drawTier = (cy: number, w: number, h: number, off: number) => {
    ctx.fillStyle = C_DARK;
    ctx.fillRect(px - w * p + off, py - cy * p, (w * 2 + 1) * p, h * p);
    ctx.fillStyle = C_PINE;
    ctx.fillRect(px - (w - 1) * p + off, py - cy * p + p, (w * 2 - 1) * p, (h - 1) * p);
    ctx.fillStyle = C_PINE_L;
    ctx.fillRect(px + off, py - cy * p + p, (w - 1) * p, (h - 2) * p);

    // 冰雪地图厚积雪顶冠
    if (snowy) {
      ctx.fillStyle = "#f0f9ff";
      ctx.fillRect(px - (w - 1) * p + off, py - cy * p, (w * 2 - 1) * p, p);
      ctx.fillStyle = "#bae6fd";
      ctx.fillRect(px - (w - 2) * p + off, py - cy * p + p, 2 * p, p);
    }
  };

  drawTier(12, 8, 7, 0);
  drawTier(18, 6, 6, Math.floor(sway * 0.5));
  drawTier(24, 4, 6, sway);

  ctx.restore();
}

/**
 * 💥 4 帧纯像素枪口火焰 (Pixel Muzzle Flash)
 */
export function drawPixelMuzzleFlash(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  frame: number,
  scale = 2
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  const p = scale;

  const f = Math.max(0, Math.min(3, Math.floor(frame)));
  if (f >= 3) {
    ctx.restore();
    return;
  }

  const C_CORE = "#ffffff";
  const C_YELLOW = "#fde047";
  const C_ORANGE = "#f97316";

  if (f === 0) {
    // 帧 0: 最大爆发
    ctx.fillStyle = C_ORANGE;
    ctx.fillRect(0, -3 * p, 6 * p, 6 * p);
    ctx.fillRect(6 * p, -2 * p, 4 * p, 4 * p);
    ctx.fillStyle = C_YELLOW;
    ctx.fillRect(0, -2 * p, 5 * p, 4 * p);
    ctx.fillRect(5 * p, -p, 3 * p, 2 * p);
    ctx.fillStyle = C_CORE;
    ctx.fillRect(0, -p, 4 * p, 2 * p);
  } else if (f === 1) {
    // 帧 1: 尖峰突刺
    ctx.fillStyle = C_ORANGE;
    ctx.fillRect(2 * p, -2 * p, 6 * p, 4 * p);
    ctx.fillRect(8 * p, -p, 3 * p, 2 * p);
    ctx.fillStyle = C_YELLOW;
    ctx.fillRect(2 * p, -p, 5 * p, 2 * p);
  } else if (f === 2) {
    // 帧 2: 残火碎屑
    ctx.fillStyle = C_YELLOW;
    ctx.fillRect(5 * p, -p, 2 * p, 2 * p);
    ctx.fillRect(8 * p, p, 2 * p, 2 * p);
  }

  ctx.restore();
}

// ===========================================================================
// 🏛️ MAP-SPECIFIC PIXEL ARCHITECTURES (8 种主题地图专属像素建筑)
// ===========================================================================

/**
 * 🤠 西部牛仔木质沙龙 / 驿站建筑 (Saloon / Outpost)
 * 包含：挑檐木瓦、"SALOON" 像素木招牌、走廊木栏杆、木百叶窗与双开木门、屋顶水塔
 */
export function drawPixelSaloon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  _t = 0
) {
  ctx.save();
  const px = Math.round(x);
  const py = Math.round(y);
  const pw = Math.round(w);
  const ph = Math.round(h);

  // 1. 木质外墙板底色 (Horizontal wood planks)
  ctx.fillStyle = "#b45309";
  ctx.fillRect(px, py, pw, ph);

  // 木板横向拼接缝 (16px 间隔)
  ctx.fillStyle = "#78350f";
  for (let dy = 16; dy < ph; dy += 16) {
    ctx.fillRect(px, py + dy, pw, 2);
  }

  // 2. 顶部木质挑檐与牛腿装饰 (Roof Cornice & Brackets)
  ctx.fillStyle = "#92400e";
  ctx.fillRect(px - 4, py - 4, pw + 8, 8);
  ctx.fillStyle = "#d97706";
  ctx.fillRect(px - 4, py - 4, pw + 8, 2); // 挑檐向阳高光
  for (let bx = 0; bx < pw; bx += 16) {
    ctx.fillStyle = "#451a03";
    ctx.fillRect(px + bx, py + 4, 4, 6);
  }

  // 3. 楼顶招牌 (SALOON Sign Board)
  if (pw >= 80) {
    const signW = Math.min(pw - 24, 72);
    const signH = 16;
    const signX = px + Math.round((pw - signW) / 2);
    const signY = py - 18;

    // 招牌木板
    ctx.fillStyle = "#78350f";
    ctx.fillRect(signX, signY, signW, signH);
    ctx.fillStyle = "#d97706";
    ctx.fillRect(signX, signY, signW, 2);
    ctx.strokeStyle = "#451a03";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(signX, signY, signW, signH);

    // 像素英文 "SALOON" 点阵
    ctx.fillStyle = "#fef3c7";
    const textStartX = signX + Math.round((signW - 48) / 2);
    const textY = signY + 4;
    // S
    ctx.fillRect(textStartX, textY, 6, 2);
    ctx.fillRect(textStartX, textY + 2, 2, 2);
    ctx.fillRect(textStartX, textY + 4, 6, 2);
    ctx.fillRect(textStartX + 4, textY + 6, 2, 2);
    ctx.fillRect(textStartX, textY + 8, 6, 2);
    // A
    ctx.fillRect(textStartX + 8, textY, 6, 2);
    ctx.fillRect(textStartX + 8, textY + 2, 2, 8);
    ctx.fillRect(textStartX + 12, textY + 2, 2, 8);
    ctx.fillRect(textStartX + 8, textY + 4, 6, 2);
    // L
    ctx.fillRect(textStartX + 16, textY, 2, 10);
    ctx.fillRect(textStartX + 16, textY + 8, 6, 2);
    // O
    ctx.fillRect(textStartX + 24, textY, 6, 10);
    ctx.fillStyle = "#78350f";
    ctx.fillRect(textStartX + 26, textY + 2, 2, 6);
    ctx.fillStyle = "#fef3c7";
    // O
    ctx.fillRect(textStartX + 32, textY, 6, 10);
    ctx.fillStyle = "#78350f";
    ctx.fillRect(textStartX + 34, textY + 2, 2, 6);
    ctx.fillStyle = "#fef3c7";
    // N
    ctx.fillRect(textStartX + 40, textY, 2, 10);
    ctx.fillRect(textStartX + 44, textY, 2, 10);
    ctx.fillRect(textStartX + 42, textY + 4, 2, 2);
  }

  // 4. 木走廊栏杆 (Front Porch Railings with Cross Posts)
  const railH = 14;
  const railY = py + ph - railH;
  ctx.fillStyle = "rgba(40,15,5,0.4)";
  ctx.fillRect(px, railY - 2, pw, railH + 2); // 栏杆阴影
  ctx.fillStyle = "#d97706";
  ctx.fillRect(px, railY, pw, 3); // 扶手横木
  ctx.fillRect(px, railY + railH - 2, pw, 2); // 底部底梁
  // 栏杆立柱与X型交叉撑条
  for (let rx = 0; rx < pw - 12; rx += 18) {
    ctx.fillStyle = "#451a03";
    ctx.fillRect(px + rx, railY, 3, railH);
    ctx.fillStyle = "#92400e";
    ctx.fillRect(px + rx + 4, railY + 4, 8, 2);
    ctx.fillRect(px + rx + 4, railY + 8, 8, 2);
  }

  // 5. 暖色木格窗户 (Warm Lit Windows)
  const cols = Math.max(1, Math.floor((pw - 30) / 36));
  const rows = Math.max(1, Math.floor((ph - 40) / 32));
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      const wx = px + 16 + c * Math.round((pw - 32) / cols);
      const wy = py + 20 + r * Math.round((ph - 50) / rows);
      // 窗框
      ctx.fillStyle = "#451a03";
      ctx.fillRect(wx - 2, wy - 2, 18, 18);
      // 暖黄发光玻璃
      ctx.fillStyle = "#fef08a";
      ctx.fillRect(wx, wy, 14, 14);
      // 十字木窗棂
      ctx.fillStyle = "#451a03";
      ctx.fillRect(wx + 6, wy, 2, 14);
      ctx.fillRect(wx, wy + 6, 14, 2);
    }
  }

  // 6. 双开沙龙门 (Saloon Doors at bottom center)
  const doorW = 28;
  const doorH = 22;
  const doorX = px + Math.round((pw - doorW) / 2);
  const doorY = py + ph - doorH;
  ctx.fillStyle = "#451a03";
  ctx.fillRect(doorX, doorY, doorW, doorH);
  ctx.fillStyle = "#92400e";
  ctx.fillRect(doorX + 2, doorY + 2, doorW / 2 - 3, doorH - 4);
  ctx.fillRect(doorX + doorW / 2 + 1, doorY + 2, doorW / 2 - 3, doorH - 4);
  // 门把手像素
  ctx.fillStyle = "#fde047";
  ctx.fillRect(doorX + doorW / 2 - 4, doorY + Math.round(doorH / 2), 2, 3);
  ctx.fillRect(doorX + doorW / 2 + 2, doorY + Math.round(doorH / 2), 2, 3);

  // 外围硬黑描边
  ctx.strokeStyle = "#291302";
  ctx.lineWidth = 2;
  ctx.strokeRect(px, py, pw, ph);

  ctx.restore();
}

/**
 * 🏙️ 赛博大厦高科技天台 (Cyber Rooftop Infrastructure)
 * 包含：直升机停机坪 [ H ]、4 帧旋转排气扇、全息发光霓虹广告牌、控制机柜与电缆
 */
export function drawPixelCyberRooftop(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  t = 0,
  accent = "#00f0ff"
) {
  ctx.save();
  const px = Math.round(x);
  const py = Math.round(y);
  const pw = Math.round(w);
  const ph = Math.round(h);

  // 1. 深色合金天台地面 (Steel tile floor)
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(px, py, pw, ph);

  // 地面防滑网格线条 (24px 间距)
  ctx.fillStyle = "#1e293b";
  for (let gx = 16; gx < pw; gx += 20) ctx.fillRect(px + gx, py, 2, ph);
  for (let gy = 16; gy < ph; gy += 20) ctx.fillRect(px, py + gy, pw, 2);

  // 2. 停机坪矩阵 [ H ] (Helipad Mark)
  const heliSz = Math.min(pw * 0.45, ph * 0.45, 48);
  if (heliSz >= 24) {
    const hx = px + Math.round((pw - heliSz) / 2);
    const hy = py + Math.round((ph - heliSz) / 2);
    // 黄色停机方框
    ctx.strokeStyle = "#facc15";
    ctx.lineWidth = 2;
    ctx.strokeRect(hx, hy, heliSz, heliSz);
    // "H" 标志
    ctx.fillStyle = "#facc15";
    const hThick = Math.max(3, Math.round(heliSz * 0.18));
    ctx.fillRect(hx + 5, hy + 5, hThick, heliSz - 10);
    ctx.fillRect(hx + heliSz - 5 - hThick, hy + 5, hThick, heliSz - 10);
    ctx.fillRect(hx + 5, hy + Math.round((heliSz - hThick) / 2), heliSz - 10, hThick);
  }

  // 3. 4 帧旋转排气扇 (4-Frame Animated Exhaust Fan)
  const fanSz = 20;
  const fanX = px + 12;
  const fanY = py + 12;
  ctx.fillStyle = "#020617";
  ctx.fillRect(fanX, fanY, fanSz, fanSz);
  ctx.strokeStyle = "#334155";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(fanX, fanY, fanSz, fanSz);
  // 4 帧风扇叶片
  const fanFrame = Math.floor((t * 12) % 4);
  ctx.fillStyle = "#94a3b8";
  const fcx = fanX + 10;
  const fcy = fanY + 10;
  if (fanFrame === 0) {
    ctx.fillRect(fcx - 1, fanY + 2, 2, 16);
    ctx.fillRect(fanX + 2, fcy - 1, 16, 2);
  } else if (fanFrame === 1) {
    ctx.fillRect(fcx - 5, fcy - 5, 10, 2);
    ctx.fillRect(fcx + 3, fcy + 3, 2, 2);
    ctx.fillRect(fcx - 5, fcy + 3, 10, 2);
  } else if (fanFrame === 2) {
    ctx.fillRect(fanX + 2, fcy - 1, 16, 2);
    ctx.fillRect(fcx - 1, fanY + 2, 2, 16);
  } else {
    ctx.fillRect(fcx - 6, fcy - 6, 12, 2);
    ctx.fillRect(fcx - 6, fcy + 4, 12, 2);
  }

  // 4. 全息霓虹广告条 (Flickering Hologram Sign)
  const holoW = Math.min(pw - 30, 60);
  const holoX = px + pw - holoW - 10;
  const holoY = py + ph - 16;
  const pulse = Math.sin(t * 8) > 0.1 ? 1 : 0.4;
  ctx.fillStyle = accent;
  ctx.globalAlpha = pulse * 0.85;
  ctx.fillRect(holoX, holoY, holoW, 8);
  ctx.globalAlpha = 1.0;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(holoX + 4, holoY + 2, holoW - 8, 4);

  // 5. 变压器机柜与发光线缆 (Power Terminal & Neon Conduits)
  ctx.fillStyle = "#1e293b";
  ctx.fillRect(px + pw - 24, py + 8, 16, 16);
  ctx.strokeStyle = "#475569";
  ctx.lineWidth = 1;
  ctx.strokeRect(px + pw - 24, py + 8, 16, 16);
  // 信号灯红绿
  ctx.fillStyle = (Math.floor(t * 3) % 2 === 0) ? "#22c55e" : "#ef4444";
  ctx.fillRect(px + pw - 20, py + 12, 3, 3);
  ctx.fillRect(px + pw - 14, py + 12, 3, 3);

  // 赛博边缘霓虹光条
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2;
  ctx.strokeRect(px, py, pw, ph);

  ctx.restore();
}

/**
 * 🏜️ 沙漠土坯石殿碉堡 (Adobe Sandstone Fortress)
 * 包含：砂岩阶梯垛口 (Crenellations)、红白条纹遮阳帆布棚、拱形神龛、砂岩浮雕
 */
export function drawPixelDesertFort(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  _t = 0
) {
  ctx.save();
  const px = Math.round(x);
  const py = Math.round(y);
  const pw = Math.round(w);
  const ph = Math.round(h);

  // 1. 砂岩土坯主体 (Sandstone Adobe body)
  ctx.fillStyle = "#d97706";
  ctx.fillRect(px, py, pw, ph);

  // 砖石水平拼接层
  ctx.fillStyle = "#b45309";
  for (let dy = 14; dy < ph; dy += 14) {
    ctx.fillRect(px, py + dy, pw, 2);
  }

  // 2. 顶部阶梯式垛口 (Stepped Crenellations)
  const cWidth = 12;
  ctx.fillStyle = "#f59e0b";
  for (let bx = 0; bx < pw; bx += cWidth * 2) {
    ctx.fillRect(px + bx, py - 6, cWidth, 6);
  }

  // 3. 红白条纹帆布遮阳蓬 (Striped Awning over portal)
  const awnW = Math.min(pw * 0.5, 48);
  const awnH = 14;
  const awnX = px + Math.round((pw - awnW) / 2);
  const awnY = py + ph - 24;

  ctx.fillStyle = "#ef4444";
  ctx.fillRect(awnX, awnY, awnW, awnH);
  // 白色交替条纹
  ctx.fillStyle = "#fef3c7";
  for (let ax = 0; ax < awnW; ax += 8) {
    ctx.fillRect(awnX + ax, awnY, 4, awnH);
  }
  // 底部波浪下摆
  for (let ax = 0; ax < awnW; ax += 6) {
    ctx.fillRect(awnX + ax, awnY + awnH, 4, 3);
  }

  // 4. 深色拱门入口
  ctx.fillStyle = "#451a03";
  ctx.fillRect(awnX + 6, awnY + awnH - 2, awnW - 12, 12);

  // 5. 砂岩浮雕窗龛 (Carved Adobe Windows)
  const cols = Math.max(1, Math.floor((pw - 20) / 36));
  for (let i = 0; i < cols; i++) {
    const wx = px + 12 + i * Math.round((pw - 24) / cols);
    const wy = py + 16;
    ctx.fillStyle = "#78350f";
    ctx.fillRect(wx, wy, 12, 16);
    ctx.fillStyle = "#fde047";
    ctx.fillRect(wx + 3, wy + 3, 6, 10);
  }

  ctx.strokeStyle = "#78350f";
  ctx.lineWidth = 2;
  ctx.strokeRect(px, py, pw, ph);

  ctx.restore();
}

/**
 * 🌿 丛林古代石殿与图腾神庙 (Ancient Jungle Stone Temple)
 * 包含：青苔石块、垂挂藤蔓、屋顶发光图腾符文 (4 帧脉冲)、石阶基座
 */
export function drawPixelJungleTemple(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  t = 0
) {
  ctx.save();
  const px = Math.round(x);
  const py = Math.round(y);
  const pw = Math.round(w);
  const ph = Math.round(h);

  // 1. 青苔古代石砖 (Mossy ancient stone body)
  ctx.fillStyle = "#15803d";
  ctx.fillRect(px, py, pw, ph);

  // 深绿砖块缝隙
  ctx.fillStyle = "#14532d";
  for (let dy = 16; dy < ph; dy += 16) ctx.fillRect(px, py + dy, pw, 2);
  for (let dx = 20; dx < pw; dx += 24) ctx.fillRect(px + dx, py, 2, ph);

  // 2. 垂挂的像素藤蔓 (Hanging Pixel Vines)
  ctx.fillStyle = "#86efac";
  for (let vx = 8; vx < pw - 8; vx += 18) {
    const vineLen = 6 + ((vx * 17) % 18);
    ctx.fillRect(px + vx, py, 3, vineLen);
    ctx.fillRect(px + vx - 2, py + vineLen - 4, 3, 3); // 侧边小叶
  }

  // 3. 4 帧发光古代符文石碑 (4-Frame Glowing Rune Stone)
  const runeSz = 24;
  const rx = px + Math.round((pw - runeSz) / 2);
  const ry = py + Math.round((ph - runeSz) / 2);
  ctx.fillStyle = "#064e3b";
  ctx.fillRect(rx, ry, runeSz, runeSz);
  ctx.strokeStyle = "#022c22";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(rx, ry, runeSz, runeSz);

  // 脉冲发光符文
  const runeFrame = Math.floor((t * 4) % 4);
  ctx.fillStyle = (runeFrame === 0 || runeFrame === 2) ? "#4ade80" : "#bbf7d0";
  ctx.fillRect(rx + 6, ry + 4, 12, 3);
  ctx.fillRect(rx + 10, ry + 7, 4, 10);
  ctx.fillRect(rx + 4, ry + 17, 16, 3);

  // 4. 石殿台阶 (Stone base steps)
  ctx.fillStyle = "#166534";
  ctx.fillRect(px - 4, py + ph - 6, pw + 8, 8);
  ctx.fillStyle = "#4ade80";
  ctx.fillRect(px - 4, py + ph - 6, pw + 8, 2);

  ctx.strokeStyle = "#052e16";
  ctx.lineWidth = 2;
  ctx.strokeRect(px, py, pw, ph);

  ctx.restore();
}

/**
 * ❄️ 极地科考雷达站 (Arctic Research Bunker)
 * 包含：倾斜防雪金属顶板、黄色对角警示条纹、旋转雷达天线、防寒气密舱门
 */
export function drawPixelArcticBunker(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  t = 0,
  _accent = "#38bdf8"
) {
  ctx.save();
  const px = Math.round(x);
  const py = Math.round(y);
  const pw = Math.round(w);
  const ph = Math.round(h);

  // 1. 保温活动板房金属墙 (Insulated bunker panel)
  ctx.fillStyle = "#0284c7";
  ctx.fillRect(px, py, pw, ph);

  // 2. 顶部厚厚积雪顶冠 (Thick Snow Cap)
  ctx.fillStyle = "#f0f9ff";
  ctx.fillRect(px - 3, py - 5, pw + 6, 8);
  ctx.fillStyle = "#e0f2fe";
  ctx.fillRect(px - 3, py + 3, pw + 6, 2);

  // 3. 黄黑对角警示条纹 (Yellow/Black Hazard Stripes)
  const hazH = 6;
  const hazY = py + ph - hazH;
  ctx.fillStyle = "#facc15";
  ctx.fillRect(px, hazY, pw, hazH);
  ctx.fillStyle = "#0f172a";
  for (let hx = 0; hx < pw; hx += 12) {
    ctx.fillRect(px + hx, hazY, 6, hazH);
  }

  // 4. 旋转雷达天线 (Rotating Radar Dish)
  const radX = px + 16;
  const radY = py - 14;
  ctx.fillStyle = "#94a3b8";
  ctx.fillRect(radX - 1, radY + 6, 3, 10); // 天线杆
  // 4 帧雷达天线锅朝向
  const radFrame = Math.floor((t * 6) % 4);
  ctx.fillStyle = "#f8fafc";
  if (radFrame === 0) {
    ctx.fillRect(radX - 8, radY, 16, 6);
    ctx.fillStyle = "#ef4444";
    ctx.fillRect(radX - 1, radY - 2, 2, 2);
  } else if (radFrame === 1) {
    ctx.fillRect(radX - 4, radY - 2, 8, 8);
    ctx.fillStyle = "#ef4444";
    ctx.fillRect(radX + 3, radY - 4, 2, 2);
  } else if (radFrame === 2) {
    ctx.fillRect(radX - 8, radY, 16, 6);
    ctx.fillStyle = "#ef4444";
    ctx.fillRect(radX - 1, radY - 2, 2, 2);
  } else {
    ctx.fillRect(radX - 4, radY - 2, 8, 8);
    ctx.fillStyle = "#ef4444";
    ctx.fillRect(radX - 5, radY - 4, 2, 2);
  }

  // 5. 冰蓝防寒发光窗户 (Icy Glowing Windows)
  const cols = Math.max(1, Math.floor((pw - 20) / 30));
  for (let c = 0; c < cols; c++) {
    const wx = px + 12 + c * Math.round((pw - 24) / cols);
    const wy = py + 14;
    ctx.fillStyle = "#0c4a6e";
    ctx.fillRect(wx, wy, 14, 14);
    ctx.fillStyle = "#38bdf8";
    ctx.fillRect(wx + 2, wy + 2, 10, 10);
  }

  // 6. 强化气密舱门 (Bulkhead Door at bottom center)
  const doorW = 20;
  const doorH = 20;
  const doorX = px + Math.round((pw - doorW) / 2);
  const doorY = py + ph - doorH - hazH;
  ctx.fillStyle = "#075985";
  ctx.fillRect(doorX, doorY, doorW, doorH);
  ctx.fillStyle = "#38bdf8";
  ctx.fillRect(doorX + Math.round(doorW / 2) - 2, doorY + 6, 4, 4);

  ctx.strokeStyle = "#082f49";
  ctx.lineWidth = 2;
  ctx.strokeRect(px, py, pw, ph);

  ctx.restore();
}

/**
 * 🌋 末日废墟残破厂房 (Ruined Industrial Factory)
 * 包含：坍塌断壁缺口、外露钢筋混凝土、碎石瓦砾堆、生化警戒标志
 */
export function drawPixelRuinFactory(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  _t = 0
) {
  ctx.save();
  const px = Math.round(x);
  const py = Math.round(y);
  const pw = Math.round(w);
  const ph = Math.round(h);

  // 1. 残破红砖外墙 (Cracked red brick body)
  ctx.fillStyle = "#b91c1c";
  ctx.fillRect(px, py, pw, ph);

  // 水平砖缝
  ctx.fillStyle = "#7f1d1d";
  for (let dy = 12; dy < ph; dy += 12) ctx.fillRect(px, py + dy, pw, 2);

  // 2. 坍塌破损的顶部缺口 (Broken jagged top collapse)
  ctx.fillStyle = "#0b0c22"; // 露空背景色
  ctx.fillRect(px + 10, py, Math.round(pw * 0.35), 8);
  ctx.fillRect(px + 18, py, Math.round(pw * 0.2), 14);

  // 3. 外露生锈钢筋 (Exposed Rebar Grid protruding from ruins)
  ctx.fillStyle = "#ea580c";
  ctx.fillRect(px + 14, py - 8, 2, 10);
  ctx.fillRect(px + 22, py - 12, 2, 14);
  ctx.fillRect(px + 30, py - 6, 2, 8);
  ctx.fillRect(px + 12, py - 4, 20, 2); // 横向钢筋绑扎

  // 4. 生化骷髅/警戒标志 (Biohazard / Warning Stencil)
  const warnSz = 18;
  const wx = px + Math.round((pw - warnSz) / 2);
  const wy = py + Math.round((ph - warnSz) / 2);
  ctx.fillStyle = "#facc15";
  ctx.fillRect(wx, wy, warnSz, warnSz);
  ctx.fillStyle = "#000000";
  ctx.fillRect(wx + 4, wy + 4, 10, 10);
  ctx.fillStyle = "#facc15";
  ctx.fillRect(wx + 7, wy + 7, 4, 4);

  // 5. 底部散落的碎砖瓦砾堆 (Rubble and Debris at Base)
  ctx.fillStyle = "#450a0a";
  for (let rx = 6; rx < pw - 10; rx += 14) {
    ctx.fillRect(px + rx, py + ph - 6, 8, 6);
    ctx.fillRect(px + rx + 2, py + ph - 8, 4, 3);
  }

  ctx.strokeStyle = "#450a0a";
  ctx.lineWidth = 2;
  ctx.strokeRect(px, py, pw, ph);

  ctx.restore();
}

// ===========================================================================
// 🌲 16-BIT RPG PIXEL ENVIRONMENT & STORYTELLING PROPS
// (Inspired by classic 16-bit RPGs: lush layered trees, flower bushes,
//  benches, picnic tables, lanterns, ponds, ruins with ivy, and cabin shops)
// ===========================================================================

/**
 * 🌳 16-bit 繁茂阔叶橡树 (Lush Layered RPG Tree)
 * 包含：深色抓地树根、分层圆润叶簇（底暗/中翠/顶亮向阳绿）、微风摇曳与树荫
 */
export function drawPixelLushTree(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  t = 0,
  scale = 2
) {
  ctx.save();
  const px = Math.round(x);
  const py = Math.round(y);
  const p = scale;

  // 4-frame gentle breeze sway
  const frame = Math.floor((t * 3) % 4);
  const sway = (frame === 1 ? 1 : frame === 3 ? -1 : 0) * p;

  const C_SHADOW = "rgba(10,25,18,0.38)";
  const C_TRUNK_D = "#38220f";
  const C_TRUNK_M = "#5c3818";
  const C_TRUNK_L = "#8c5b2c";
  const C_LEAF_DARK = "#123820";
  const C_LEAF_SHADOW = "#1b4d2e";
  const C_LEAF_MID = "#2e7d32";
  const C_LEAF_LIGHT = "#4caf50";
  const C_LEAF_SUN = "#81c784";

  // 1. 地面深色椭圆阴影
  ctx.fillStyle = C_SHADOW;
  ctx.fillRect(px - 14 * p, py - 3 * p, 28 * p, 7 * p);
  ctx.fillRect(px - 10 * p, py - 5 * p, 20 * p, 11 * p);

  // 2. 强壮树根与树干
  ctx.fillStyle = C_TRUNK_D;
  ctx.fillRect(px - 4 * p, py - 10 * p, 8 * p, 10 * p);
  ctx.fillRect(px - 7 * p, py - 3 * p, 14 * p, 4 * p); // 盘根
  ctx.fillStyle = C_TRUNK_M;
  ctx.fillRect(px - 3 * p, py - 10 * p, 5 * p, 9 * p);
  ctx.fillRect(px - 5 * p, py - 2 * p, 10 * p, 2 * p);
  ctx.fillStyle = C_TRUNK_L;
  ctx.fillRect(px - p, py - 9 * p, 2 * p, 8 * p); // 树干向阳高光线

  // 3. 繁茂分层树冠 (多团圆润叶簇堆叠)
  const crownY = py - 12 * p;

  const drawLobe = (cx: number, cy: number, w: number, h: number, offX = 0) => {
    const lx = px + cx * p + offX;
    const ly = crownY + cy * p;
    // 深色外轮廓
    ctx.fillStyle = C_LEAF_DARK;
    ctx.fillRect(lx, ly, w * p, h * p);
    // 暗底阴影
    ctx.fillStyle = C_LEAF_SHADOW;
    ctx.fillRect(lx + p, ly + p, (w - 2) * p, (h - 2) * p);
    // 中间固有色
    ctx.fillStyle = C_LEAF_MID;
    ctx.fillRect(lx + p, ly + p, (w - 2) * p, (h - 4) * p);
    // 向阳亮面
    ctx.fillStyle = C_LEAF_LIGHT;
    ctx.fillRect(lx + 2 * p, ly + p, (w - 4) * p, Math.max(1, (h - 6)) * p);
    // 顶部向阳高光点
    ctx.fillStyle = C_LEAF_SUN;
    ctx.fillRect(lx + 3 * p, ly + p, Math.max(1, (w - 6)) * p, p);
  };

  // 底层左右侧叶簇
  drawLobe(-16, -6, 12, 10, 0);
  drawLobe(4, -6, 12, 10, 0);
  drawLobe(-6, -4, 12, 10, 0);

  // 中层大叶簇
  drawLobe(-18, -16, 14, 12, Math.floor(sway * 0.5));
  drawLobe(4, -16, 14, 12, Math.floor(sway * 0.5));
  drawLobe(-8, -14, 16, 14, Math.floor(sway * 0.5));

  // 顶层迎阳叶簇
  drawLobe(-12, -26, 12, 12, sway);
  drawLobe(0, -26, 12, 12, sway);
  drawLobe(-6, -30, 12, 10, sway);

  ctx.restore();
}

/**
 * 🌺 16-bit 繁花灌木丛 (Bush with Colorful Wildflowers)
 */
export function drawPixelBushWithFlowers(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  flowerColor = "#f472b6",
  scale = 2
) {
  ctx.save();
  const px = Math.round(x);
  const py = Math.round(y);
  const p = scale;

  // 阴影
  ctx.fillStyle = "rgba(10,25,18,0.3)";
  ctx.fillRect(px - 10 * p, py - 2 * p, 20 * p, 4 * p);

  // 灌木绿叶块 (3层色阶)
  ctx.fillStyle = "#143d22"; // 暗轮廓
  ctx.fillRect(px - 9 * p, py - 7 * p, 18 * p, 7 * p);
  ctx.fillRect(px - 6 * p, py - 9 * p, 12 * p, 9 * p);

  ctx.fillStyle = "#2d6a4f"; // 中绿
  ctx.fillRect(px - 8 * p, py - 6 * p, 16 * p, 5 * p);
  ctx.fillRect(px - 5 * p, py - 8 * p, 10 * p, 7 * p);

  ctx.fillStyle = "#52b788"; // 亮绿
  ctx.fillRect(px - 6 * p, py - 7 * p, 5 * p, 3 * p);
  ctx.fillRect(px + p, py - 8 * p, 5 * p, 3 * p);

  // 点缀野花 (十字 4 像素 + 黄色花蕊)
  const flowers = [
    { dx: -5, dy: -5 },
    { dx: 3, dy: -6 },
    { dx: -2, dy: -3 },
    { dx: 5, dy: -3 },
  ];
  for (const fl of flowers) {
    const fx = px + fl.dx * p;
    const fy = py + fl.dy * p;
    ctx.fillStyle = flowerColor;
    ctx.fillRect(fx, fy - p, p, 3 * p);
    ctx.fillRect(fx - p, fy, 3 * p, p);
    ctx.fillStyle = "#fef08a"; // 黄色花蕊
    ctx.fillRect(fx, fy, p, p);
  }

  ctx.restore();
}

/**
 * 🪑 16-bit 公园铁艺木条长椅 (Park Wooden Bench)
 */
export function drawPixelParkBench(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale = 2
) {
  ctx.save();
  const px = Math.round(x);
  const py = Math.round(y);
  const p = scale;

  // 阴影
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.fillRect(px - 14 * p, py + p, 28 * p, 3 * p);

  // 铁艺支架 (深墨绿/黑铁)
  ctx.fillStyle = "#1e293b";
  ctx.fillRect(px - 12 * p, py - 6 * p, 2 * p, 8 * p); // 左腿
  ctx.fillRect(px + 10 * p, py - 6 * p, 2 * p, 8 * p); // 右腿
  ctx.fillRect(px - 13 * p, py - 8 * p, 3 * p, 3 * p); // 左扶手
  ctx.fillRect(px + 10 * p, py - 8 * p, 3 * p, 3 * p); // 右扶手

  // 靠背木条 (3 条带高光)
  ctx.fillStyle = "#78350f";
  ctx.fillRect(px - 11 * p, py - 12 * p, 22 * p, 2 * p);
  ctx.fillRect(px - 11 * p, py - 9 * p, 22 * p, 2 * p);
  ctx.fillStyle = "#d97706";
  ctx.fillRect(px - 11 * p, py - 12 * p, 22 * p, p);
  ctx.fillRect(px - 11 * p, py - 9 * p, 22 * p, p);

  // 座垫木条 (2 条向前延伸)
  ctx.fillStyle = "#92400e";
  ctx.fillRect(px - 12 * p, py - 5 * p, 24 * p, 2 * p);
  ctx.fillRect(px - 12 * p, py - 3 * p, 24 * p, 2 * p);
  ctx.fillStyle = "#f59e0b";
  ctx.fillRect(px - 12 * p, py - 5 * p, 24 * p, p);
  ctx.fillRect(px - 12 * p, py - 3 * p, 24 * p, p);

  ctx.restore();
}

/**
 * 🥪 16-bit 野餐木桌与餐点 (Picnic Table with Food & Drinks)
 */
export function drawPixelPicnicTable(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale = 2
) {
  ctx.save();
  const px = Math.round(x);
  const py = Math.round(y);
  const p = scale;

  // 阴影
  ctx.fillStyle = "rgba(0,0,0,0.32)";
  ctx.fillRect(px - 16 * p, py + 2 * p, 32 * p, 5 * p);

  // A字形木桌腿与侧凳
  ctx.fillStyle = "#451a03";
  ctx.fillRect(px - 14 * p, py - 4 * p, 3 * p, 7 * p); // 左凳
  ctx.fillRect(px + 11 * p, py - 4 * p, 3 * p, 7 * p); // 右凳
  ctx.fillRect(px - 8 * p, py - 4 * p, 16 * p, 6 * p);  // 中桌架

  // 上下两侧长条木凳面
  ctx.fillStyle = "#b45309";
  ctx.fillRect(px - 15 * p, py - 5 * p, 5 * p, 2 * p);
  ctx.fillRect(px + 10 * p, py - 5 * p, 5 * p, 2 * p);
  ctx.fillStyle = "#f59e0b";
  ctx.fillRect(px - 15 * p, py - 5 * p, 5 * p, p);
  ctx.fillRect(px + 10 * p, py - 5 * p, 5 * p, p);

  // 主桌面木板
  ctx.fillStyle = "#78350f";
  ctx.fillRect(px - 10 * p, py - 11 * p, 20 * p, 7 * p);
  ctx.fillStyle = "#b45309";
  ctx.fillRect(px - 9 * p, py - 10 * p, 18 * p, 5 * p);

  // 红白相间野餐布
  ctx.fillStyle = "#ef4444";
  ctx.fillRect(px - 7 * p, py - 9 * p, 14 * p, 4 * p);
  ctx.fillStyle = "#f8fafc";
  for (let i = -7; i < 7; i += 4) {
    ctx.fillRect(px + i * p, py - 9 * p, 2 * p, 2 * p);
    ctx.fillRect(px + (i + 2) * p, py - 7 * p, 2 * p, 2 * p);
  }

  // 桌面道具：面包、果盘、玻璃饮料瓶
  // 面包/水果
  ctx.fillStyle = "#d97706";
  ctx.fillRect(px - 5 * p, py - 12 * p, 4 * p, 2 * p);
  ctx.fillStyle = "#fde047";
  ctx.fillRect(px - 4 * p, py - 12 * p, 2 * p, p);

  // 绿色玻璃饮料瓶
  ctx.fillStyle = "#059669";
  ctx.fillRect(px + 3 * p, py - 14 * p, 2 * p, 4 * p);
  ctx.fillStyle = "#a7f3d0";
  ctx.fillRect(px + 3 * p, py - 13 * p, p, 2 * p);

  // 白色餐盘
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(px - p, py - 9 * p, 3 * p, 2 * p);

  ctx.restore();
}

/**
 * 🏮 16-bit 铸铁暖光路灯 (Rustic Street Lantern with Warm Glow)
 */
export function drawPixelStreetLantern(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  t = 0,
  scale = 2
) {
  ctx.save();
  const px = Math.round(x);
  const py = Math.round(y);
  const p = scale;

  // 阴影
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.fillRect(px - 4 * p, py - p, 8 * p, 3 * p);

  // 铁艺灯杆与基座
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(px - 3 * p, py - 3 * p, 6 * p, 3 * p); // 基座
  ctx.fillRect(px - p, py - 20 * p, 2 * p, 18 * p);   // 竖杆
  ctx.fillRect(px - 4 * p, py - 18 * p, 8 * p, 2 * p); // 装饰横翼
  ctx.fillRect(px - 3 * p, py - 24 * p, 6 * p, 2 * p); // 顶盖

  // 灯笼玻璃罩与暖光
  const pulse = Math.sin(t * 5) * 0.15;
  ctx.fillStyle = "#f59e0b"; // 橙黄外晕
  ctx.fillRect(px - 3 * p, py - 22 * p, 6 * p, 4 * p);
  ctx.fillStyle = "#fef08a"; // 亮黄灯芯
  ctx.fillRect(px - 2 * p, py - 21 * p, 4 * p, 2 * p);
  ctx.fillStyle = "#ffffff"; // 白炽光核心
  ctx.fillRect(px - p, py - 21 * p, 2 * p, p);

  // 地面温暖微光 (像素光斑)
  ctx.fillStyle = `rgba(253, 224, 71, ${0.12 + pulse})`;
  ctx.fillRect(px - 10 * p, py - 4 * p, 20 * p, 8 * p);
  ctx.fillRect(px - 6 * p, py - 6 * p, 12 * p, 12 * p);

  ctx.restore();
}

/**
 * 🌊 16-bit 鹅卵石水潭与睡莲 (Organic Pond with Shimmer & Lilies)
 */
export function drawPixelPond(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w = 100,
  h = 60,
  t = 0
) {
  ctx.save();
  const px = Math.round(x);
  const py = Math.round(y);
  const pw = Math.round(w);
  const ph = Math.round(h);

  // 1. 泥土外缘过渡圈
  ctx.fillStyle = "#78350f";
  ctx.fillRect(px - 6, py - 6, pw + 12, ph + 12);

  // 2. 环湖鹅卵石岸边 (Stepped Pebble Rim)
  ctx.fillStyle = "#64748b";
  ctx.fillRect(px - 4, py - 4, pw + 8, ph + 8);
  ctx.fillStyle = "#94a3b8"; // 岸石高光
  for (let sx = 0; sx < pw; sx += 12) {
    ctx.fillRect(px + sx, py - 4, 6, 3);
    ctx.fillRect(px + sx + 4, py + ph + 1, 6, 3);
  }

  // 3. 深水区 (Sapphire Deep Water Base)
  ctx.fillStyle = "#0c4a6e";
  ctx.fillRect(px, py, pw, ph);

  // 4. 浅水泛光与波光粼粼 (Shimmering Water Layer)
  ctx.fillStyle = "#0284c7";
  ctx.fillRect(px + 4, py + 4, pw - 8, ph - 8);

  const waveOffset = Math.floor((t * 4) % 8);
  ctx.fillStyle = "rgba(56, 189, 248, 0.4)";
  for (let wy = 8; wy < ph - 8; wy += 10) {
    const wx = (wy * 7 + waveOffset * 4) % (pw - 20);
    ctx.fillRect(px + 6 + wx, py + wy, 14, 2);
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    ctx.fillRect(px + 10 + wx, py + wy, 6, 1);
    ctx.fillStyle = "rgba(56, 189, 248, 0.4)";
  }

  // 5. 漂浮睡莲与莲花 (Water Lily Pads & Pink Lotus)
  const lilies = [
    { lx: 14, ly: 12 },
    { lx: pw - 24, ly: 16 },
    { lx: 28, ly: ph - 18 },
  ];
  for (const lily of lilies) {
    // 绿色荷叶
    ctx.fillStyle = "#15803d";
    ctx.fillRect(px + lily.lx, py + lily.ly, 8, 6);
    ctx.fillStyle = "#4ade80";
    ctx.fillRect(px + lily.lx + 1, py + lily.ly + 1, 6, 4);
    // 荷叶缺角
    ctx.fillStyle = "#0284c7";
    ctx.fillRect(px + lily.lx + 5, py + lily.ly + 2, 2, 2);
    // 粉白小莲花
    ctx.fillStyle = "#f472b6";
    ctx.fillRect(px + lily.lx + 2, py + lily.ly - 2, 4, 3);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(px + lily.lx + 3, py + lily.ly - 1, 2, 1);
  }

  ctx.restore();
}

/**
 * 🏛️ 16-bit 苔藓石砖遗迹与藤蔓 (Ancient Mossy Stone Ruins with Climbing Ivy)
 */
export function drawPixelStoneRuins(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number
) {
  ctx.save();
  const px = Math.round(x);
  const py = Math.round(y);
  const pw = Math.round(w);
  const ph = Math.round(h);

  // 阴影
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(px - 2, py + ph + 2, pw + 4, 6);

  // 1. 石砖基底 (Slate Stone Brick Body)
  ctx.fillStyle = "#334155";
  ctx.fillRect(px, py, pw, ph);

  // 2. 拼贴石砖缝隙 (Brick Joint Lines)
  ctx.fillStyle = "#1e293b";
  const rowH = 10;
  for (let ry = 0; ry < ph; ry += rowH) {
    ctx.fillRect(px, py + ry, pw, 2); // 横向砖缝
    const isOdd = Math.floor(ry / rowH) % 2 === 1;
    const colStep = 20;
    const offX = isOdd ? 10 : 0;
    for (let cx = offX; cx < pw; cx += colStep) {
      ctx.fillRect(px + cx, py + ry, 2, rowH); // 纵向砖缝
    }
  }

  // 3. 顶部剥落断裂缺口 (Weathered Top Battlement)
  ctx.fillStyle = "#64748b";
  for (let bx = 4; bx < pw - 6; bx += 16) {
    ctx.fillRect(px + bx, py, 10, 3);
    ctx.fillStyle = "#94a3b8"; // 顶砖高光
    ctx.fillRect(px + bx + 1, py, 8, 1);
    ctx.fillStyle = "#64748b";
  }

  // 4. 攀爬的茂密青翠藤蔓 (Climbing Ivy Vines)
  ctx.fillStyle = "#14532d";
  ctx.fillRect(px + 4, py + 4, 4, ph - 8);
  ctx.fillRect(px + pw - 12, py + 6, 4, ph - 10);
  ctx.fillStyle = "#16a34a";
  for (let vy = 4; vy < ph - 6; vy += 8) {
    ctx.fillRect(px + 2, py + vy, 6, 4);
    ctx.fillRect(px + pw - 14, py + vy + 3, 7, 4);
  }
  ctx.fillStyle = "#86efac"; // 藤蔓亮叶
  for (let vy = 6; vy < ph - 8; vy += 12) {
    ctx.fillRect(px + 4, py + vy, 2, 2);
    ctx.fillRect(px + pw - 10, py + vy, 2, 2);
  }

  ctx.strokeStyle = "#0f172a";
  ctx.lineWidth = 2;
  ctx.strokeRect(px, py, pw, ph);

  ctx.restore();
}

/**
 * 🏠 16-bit 温馨木屋商铺 (Charming Wooden Cabin Shop with Striped Awning)
 */
export function drawPixelCabinShop(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  _t = 0
) {
  ctx.save();
  const px = Math.round(x);
  const py = Math.round(y);
  const pw = Math.round(w);
  const ph = Math.round(h);

  // 阴影
  ctx.fillStyle = "rgba(0,0,0,0.38)";
  ctx.fillRect(px - 3, py + ph + 2, pw + 6, 8);

  // 1. 原木墙身 (Timber Wall Planks)
  ctx.fillStyle = "#5c3818";
  ctx.fillRect(px, py, pw, ph);
  ctx.fillStyle = "#78451f";
  for (let dy = 6; dy < ph; dy += 8) {
    ctx.fillRect(px, py + dy, pw, 6);
  }
  // 木纹接缝
  ctx.fillStyle = "#38220f";
  for (let dy = 6; dy < ph; dy += 8) {
    ctx.fillRect(px, py + dy, pw, 1);
  }

  // 2. 瓦片屋檐 (Shingle Roof Overhang)
  const roofH = Math.min(18, Math.round(ph * 0.35));
  ctx.fillStyle = "#78350f";
  ctx.fillRect(px - 4, py - 4, pw + 8, roofH);
  ctx.fillStyle = "#b45309";
  for (let rx = 0; rx < pw + 6; rx += 8) {
    ctx.fillRect(px - 3 + rx, py - 3, 6, roofH - 2);
    ctx.fillStyle = "#f59e0b"; // 瓦片亮沿
    ctx.fillRect(px - 3 + rx, py - 3, 6, 1);
    ctx.fillStyle = "#b45309";
  }

  // 3. 红白相间条纹帆布遮阳蓬 (Red & White Striped Canvas Awning)
  const awnY = py + roofH - 2;
  const awnH = 10;
  const stripeW = 8;
  const numStripes = Math.floor(pw / stripeW);
  for (let s = 0; s < numStripes; s++) {
    const isRed = s % 2 === 0;
    const sx = px + s * stripeW;
    ctx.fillStyle = isRed ? "#dc2626" : "#f8fafc";
    ctx.fillRect(sx, awnY, stripeW, awnH);
    // 垂坠圆齿波浪边 (Scalloped Edges)
    ctx.fillRect(sx + 1, awnY + awnH, stripeW - 2, 2);
  }

  // 4. 橱窗与窗台花箱 (Display Window & Flower Box)
  const winW = Math.round(pw * 0.35);
  const winH = Math.round(ph * 0.3);
  const winX = px + 10;
  const winY = awnY + awnH + 4;
  // 窗框
  ctx.fillStyle = "#1e293b";
  ctx.fillRect(winX, winY, winW, winH);
  ctx.fillStyle = "#bae6fd";
  ctx.fillRect(winX + 2, winY + 2, winW - 4, winH - 4);
  // 窗格十字
  ctx.fillStyle = "#0284c7";
  ctx.fillRect(winX + Math.round(winW / 2) - 1, winY + 2, 2, winH - 4);
  ctx.fillRect(winX + 2, winY + Math.round(winH / 2) - 1, winW - 4, 2);

  // 窗台花箱 (木盒与各色鲜花)
  ctx.fillStyle = "#78350f";
  ctx.fillRect(winX - 2, winY + winH, winW + 4, 4);
  // 鲜花点缀
  const flowerCols = ["#f472b6", "#fde047", "#ffffff", "#f87171"];
  for (let fx = 0; fx < winW; fx += 5) {
    ctx.fillStyle = flowerCols[Math.floor(fx / 5) % flowerCols.length];
    ctx.fillRect(winX + fx, winY + winH - 3, 3, 3);
  }

  // 5. 木门与铜把手
  const doorW = 16;
  const doorH = ph - awnY - awnH - 6;
  const doorX = px + pw - doorW - 10;
  const doorY = py + ph - doorH;
  ctx.fillStyle = "#38220f";
  ctx.fillRect(doorX, doorY, doorW, doorH);
  ctx.fillStyle = "#78451f";
  ctx.fillRect(doorX + 2, doorY + 2, doorW - 4, doorH - 2);
  // 铜门把手
  ctx.fillStyle = "#facc15";
  ctx.fillRect(doorX + 3, doorY + Math.round(doorH / 2), 2, 3);

  ctx.strokeStyle = "#1c1107";
  ctx.lineWidth = 2;
  ctx.strokeRect(px, py, pw, ph);

  ctx.restore();
}

/**
 * 🕊️ 16-bit 环境生机小动物微动效 (Ambient Critters)
 * 包括：啄米白鸽/小鸟 (bird)、荷塘青蛙 (frog)、小花猫 (cat)、飞舞蝴蝶 (butterfly)
 */
export function drawPixelCritters(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  t = 0,
  kind: "bird" | "frog" | "cat" | "butterfly" = "bird",
  scale = 2
) {
  ctx.save();
  const px = Math.round(x);
  const py = Math.round(y);
  const p = scale;

  if (kind === "bird") {
    // 4-frame pecking / hopping white dove
    const f = Math.floor((t * 4) % 4);
    const peckY = (f === 1 || f === 2) ? p : 0;
    // 阴影
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.fillRect(px - 2 * p, py, 5 * p, 2 * p);
    // 身体
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(px - 2 * p, py - 4 * p + peckY, 4 * p, 3 * p);
    // 头部与喙
    ctx.fillRect(px + p, py - 6 * p + peckY, 2 * p, 3 * p);
    ctx.fillStyle = "#f97316"; // 橘黄鸟喙
    ctx.fillRect(px + 3 * p, py - 5 * p + peckY, p, p);
    // 灰羽暗影与黑眼
    ctx.fillStyle = "#cbd5e1";
    ctx.fillRect(px - 2 * p, py - 3 * p + peckY, 2 * p, 2 * p);
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(px + 2 * p, py - 6 * p + peckY, p, p);
  } else if (kind === "frog") {
    // 眨眼绿色小青蛙
    const blink = Math.floor(t * 2) % 4 === 0;
    // 阴影
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.fillRect(px - 3 * p, py, 6 * p, 2 * p);
    // 绿色身体
    ctx.fillStyle = "#15803d";
    ctx.fillRect(px - 3 * p, py - 3 * p, 6 * p, 3 * p);
    ctx.fillStyle = "#4ade80";
    ctx.fillRect(px - 2 * p, py - 2 * p, 4 * p, 2 * p);
    // 突出的大眼睛
    ctx.fillStyle = "#15803d";
    ctx.fillRect(px - 3 * p, py - 5 * p, 2 * p, 2 * p);
    ctx.fillRect(px + p, py - 5 * p, 2 * p, 2 * p);
    ctx.fillStyle = blink ? "#15803d" : "#ffffff";
    ctx.fillRect(px - 2 * p, py - 5 * p, p, p);
    ctx.fillRect(px + p, py - 5 * p, p, p);
  } else if (kind === "cat") {
    // 卷尾巴橙色小猫
    const tailFrame = Math.floor((t * 3) % 3);
    const tailOff = tailFrame === 1 ? -p : 0;
    // 阴影
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.fillRect(px - 3 * p, py, 7 * p, 2 * p);
    // 橙色身子与白肚皮
    ctx.fillStyle = "#ea580c";
    ctx.fillRect(px - 3 * p, py - 4 * p, 6 * p, 4 * p);
    ctx.fillStyle = "#fed7aa";
    ctx.fillRect(px - p, py - 2 * p, 3 * p, 2 * p);
    // 猫耳与面孔
    ctx.fillStyle = "#ea580c";
    ctx.fillRect(px + 2 * p, py - 6 * p, p, 2 * p); // 右耳
    ctx.fillRect(px, py - 6 * p, p, 2 * p);        // 左耳
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(px + p, py - 4 * p, p, p);        // 眼睛
    // 竖起的卷尾巴
    ctx.fillStyle = "#c2410c";
    ctx.fillRect(px - 4 * p, py - 3 * p + tailOff, p, 3 * p);
  } else if (kind === "butterfly") {
    // 翩翩起舞的轻盈彩色蝴蝶
    const flap = Math.floor((t * 8) % 2) === 0;
    const flyY = Math.sin(t * 4) * 3 * p;
    ctx.fillStyle = "#ec4899"; // 粉红蝶翼
    if (flap) {
      ctx.fillRect(px - 2 * p, py - 4 * p + flyY, 2 * p, 2 * p);
      ctx.fillRect(px + p, py - 4 * p + flyY, 2 * p, 2 * p);
    } else {
      ctx.fillRect(px - p, py - 5 * p + flyY, p, 3 * p);
      ctx.fillRect(px + p, py - 5 * p + flyY, p, 3 * p);
    }
    ctx.fillStyle = "#fde047"; // 黄色躯干
    ctx.fillRect(px, py - 4 * p + flyY, p, 2 * p);
  }

  ctx.restore();
}

/**
 * ❄️ 16-bit 阶梯积雪堆 (Organic Pixel Snow Drift)
 */
export function drawPixelSnowDrift(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale = 2
) {
  ctx.save();
  const px = Math.round(x);
  const py = Math.round(y);
  const p = scale;

  // 1. 冰蓝深色阴影底层
  ctx.fillStyle = "rgba(2, 132, 199, 0.35)";
  ctx.fillRect(px - 14 * p, py + 2 * p, 28 * p, 4 * p);

  // 2. 积雪背阴中层
  ctx.fillStyle = "#bae6fd";
  ctx.fillRect(px - 12 * p, py - 3 * p, 24 * p, 6 * p);
  ctx.fillRect(px - 8 * p, py - 6 * p, 16 * p, 4 * p);

  // 3. 向阳纯白积雪顶层
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(px - 10 * p, py - 4 * p, 20 * p, 4 * p);
  ctx.fillRect(px - 6 * p, py - 7 * p, 12 * p, 3 * p);

  ctx.restore();
}

/**
 * 🛤️ 16-bit 极地铁道路轨与道口警报灯 (Arctic Railway Track & Crossing Signals)
 */
export function drawPixelRailwayTrack(
  ctx: CanvasRenderingContext2D,
  worldW: number,
  trackY: number,
  t = 0,
  warning = false
) {
  ctx.save();
  const ty = Math.round(trackY);

  // 1. 道砟碎石床 (Ballast Gravel Bed)
  ctx.fillStyle = "#1e293b";
  ctx.fillRect(0, ty - 18, worldW, 36);

  // 碎石纹理与边缘积雪
  ctx.fillStyle = "#334155";
  for (let x = 0; x < worldW; x += 16) {
    const r1 = (x * 17) % 11;
    const r2 = (x * 23) % 11;
    ctx.fillRect(x + 2, ty - 14 + r1, 4, 3);
    ctx.fillRect(x + 8, ty - 6 + r2, 5, 3);
  }
  // 铁轨边缘积雪覆盖 (Snow dusting on track edges)
  ctx.fillStyle = "#e0f2fe";
  for (let x = 0; x < worldW; x += 24) {
    const sw = ((x * 13) % 7) + 6;
    ctx.fillRect(x, ty - 18, sw, 3);
    ctx.fillRect(x + 6, ty + 15, sw, 3);
  }

  // 2. 防腐木质轨枕 (Wooden Sleepers / Ties)
  const tieStep = 24;
  for (let x = 0; x < worldW; x += tieStep) {
    ctx.fillStyle = "#38220f";
    ctx.fillRect(x, ty - 14, 8, 28);
    ctx.fillStyle = "#78350f";
    ctx.fillRect(x + 1, ty - 13, 6, 26);
    // 铁垫板 (Steel Tie Plates)
    ctx.fillStyle = "#475569";
    ctx.fillRect(x + 1, ty - 9, 6, 4);
    ctx.fillRect(x + 1, ty + 5, 6, 4);
  }

  // 3. 双轨抛光重型钢轨 (Dual Continuous Steel Rails)
  // 北轨 (North Rail) at ty - 7
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, ty - 8, worldW, 4);
  ctx.fillStyle = "#94a3b8";
  ctx.fillRect(0, ty - 7, worldW, 2);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, ty - 7, worldW, 1);

  // 南轨 (South Rail) at ty + 7
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, ty + 5, worldW, 4);
  ctx.fillStyle = "#94a3b8";
  ctx.fillRect(0, ty + 6, worldW, 2);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, ty + 6, worldW, 1);

  // 4. 铁道平交道口信号柱 (Crossing Warning Posts)
  const crossingXs = [
    Math.round(worldW * 0.25),
    Math.round(worldW * 0.5),
    Math.round(worldW * 0.75),
  ];

  for (const cx of crossingXs) {
    // 信号立柱 (斑马黑黄警示纹)
    const postX = cx;
    const postY = ty - 45;
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(postX - 2, postY, 4, 30);
    ctx.fillStyle = "#facc15";
    ctx.fillRect(postX - 2, postY + 6, 4, 4);
    ctx.fillRect(postX - 2, postY + 16, 4, 4);

    // 交叉警示板 (Crossbuck 'X')
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(postX - 8, postY - 8, 16, 3);
    ctx.fillRect(postX - 8, postY - 2, 16, 3);
    ctx.fillStyle = "#dc2626";
    ctx.fillRect(postX - 6, postY - 8, 3, 3);
    ctx.fillRect(postX + 3, postY - 2, 3, 3);

    // 双红 LED 报警信号灯
    const flash = warning && Math.floor(t * 8) % 2 === 0;
    const leftRed = warning ? (flash ? "#ef4444" : "#7f1d1d") : "#450a0a";
    const rightRed = warning ? (!flash ? "#ef4444" : "#7f1d1d") : "#450a0a";

    // 左右灯座
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(postX - 10, postY - 14, 20, 6);
    // 左灯
    ctx.fillStyle = leftRed;
    ctx.fillRect(postX - 8, postY - 13, 5, 4);
    // 右灯
    ctx.fillStyle = rightRed;
    ctx.fillRect(postX + 3, postY - 13, 5, 4);

    // 预警时极速红光外晕
    if (warning) {
      ctx.fillStyle = flash ? "rgba(239, 68, 68, 0.45)" : "rgba(239, 68, 68, 0.15)";
      ctx.fillRect(postX - 18, postY - 20, 36, 20);
    }
  }

  ctx.restore();
}

/**
 * 🚂 16-bit 极地特快装甲重型列车 (Arctic Armored Express Train)
 * 包含：重型蒸汽机车头、探照灯光锥、烟囱排烟、车轮连杆、3 节重型货运车厢与尾部守车
 */
export function drawPixelTrain(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  dir = 1,
  t = 0,
  _warning = false
) {
  ctx.save();
  const ty = Math.round(y);
  const px = Math.round(x);

  const locoW = 150;
  const wagonW = 110;
  const cabooseW = 90;
  const gap = 12;

  // Wheel animation rotation angle
  const wheelAngle = (t * 20) % (Math.PI * 2);

  const drawCar = (
    carFrontX: number,
    carW: number,
    type: "loco" | "cargo_blue" | "cargo_red" | "cargo_grey" | "caboose"
  ) => {
    const cX = dir === 1 ? carFrontX - carW : carFrontX;
    const cY = ty - 24;
    const cH = 38;

    // 1. 车底阴影
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(cX - 4, ty + 12, carW + 8, 5);

    if (type === "loco") {
      // ==== 机车车头 (Locomotive) ====
      const plowX = dir === 1 ? cX + carW : cX - 14;
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(plowX, cY + 12, 14, 22);
      ctx.fillStyle = "#475569";
      ctx.fillRect(plowX + (dir === 1 ? 0 : 4), cY + 16, 10, 14);

      // 锅炉车体
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(cX, cY + 4, carW, cH - 8);
      ctx.fillStyle = "#334155";
      ctx.fillRect(cX, cY + 6, carW - (dir === 1 ? 40 : 0), 12);

      // 铜质锅炉箍环
      ctx.fillStyle = "#f59e0b";
      for (let bx = 16; bx < carW - 40; bx += 22) {
        const bandX = dir === 1 ? cX + bx : cX + carW - bx - 4;
        ctx.fillRect(bandX, cY + 4, 3, cH - 8);
      }

      // 驾驶室
      const cabX = dir === 1 ? cX : cX + carW - 44;
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(cabX, cY - 8, 44, cH + 4);
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(cabX + 2, cY - 6, 40, cH);

      // 驾驶室暖光窗户
      ctx.fillStyle = "#f59e0b";
      ctx.fillRect(cabX + (dir === 1 ? 10 : 18), cY - 2, 16, 12);
      ctx.fillStyle = "#fef08a";
      ctx.fillRect(cabX + (dir === 1 ? 12 : 20), cY, 12, 8);

      // 蒸汽烟囱
      const stackX = dir === 1 ? cX + carW - 28 : cX + 20;
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(stackX, cY - 14, 10, 16);
      ctx.fillStyle = "#475569";
      ctx.fillRect(stackX - 2, cY - 16, 14, 3);

      // 动态排烟
      for (let s = 0; s < 4; s++) {
        const puffT = (t * 8 + s * 1.5) % 6;
        const driftX = stackX - dir * (puffT * 18);
        const driftY = cY - 18 - puffT * 8;
        const pSize = 6 + puffT * 3;
        ctx.fillStyle = s % 2 === 0 ? "rgba(248, 250, 252, 0.85)" : "rgba(203, 213, 225, 0.75)";
        ctx.fillRect(driftX, driftY, pSize, pSize);
      }

      // 前置探照灯与向阳光锥
      const lightX = dir === 1 ? cX + carW : cX;
      ctx.fillStyle = "#facc15";
      ctx.fillRect(dir === 1 ? lightX - 4 : lightX - 6, cY + 6, 10, 10);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(dir === 1 ? lightX - 2 : lightX - 4, cY + 8, 6, 6);

      // 投射光锥
      ctx.fillStyle = "rgba(254, 240, 138, 0.28)";
      ctx.beginPath();
      ctx.moveTo(lightX, cY + 11);
      ctx.lineTo(lightX + dir * 320, cY - 45);
      ctx.lineTo(lightX + dir * 320, cY + 65);
      ctx.closePath();
      ctx.fill();

    } else if (type === "caboose") {
      // ==== 尾部守车 ====
      ctx.fillStyle = "#7f1d1d";
      ctx.fillRect(cX, cY - 2, carW, cH - 2);
      ctx.fillStyle = "#991b1b";
      ctx.fillRect(cX + 2, cY, carW - 4, cH - 6);

      // 守车观察穹顶
      ctx.fillStyle = "#450a0a";
      ctx.fillRect(cX + 25, cY - 10, 40, 9);
      ctx.fillStyle = "#fde047";
      ctx.fillRect(cX + 30, cY - 7, 12, 5);
      ctx.fillRect(cX + 48, cY - 7, 12, 5);

      // 守车窗户
      ctx.fillStyle = "#fef08a";
      ctx.fillRect(cX + 12, cY + 6, 10, 10);
      ctx.fillRect(cX + carW - 22, cY + 6, 10, 10);

      // 尾部红色信号灯
      const tailLightX = dir === 1 ? cX - 4 : cX + carW;
      ctx.fillStyle = "#ef4444";
      ctx.fillRect(tailLightX, cY + 8, 5, 5);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(tailLightX + 1, cY + 9, 3, 3);

    } else {
      // ==== 重型货运车厢 ====
      const bodyColor =
        type === "cargo_blue" ? "#0369a1" : type === "cargo_red" ? "#b91c1c" : "#475569";
      const ribColor =
        type === "cargo_blue" ? "#0284c7" : type === "cargo_red" ? "#dc2626" : "#64748b";

      ctx.fillStyle = bodyColor;
      ctx.fillRect(cX, cY, carW, cH - 4);

      // 瓦楞加强筋
      ctx.fillStyle = ribColor;
      for (let rx = 10; rx < carW - 6; rx += 14) {
        ctx.fillRect(cX + rx, cY + 2, 4, cH - 8);
      }

      // 车顶厚厚积雪
      ctx.fillStyle = "#f0f9ff";
      ctx.fillRect(cX - 2, cY - 3, carW + 4, 4);
      ctx.fillStyle = "#bae6fd";
      ctx.fillRect(cX, cY + 1, carW, 2);
    }

    // 车轮与轮轨火花
    const wheelY = ty + 8;
    const numWheels = type === "loco" ? 4 : 3;
    const wheelStep = (carW - 24) / (numWheels - 1);

    for (let w = 0; w < numWheels; w++) {
      const wx = cX + 12 + w * wheelStep;
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(wx - 6, wheelY - 6, 12, 12);
      ctx.fillStyle = "#94a3b8";
      ctx.fillRect(wx - 4, wheelY - 4, 8, 8);
      const spkX = Math.cos(wheelAngle) * 3;
      const spkY = Math.sin(wheelAngle) * 3;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(wx + spkX - 1, wheelY + spkY - 1, 2, 2);

      // 摩擦火花
      if (Math.random() > 0.4) {
        ctx.fillStyle = "#fbbf24";
        ctx.fillRect(wx + (Math.random() - 0.5) * 8, ty + 12, 2, 2);
        ctx.fillStyle = "#f97316";
        ctx.fillRect(wx + (Math.random() - 0.5) * 6, ty + 13, 2, 2);
      }
    }
  };

  let curFrontX = px;

  if (dir === 1) {
    drawCar(curFrontX, locoW, "loco");
    curFrontX -= (locoW + gap);
    drawCar(curFrontX, wagonW, "cargo_blue");
    curFrontX -= (wagonW + gap);
    drawCar(curFrontX, wagonW, "cargo_red");
    curFrontX -= (wagonW + gap);
    drawCar(curFrontX, wagonW, "cargo_grey");
    curFrontX -= (wagonW + gap);
    drawCar(curFrontX, cabooseW, "caboose");
  } else {
    drawCar(curFrontX, locoW, "loco");
    curFrontX += (locoW + gap);
    drawCar(curFrontX, wagonW, "cargo_blue");
    curFrontX += (wagonW + gap);
    drawCar(curFrontX, wagonW, "cargo_red");
    curFrontX += (wagonW + gap);
    drawCar(curFrontX, wagonW, "cargo_grey");
    curFrontX += (wagonW + gap);
    drawCar(curFrontX, cabooseW, "caboose");
  }

  ctx.restore();
}

/**
 * 🌵 16-bit 西部沙漠高精度像素仙人掌 (Saguaro & Prickly Pear Cactus)
 * 包含：4 阶阴影草绿、针刺像素节点、分叉主干与顶端娇艳沙漠小花
 */
export function drawPixelCactus(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  _t = 0,
  variant: 0 | 1 | 2 = 0,
  scale = 1
) {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.scale(scale, scale);

  // 椭圆沙地阴影
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.fillRect(-10, 8, 20, 4);

  const C_OUTLINE = "#064e3b";
  const C_DARK = "#14532d";
  const C_MID = "#16a34a";
  const C_HI = "#4ade80";
  const C_FLOWER = "#f43f5e";
  const C_FLOWER_CORE = "#fef08a";

  if (variant === 0) {
    // 经典双向高耸巨型萨瓜罗仙人掌 (Classic Saguaro)
    // 主干
    ctx.fillStyle = C_OUTLINE;
    ctx.fillRect(-6, -22, 12, 32);
    ctx.fillStyle = C_DARK;
    ctx.fillRect(-5, -21, 10, 30);
    ctx.fillStyle = C_MID;
    ctx.fillRect(-4, -21, 6, 30);
    ctx.fillStyle = C_HI;
    ctx.fillRect(-3, -21, 2, 30);

    // 左侧横臂与直立分支
    ctx.fillStyle = C_OUTLINE;
    ctx.fillRect(-16, -10, 11, 7);
    ctx.fillRect(-16, -18, 7, 10);
    ctx.fillStyle = C_DARK;
    ctx.fillRect(-15, -9, 9, 5);
    ctx.fillRect(-15, -17, 5, 9);
    ctx.fillStyle = C_MID;
    ctx.fillRect(-14, -9, 7, 3);
    ctx.fillRect(-14, -17, 3, 8);
    ctx.fillStyle = C_HI;
    ctx.fillRect(-14, -17, 1, 8);

    // 右侧横臂与直立分支
    ctx.fillStyle = C_OUTLINE;
    ctx.fillRect(5, -4, 12, 7);
    ctx.fillRect(10, -14, 7, 12);
    ctx.fillStyle = C_DARK;
    ctx.fillRect(6, -3, 10, 5);
    ctx.fillRect(11, -13, 5, 10);
    ctx.fillStyle = C_MID;
    ctx.fillRect(7, -3, 8, 3);
    ctx.fillRect(12, -13, 3, 9);
    ctx.fillStyle = C_HI;
    ctx.fillRect(12, -13, 1, 9);

    // 针刺斑点 (Spines)
    ctx.fillStyle = "#dcfce7";
    ctx.fillRect(-7, -18, 1, 2);
    ctx.fillRect(6, -15, 1, 2);
    ctx.fillRect(-7, -4, 1, 2);
    ctx.fillRect(6, 2, 1, 2);
    ctx.fillRect(-17, -15, 1, 2);
    ctx.fillRect(17, -10, 1, 2);

    // 顶端绽放金红沙漠花朵
    ctx.fillStyle = C_FLOWER;
    ctx.fillRect(-3, -25, 6, 4);
    ctx.fillRect(-4, -24, 8, 2);
    ctx.fillStyle = C_FLOWER_CORE;
    ctx.fillRect(-1, -24, 2, 2);
  } else if (variant === 1) {
    // 团扇扁平刺梨仙人掌 (Prickly Pear Cluster)
    // 底部圆扇
    ctx.fillStyle = C_OUTLINE;
    ctx.fillRect(-8, -6, 16, 15);
    ctx.fillStyle = C_DARK;
    ctx.fillRect(-7, -5, 14, 13);
    ctx.fillStyle = C_MID;
    ctx.fillRect(-5, -5, 9, 12);
    ctx.fillStyle = C_HI;
    ctx.fillRect(-3, -4, 3, 10);

    // 左上扇片
    ctx.fillStyle = C_OUTLINE;
    ctx.fillRect(-16, -17, 13, 13);
    ctx.fillStyle = C_DARK;
    ctx.fillRect(-15, -16, 11, 11);
    ctx.fillStyle = C_MID;
    ctx.fillRect(-13, -15, 7, 9);
    ctx.fillStyle = C_HI;
    ctx.fillRect(-11, -14, 3, 7);

    // 右上扇片
    ctx.fillStyle = C_OUTLINE;
    ctx.fillRect(2, -19, 14, 15);
    ctx.fillStyle = C_DARK;
    ctx.fillRect(3, -18, 12, 13);
    ctx.fillStyle = C_MID;
    ctx.fillRect(4, -17, 8, 11);
    ctx.fillStyle = C_HI;
    ctx.fillRect(5, -16, 3, 9);

    // 顶端红色刺梨仙人掌果实 (Prickly Pear Fruit)
    ctx.fillStyle = "#e11d48";
    ctx.fillRect(-13, -20, 4, 4);
    ctx.fillRect(8, -22, 4, 4);
    ctx.fillStyle = "#fde047";
    ctx.fillRect(-12, -21, 2, 2);
    ctx.fillRect(9, -23, 2, 2);
  } else {
    // 三联沙漠开花仙人掌丛 (Flowering Triple Cactus)
    // 中间大柱
    ctx.fillStyle = C_OUTLINE;
    ctx.fillRect(-4, -18, 8, 27);
    ctx.fillStyle = C_MID;
    ctx.fillRect(-3, -17, 6, 25);
    ctx.fillStyle = C_HI;
    ctx.fillRect(-2, -17, 2, 25);
    // 左小柱
    ctx.fillStyle = C_OUTLINE;
    ctx.fillRect(-11, -11, 6, 19);
    ctx.fillStyle = C_MID;
    ctx.fillRect(-10, -10, 4, 17);
    // 右中柱
    ctx.fillStyle = C_OUTLINE;
    ctx.fillRect(5, -14, 7, 22);
    ctx.fillStyle = C_MID;
    ctx.fillRect(6, -13, 5, 20);

    // 盛开粉白沙漠小花
    ctx.fillStyle = "#fb7185";
    ctx.fillRect(-3, -21, 6, 4);
    ctx.fillRect(6, -17, 5, 4);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(-1, -20, 2, 2);
    ctx.fillRect(8, -16, 2, 2);
  }

  ctx.restore();
}

/**
 * 🏡 16-bit 西部木结构民居 / 边境木屋 (Western Timber House & Outpost)
 * 包含：原木横向板壁、挑檐坡顶木瓦、前廊走道与木柱、百叶木窗与壁炉烟囱
 */
export function drawPixelWesternHouse(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  t = 0
) {
  ctx.save();
  const px = Math.round(x);
  const py = Math.round(y);
  const pw = Math.round(w);
  const ph = Math.round(h);

  // 1. 地面投射阴影
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(px - 4, py + ph + 2, pw + 8, 8);

  // 2. 原木板壁墙身 (Weathered Wood Timber Planks)
  ctx.fillStyle = "#78350f";
  ctx.fillRect(px, py, pw, ph);

  // 横向木板缝隙与木纹色阶
  ctx.fillStyle = "#92400e";
  for (let dy = 4; dy < ph; dy += 10) {
    ctx.fillRect(px, py + dy, pw, 7);
  }
  ctx.fillStyle = "#451a03";
  for (let dy = 10; dy < ph; dy += 10) {
    ctx.fillRect(px, py + dy, pw, 1);
  }

  // 3. 坡面木瓦屋顶 (Pitched Wooden Roof with Shingles)
  const roofH = Math.min(22, Math.round(ph * 0.36));
  ctx.fillStyle = "#451a03";
  ctx.fillRect(px - 4, py - 4, pw + 8, roofH + 4);
  ctx.fillStyle = "#92400e";
  ctx.fillRect(px - 3, py - 3, pw + 6, roofH);

  // 屋瓦层叠纹理
  for (let rx = 0; rx < pw + 4; rx += 10) {
    ctx.fillStyle = "#b45309";
    ctx.fillRect(px - 2 + rx, py - 2, 8, roofH - 4);
    ctx.fillStyle = "#f59e0b"; // 瓦片反光边缘
    ctx.fillRect(px - 2 + rx, py - 2, 8, 1);
  }

  // 4. 红砖/石砌壁炉烟囱 (Brick Chimney with gentle smoke)
  const chimW = 12;
  const chimH = 14;
  const chimX = px + Math.round(pw * 0.75);
  const chimY = py - 12;
  ctx.fillStyle = "#7c2d12";
  ctx.fillRect(chimX, chimY, chimW, chimH);
  ctx.fillStyle = "#b91c1c";
  ctx.fillRect(chimX + 1, chimY + 1, chimW - 2, chimH - 2);
  ctx.fillStyle = "#451a03";
  ctx.fillRect(chimX - 2, chimY, chimW + 4, 3); // 烟囱顶帽

  // 烟囱微弱飘烟
  const smokePhase = (t * 2) % 3;
  ctx.fillStyle = "rgba(220,220,220,0.4)";
  ctx.fillRect(chimX + 4 + Math.sin(t * 3) * 3, chimY - 6 - smokePhase * 4, 4 + smokePhase * 2, 4 + smokePhase * 2);

  // 5. 前廊立柱与横梁 (Front Porch Posts)
  const porchH = Math.round(ph * 0.38);
  const porchY = py + ph - porchH;
  ctx.fillStyle = "rgba(40,15,5,0.3)";
  ctx.fillRect(px, porchY, pw, porchH);
  ctx.fillStyle = "#d97706";
  ctx.fillRect(px, porchY, pw, 3); // 前廊挑檐梁

  // 前廊木立柱
  const postStep = Math.max(28, Math.round(pw / 3));
  for (let postX = 6; postX < pw - 6; postX += postStep) {
    ctx.fillStyle = "#451a03";
    ctx.fillRect(px + postX, porchY, 4, porchH);
    ctx.fillStyle = "#d97706";
    ctx.fillRect(px + postX + 1, porchY, 2, porchH);
  }

  // 6. 木百叶窗户 (Windows with warm indoor glow)
  const winW = 18;
  const winH = 16;
  const winX = px + 12;
  const winY = py + roofH + 6;
  ctx.fillStyle = "#451a03";
  ctx.fillRect(winX - 1, winY - 1, winW + 2, winH + 2);
  ctx.fillStyle = "#fef08a";
  ctx.fillRect(winX, winY, winW, winH);
  // 十字木窗棂
  ctx.fillStyle = "#78350f";
  ctx.fillRect(winX + Math.round(winW / 2) - 1, winY, 2, winH);
  ctx.fillRect(winX, winY + Math.round(winH / 2) - 1, winW, 2);

  // 7. 西部木门与五金件 (Wooden Plank Door)
  const doorW = 18;
  const doorH = Math.min(26, ph - roofH - 12);
  const doorX = px + pw - doorW - 14;
  const doorY = py + ph - doorH;
  ctx.fillStyle = "#38220f";
  ctx.fillRect(doorX, doorY, doorW, doorH);
  ctx.fillStyle = "#92400e";
  ctx.fillRect(doorX + 2, doorY + 2, doorW - 4, doorH - 2);
  // 门把手与铁合页
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(doorX + 2, doorY + 4, 3, 2);
  ctx.fillRect(doorX + 2, doorY + doorH - 6, 3, 2);
  ctx.fillStyle = "#fbbf24";
  ctx.fillRect(doorX + doorW - 5, doorY + Math.round(doorH / 2), 2, 3);

  // 8. 整体黑巧描边
  ctx.strokeStyle = "#290c01";
  ctx.lineWidth = 2;
  ctx.strokeRect(px, py, pw, ph);

  ctx.restore();
}



