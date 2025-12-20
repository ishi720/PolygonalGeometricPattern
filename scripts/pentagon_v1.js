// Canvas要素とコンテキスト
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// 定数
const CX = 400;
const CY = 400;
const RADIUS = 280;

// 色の定義（5辺用）
const edgeColors = [
  '#ff6b6b', // 赤
  '#4ecdc4', // シアン
  '#ffd93d', // 黄
  '#a855f7', // 紫
  '#22c55e'  // 緑
];

// 軌跡の色（10個の交点用）
const trailColors = [
  '#ff69b4', // 0-1
  '#ff8c00', // 0-2
  '#ffd700', // 0-3
  '#adff2f', // 0-4
  '#00ffff', // 1-2
  '#00fa9a', // 1-3
  '#87ceeb', // 1-4
  '#da70d6', // 2-3
  '#f0e68c', // 2-4
  '#dda0dd'  // 3-4
];

// 五角形の頂点を計算
const pentagonVertices = [];
for (let i = 0; i < 5; i++) {
  const angle = (Math.PI * 2 / 5) * i - Math.PI / 2;
  pentagonVertices.push({
    x: CX + RADIUS * Math.cos(angle),
    y: CY + RADIUS * Math.sin(angle)
  });
}

// 5つの辺を定義
const edges = [];
for (let i = 0; i < 5; i++) {
  edges.push({
    start: pentagonVertices[i],
    end: pentagonVertices[(i + 1) % 5],
    color: edgeColors[i]
  });
}

// 交点ペアを生成（5C2 = 10個）
const intersectionPairs = [];
for (let i = 0; i < 5; i++) {
  for (let j = i + 1; j < 5; j++) {
    intersectionPairs.push({ edge1: i, edge2: j });
  }
}

// 状態変数
let isRunning = true;
let guideVisible = false;
let trailLength = 50;

// 5つの点の位置（0〜1）、方向、速度
const points = [
  { t: 0.0, dir: 1, speed: 0.005 },
  { t: 0.2, dir: 1, speed: 0.007 },
  { t: 0.4, dir: 1, speed: 0.009 },
  { t: 0.6, dir: 1, speed: 0.011 },
  { t: 0.8, dir: 1, speed: 0.013 }
];

// 軌跡の配列（10個）
const trails = [];
for (let i = 0; i < 10; i++) {
  trails.push([]);
}

/**
 * 辺上の位置と法線ベクトルを取得
 */
function getPositionAndNormal(edgeIndex) {
  const edge = edges[edgeIndex];
  const t = points[edgeIndex].t;
  const p1 = edge.start;
  const p2 = edge.end;

  // 辺上の位置
  const x = p1.x + (p2.x - p1.x) * t;
  const y = p1.y + (p2.y - p1.y) * t;

  // 辺の方向ベクトル
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const len = Math.sqrt(dx * dx + dy * dy);

  // 法線ベクトル（内向き）
  const nx = dy / len;
  const ny = -dx / len;

  return { x, y, nx, ny, color: edge.color };
}

/**
 * 2本の線の交点を計算
 */
function getIntersection(p1, p2) {
  const det = p1.nx * p2.ny - p1.ny * p2.nx;
  if (Math.abs(det) < 0.0001) return null;

  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const t = (dx * p2.ny - dy * p2.nx) / det;

  return {
    x: p1.x + t * p1.nx,
    y: p1.y + t * p1.ny
  };
}

/**
 * 往復移動の更新
 */
function updateBounce(point) {
  let newT = point.t + point.speed * point.dir;

  if (newT >= 1) {
    newT = 1;
    point.dir = -1;
  } else if (newT <= 0) {
    newT = 0;
    point.dir = 1;
  }

  point.t = newT;
}

/**
 * 五角形を描画
 */
function drawPentagon() {
  ctx.beginPath();
  ctx.moveTo(pentagonVertices[0].x, pentagonVertices[0].y);
  for (let i = 1; i < 5; i++) {
    ctx.lineTo(pentagonVertices[i].x, pentagonVertices[i].y);
  }
  ctx.closePath();
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 2;
  ctx.stroke();
}

/**
 * 全ての辺をハイライト描画
 */
function drawActiveEdges() {
  edges.forEach(edge => {
    ctx.beginPath();
    ctx.moveTo(edge.start.x, edge.start.y);
    ctx.lineTo(edge.end.x, edge.end.y);
    ctx.strokeStyle = edge.color;
    ctx.lineWidth = 4;
    ctx.shadowColor = edge.color;
    ctx.shadowBlur = 10;
    ctx.stroke();
    ctx.shadowBlur = 0;
  });
}

/**
 * 軌跡を描画
 */
function drawTrail(trailPoints, color) {
  if (trailPoints.length < 2) return;

  for (let i = 1; i < trailPoints.length; i++) {
    const progress = i / trailPoints.length;
    const lineWidth = 0.5 + progress * 4;
    const alpha = 0.1 + progress * 0.7;

    ctx.beginPath();
    ctx.moveTo(trailPoints[i - 1].x, trailPoints[i - 1].y);
    ctx.lineTo(trailPoints[i].x, trailPoints[i].y);
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.globalAlpha = alpha;
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

/**
 * 垂直線を描画
 */
function drawNormalLine(pos, color) {
  ctx.beginPath();
  ctx.moveTo(pos.x - pos.nx * 800, pos.y - pos.ny * 800);
  ctx.lineTo(pos.x + pos.nx * 800, pos.y + pos.ny * 800);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.4;
  ctx.stroke();
  ctx.globalAlpha = 1;
}

/**
 * 移動する点を描画
 */
function drawMovingPoint(pos, color) {
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, 12, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 20;
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.beginPath();
  ctx.arc(pos.x, pos.y, 5, 0, Math.PI * 2);
  ctx.fillStyle = '#fff';
  ctx.fill();
}

/**
 * 現在の交点をマーク
 */
function drawCurrentIntersection(trailPoints, color) {
  if (trailPoints.length === 0) return;
  const p = trailPoints[trailPoints.length - 1];
  ctx.beginPath();
  ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 12;
  ctx.fill();
  ctx.shadowBlur = 0;
}

/**
 * メイン描画関数
 */
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 全ての辺上の点の位置を取得
  const edgePositions = [];
  for (let i = 0; i < 5; i++) {
    edgePositions.push(getPositionAndNormal(i));
  }

  if (guideVisible) {
    drawPentagon();
    drawActiveEdges();

    // 垂直線を描画
    edgePositions.forEach((pos, i) => {
      drawNormalLine(pos, pos.color);
    });

    // 移動する点を描画
    edgePositions.forEach((pos, i) => {
      drawMovingPoint(pos, pos.color);
    });
  }

  // 軌跡を描画
  trails.forEach((trail, i) => {
    drawTrail(trail, trailColors[i]);
  });

  // 現在の交点をマーク
  trails.forEach((trail, i) => {
    drawCurrentIntersection(trail, trailColors[i]);
  });
}

/**
 * 状態更新関数
 */
function update() {
  // 全ての点の位置を更新
  points.forEach(point => updateBounce(point));

  // 全ての辺上の点の位置を取得
  const edgePositions = [];
  for (let i = 0; i < 5; i++) {
    edgePositions.push(getPositionAndNormal(i));
  }

  // 全ての交点を計算
  const isValid = (p) => p && Math.abs(p.x - CX) < 600 && Math.abs(p.y - CY) < 600;

  intersectionPairs.forEach((pair, index) => {
    const intersection = getIntersection(edgePositions[pair.edge1], edgePositions[pair.edge2]);
    if (isValid(intersection)) {
      trails[index].push(intersection);
      if (trails[index].length > trailLength) trails[index].shift();
    }
  });
}

/**
 * アニメーションループ
 */
function animate() {
  if (isRunning) {
    update();
  }
  draw();
  requestAnimationFrame(animate);
}

/**
 * 軌跡をクリア
 */
function clearTrails() {
  for (let i = 0; i < trails.length; i++) {
    trails[i] = [];
  }
}

// イベントリスナーの設定
function setupEventListeners() {
  const playBtn = document.getElementById('playBtn');
  playBtn.addEventListener('click', () => {
    isRunning = !isRunning;
    playBtn.textContent = isRunning ? '停止' : '再生';
    playBtn.classList.toggle('paused', !isRunning);
  });

  const guideBtn = document.getElementById('guideBtn');
  guideBtn.addEventListener('click', () => {
    guideVisible = !guideVisible;
    guideBtn.textContent = guideVisible ? 'ガイド切替OFF' : 'ガイド切替ON';
    guideBtn.classList.toggle('active', guideVisible);
  });

  // 速度スライダー（5つ）
  for (let i = 1; i <= 5; i++) {
    document.getElementById(`speed${i}`).addEventListener('input', (e) => {
      points[i - 1].speed = parseFloat(e.target.value);
    });
  }
}

// 初期化
setupEventListeners();
animate();