// Canvas要素とコンテキスト
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// 定数
const CX = 400;
const CY = 400;
const SIZE = 500; // 四角形の一辺の長さ

// 四角形の頂点を計算（中心から）
const halfSize = SIZE / 2;
const squareVertices = [
  { x: CX - halfSize, y: CY - halfSize }, // 左上 (0)
  { x: CX + halfSize, y: CY - halfSize }, // 右上 (1)
  { x: CX + halfSize, y: CY + halfSize }, // 右下 (2)
  { x: CX - halfSize, y: CY + halfSize }  // 左下 (3)
];

// 2つの辺を定義（上、右）
const edges = [
  { start: squareVertices[0], end: squareVertices[1], color: '#ff6b6b' }, // 上辺
  { start: squareVertices[1], end: squareVertices[2], color: '#4ecdc4' }  // 右辺
];

// 状態変数
let isRunning = true;
let speed1 = 0.008;
let speed2 = 0.011;
let trailLength = 50;

// 点の位置（0〜1）と方向
let t1 = 0, t2 = 0.3;
let dir1 = 1, dir2 = 1;

// 軌跡の配列（赤×シアンの交点）
let points1 = [];

let guideVisible = false;

/**
 * 辺上の位置と法線ベクトルを取得
 */
function getPositionAndNormal(t, edgeIndex) {
  const edge = edges[edgeIndex];
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
function getIntersection(p1, n1, p2, n2) {
  const det = n1.nx * n2.ny - n1.ny * n2.nx;
  if (Math.abs(det) < 0.0001) return null;

  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const t = (dx * n2.ny - dy * n2.nx) / det;

  return {
    x: p1.x + t * n1.nx,
    y: p1.y + t * n1.ny
  };
}

/**
 * 往復移動の更新
 */
function updateBounce(t, dir, speed) {
  let newT = t + speed * dir;
  let newDir = dir;

  if (newT >= 1) {
    newT = 1;
    newDir = -1;
  } else if (newT <= 0) {
    newT = 0;
    newDir = 1;
  }

  return { t: newT, dir: newDir };
}

/**
 * 四角形を描画
 */
function drawSquare() {
  ctx.beginPath();
  ctx.moveTo(squareVertices[0].x, squareVertices[0].y);
  for (let i = 1; i < 4; i++) {
    ctx.lineTo(squareVertices[i].x, squareVertices[i].y);
  }
  ctx.closePath();
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 2;
  ctx.stroke();
}

/**
 * アクティブな2辺をハイライト描画
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
function drawTrail(points, color) {
  if (points.length < 2) return;

  for (let i = 1; i < points.length; i++) {
    const progress = i / points.length;
    const lineWidth = 0.5 + progress * 5;
    const alpha = 0.1 + progress * 0.6;

    ctx.beginPath();
    ctx.moveTo(points[i - 1].x, points[i - 1].y);
    ctx.lineTo(points[i].x, points[i].y);
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
  ctx.arc(pos.x, pos.y, 14, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 20;
  ctx.fill();
  ctx.shadowBlur = 0;

  // 内側の白い円
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, 7, 0, Math.PI * 2);
  ctx.fillStyle = '#fff';
  ctx.fill();
}

/**
 * 現在の交点をマーク
 */
function drawCurrentIntersection(points, color) {
  if (points.length === 0) return;
  const p = points[points.length - 1];
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

  if (guideVisible) {
    // 四角形
    drawSquare();

    // アクティブな辺
    drawActiveEdges();
  }

  // 現在の位置を取得
  const pos1 = getPositionAndNormal(t1, 0);
  const pos2 = getPositionAndNormal(t2, 1);

  // 軌跡を描画
  drawTrail(points1, '#ff69b4');

  if (guideVisible) {
    // 垂直線を描画
    drawNormalLine(pos1, '#ff6b6b');
    drawNormalLine(pos2, '#4ecdc4');

    // 移動する点を描画
    drawMovingPoint(pos1, '#ff6b6b');
    drawMovingPoint(pos2, '#4ecdc4');

    // 反対側の点を描画（法線方向に中心を挟んで反対側）
    const distToCenter1 = (CX - pos1.x) * pos1.nx + (CY - pos1.y) * pos1.ny;
    const mirror1 = {
      x: pos1.x + 2 * distToCenter1 * pos1.nx,
      y: pos1.y + 2 * distToCenter1 * pos1.ny
    };

    const distToCenter2 = (CX - pos2.x) * pos2.nx + (CY - pos2.y) * pos2.ny;
    const mirror2 = {
      x: pos2.x + 2 * distToCenter2 * pos2.nx,
      y: pos2.y + 2 * distToCenter2 * pos2.ny
    };

    drawMovingPoint(mirror1, '#ff6b6b');
    drawMovingPoint(mirror2, '#4ecdc4');
  }

  // 現在の交点をマーク
  drawCurrentIntersection(points1, '#ff69b4');
}

/**
 * 状態更新関数
 */
function update() {
  // 位置を更新
  const r1 = updateBounce(t1, dir1, speed1);
  t1 = r1.t; dir1 = r1.dir;

  const r2 = updateBounce(t2, dir2, speed2);
  t2 = r2.t; dir2 = r2.dir;

  // 交点を計算
  const pos1 = getPositionAndNormal(t1, 0);
  const pos2 = getPositionAndNormal(t2, 1);

  const int12 = getIntersection(pos1, pos1, pos2, pos2);

  // 有効な交点を軌跡に追加
  const isValid = (p) => p && Math.abs(p.x - CX) < 600 && Math.abs(p.y - CY) < 600;

  if (isValid(int12)) {
    points1.push(int12);
    if (points1.length > trailLength) points1.shift();
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
  points1 = [];
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

  // 速度スライダー
  document.getElementById('speed1').addEventListener('input', (e) => {
    speed1 = parseFloat(e.target.value);
  });

  document.getElementById('speed2').addEventListener('input', (e) => {
    speed2 = parseFloat(e.target.value);
  });
}

// 初期化
setupEventListeners();
animate();