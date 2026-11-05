// v9(16장) → v10 발표용 보강. 사용: node build-v10.mjs  (결과: hangeut-mvp-result-v10.html, 제출본은 건드리지 않음)
// 1) 1280px에서 글자 18px 이상(캔버스 27px) 2) 검증 수치를 막대로 3) 표지 영상 썸네일 4) 5분 발표 핵심 장 표시
import fs from "node:fs";
const dir = new URL(".", import.meta.url);
let s = fs.readFileSync(new URL("hangeut-mvp-result-v9.html", dir), "utf8");
const K = (n) => `calc(${n} * var(--k))`;
const DRIVE = "https://drive.google.com/file/d/17eYPk3Q0dnIoR-c7ilwHbZVIrrNGAtpg/view?usp=sharing";
const MIN = 27; // 1280px에서 18px = 캔버스 27px
const KEY = [1, 8, 9, 10, 11, 13, 15]; // 5분 발표 핵심 장

const rep = (a, b) => {
  if (!s.includes(a)) throw new Error("missing: " + a.slice(0, 70));
  s = s.replace(a, b);
};

// ── 1) 글자 크기: 캔버스 27px 미만을 전부 27px로 ──
s = s.replace(/font-size:calc\((\d+(?:\.\d+)?) \* var\(--k\)\)/g, (m, n) => (+n < MIN ? `font-size:${K(MIN)}` : m));

// ── 2) 일별 게시 막대 — evidence/README.md '날짜별 수집 결과' 표의 값(X = 실행 없음·실패) ──
const DAYS = [3, 3, 2, 2, 1, 2, 2, 2, 1, 2, 2, 1, 0, 1, 0, 0, 0, "X", 1, 0, 0, "X", 1, 0, 0, 0, 0];
const nums = DAYS.map((d) => (d === "X" ? 0 : d));
if (nums.reduce((a, b) => a + b) !== 26 || nums.slice(13).reduce((a, b) => a + b) !== 3) throw new Error("README 값과 불일치");
const dayBars = DAYS.map((d, i) =>
  d === "X"
    ? `<i class="x" title="10/${i + 1} 수집 실패·실행 없음"></i>`
    : `<i style="height:${(d / 3) * 100}%" title="10/${i + 1} 게시 ${d}건"></i>`
).join("");
const dayChart = `<div class="days" role="img" aria-label="10월 1일부터 27일까지 일별 자동 게시 수. 초반 하루 1~3건, 10월 14일 이후 14일 동안 3건, 실패·미실행 2일">
        <span class="recent"><em>최근 14일 3건</em></span>${dayBars}</div>
      <div class="axis"><span>10/1</span><span>10/14</span><span>10/27</span></div>
      <p class="dl"><i></i>수집 실패·미실행 2일 · 10/18 · 10/22</p>`;
const meter = `<div class="meter" role="img" aria-label="출처 링크 366개 중 정상 363개, 확인 못 함 1개, 안 열림 2개"><i class="ok" style="flex:363"></i><i class="q" style="flex:1"></i><i class="bad" style="flex:2"></i></div>
      <p class="ml"><b>정상 363</b> · 확인 못 함 1 · <b>안 열림 2</b></p>`;
const hbar = (label, inner, val) => `<div class="hb"><span class="rl">${label}</span>${inner}<b class="v">${val}</b></div>`;
const seg = (n, empty) => `<div class="seg" style="grid-template-columns:repeat(${n},1fr)">${`<i${empty ? ' class="e"' : ""}></i>`.repeat(n)}</div>`;

rep(`<div class="kpi">2 / 366<small>안 열리는 링크</small></div>`, `<div class="kpi">2 / 366<small>안 열리는 링크</small></div>\n      ${meter}`);
rep(`<div class="kpi">26건<small>10/1~27 자동 게시</small></div>`, `<div class="kpi">26건<small>10/1~27 자동 게시</small></div>\n      ${dayChart}`);
rep(`<div class="bar3"><i class="a" style="width:50%;">일치 5</i><i class="b" style="width:40%;">부분 4</i><i class="c" style="width:10%;">1</i></div>`,
  `<div class="hbs">${hbar("프로그램", `<div class="bar3"><i class="a" style="width:100%;">통과 10</i></div>`, "10 / 10")}${hbar("사람", `<div class="bar3"><i class="a" style="width:50%;">일치 5</i><i class="b" style="width:40%;">부분 4</i><i class="c" style="width:10%;">1</i></div>`, "틀림 1")}</div>`);
rep(`<div class="kpi">0명<small>사람 테스트</small></div>`,
  `<div class="kpi">0명<small>사람 테스트</small></div>\n      <div class="hbs">${hbar("사람", seg(3, true), "0 / 3")}${hbar("자동 점검", seg(11), "11 / 11")}</div>`);

// ── 3) 표지: 영상 썸네일 중심 ──
const thumb = "data:image/jpeg;base64," + fs.readFileSync(new URL("v10-thumb.jpg", dir)).toString("base64");
s = s.replace(/<section class="slide" aria-label="표지">[\s\S]*?<div class="info">/, `<section class="slide" aria-label="표지"><div class="page">
  <div class="cover">
    <div>
      <div class="kicker"><span class="bar"></span>MVP 구현 결과 · 개인 프로젝트</div>
      <h1 class="display">한<span class="pt">끗</span></h1>
      <p class="accent">AZ와 MZ는 한 끗 차이</p>
      <p class="body">처음 보는 유행의 뜻 · 지금 단계 · 근거 출처를 1분 안에 — 모바일 웹</p>
      <a class="btn" href="https://az2mz.vercel.app" target="_blank" rel="noopener">배포 사이트 · az2mz.vercel.app</a>
    </div>
    <div>
      <a class="thumb" href="${DRIVE}" data-fill="video-url" target="_blank" rel="noopener" aria-label="데모 영상 보기 · 1분 46초"><img src="${thumb}" alt="배포본 홈 화면: 요즘의 발견, 오늘의 한끗, 분류 칩"><span class="play"><i></i>데모 영상 보기 · 1분 46초</span></a>
      <p class="cap">배포본 실제 화면 · 수업 중 라이브 시연 가능</p>
    </div>
  </div>
  <div class="info">`);

// ── 4) 5분 발표 핵심 장 표시 ──
for (const n of KEY) rep(`<span class="pageno">${n} / 16</span>`, `<span class="keymark">◆ 발표 핵심</span><span class="pageno">${n} / 16</span>`);
rep(`<div><i>7</i><b>앞으로의 계획</b><span>15장</span></div></div>`,
  `<div><i>7</i><b>앞으로의 계획</b><span>15장</span></div></div>\n  <p class="keyline"><b>◆ 5분 발표 핵심 장</b> ${KEY.join(" · ")}장 · 나머지는 질문용 예비</p>`);

rep("</style>", `
/* ── v10 발표용: 표지 썸네일 · 막대 · 핵심 장 표시 ── */
:root{--faint:#8190a5}
.cover{display:grid;grid-template-columns:520px 1fr;gap:40px;align-items:start;margin-top:16px}
.cover .display{font-size:150px;margin-top:12px}
.cover .accent{font-size:50px;margin:14px 0 0}
.cover .body{font-size:32px;margin:14px 0 26px}
.cover .btn{font-size:29px;padding:20px 24px}
.thumb{position:relative;display:block;color:var(--ink);height:590px;border:1px solid var(--line);border-radius:var(--r);overflow:hidden;text-decoration:none}
.thumb img{display:block;width:100%;height:100%;object-fit:cover;object-position:top}
.thumb .play{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);background:var(--ink);color:var(--on-ink);font-size:36px;font-weight:800;line-height:1;padding:30px 40px;border-radius:var(--r);white-space:nowrap;display:flex;align-items:center;gap:20px}
.thumb .play i{display:block;width:0;height:0;border-style:solid;border-width:16px 0 16px 26px;border-color:transparent transparent transparent var(--on-ink)}
.cap{font-size:29px;font-weight:600;color:var(--ink);margin:14px 0 0}
.keymark{position:absolute;right:300px;bottom:52px;font-size:27px;font-weight:800;color:var(--ink)}
.keyline{font-size:32px;line-height:1.5;color:var(--body);margin:34px 0 0;padding:20px 28px;background:var(--paper-soft);border-radius:var(--r)}
.keyline b{color:var(--ink);font-weight:800;margin-right:14px}
.kpi{font-size:96px;margin:4px 0 14px}
.fill .box{min-height:600px}
.box .cb{padding:22px 32px 20px}
.card p{line-height:1.5}
.card p + p{margin-top:8px}
.meter{display:flex;gap:2px;height:30px;margin:0 0 8px}
.meter i{display:block;min-width:4px}
.meter .ok{background:var(--ink)}.meter .q{background:var(--faint)}.meter .bad{background:var(--ad)}
.ml{margin:0 0 14px!important}
.ml b{color:var(--ink);font-weight:800}
.days{position:relative;display:grid;grid-template-columns:repeat(27,1fr);gap:2px;align-items:end;height:112px;border-bottom:1px solid var(--body)}
.days i{position:relative;z-index:1;display:block;background:var(--ink);border-radius:2px 2px 0 0}
.days i.x{height:16px;background:var(--ad)}
.days .recent{position:absolute;left:48.15%;right:0;top:0;bottom:0;background:var(--paper-soft);display:flex;justify-content:flex-end;padding:4px 8px 0 0}
.days em{font-style:normal;font-size:27px;font-weight:800;color:var(--ink);line-height:1.3}
.axis{position:relative;display:flex;justify-content:space-between;font-size:27px;line-height:1.5;color:var(--body);font-variant-numeric:tabular-nums}
.axis span:nth-child(2){position:absolute;left:48.15%}
p.dl{display:flex;align-items:center;gap:12px;margin:2px 0 12px!important;font-size:27px;line-height:1.5}
.dl i{display:block;width:18px;height:18px;background:var(--ad);border-radius:2px}
.hbs{display:flex;flex-direction:column;gap:8px;margin:0 0 14px}
.hb{display:grid;grid-template-columns:150px 1fr 130px;gap:14px;align-items:center}
.hb .rl{font-size:27px;font-weight:700;color:var(--ink);line-height:1.3}
.hb .v{font-size:30px;font-weight:800;color:var(--ink);text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
.hb .bar3{height:48px;margin:0;gap:2px;border:0;border-radius:4px}
.seg{display:grid;gap:4px;height:48px}
.seg i{display:block;background:var(--ink);border-radius:2px}
.seg i.e{background:var(--paper);border:2px solid var(--ink)}
.lg .logbox{max-height:640px}
</style>`.replace(/(\d+(?:\.\d+)?)px/g, (m, n) => (+n <= 2 ? m : K(n))));

if (/\{\{/.test(s)) throw new Error("placeholder left");
fs.writeFileSync(new URL("hangeut-mvp-result-v10.html", dir), s);
console.log("v10 bytes", Buffer.byteLength(s));
