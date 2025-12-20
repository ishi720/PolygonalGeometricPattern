// Canvas要素とコンテキスト
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// 定数
const CX = 400;
const CY = 400;
const RADIUS = 280;

// 色の定義（6辺用）
const edgeColors = [
  '#ff6b6b', // 赤
  '#4ecdc4', // シアン
  '#ffd93d', // 黄
  '#a855f7', // 紫
  '#22c55e', // 緑
  '#f97316'  // オレンジ
];

// 対角ペアの線の色
const lineColors = [
  '#ff69b4', // 辺0-3: ピンク
  '#7fff00', // 辺1-4: ライム
  '#00ffff'  // 辺2-5: シアン
];

// 軌跡の色（3本の線から3つの交点）
const trailColors = [
  '#ff1493', // 線0-1の交点
  '#ffd700', // 線1-2の交点
  '#00fa9a'  // 線0-2の交点
];

// 六角形の頂点を計算
const hexagonVertices = [];
for (let i = 0; i < 6; i++) {
  const angle = (Math.PI / 3) * i - Math.PI / 2;
  hexagonVertices.push({
    x: CX + RADIUS * Math.cos(angle),
    y: CY + RADIUS * Math.sin(angle)
  });
}

// 6つの辺を定義
const edges = [];
for (let i = 0; i < 6; i++) {
  edges.push({
    start: hexagonVertices[i],
    end: hexagonVertices[(i + 1) % 6],
    color: edgeColors[i]
  });
}

// 対角ペア（辺0-3, 辺1-4, 辺2-5）
const diagonalPairs = [
  { edge1: 0, edge2: 3 },
  { edge1: 1, edge2: 4 },
  { edge1: 2, edge2: 5 }
];

// 状態変数
let isRunning = true;
let guideVisible = false;
let trailLength = 60;

// 6つの点の位置（0〜1）、方向、速度
const points = [
  { t: 0.0, dir: 1, speed: 0.005 },
  { t: 0.17, dir: 1, speed: 0.007 },
  { t: 0.33, dir: 1, speed: 0.009 },
  { t: 0.5, dir: 1, speed: 0.011 },
  { t: 0.67, dir: 1, speed: 0.013 },
  { t: 0.83, dir: 1, speed: 0.015 }
];

// 軌跡の配列（3本の線から3つの交点）
const trails = [[], [], []];

/**
 * 辺上の位置を取得
 */
function getPointOnEdge(edgeIndex) {
  const edge = edges[edgeIndex];
  const t = points[edgeIndex].t;

  return {
    x: edge.start.x + (edge.end.x - edge.start.x) * t,
    y: edge.start.y + (edge.end.y - edge.start.y) * t,
    color: edge.color
  };
}

/**
 * 2点を通る線の方向ベクトルを取得
 */
function getLineDirection(p1, p2) {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const len = Math.sqrt(dx * dx + dy * dy);

  return {
    x: p1.x,
    y: p1.y,
    dx: dx / len,
    dy: dy / len
  };
}

/**
 * 2本の線の交点を計算
 */
function getIntersection(line1, line2) {
  const det = line1.dx * line2.dy - line1.dy * line2.dx;
  if (Math.abs(det) < 0.0001) return null;

  const dx = line2.x - line1.x;
  const dy = line2.y - line1.y;
  const t = (dx * line2.dy - dy * line2.dx) / det;

  return {
    x: line1.x + t * line1.dx,
    y: line1.y + t * line1.dy
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
 * 六角形を描画
 */
function drawHexagon() {
  ctx.beginPath();
  ctx.moveTo(hexagonVertices[0].x, hexagonVertices[0].y);
  for (let i = 1; i < 6; i++) {
    ctx.lineTo(hexagonVertices[i].x, hexagonVertices[i].y);
  }
  ctx.closePath();
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.lineWidth = 2;
  ctx.stroke();
}

/**
 * 全ての辺をハイライト描画
 */
function drawActiveEdges() {
  edges.forEach((edge, i) => {
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
    const lineWidth = 0.5 + progress * 5;
    const alpha = 0.1 + progress * 0.8;

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
 * 対角の点を結ぶ線を描画
 */
function drawDiagonalLine(p1, p2, color) {
  // 両端を延長
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  const extend = 300;

  const x1 = p1.x - (dx / len) * extend;
  const y1 = p1.y - (dy / len) * extend;
  const x2 = p2.x + (dx / len) * extend;
  const y2 = p2.y + (dy / len) * extend;

  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.5;
  ctx.stroke();
  ctx.globalAlpha = 1;
}

/**
 * 移動する点を描画
 */
function drawMovingPoint(pos, color) {
  // 外側の光る円
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, 12, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 20;
  ctx.fill();
  ctx.shadowBlur = 0;

  // 内側の白い円
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
  ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 15;
  ctx.fill();
  ctx.shadowBlur = 0;
}

/**
 * メイン描画関数
 */
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 全ての辺上の点の位置を取得
  const edgePoints = [];
  for (let i = 0; i < 6; i++) {
    edgePoints.push(getPointOnEdge(i));
  }

  if (guideVisible) {
    drawHexagon();
    drawActiveEdges();

    // 対角の点を結ぶ線を描画
    diagonalPairs.forEach((pair, i) => {
      const p1 = edgePoints[pair.edge1];
      const p2 = edgePoints[pair.edge2];
      drawDiagonalLine(p1, p2, lineColors[i]);
    });

    // 移動する点を描画
    edgePoints.forEach((pos, i) => {
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
  const edgePoints = [];
  for (let i = 0; i < 6; i++) {
    edgePoints.push(getPointOnEdge(i));
  }

  // 3本の対角線を作成
  const lines = diagonalPairs.map(pair => {
    const p1 = edgePoints[pair.edge1];
    const p2 = edgePoints[pair.edge2];
    return getLineDirection(p1, p2);
  });

  // 3本の線の交点を計算（線0-1, 線1-2, 線0-2）
  const isValid = (p) => p && Math.abs(p.x - CX) < 600 && Math.abs(p.y - CY) < 600;

  const int01 = getIntersection(lines[0], lines[1]);
  const int12 = getIntersection(lines[1], lines[2]);
  const int02 = getIntersection(lines[0], lines[2]);

  if (isValid(int01)) {
    trails[0].push(int01);
    if (trails[0].length > trailLength) trails[0].shift();
  }
  if (isValid(int12)) {
    trails[1].push(int12);
    if (trails[1].length > trailLength) trails[1].shift();
  }
  if (isValid(int02)) {
    trails[2].push(int02);
    if (trails[2].length > trailLength) trails[2].shift();
  }
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
  // 再生/停止ボタン
  const playBtn = document.getElementById('playBtn');
  playBtn.addEventListener('click', () => {
    isRunning = !isRunning;
    playBtn.textContent = isRunning ? '停止' : '再生';
    playBtn.classList.toggle('paused', !isRunning);
  });

  // ガイド切替ボタン
  const guideBtn = document.getElementById('guideBtn');
  guideBtn.addEventListener('click', () => {
    guideVisible = !guideVisible;
    guideBtn.textContent = guideVisible ? 'ガイド切替OFF' : 'ガイド切替ON';
    guideBtn.classList.toggle('active', guideVisible);
  });

  // 速度スライダー（6つ）
  for (let i = 1; i <= 6; i++) {
    document.getElementById(`speed${i}`).addEventListener('input', (e) => {
      points[i - 1].speed = parseFloat(e.target.value);
    });
  }
}

// 初期化
setupEventListeners();
animate();
