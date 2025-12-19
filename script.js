// Canvas要素とコンテキスト
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// 定数
const CX = 400;
const CY = 400;
const RADIUS = 280;

// 六角形の頂点を計算
const hexagonVertices = [];
for (let i = 0; i < 6; i++) {
  const angle = (Math.PI / 3) * i - Math.PI / 2;
  hexagonVertices.push({
    x: CX + RADIUS * Math.cos(angle),
    y: CY + RADIUS * Math.sin(angle)
  });
}

// 右側の3辺を定義
const edges = [
  { start: hexagonVertices[0], end: hexagonVertices[1], color: '#ff6b6b' }, // 右上
  { start: hexagonVertices[1], end: hexagonVertices[2], color: '#4ecdc4' }, // 右
  { start: hexagonVertices[2], end: hexagonVertices[3], color: '#ffd93d' }  // 右下
];

// 状態変数
let isRunning = true;
let speed1 = 0.008;
let speed2 = 0.011;
let speed3 = 0.015;
let trailLength = 40;

// 点の位置（0〜1）と方向
let t1 = 0, t2 = 0.3, t3 = 0.6;
let dir1 = 1, dir2 = 1, dir3 = 1;

// 軌跡の配列
let points1 = []; // 赤×シアン
let points2 = []; // シアン×黄
let points3 = []; // 赤×黄

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
 * 六角形を描画
 */
function drawHexagon() {
  ctx.beginPath();
  ctx.moveTo(hexagonVertices[0].x, hexagonVertices[0].y);
  for (let i = 1; i < 6; i++) {
    ctx.lineTo(hexagonVertices[i].x, hexagonVertices[i].y);
  }
  ctx.closePath();
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 2;
  ctx.stroke();
}

/**
 * アクティブな3辺をハイライト描画
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

  // 反対側の3辺もハイライト描画（中心点を基準に反転）
  edges.forEach(edge => {
    const mirrorStart = { x: 2 * CX - edge.start.x, y: 2 * CY - edge.start.y };
    const mirrorEnd = { x: 2 * CX - edge.end.x, y: 2 * CY - edge.end.y };
    ctx.beginPath();
    ctx.moveTo(mirrorStart.x, mirrorStart.y);
    ctx.lineTo(mirrorEnd.x, mirrorEnd.y);
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

  // 線を描画
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.7;
  ctx.stroke();
  ctx.globalAlpha = 1;

  // 点を描画
  points.forEach((p, i) => {
    const alpha = 0.3 + (i / points.length) * 0.7;
    const r = 1 + (i / points.length) * 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.globalAlpha = alpha;
    ctx.fill();
  });
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
    // 六角形
    drawHexagon();

    // アクティブな辺
    drawActiveEdges();
  }

  // 現在の位置を取得
  const pos1 = getPositionAndNormal(t1, 0);
  const pos2 = getPositionAndNormal(t2, 1);
  const pos3 = getPositionAndNormal(t3, 2);

  // 軌跡を描画
  drawTrail(points1, '#ff69b4');
  drawTrail(points2, '#7fff00');
  drawTrail(points3, '#ff8c00');

  if (guideVisible) {
    // 垂直線を描画
    drawNormalLine(pos1, '#ff6b6b');
    drawNormalLine(pos2, '#4ecdc4');
    drawNormalLine(pos3, '#ffd93d');

    // 移動する点を描画
    drawMovingPoint(pos1, '#ff6b6b');
    drawMovingPoint(pos2, '#4ecdc4');
    drawMovingPoint(pos3, '#ffd93d');

    // 反対側の点を描画（垂直線上で中心点の反対側）
    // 元の点から中心点への距離を計算し、その分だけ法線方向に延長
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

    const distToCenter3 = (CX - pos3.x) * pos3.nx + (CY - pos3.y) * pos3.ny;
    const mirror3 = {
      x: pos3.x + 2 * distToCenter3 * pos3.nx,
      y: pos3.y + 2 * distToCenter3 * pos3.ny
    };

    drawMovingPoint(mirror1, '#ff6b6b');
    drawMovingPoint(mirror2, '#4ecdc4');
    drawMovingPoint(mirror3, '#ffd93d');
  }
  // 現在の交点をマーク
  drawCurrentIntersection(points1, '#ff69b4');
  drawCurrentIntersection(points2, '#7fff00');
  drawCurrentIntersection(points3, '#ff8c00');
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

  const r3 = updateBounce(t3, dir3, speed3);
  t3 = r3.t; dir3 = r3.dir;

  // 交点を計算
  const pos1 = getPositionAndNormal(t1, 0);
  const pos2 = getPositionAndNormal(t2, 1);
  const pos3 = getPositionAndNormal(t3, 2);

  const int12 = getIntersection(pos1, pos1, pos2, pos2);
  const int23 = getIntersection(pos2, pos2, pos3, pos3);
  const int13 = getIntersection(pos1, pos1, pos3, pos3);

  // 有効な交点を軌跡に追加
  const isValid = (p) => p && Math.abs(p.x - CX) < 600 && Math.abs(p.y - CY) < 600;

  if (isValid(int12)) {
    points1.push(int12);
    if (points1.length > trailLength) points1.shift();
  }
  if (isValid(int23)) {
    points2.push(int23);
    if (points2.length > trailLength) points2.shift();
  }
  if (isValid(int13)) {
    points3.push(int13);
    if (points3.length > trailLength) points3.shift();
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
  points2 = [];
  points3 = [];
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
  const guideBtn = document.getElementById('guideBtn')
  guideBtn.addEventListener('click', () => {
    guideVisible = !guideVisible;
    guideBtn.textContent = guideVisible ? 'ガイド切替OFF' : 'ガイド切替ON';
    guideBtn.classList.toggle('active', guideVisible);
  });

  // 速度スライダー1
  document.getElementById('speed1').addEventListener('input', (e) => {
    speed1 = parseFloat(e.target.value);
    document.getElementById('speed1Val').textContent = speed1.toFixed(3);
  });

  // 速度スライダー2
  document.getElementById('speed2').addEventListener('input', (e) => {
    speed2 = parseFloat(e.target.value);
    document.getElementById('speed2Val').textContent = speed2.toFixed(3);
  });

  // 速度スライダー3
  document.getElementById('speed3').addEventListener('input', (e) => {
    speed3 = parseFloat(e.target.value);
    document.getElementById('speed3Val').textContent = speed3.toFixed(3);
  });
}

// 初期化
setupEventListeners();
animate();