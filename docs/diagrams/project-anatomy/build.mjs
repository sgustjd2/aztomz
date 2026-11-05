// 한끗 프로젝트 해부도 — anatomy 스킬(github.com/wheresryan22/anatomy, MIT)의 iso-kit로 그린 등각 그림.
// 실행: node docs/diagrams/project-anatomy/build.mjs [--dark]  → hangeut-anatomy.html
// 서랍 깊이·카드 수·다이얼 값은 전부 backend/data/trends.json 과 .pipeline/review-queue.json 에서 읽는다.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "./kit/iso-kit.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "../../..");
const theme = process.argv.includes("--dark") ? "dark" : "light";

// ── 진실: 데이터에서 숫자를 읽는다
const raw = JSON.parse(readFileSync(join(ROOT, "backend/data/trends.json"), "utf8"));
const TRENDS = Array.isArray(raw) ? raw : raw.trends || raw.items;
const queueFile = join(ROOT, ".pipeline/review-queue.json");
const QUEUE = existsSync(queueFile) ? (JSON.parse(readFileSync(queueFile, "utf8")).items || []).length : 0;
const TODAY_STR = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
const TODAY = new Date(TODAY_STR + "T00:00:00");
const ageOf = (t) => Math.round((TODAY - new Date((t.analyzedAt || t.collectedAt) + "T00:00:00")) / 864e5);
// 아래 서랍부터 위로: 광고 분석 + 트렌드 7분류
const ORDER = ["광고 분석", "신조어", "패션", "노래·챌린지", "AI 프롬프트", "디저트", "맛집", "카페·핫플"];
const DRAWERS = ORDER.map((name) => {
  const list = TRENDS.filter((t) => (name === "광고 분석" ? t.type === "신뢰분석" : t.type !== "신뢰분석" && t.cat === name));
  return { name, n: list.length, fresh: list.filter((t) => ageOf(t) < 14).length, src: list.reduce((s, t) => s + (t.src || []).length, 0) };
});
const TOTAL = TRENDS.length;
const FRESH = DRAWERS.reduce((s, d) => s + d.fresh, 0);
const MAXN = Math.max(...DRAWERS.map((d) => d.n));

// ── 월드 배치 (1 단위 ≈ 1px, x·y 바닥, z 위)
const WIDTH = 680;
const HEIGHT = 440;
const PLATE = { x: -204, y: -48, w: 400, d: 124, r: 8 };
const PLATE_H = 10;
const FOOT_H = 5;
const RAIL_Y = [-14, 10];
const RAIL = { from: -128, to: 92 };
const STOP = { hopper: -106, gate: -60, stamp: 8, cabinet: 66 };
const CARD_Z = 8.4; // 운반대 위 카드 윗면
const GATE_X = -60;
const PROBE_Y = [-12, 0, 12];
const PROBE_REST = 22;
const STAMP = [STOP.stamp, -2];
const HEAD_REST = 22; // 도장 바닥 높이
const CAB = { x: 102, y: -36, w: 76, d: 58 };
const FRONT_Y = CAB.y + CAB.d; // 22
const PITCH = 9;
const Z0 = 4;
const LID_Z = Z0 + PITCH * DRAWERS.length; // 76
const DIAL = [140, -8];
const DIAL_R = 15;
const DIAL_Z = LID_Z + 4;
const DIAL_TOP = DIAL_Z + 7;
const depthOfDrawer = (n) => 8 + 34 * (n / MAXN); // 서랍(카드 묶음) 깊이 ∝ 건수
const SWEEP = [-0.75 * Math.PI, 1.5 * Math.PI];

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [CAB.x + CAB.w, CAB.y, DIAL_TOP + 2], [GATE_X, -32, 54], [PLATE.x, PLATE.y, 30], [CAB.x, FRONT_Y + 44, 0]],
  WIDTH,
  HEIGHT,
  { pad: 26, azimuth: 40 },
);
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const slab = (plan, z, h, steps = 3, bevel = 0) => k.slabOf(plan, z, h, P, steps, bevel);
const byDepth = (pts) => [...pts].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));

// ── 바닥판: 받침발·홈·나사·눈금자·명판
function plate() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(PLATE, 22))) {
    out.push(S(k.cylinder(x, y, 7, -PLATE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 5.4, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
  }
  out.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6), { tone: "mid", inner: L(k.sideSeam(PLATE, -4, P, 8), { tone: "faint" }) }));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "lo" }));
  const screws = k.corners(PLATE, 10);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  const strip = { x: -150, y: PLATE.y + PLATE.d - 14, w: 236, d: 7, r: 1 };
  out.push(S(slab(strip, 0, 0.6), { tone: "lo", crease: "none" }));
  const ticks = k.topTicks(strip.x + 4, strip.x + strip.w - 4, 4, 5, strip.y + 0.8, 0.6, [2, 3.6], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(D([at([strip.x + 2, strip.y + 3.5, 0.6]), at([strip.x + strip.w - 2, strip.y + 3.5, 0.6])], { size: 0.45 }));
  const label = { x: -192, y: 30, w: 34, d: 22, r: 1.5 };
  out.push(S(slab(label, 0, 0.8, 4), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(label, 1.6), 0.8, P, 4), { tone: "faint" }));
  out.push(k.faceTextSvg(k.topMatrix([label.x + label.w / 2, label.y + 7], 0.8, P, "x"), "AZ2MZ", { size: 3.2, tone: "mid", anchor: "middle" }));
  [[label.x + 5, label.x + 29], [label.x + 5, label.x + 24], [label.x + 5, label.x + 18]].forEach(([a, b], i) =>
    out.push(L(k.lineOnTop([a, label.y + 11 + i * 3], [b, label.y + 11 + i * 3], 0.8, P), { tone: "lo", free: true })));
  out.push(D([at([label.x + 2.4, label.y + 2.4, 0.8]), at([label.x + label.w - 2.4, label.y + label.d - 2.4, 0.8])], { size: 0.4 }));
  return out.join("");
}

// ── 레일·끝 멈춤쇠
function rails() {
  const out = [];
  for (const y of RAIL_Y) {
    out.push(S(slab({ x: RAIL.from, y, w: RAIL.to - RAIL.from, d: 4, r: 1 }, 0, 3, 3, 0.4), { tone: "mid" }));
    out.push(D([RAIL.from + 6, (RAIL.from + RAIL.to) / 2, RAIL.to - 6].map((x) => at([x, y + 2, 3])), { size: 0.4 }));
  }
  for (const x of [RAIL.from - 5, RAIL.to]) {
    out.push(S(slab({ x, y: RAIL_Y[0] - 3, w: 5, d: RAIL_Y[1] - RAIL_Y[0] + 10, r: 1.2 }, 0, 7, 3, 0.5), { tone: "mid" }));
    out.push(D([at([x + 2.5, RAIL_Y[0], 7]), at([x + 2.5, RAIL_Y[1] + 4, 7])], { size: 0.45 }));
  }
  return out.join("");
}

// ── 수집 호퍼: Hermes가 모아 온 후보 카드 더미
function hopper() {
  const out = [];
  const tray = { x: -192, y: -34, w: 52, d: 54, r: 2 };
  out.push(`<path class="iso-halo" d="${k.haloOf(k.insetPlan(tray, 2), 0, 0.1, P)}" style="filter:blur(3px)"/>`);
  out.push(S(slab(tray, 0, 3, 4, 0.5), { tone: "mid" }));
  out.push(S(slab({ x: tray.x, y: tray.y, w: tray.w, d: 3, r: 1 }, 3, 26, 3, 0.4), { tone: "mid" })); // 뒷벽
  out.push(S(slab({ x: tray.x, y: tray.y + 3, w: 3, d: tray.d - 3, r: 1 }, 3, 26, 3, 0.4), { tone: "mid" })); // 왼벽
  for (let i = 0; i < 9; i++) {
    const card = { x: tray.x + 7, y: tray.y + 7, w: 38, d: 40, r: 0.8 };
    out.push(S(slab(card, 3 + i * 1.8, 1.2, 2), { tone: i === 8 ? "hi" : "mid", crease: i === 8 ? "faint" : "none" }));
  }
  const tab = { x: tray.x + 30, y: tray.y + 7, w: 9, d: 3, r: 0.6 };
  out.push(S(slab(tab, 3 + 8 * 1.8 + 1.2, 1.4, 2), { tone: "lo", crease: "none" }));
  out.push(S(slab({ x: tray.x + tray.w - 3, y: tray.y + 3, w: 3, d: tray.d - 3, r: 1 }, 3, 8, 3, 0.4), { tone: "mid" })); // 앞 낮은 벽
  out.push(S(slab({ x: tray.x + 3, y: tray.y + tray.d - 3, w: tray.w - 6, d: 3, r: 1 }, 3, 8, 3, 0.4), { tone: "mid" }));
  out.push(D([at([tray.x + 1.5, tray.y + 1.5, 29]), at([tray.x + tray.w - 1.5, tray.y + 1.5, 29])], { size: 0.45 }));
  return out.join("");
}

// ── 운반대: 카드 한 장(lit)을 레일 위로 나른다 (x=0에 만들고 translateAlong으로 이동)
function carriage() {
  const base = { x: -14, y: RAIL_Y[0] - 4, w: 28, d: RAIL_Y[1] - RAIL_Y[0] + 12, r: 2.4 };
  const out = [`<path class="iso-halo" d="${k.haloOf(k.insetPlan(base, 3), 3, 0.1, P)}" style="filter:blur(4px)"/>`];
  for (const y of RAIL_Y) for (const x of [-10, 4]) out.push(S(slab({ x, y: y - 1, w: 6, d: 6, r: 1 }, 2, 2, 2), { tone: "lo" }));
  out.push(S(slab(base, 4, 3, 4, 0.6), { tone: "mid" }));
  out.push(D([-10, -3, 4, 11].map((x) => at([x, base.y + base.d - 2, 7])), { size: 0.4, tone: "lo" }));
  const card = { x: -11, y: base.y + 3, w: 22, d: base.d - 6, r: 0.8 };
  out.push(S(slab(card, 7, CARD_Z - 7, 2), { tone: "hi", lit: true }));
  out.push(S(slab({ x: 2, y: card.y - 1.6, w: 7, d: 2, r: 0.5 }, 7, CARD_Z - 7 + 0.6, 2), { tone: "hi", lit: true, crease: "none" }));
  const handle = [base.x + base.w + 2, 0];
  out.push(S(slab({ x: base.x + base.w - 1, y: -2, w: 3, d: 4, r: 1 }, 4.6, 2, 2), { tone: "mid", crease: "none" }));
  out.push(S(k.cylinder(handle[0] + 1, handle[1], 2.6, 3.6, 4.2, P, 20), { tone: "mid" }));
  out.push(L(k.knurl(handle[0] + 1, handle[1], 2.6, 3.6, 7.8, 18, P), { tone: "lo" }));
  return out.join("");
}

// ── 검증 게이트: 기둥 둘·가로대·탐침 셋(링크 생존 / 본문 관련성 / 근거 대조)
const gateBackPost = () => S(k.cylinder(GATE_X, -28, 3.2, 0, 46, P, 24), { tone: "mid", inner: L(k.sideArc(GATE_X, -28, 3.2, 12, P, 12), { tone: "faint" }) });
const gateFrontPost = () =>
  S(k.cylinder(GATE_X, 28, 4.6, 0, 3, P, 24), { tone: "lo" }) + S(k.cylinder(GATE_X, 28, 3.2, 3, 43, P, 24), { tone: "mid", inner: L(k.sideArc(GATE_X, 28, 3.2, 12, P, 12), { tone: "faint" }) });
function probeRods() {
  return byDepth(PROBE_Y.map((y) => [GATE_X, y]))
    .map(([x, y]) => S(k.cylinder(x, y, 1.6, PROBE_REST + 0.8, 28, P, 14), { tone: "hi", crease: "none" }) + S(k.cylinder(x, y, 2.2, PROBE_REST, 0.8, P, 16), { tone: "hi" }))
    .join("");
}
function gateTop() {
  const out = [];
  for (const [x, y] of byDepth(PROBE_Y.map((y) => [GATE_X, y]))) {
    out.push(S(k.cylinder(x, y, 2.8, 34, 12, P, 20), { tone: "mid", inner: L(k.sideArc(x, y, 2.8, 37, P, 12), { tone: "faint" }) }));
  }
  const bar = { x: GATE_X - 6, y: -32, w: 12, d: 64, r: 1.5 };
  out.push(S(slab(bar, 46, 6, 3, 0.6), { tone: "mid" }));
  out.push(D([-28, 28].map((y) => at([GATE_X, y, 52])), { size: 0.5 }));
  out.push(L(PROBE_Y.map((y) => k.ring(GATE_X, y, 1.4, 52, P, 12)).join(""), { tone: "lo" }));
  return out.join("");
}

// ── 날짜 도장: analyzedAt 찍기
const stampPost = () => S(k.cylinder(STAMP[0], -30, 3.2, 0, 45, P, 24), { tone: "mid" }) + S(k.cylinder(STAMP[0], -30, 4.6, 0, 3, P, 24), { tone: "lo" });
function stampHead() {
  const [x, y] = STAMP;
  return [
    S(k.cylinder(x, y, 1.6, HEAD_REST + 4, 26, P, 14), { tone: "hi", crease: "none" }),
    S(k.cylinder(x, y, 6.4, HEAD_REST, 1.2, P, 32), { tone: "lo" }),
    S(k.cylinder(x, y, 6, HEAD_REST + 1.2, 2.8, P, 32, 0.4), { tone: "hi" }),
  ].join("");
}
function stampTop() {
  const [x, y] = STAMP;
  const out = [];
  out.push(S(k.cylinder(x, y, 3.4, 34, 6, P, 20), { tone: "mid" }));
  out.push(S(slab({ x: x - 5, y: -34, w: 10, d: 36, r: 2 }, 40, 5, 3, 0.5), { tone: "mid" }));
  out.push(S(k.cylinder(x, y, 2.6, 45, 1.6, P, 18), { tone: "mid" }));
  out.push(D([at([x, -30, 45])], { size: 0.5 }));
  return out.join("");
}

// ── 보류함: 근거가 부족해 사람 검수를 기다리는 후보
function rejectTray() {
  const tray = { x: -78, y: 38, w: 36, d: 24, r: 1.6 };
  const out = [`<path class="iso-halo" d="${k.haloOf(k.insetPlan(tray, 2), 0, 0.1, P)}" style="filter:blur(3px)"/>`];
  out.push(S(slab(tray, 0, 2, 4, 0.4), { tone: "lo" }));
  out.push(S(slab({ x: tray.x, y: tray.y, w: tray.w, d: 2.4, r: 0.8 }, 2, 6, 3), { tone: "mid" }));
  out.push(S(slab({ x: tray.x, y: tray.y + 2.4, w: 2.4, d: tray.d - 2.4, r: 0.8 }, 2, 6, 3), { tone: "mid" }));
  for (let i = 0; i < Math.min(QUEUE, 6); i++) out.push(S(slab({ x: tray.x + 5 + i * 1.4, y: tray.y + 5 - i, w: 24, d: 15, r: 0.6 }, 2 + i * 1.3, 1, 2), { tone: "mid", crease: "none" }));
  out.push(S(slab({ x: tray.x + tray.w - 2.4, y: tray.y + 2.4, w: 2.4, d: tray.d - 2.4, r: 0.8 }, 2, 3.4, 3), { tone: "mid" }));
  out.push(S(slab({ x: tray.x + 2.4, y: tray.y + tray.d - 2.4, w: tray.w - 4.8, d: 2.4, r: 0.8 }, 2, 3.4, 3), { tone: "mid" }));
  return out.join("");
}

// ── 서랍장: trends.json — 서랍 8칸(광고 분석 + 트렌드 7분류), 서랍 깊이 ∝ 건수
const zOf = (i) => Z0 + i * PITCH;
function drawer(d, i) {
  const z = zOf(i);
  const deep = depthOfDrawer(d.n);
  const tray = { x: CAB.x + 6, y: FRONT_Y - deep, w: CAB.w - 12, d: deep, r: 0.8 };
  const out = [S(slab(tray, z + 1, 5, 2), { tone: "mid" })];
  const inner = k.insetPlan(tray, 1.6);
  out.push(L(k.planOutline(inner, z + 6, P, 2), { tone: "lo" }));
  const cards = Math.max(2, Math.round(d.n / 2));
  const lines = [];
  for (let c = 1; c <= cards; c++) {
    const y = inner.y + (inner.d * c) / (cards + 1);
    lines.push(k.lineOnTop([inner.x, y], [inner.x + inner.w, y], z + 6, P));
  }
  out.push(L(lines.join(""), { tone: "faint" }));
  const front = { x: CAB.x + 4, y: FRONT_Y, w: CAB.w - 8, d: 2, r: 0.6 };
  out.push(S(slab(front, z, 8, 2, 0.3), { tone: "hi" }));
  out.push(S(slab({ x: front.x + 6, y: FRONT_Y + 2, w: 14, d: 0.6, r: 0.2 }, z + 2.4, 3.6, 2), { tone: "lo", crease: "none" }));
  out.push(S(slab({ x: front.x + front.w - 20, y: FRONT_Y + 2, w: 10, d: 1.8, r: 0.6 }, z + 3.2, 1.6, 2), { tone: "mid" }));
  out.push(D([at([front.x + front.w - 21.4, FRONT_Y + 2, z + 4]), at([front.x + front.w - 8.6, FRONT_Y + 2, z + 4])], { size: 0.4 }));
  return out.join("");
}
function cabinetBack() {
  const out = [`<path class="iso-halo" d="${k.haloOf(k.insetPlan({ ...CAB, r: 2 }, 1), 0, 0.1, P)}" style="filter:blur(5px)"/>`];
  out.push(S(slab({ x: CAB.x, y: CAB.y, w: CAB.w, d: CAB.d, r: 1.6 }, 0, Z0, 4, 0.5), { tone: "lo" }));
  out.push(S(slab({ x: CAB.x, y: CAB.y, w: 4, d: CAB.d, r: 1 }, Z0, LID_Z - Z0, 3), { tone: "mid" }));
  out.push(S(slab({ x: CAB.x + 4, y: CAB.y, w: CAB.w - 8, d: 4, r: 1 }, Z0, LID_Z - Z0, 3), { tone: "mid" }));
  return out.join("");
}
function cabinetFront() {
  const out = [];
  const side = { x: CAB.x + CAB.w - 4, y: CAB.y, w: 4, d: CAB.d, r: 1 };
  const seams = DRAWERS.slice(1).map((_, i) => k.sideSeam(side, zOf(i + 1) - 0.5, P, 3)).join(""); // 측판 이음선: 보이는 모서리를 돌아 실루엣에서 끝난다
  out.push(S(slab(side, Z0, LID_Z - Z0, 3, 0.4), { tone: "mid", inner: L(seams, { tone: "faint" }) }));
  const lid = { x: CAB.x - 2, y: CAB.y - 2, w: CAB.w + 4, d: CAB.d + 4, r: 2 };
  out.push(S(slab(lid, LID_Z, 4, 4, 0.8), { tone: "mid" }));
  out.push(D(k.corners(lid, 4).map(([x, y]) => at([x, y, LID_Z + 4])), { size: 0.45 }));
  const [x, y] = DIAL;
  out.push(S(k.cylinder(x, y, DIAL_R + 2, DIAL_Z - 0, 1.6, P, 48), { tone: "lo" }));
  out.push(S(k.cylinder(x, y, DIAL_R, DIAL_Z + 1.6, DIAL_TOP - DIAL_Z - 1.6, P, 64, 0.8), { tone: "hi", crease: "lo" }));
  out.push(L(k.knurl(x, y, DIAL_R, DIAL_TOP - 3, DIAL_TOP, 72, P, 0.3), { tone: "lo" }));
  out.push(L(k.ring(x, y, DIAL_R - 2, DIAL_TOP, P, 64), { tone: "lo" }));
  const ticks = k.radialTicks(x, y, DIAL_R - 2.6, 28, 7, DIAL_TOP, [1.2, 2.6], P, SWEEP[0], SWEEP[1]);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(L(k.ring(x, y, 1.5, DIAL_TOP, P, 16), { tone: "mid" }));
  out.push(k.faceTextSvg(k.topMatrix([x, y + 7], DIAL_TOP, P, "x"), "14d", { size: 2.4, tone: "lo", anchor: "middle" }));
  return out.join("");
}
const needleAt = (frac) => {
  const a = SWEEP[0] + SWEEP[1] * Math.max(0, Math.min(1, frac));
  const [x, y] = DIAL;
  return k.lineOnTop([x - Math.sin(a) * 3, y + Math.cos(a) * 3], [x + Math.sin(a) * (DIAL_R - 3.6), y - Math.cos(a) * (DIAL_R - 3.6)], DIAL_TOP + 0.2, P);
};

const START = 1; // 신조어 서랍부터
// --slide: 움직임 없이 한 장면으로 멈춘 발표용(카드는 게이트에서 검증 중, 신조어 서랍은 열림)
const SLIDE = process.argv.includes("--slide");
const LIVE = SLIDE && process.argv.includes("--live"); // 발표용 화면 + 움직임(GIF 녹화용)
const POSE = SLIDE && !LIVE
  ? { x: STOP.gate, probe: CARD_Z + 0.2 - PROBE_REST, open: START }
  : { x: STOP.hopper, probe: 0, open: -1 };
// 기능별 색: 수집(파랑)·검증(빨강)·도장(초록)·보류(주황)·데이터(남색)·지금 처리 중인 카드(노랑) — 프로젝트 styles.css 토큰에서 뽑음
const hue = (name, html) => `<g class="hue-${name}">${html}</g>`;
const HUES = {
  collect: { c: "#3656d4" }, // --pulse
  gate: { c: "#e54756" }, // --ad
  stamp: { c: "#21885a" }, // --trust
  hold: { c: "#d08a1e" }, // --amber 계열
  data: { c: "#24365c" }, // --ink 계열
  card: { c: "#e0a800" }, // --trend 계열(노랑), lit 부품만 칠한다
};
// 면은 테마의 면 색에 색조를 섞고(그늘일수록 진하게), 선은 테마 선 색에 섞는다. 기준 색은 .iso에서 한 번 받아 둔다(자기 참조 순환 방지).
const HUE_CSS = `.iso{--b-face:var(--anatomy-face);--b-top:var(--anatomy-top);--b-s0:var(--anatomy-shade-0);--b-s1:var(--anatomy-shade-1);--b-s2:var(--anatomy-shade-2);--b-s3:var(--anatomy-shade-3);--b-hi:var(--anatomy-hi);--b-mid:var(--anatomy-mid);--b-lo:var(--anatomy-lo);--b-faint:var(--anatomy-faint);--b-lt:var(--anatomy-lit-top);--b-ls:var(--anatomy-lit-shade)}
${Object.entries(HUES)
  .filter(([n]) => n !== "card")
  .map(([n, { c }]) => `.hue-${n}{--anatomy-face:color-mix(in srgb,${c} 9%,var(--b-face));--anatomy-top:color-mix(in srgb,${c} 13%,var(--b-top));--anatomy-shade-3:color-mix(in srgb,${c} 18%,var(--b-s3));--anatomy-shade-2:color-mix(in srgb,${c} 24%,var(--b-s2));--anatomy-shade-1:color-mix(in srgb,${c} 30%,var(--b-s1));--anatomy-shade-0:color-mix(in srgb,${c} 36%,var(--b-s0));--anatomy-hi:color-mix(in srgb,${c} 80%,var(--b-hi));--anatomy-mid:color-mix(in srgb,${c} 62%,var(--b-mid));--anatomy-lo:color-mix(in srgb,${c} 45%,var(--b-lo));--anatomy-faint:color-mix(in srgb,${c} 30%,var(--b-faint))}`)
  .join("\n")}
.hue-card{--anatomy-lit-top:color-mix(in srgb,${HUES.card.c} 38%,var(--b-lt));--anatomy-lit-shade:color-mix(in srgb,${HUES.card.c} 62%,var(--b-ls));--anatomy-lit:color-mix(in srgb,${HUES.card.c} 70%,#3a2a00)}`;
const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label: `한끗을 하나의 카드 분류기로 그린 등각 그림. 왼쪽 호퍼에 모인 후보 카드를 운반대가 레일로 옮겨 탐침 세 개의 검증 게이트와 날짜 도장을 지나게 하고, 오른쪽 서랍장 8칸(광고 분석과 트렌드 7분류)에 넣는다. 서랍 깊이는 분류별 건수에 비례하고, 서랍장 위 다이얼은 선택한 서랍에서 14일 안에 분석된 비율을 가리킨다. 게이트 앞 보류함에는 사람 검수를 기다리는 후보 ${QUEUE}건이 있다.`,
  body: [
    plate(),
    rails(),
    hue("collect", hopper()),
    hue("gate", gateBackPost()),
    hue("stamp", stampPost()),
    `<g class="hue-card" data-part="carriage" transform="${k.translateAlong(P, [POSE.x, 0, 0])}">${carriage()}</g>`,
    `<g class="hue-gate" data-part="probes" transform="${k.translateAlong(P, [0, 0, POSE.probe])}">${probeRods()}</g>`,
    hue("gate", gateTop() + gateFrontPost()),
    `<g class="hue-stamp" data-part="stamp">${stampHead()}</g>`,
    hue("stamp", stampTop()),
    hue("hold", rejectTray()),
    hue("data", cabinetBack()),
    ...DRAWERS.map((d, i) => `<g class="hue-data" data-part="drawer" data-i="${i}" transform="${k.translateAlong(P, [0, i === POSE.open ? depthOfDrawer(d.n) : 0, 0])}">${drawer(d, i)}</g>`),
    hue("data", cabinetFront()),
    `<path data-part="needle" class="iso-line" data-tone="lit" data-free="start" d="${needleAt(DRAWERS[START].fresh / DRAWERS[START].n)}" style="stroke-width:1.1"/>`,
  ],
});

const say = (d) => `${d.name} ${d.n}건 · 14일 안 분석 ${d.fresh}건 · 출처 ${d.src}개`;
const live = `
const P = ${JSON.stringify(P)};
const DRAWERS = ${JSON.stringify(DRAWERS)};
const STOP = ${JSON.stringify(STOP)};
const DIAL = ${JSON.stringify(DIAL)}, DIAL_R = ${DIAL_R}, DIAL_TOP = ${DIAL_TOP}, SWEEP = ${JSON.stringify(SWEEP)};
const deepOf = (n) => 8 + 34 * (n / ${MAXN});
const PROBE_DOWN = ${CARD_Z + 0.2 - PROBE_REST}, STAMP_DOWN = ${CARD_Z + 0.2 - HEAD_REST};
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const carriage = svg.querySelector('[data-part="carriage"]');
const probes = svg.querySelector('[data-part="probes"]');
const stamp = svg.querySelector('[data-part="stamp"]');
const drawers = [...svg.querySelectorAll('[data-part="drawer"]')];
const needle = svg.querySelector('[data-part="needle"]');
const readout = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const needleAt = ${needleAt.toString().replace("k.lineOnTop", "lineOnTop")};
const say = ${say.toString()};
// 한 바퀴(5.6초): 호퍼 → 게이트(탐침) → 도장 → 서랍장(서랍 열림) → 호퍼
const CYCLE = 5.6;
function plan(t) {
  const x = t < 1.0 ? STOP.gate : t < 1.7 ? STOP.gate : t < 2.5 ? STOP.stamp : t < 3.1 ? STOP.stamp : t < 4.9 ? STOP.cabinet : STOP.hopper;
  const probe = t > 1.05 && t < 1.55 ? PROBE_DOWN : 0;
  const head = t > 2.55 && t < 2.95 ? STAMP_DOWN : 0;
  const open = t > 3.5 && t < 4.7;
  return { x, probe, head, open };
}
let sel = ${START}, touring = true, clock = 0, visible = false, frame = 0, last = 0, idle = 0;
const s = { x: STOP.hopper, probe: 0, head: 0, needle: DRAWERS[sel].fresh / DRAWERS[sel].n, out: DRAWERS.map(() => 0) };
const follow = (v, to, dt, sec, calm) => calm ? to : v + (to - v) * (1 - Math.exp(-dt / sec));
function draw() {
  carriage.setAttribute("transform", translateAlong(P, [s.x, 0, 0]));
  probes.setAttribute("transform", translateAlong(P, [0, 0, s.probe]));
  stamp.setAttribute("transform", translateAlong(P, [0, 0, s.head]));
  drawers.forEach((g, i) => g.setAttribute("transform", translateAlong(P, [0, s.out[i], 0])));
  needle.setAttribute("d", needleAt(s.needle));
  const text = say(DRAWERS[sel]);
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuenow", String(sel));
  stage.setAttribute("aria-valuetext", text);
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  const calm = still.matches;
  let want;
  if (touring) {
    clock += dt;
    const t = clock % CYCLE;
    sel = (${START} + Math.floor(clock / CYCLE)) % DRAWERS.length;
    want = plan(t);
  } else want = { x: STOP.cabinet, probe: 0, head: 0, open: true };
  s.x = follow(s.x, want.x, dt, 0.22, calm);
  s.probe = follow(s.probe, want.probe, dt, 0.08, calm);
  s.head = follow(s.head, want.head, dt, 0.07, calm);
  s.needle = follow(s.needle, DRAWERS[sel].fresh / DRAWERS[sel].n, dt, 0.35, calm);
  s.out = s.out.map((v, i) => follow(v, want.open && i === sel ? deepOf(DRAWERS[i].n) : 0, dt, 0.25, calm));
  draw();
  const settled = !touring && Math.abs(s.x - want.x) < 0.02 && s.out.every((v, i) => Math.abs(v - (i === sel ? deepOf(DRAWERS[i].n) : 0)) < 0.02) && Math.abs(s.needle - DRAWERS[sel].fresh / DRAWERS[sel].n) < 0.001;
  frame = visible && !settled ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const choose = (i) => { touring = false; sel = Math.max(0, Math.min(DRAWERS.length - 1, i)); clearTimeout(idle); idle = setTimeout(() => { touring = !still.matches; clock = 0; run(); }, 4200); run(); };
new IntersectionObserver((e) => { visible = e[e.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
if (still.matches) { touring = false; s.x = STOP.cabinet; s.out[sel] = deepOf(DRAWERS[sel].n); }
stage.addEventListener("pointermove", (e) => {
  const b = svg.getBoundingClientRect();
  const share = Math.max(0, Math.min(1, ((e.clientY - b.top) / b.height - 0.12) / 0.62));
  const i = DRAWERS.length - 1 - Math.floor(share * DRAWERS.length * 0.999);
  if (i !== sel || touring) choose(i);
});
stage.addEventListener("keydown", (e) => {
  let to = null;
  if (e.key === "ArrowUp" || e.key === "ArrowRight") to = sel + 1;
  if (e.key === "ArrowDown" || e.key === "ArrowLeft") to = sel - 1;
  if (e.key === "Home") to = 0;
  if (e.key === "End") to = DRAWERS.length - 1;
  if (to === null) return;
  e.preventDefault();
  choose(to);
});
draw();
`;

const plateBody = k.plateHtml({
  fig: "Fig 1",
  title: "한끗 트렌드 분류기",
  hint: "위아래로 움직여 서랍 고르기 · ↑↓ 키",
  readout: say(DRAWERS[START]),
  keys: [
    { mark: "lit", label: "카드: 지금 검증·분류되는 트렌드 한 건" },
    { mark: "raised", label: "서랍 8칸: trends.json (깊이 ∝ 건수)" },
    { mark: "flat", label: "보류함: 사람 검수 대기 후보" },
  ],
  caption: `trends.json ${TOTAL}건 중 14일 안에 분석된 것은 ${FRESH}건이다. 카드는 링크 생존·본문 관련성·근거 대조 탐침을 모두 지나야 서랍에 들어가고, 날짜 도장(analyzedAt)이 찍힌다. 다이얼은 고른 서랍에서 14일 안에 분석된 비율이다.`,
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="한끗 트렌드 분류기: 화살표 키로 서랍을 고른다" aria-valuemin="0" aria-valuemax="${DRAWERS.length - 1}" aria-valuenow="${START}">${svg}</div>`,
});

// 부품 ↔ 실제 구성 대응표 (그림 밖, 카드 아래). 첫 칸 색 = 그림 속 부품 색
const PARTS = [
  ["collect", "수집 호퍼", "Hermes AI 비서가 매일 21:30 모아 오는 후보", ".pipeline/curate.json"],
  ["card", "처리 중인 카드", "지금 검증·분류되는 트렌드 한 건", "운반대 위 카드"],
  ["", "운반대·레일", "결정적 스크립트가 후보를 한 건씩 옮긴다", "backend/scripts/auto-build.mjs"],
  ["gate", "검증 게이트", "탐침 셋: 링크 생존 · 본문 관련성 · 근거 대조", "check-links · check-source · lib/grounding.mjs"],
  ["hold", "보류함", `걸린 후보는 디스코드 버튼 검수로 (지금 ${QUEUE}건)`, ".pipeline/review-queue.json · pipeline-review.mjs"],
  ["stamp", "날짜 도장", "실제로 분석한 항목만 analyzedAt 갱신", "restage.mjs · recheck-ad.mjs"],
  ["data", "서랍장 8칸", `광고 분석 + 트렌드 7분류, 모두 ${TOTAL}건 (서랍 깊이 ∝ 건수)`, "backend/data/trends.json"],
  ["data", "신선도 다이얼", "고른 서랍에서 14일 안에 분석된 비율, 지나면 '오래된 분석' 경고", "frontend/assets/app.js H.freshness"],
  ["", "그림 밖", "refresh.mjs → frontend/data/trends.js → git push → Vercel", "az2mz.vercel.app"],
];
const chip = (h) => (h ? `<span class="hg-chip" style="--c:${HUES[h].c}"></span>` : `<span class="hg-chip" style="--c:var(--anatomy-mid)"></span>`);
const parts = `<section class="hg-parts" aria-label="부품과 실제 구성">
<h2>부품 = 실제 구성</h2>
<table><thead><tr><th>부품</th><th>하는 일</th><th>코드·데이터</th></tr></thead><tbody>
${PARTS.map(([h, a, b, c]) => `<tr><td>${chip(h)}${a}</td><td>${b}</td><td><code>${c}</code></td></tr>`).join("\n")}
</tbody></table>
<p class="hg-note">서랍별 수치: ${DRAWERS.map((d) => `${d.name} ${d.n}(${d.fresh})`).join(" · ")} — 괄호는 14일 안 분석. 기준일 ${TODAY_STR}.</p>
</section>`;
const head = `<header class="hg-head"><p>AZ와 MZ는 한 끗 차이 · 프로젝트 해부도</p><h1>한끗은 카드 분류기다</h1><p class="hg-sub">트렌드 한 건이 수집되어 검증·날짜 도장을 거쳐 서랍(데이터)에 들어가고, 날짜가 오래되면 다이얼이 내려간다. 움직이는 숫자는 모두 실제 데이터에서 읽었다.</p></header>`;
const css = `<style>
.hg-head{margin:0 0 28px}.hg-head p:first-child{font:600 12.5px/1.4 Pretendard,"Apple SD Gothic Neo","Noto Sans KR","Malgun Gothic",sans-serif;letter-spacing:.02em;color:var(--anatomy-muted);margin:0 0 10px}
.hg-head h1{font:700 30px/1.25 Pretendard,"Apple SD Gothic Neo","Noto Sans KR","Malgun Gothic",sans-serif;color:var(--anatomy-strong);margin:0 0 8px;letter-spacing:-.01em}
.hg-sub{margin:0;max-width:60ch;font-size:15px}
.iso-page,.iso .iso-plate-corner,.iso-legend{font-family:Pretendard,"Apple SD Gothic Neo","Noto Sans KR","Malgun Gothic",sans-serif}
.iso .iso-plate-corner{font-size:12px;letter-spacing:0}.iso .iso-plate-corner[data-corner="title"],.iso .iso-plate-corner[data-corner="hint"]{letter-spacing:0}
.hg-parts{margin-top:40px}.hg-parts h2{font:700 17px/1.4 inherit;color:var(--anatomy-strong);margin:0 0 12px}
.hg-parts table{width:100%;border-collapse:collapse;font-size:13.5px}
.hg-parts th,.hg-parts td{text-align:left;vertical-align:top;padding:9px 10px;border-top:1px solid color-mix(in srgb,var(--anatomy-text) 18%,transparent)}
.hg-parts th{font-weight:600;color:var(--anatomy-strong);font-size:12.5px}
.hg-parts td:first-child{white-space:nowrap;color:var(--anatomy-strong);font-weight:600}
.hg-parts code{font:12px/1.5 var(--anatomy-mono);word-break:break-word}
.hg-note{font-size:12.5px;color:var(--anatomy-muted);margin-top:12px}
@media (max-width:560px){.hg-parts td:nth-child(3),.hg-parts th:nth-child(3){display:none}.hg-head h1{font-size:24px}}
.hg-chip{display:inline-block;width:11px;height:11px;border-radius:3px;margin-right:8px;vertical-align:-1px;background:color-mix(in srgb,var(--c) 28%,var(--anatomy-face));border:1.4px solid var(--c)}
${HUE_CSS}
</style>`;

if (SLIDE) {
  // 발표용 16:9 한 장(1280×720): 왼쪽 그림, 오른쪽 색 범례. 움직임 없음 — svgpng 로 2560×1440 PNG를 뜬다
  const LEG = [
    ["collect", "수집 호퍼", "AI 비서가 매일 21:30 모은 후보"],
    ["card", "처리 중인 카드", "지금 검증·분류되는 트렌드 한 건"],
    ["gate", "검증 게이트", "탐침 셋: 링크 생존 · 본문 관련성 · 근거 대조"],
    ["hold", "보류함", `걸리면 사람이 디스코드 버튼으로 검수 (지금 ${QUEUE}건)`],
    ["stamp", "날짜 도장", "실제로 분석한 항목만 분석일 갱신"],
    ["data", "서랍장 8칸 = trends.json", `광고 분석 + 트렌드 7분류 ${TOTAL}건, 깊이 ∝ 건수`],
    ["data", "신선도 다이얼", LIVE ? "열린 서랍에서 14일 안에 분석된 비율" : `열린 서랍(${DRAWERS[START].name})에서 14일 안 분석 비율`],
  ];
  const slideCss = `<style>
*{box-sizing:border-box}html,body{margin:0}
body{width:1280px;height:720px;overflow:hidden;background:var(--anatomy-page);font-family:Pretendard,"Apple SD Gothic Neo","Noto Sans KR","Malgun Gothic",sans-serif;color:var(--anatomy-text)}
.sl{display:grid;grid-template-columns:860px 1fr;height:720px;padding:36px 44px 32px 28px;gap:12px}
.sl-fig{display:flex;align-items:center}.sl-fig svg{width:860px;height:auto;display:block}
.sl-side{display:flex;flex-direction:column;justify-content:center;gap:0}
.sl-eyebrow{font-size:14px;font-weight:600;color:var(--anatomy-muted);margin:0 0 6px}
.sl h1{font-size:30px;line-height:1.25;font-weight:700;color:var(--anatomy-strong);margin:0 0 22px;letter-spacing:-.01em}
.sl ul{list-style:none;margin:0;padding:0;display:grid;gap:13px}
.sl li{display:grid;grid-template-columns:22px 1fr;column-gap:10px;align-items:start}
.sl b{display:block;font-size:17px;line-height:1.3;color:var(--anatomy-strong);font-weight:700}
.sl span.d{display:block;font-size:14px;line-height:1.45;color:var(--anatomy-text);margin-top:2px}
.sl i{width:18px;height:18px;border-radius:4px;margin-top:2px;background:color-mix(in srgb,var(--c) 30%,#fff);border:2px solid var(--c)}
.sl-now{margin:20px 0 0;font-size:15px;font-weight:600;color:var(--anatomy-strong)}.sl-now span{color:#24365c}
.sl-foot{margin-top:22px;padding-top:14px;border-top:1px solid color-mix(in srgb,var(--anatomy-text) 20%,transparent);font-size:13px;line-height:1.5;color:var(--anatomy-muted)}
${HUE_CSS}
</style>`;
  const slide = `<main class="sl"><div class="sl-fig${LIVE ? " iso-stage" : ""}">${svg}</div><aside class="sl-side"><p class="sl-eyebrow">한끗 프로젝트 해부도</p><h1>한끗은 트렌드<br>카드 분류기다</h1><ul>${LEG.map(([h, a, b]) => `<li><i style="--c:${HUES[h].c}"></i><div><b>${a}</b><span class="d">${b}</span></div></li>`).join("")}</ul>${LIVE ? `<span data-readout hidden></span>` : `<p class="sl-foot">trends.json ${TOTAL}건 중 14일 안 분석 ${FRESH}건 · 기준일 ${TODAY_STR}<br>그림 밖: refresh → git push → Vercel 배포</p>`}</aside></main>`;
  const liveScript = (readFileSync(join(HERE, "kit/iso-kit.mjs"), "utf8").replace(/^export /gm, "") + live).replace(/<\/(script)/gi, "<\\/$1");
  const slideHtml = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>한끗 프로젝트 해부도 · 슬라이드</title><style>${k.ISO_CSS}</style>${slideCss}</head><body class="iso" data-theme="light">${slide}${LIVE ? `<script type="module">${liveScript}</script>` : ""}</body></html>`;
  writeFileSync(join(HERE, LIVE ? "hangeut-anatomy-slide-live.html" : "hangeut-anatomy-slide.html"), slideHtml);
  console.log("wrote", LIVE ? "hangeut-anatomy-slide-live.html" : "hangeut-anatomy-slide.html");
}

const kitSrc = readFileSync(join(HERE, "kit/iso-kit.mjs"), "utf8").replace(/^export /gm, "");
const file = theme === "light" ? "hangeut-anatomy.html" : "hangeut-anatomy-dark.html";
const html = k.pageHtml({ title: "한끗 프로젝트 해부도", theme, body: css + head + plateBody + parts, script: kitSrc + live, width: 760 }).replace('<html lang="en">', '<html lang="ko">');
if (!SLIDE) writeFileSync(join(HERE, file), html);
console.log(SLIDE ? "slide only" : "wrote " + file, { total: TOTAL, fresh: FRESH, queue: QUEUE, drawers: DRAWERS.map((d) => d.name + ":" + d.n) });
