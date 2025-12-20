// Canvas要素とコンテキスト
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// 定数
const CX = 400;
const CY = 400;
const RADIUS = 280;

// 八角形の頂点を計算
const octagonVertices = [];
for (let i = 0; i < 8; i++) {
  const angle = (Math.PI / 4) * i - Math.PI / 2;
  octagonVertices.push({
    x: CX + RADIUS * Math.cos(angle),
    y: CY + RADIUS * Math.sin(angle)
  });
}

// 右側の4辺を定義
const edges = [
  { start: octagonVertices[0], end: octagonVertices[1], color: '#ff6b6b' }, // 右上
  { start: octagonVertices[1], end: octagonVertices[2], color: '#4ecdc4' }, // 右
  { start: octagonVertices[2], end: octagonVertices[3], color: '#ffd93d' }, // 右下
  { start: octagonVertices[3], end: octagonVertices[4], color: '#a855f7' }  // 下
];

// 軌跡の色（6つの交点用: 4C2 = 6）
const trailColors = [
  '#ff69b4', // 0-1: ピンク
  '#ff8c00', // 0-2: オレンジ
  '#adff2f', // 0-3: ライム
  '#7fff00', // 1-2: グリーン
  '#00ffff', // 1-3: シアン
  '#da70d6'  // 2-3: オーキッド
];

// 状態変数
let isRunning = true;
let speed1 = 0.006;
let speed2 = 0.009;
let speed3 = 0.012;
let speed4 = 0.015;
let trailLength = 50;

// 点の位置（0〜1）と方向
let t1 = 0, t2 = 0.25, t3 = 0.5, t4 = 0.75;
let dir1 = 1, dir2 = 1, dir3 = 1, dir4 = 1;

// 軌跡の配列（6つの交点）
let trails = [[], [], [], [], [], []];

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
 * 八角形を描画
 */
function drawOctagon() {
  ctx.beginPath();
  ctx.moveTo(octagonVertices[0].x, octagonVertices[0].y);
  for (let i = 1; i < 8; i++) {
    ctx.lineTo(octagonVertices[i].x, octagonVertices[i].y);
  }
  ctx.closePath();
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 2;
  ctx.stroke();
}

/**
 * アクティブな4辺をハイライト描画
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

  // 反対側の4辺もハイライト描画（中心点を基準に反転）
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
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, 14, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 20;
  ctx.fill();
  ctx.shadowBlur = 0;

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
    drawOctagon();
    drawActiveEdges();
  }

  // 現在の位置を取得
  const pos1 = getPositionAndNormal(t1, 0);
  const pos2 = getPositionAndNormal(t2, 1);
  const pos3 = getPositionAndNormal(t3, 2);
  const pos4 = getPositionAndNormal(t4, 3);

  // 軌跡を描画
  trails.forEach((trail, i) => {
    drawTrail(trail, trailColors[i]);
  });

  if (guideVisible) {
    // 垂直線を描画
    drawNormalLine(pos1, '#ff6b6b');
    drawNormalLine(pos2, '#4ecdc4');
    drawNormalLine(pos3, '#ffd93d');
    drawNormalLine(pos4, '#a855f7');

    // 移動する点を描画
    drawMovingPoint(pos1, '#ff6b6b');
    drawMovingPoint(pos2, '#4ecdc4');
    drawMovingPoint(pos3, '#ffd93d');
    drawMovingPoint(pos4, '#a855f7');

    // 反対側の点を描画
    const positions = [pos1, pos2, pos3, pos4];
    positions.forEach(pos => {
      const distToCenter = (CX - pos.x) * pos.nx + (CY - pos.y) * pos.ny;
      const mirror = {
        x: pos.x + 2 * distToCenter * pos.nx,
        y: pos.y + 2 * distToCenter * pos.ny
      };
      drawMovingPoint(mirror, pos.color);
    });
  }

  // 現在の交点をマーク
  trails.forEach((trail, i) => {
    drawCurrentIntersection(trail, trailColors[i]);
  });
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

  const r4 = updateBounce(t4, dir4, speed4);
  t4 = r4.t; dir4 = r4.dir;

  // 交点を計算
  const pos1 = getPositionAndNormal(t1, 0);
  const pos2 = getPositionAndNormal(t2, 1);
  const pos3 = getPositionAndNormal(t3, 2);
  const pos4 = getPositionAndNormal(t4, 3);

  const positions = [pos1, pos2, pos3, pos4];

  // 全ての交点ペアを計算（4C2 = 6）
  const pairs = [
    [0, 1], [0, 2], [0, 3],
    [1, 2], [1, 3], [2, 3]
  ];

  const isValid = (p) => p && Math.abs(p.x - CX) < 600 && Math.abs(p.y - CY) < 600;

  pairs.forEach((pair, index) => {
    const p1 = positions[pair[0]];
    const p2 = positions[pair[1]];
    const intersection = getIntersection(p1, p1, p2, p2);
    
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
  trails = [[], [], [], [], [], []];
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

  document.getElementById('speed1').addEventListener('input', (e) => {
    speed1 = parseFloat(e.target.value);
  });

  document.getElementById('speed2').addEventListener('input', (e) => {
    speed2 = parseFloat(e.target.value);
  });

  document.getElementById('speed3').addEventListener('input', (e) => {
    speed3 = parseFloat(e.target.value);
  });

  document.getElementById('speed4').addEventListener('input', (e) => {
    speed4 = parseFloat(e.target.value);
  });
}

// 初期化
setupEventListeners();
animate();
