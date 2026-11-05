// v21 → v22: 빽빽해서 두세 줄로 넘어가던 장(7·10~15)을 가독성 위주로 다시 짬. 내용·수치는 그대로(문구만 줄이고 배치 변경).
//  · 상태 표시(고침·통과·미실시·그대로·달라짐·덜 됨·있음): 버튼처럼 보이던 테두리 상자 → 선 아이콘 + 색 글자(lucide 모양)
//  · 10장(기획안과의 차이): 좁은 3단 카드 → 넓은 줄 표(상태 | 무엇이 | 이유), 한 줄에 하나
//  · 11장(검증 한눈에): 좁은 4단 카드 → 넓은 줄 4개(검증 | 상태 | 숫자 | 설명)
//  · 7·12·13·14·15장: 배치는 그대로, 줄마다 한 줄에 들어가게 문구를 줄이고 칸 너비 조정, 발췌 상자는 일반 글꼴
// 사용: node build-v22.mjs
import fs from "node:fs";
const dir = new URL(".", import.meta.url);
let s = fs.readFileSync(new URL("hangeut-mvp-result-v21.html", dir), "utf8");

// ── 아이콘(lucide, stroke = 글자색)
const svg = (inner) => `<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
const ICON = {
  check: svg('<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>'),
  wrench: svg('<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>'),
  dashed: svg('<path d="M10.1 2.18a10 10 0 0 1 3.8 0"/><path d="M13.9 21.82a10 10 0 0 1-3.8 0"/><path d="M17.61 3.72a10 10 0 0 1 2.69 2.7"/><path d="M2.18 13.9a10 10 0 0 1 0-3.8"/><path d="M20.28 17.61a10 10 0 0 1-2.7 2.69"/><path d="M21.82 10.1a10 10 0 0 1 0 3.8"/><path d="M3.72 6.39a10 10 0 0 1 2.7-2.69"/><path d="M6.39 20.28a10 10 0 0 1-2.69-2.7"/>'),
  swap: svg('<path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/>'),
  alert: svg('<circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/>'),
};
const stat = (kind, text) => {
  const map = { 통과: ["ok", "check"], 있음: ["ok", "check"], 그대로: ["ok", "check"], 고침: ["fix", "wrench"], 달라짐: ["fix", "swap"], 미실시: ["none", "dashed"], "덜 됨": ["warn", "alert"] };
  const [cls, ic] = map[kind];
  return `<span class="stx ${cls}">${ICON[ic]}${text ?? kind}</span>`;
};

// ── 1) 기존 상태 칩(.st + mk2) → 아이콘 글자
let chips = 0;
s = s.replace(/<span class="st(?: on)?"><i class="mk2 \w+" aria-hidden="true"><\/i>([^<]+)<\/span>/g, (m, text) => {
  chips++;
  const kind = /^있음/.test(text) ? "있음" : /^0건/.test(text) || /노출 0건/.test(text) ? "통과" : text.trim();
  return stat(kind, text);
});

// ── 2) 장 통째로 바꾸기
function replaceSlide(label, build) {
  const re = new RegExp(`(<section class="slide" aria-label="${label}"><div class="page">[\\s\\S]*?<div class="subs">[\\s\\S]*?</div>)([\\s\\S]*?)(<i class="prog")`);
  if (!re.test(s)) throw new Error("slide not found: " + label);
  s = s.replace(re, (m, head, body, tail) => head + build() + tail);
}

replaceSlide("기획안과의 차이", () => {
  const R = [
    ["그대로", "핵심 기능 3개 · 배포본에서 동작", "기획안 그대로 구현"],
    ["그대로", "광고·후기 분석은 범위 밖", "기획안에서 '하지 않을 것'으로 정함"],
    ["달라짐", "'갱신 필요' 대신 '오래된 분석' 경고", "10/21 디자인 개편 때 빠짐 · 사전엔 '지난 유행어' 칸"],
    ["달라짐", "트렌드 데이터 158건 → 159건", "10/23 검증을 통과한 1건만 자동 게시"],
    ["덜 됨", "목록 키워드 검색 없음 (MZ 사전에만)", "이번 주 작업에서 빠짐 → 기말 전 추가"],
    ["덜 됨", "10/24~11/1 새 수집 후보 0건", "근거 부족으로 모두 보류 → 기말 전 원인 조정"],
    ["덜 됨", "유행 단계 재판정 9일간 11건 (목표 하루 5건)", "근거 못 찾는 같은 5건만 반복 → 기말 전 고침"],
  ];
  return `
  <div class="v22c" style="margin-top:calc(28 * var(--k));">
    <div class="v22c-r hd"><span>상태</span><span>무엇이</span><span>이유</span></div>
    ${R.map(([k, a, b]) => `<div class="v22c-r">${stat(k)}<b>${a}</b><span>${b}</span></div>`).join("\n    ")}
  </div>
  `;
});

replaceSlide("검증 결과 한눈에", () => {
  const R = [
    ["검증 1", "출처 링크가 열리나?", "고침", "3 → 0", "안 열리는 출처 링크 3개 → 0개", "368개를 모두 열어 봄 · 3개는 다른 출처로 교체"],
    ["검증 2", "AI 비서가 매일 돌았나?", "통과", "26건", "10월 사람 손 없이 26건 자동 게시", "10/14 이후 3건 · 10/24부터 0건 (후보가 걸러짐)"],
    ["검증 3", "설명이 원문과 같나?", "고침", "5 → 10", "설명 10건을 원문과 대조 · 맞는 설명 5 → 10건", "어긋난 5건을 원문대로 고침"],
    ["검증 4", "1분 안에 이해되나?", "미실시", "0명", "처음 보는 사람 테스트는 아직", "대신 휴대폰 화면 길 11개 자동 점검 통과"],
  ];
  return `
  <div class="v22s" style="margin-top:calc(24 * var(--k));">
    ${R.map(([t, q, k, n, a, b]) => `<div class="v22s-r"><div class="v22s-q"><span>${t}</span><b>${q}</b></div>${stat(k)}<div class="v22s-n">${n}</div><div class="v22s-d"><b>${a}</b><span>${b}</span></div></div>`).join("\n    ")}
  </div>
  <p class="aband"><b>한 줄 결론</b> 만든 기능은 동작함 · 링크 3곳과 설명 5건은 11/2에 고침 · 사람 테스트와 수집 개선이 남음</p>
  `;
});

// ── 3) 문구 줄이기(한 줄에 들어가게)
const FIX = [
  // 12장
  ["링크 368개를 모두 열어 봄 → 안 열린 3곳 교체 → 367개 다시 점검", "링크 368개를 모두 열어 봄 → 3곳 교체"],
  ["처음엔 안 열리는 곳 3곳(글 삭제 2 · 로그인해야 보임 1) → 읽히는 출처로 바꿔 0곳 · 확인 못 한 1곳은 Forbes(봇 차단)", "안 열림 3곳(글 삭제 2 · 로그인 필요 1) → 0곳<br>확인 못 함 1곳은 Forbes (자동 접속 차단)"],
  // 13장
  ['<i class="a" style="width:50%;">처음 일치 5</i><i class="b" style="width:40%;">일부 4</i>', '<i class="a" style="width:50%;">맞음 5</i><i class="b" style="width:40%;">일부만 맞음 4</i>'],
  ["처음엔 원문과 맞음 5 · 일부만 맞음 4 · 틀림 1 → 어긋난 5건 고침", "어긋난 5건(일부만 맞음 4 · 틀림 1)을 고침"],
  ['<b style="color:var(--ink);">쉽게 말하면</b> 프로그램 검사는 10건 모두 통과시켰지만 글자만 비교해 뜻이 바뀐 건 놓침 → 사람이 읽어서 찾음', '<b style="color:var(--ink);">놓친 점</b> 프로그램은 10건 통과 · 뜻 바뀐 건 사람이 찾음'],
  ["휴대폰 크기 화면에서 뜻 · 단계 · 출처까지 가는 길을 눌러 봄 (11/2 다시 실행)", "휴대폰 화면에서 뜻 · 단계 · 출처까지 눌러 봄"],
  ['<b style="color:var(--ink);">한계</b> 사람이 이해하는지는 못 잼 → 기말 전 1~2명, 못 하면 같은 점검을 직접 반복', '<b style="color:var(--ink);">남은 일</b> 기말 전 1~2명에게 직접 테스트'],
  // 14장
  ["휴대폰(390px) · PC(1280px) 화면을 실제로 띄워 확인 → 검토 에이전트가 다시 확인", "휴대폰 · PC 화면을 띄워 보고 에이전트가 재확인"],
  ["한 글자씩 줄바꿈 → 한 줄 (높이 56 → 19px)", "한 글자씩 줄바꿈 → 한 줄로"],
  ["글자와 배경 대비 3.02 → 4.81 (읽기 쉬움 기준 4.5 통과)", "글자 대비 3.02 → 4.81 (기준 4.5)"],
  ["커밋 25ddc78 · 4169dd2 (사이트 아이콘 교체 포함)", "11/4 반영 · 사이트 아이콘 교체 포함"],
  // 15장
  ["<b>07/11 내부 값('curate' 등)이 화면에 그대로 6건</b>", "<b>07/11 내부 값('curate' 등) 화면 노출 6건</b>"],
];
for (const [a, b] of FIX) {
  const n = s.split(a).length - 1;
  if (n !== 1) throw new Error(`찾은 횟수 ${n}: ${a}`);
  s = s.replace(a, b);
}
// 15장 칸 너비: 언제 좁게, 고친 것 넓게
const g15 = 'grid-template-columns:calc(330 * var(--k)) 1fr 1fr;';
const n15 = s.split(g15).length - 1;
if (n15 !== 5) throw new Error("15장 줄 " + n15);
s = s.split(g15).join("grid-template-columns:calc(260 * var(--k)) 0.85fr 1.15fr;");

// ── 4) 스타일 (styles.css 토큰 색만)
const css = `<style id="v22">
.stx{display:inline-flex;align-items:center;gap:calc(8 * var(--k));font-size:calc(27 * var(--k));font-weight:600;line-height:1.2;white-space:nowrap}
.stx .ico{width:calc(28 * var(--k));height:calc(28 * var(--k));flex:none}
.stx.ok{color:#21885a}.stx.fix{color:var(--ink)}.stx.none{color:#8190a5}.stx.warn{color:var(--ad)}
.box .ch .stx{margin:0}
.v22c{display:grid}
.v22c-r{display:grid;grid-template-columns:calc(190 * var(--k)) calc(700 * var(--k)) 1fr;align-items:center;column-gap:calc(32 * var(--k));padding:calc(18 * var(--k)) 0;border-bottom:1px solid var(--line)}
.v22c-r b{font-size:calc(30 * var(--k));font-weight:600;color:var(--ink);line-height:1.3}
.v22c-r > span:not(.stx){font-size:calc(27 * var(--k));color:var(--body);line-height:1.5}
.v22c-r.hd{padding-top:0;padding-bottom:calc(12 * var(--k));border-bottom:2px solid var(--ink)}
.v22c-r.hd span{font-size:calc(27 * var(--k));font-weight:600;color:var(--ink)}
.v22s{display:grid}
.v22s-r{display:grid;grid-template-columns:calc(390 * var(--k)) calc(150 * var(--k)) calc(220 * var(--k)) 1fr;align-items:center;column-gap:calc(32 * var(--k));padding:calc(20 * var(--k)) 0;border-bottom:1px solid var(--line)}
.v22s-r:first-child{border-top:2px solid var(--ink)}
.v22s-q span{display:block;font-size:calc(27 * var(--k));color:var(--body);line-height:1.5}
.v22s-q b{display:block;font-size:calc(32 * var(--k));font-weight:600;color:var(--ink);line-height:1.3}
.v22s-n{font-size:calc(60 * var(--k));font-weight:600;color:var(--ink);line-height:1;font-variant-numeric:tabular-nums;white-space:nowrap}
.v22s-d b{display:block;font-size:calc(29 * var(--k));font-weight:600;color:var(--ink);line-height:1.4}
.v22s-d span{display:block;font-size:calc(27 * var(--k));color:var(--body);line-height:1.5}
.kc .term{font-family:var(--sans);line-height:1.5}
/* 줄 간격: 여유 있는 장(10·11·12·13·14·15)에서 줄과 줄, 항목과 항목 사이를 넓힘 */
.v22c-r{padding:calc(20 * var(--k)) 0}
.v22s-r{padding:calc(22 * var(--k)) 0}
.v22s-q b,.v22s-d b{margin-top:calc(4 * var(--k))}
.v22s-d span{margin-top:calc(6 * var(--k))}
.box .cb p{line-height:1.65}
.box .cb p + p{margin-top:calc(18 * var(--k))!important}
.rows .row{padding-top:calc(18 * var(--k));padding-bottom:calc(18 * var(--k))}
.rows .row span{margin-top:calc(6 * var(--k))}
</style>`;
s = s.replace("</head>", css + "</head>");

const N = (s.match(/<section class="slide"/g) || []).length;
if (N !== 18) throw new Error("N " + N);
fs.writeFileSync(new URL("hangeut-mvp-result-v22.html", dir), s);
console.log("v22 bytes", Buffer.byteLength(s), "slides", N, { chips });
