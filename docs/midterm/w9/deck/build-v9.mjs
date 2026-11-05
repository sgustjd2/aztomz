// v5(13장, 근거 중심) → v6(11장, 발표용) 재구성. 사용: node build-v6.mjs
// v5의 CSS·이미지·로그 원문을 그대로 재사용하고 장 구성·글자 크기만 바꾼다.
import fs from "node:fs";
const dir = new URL(".", import.meta.url);
const v5 = fs.readFileSync(new URL("hangeut-mvp-result-v5.html", dir), "utf8");
const K = (n) => `calc(${n} * var(--k))`;
const N = 16;

const head = v5.slice(0, v5.indexOf("</style>"));
const secs = v5.split("<section").slice(1).map((s) => "<section" + s.split("</section>")[0] + "</section>");
const pres = (i) => secs[i - 1].match(/<pre class="term">[\s\S]*?<\/pre>/g) || [];
const figs = (i) => secs[i - 1].match(/<figure class="shot">[\s\S]*?<\/figure>/g) || [];
console.log("pre per v5 slide", [7, 8, 9, 10, 11, 12].map((i) => i + ":" + pres(i).length).join(" "));
console.log("fig per v5 slide", [2, 3, 4].map((i) => i + ":" + figs(i).length).join(" "));

const css = `
/* ── v6 발표용 덮어쓰기: 1280px에서도 본문 20px 이상(캔버스 30px×0.667) ── */
.kicker{font-size:${K(28)}}
.sub{font-size:${K(28)}}
.body{font-size:${K(34)}}
.small{font-size:${K(30)}}
.src{font-size:${K(24)}}
.meta-line{font-size:${K(24)}}
.lbl{font-size:${K(28)}}
.btn{font-size:${K(30)}}
.st{font-size:${K(26)}}
.legend li{font-size:${K(30)};grid-template-columns:${K(48)} 1fr}
.mk{width:${K(48)};height:${K(48)};font-size:${K(28)}}
.t td{font-size:${K(30)}}.t th{font-size:${K(24)}}
.rows b{font-size:${K(32)}}.rows span{font-size:${K(30)}}
.rows .hd span{font-size:${K(26)}}
.rows .when i{font-size:${K(24)}}
.rows .when{font-size:${K(30)}}
.big3 .card{min-height:${K(330)};padding:${K(36)} ${K(36)}}.big3 .card h3{font-size:${K(44)};margin-bottom:${K(18)}}.big3 .card p{font-size:${K(34)};line-height:1.6}.big3 .card .tag{font-size:${K(30)};margin-bottom:${K(18)}}
.g{display:grid;gap:${K(36)}}
.g2{grid-template-columns:1fr 1fr}.g3{grid-template-columns:repeat(3,1fr)}
.card{border:1px solid var(--line);border-radius:var(--r);padding:${K(28)} ${K(32)};background:var(--paper)}
.card.soft{background:var(--paper-soft)}
.card.ink{background:var(--ink);border-color:var(--ink)}
.card.ink *{color:var(--on-ink)!important}
.card h3{margin:0 0 ${K(10)};font-size:${K(36)};font-weight:800;line-height:1.3;color:var(--ink)}
.card p{margin:0;font-size:${K(30)};line-height:1.5;color:var(--body)}
.card .tag{display:inline-block;font-size:${K(26)};font-weight:800;color:var(--ink);margin-bottom:${K(12)}}
.kpi{font-variant-numeric:tabular-nums;font-weight:800;font-size:${K(120)};line-height:1;letter-spacing:-0.03em;color:var(--ink);margin:${K(6)} 0 ${K(10)}}
.kpi small{font-size:${K(36)};font-weight:700;letter-spacing:0;margin-left:${K(10)}}
.flow{display:flex;align-items:stretch;gap:${K(20)}}
.flow .arr{align-self:center;font-size:${K(44)};font-weight:800;color:var(--ink)}
.flow .card{flex:1;padding:${K(22)} ${K(24)}}
.flow .card h3{font-size:${K(32)}}.flow .card p{font-size:${K(28)}}
.bar3{display:flex;height:${K(56)};border-radius:${K(8)};overflow:hidden;border:1px solid var(--ink);margin:${K(8)} 0 ${K(10)}}
.bar3 i{display:flex;align-items:center;justify-content:center;font-style:normal;font-weight:800;font-size:${K(26)};color:var(--ink)}
.bar3 i.a{background:var(--ink);color:var(--on-ink)}.bar3 i.b{background:var(--line)}.bar3 i.c{background:var(--ad);color:var(--on-ink)}
.lg{margin-top:${K(16)}}
.lg summary{display:inline-block;cursor:pointer;font-size:${K(26)};font-weight:700;color:var(--ink);border:1px solid var(--ink);border-radius:${K(8)};padding:${K(10)} ${K(18)};list-style:none}
.lg summary::-webkit-details-marker{display:none}
.lg .logbox{position:absolute;left:${K(160)};right:${K(160)};bottom:${K(120)};max-height:${K(620)};overflow:auto;background:var(--ink);border-radius:var(--r);padding:${K(16)};z-index:9;display:flex;flex-direction:column;gap:${K(12)}}
.lg .term{background:transparent;padding:${K(8)} ${K(10)};font-size:${K(22)}}
.lg .term .f{font-size:${K(22)}}
.tl{display:grid;grid-template-columns:repeat(5,1fr);gap:${K(20)};position:relative}
.tl .card{padding:${K(20)} ${K(22)}}
.tl .card h3{font-size:${K(30)}}.tl .card p{font-size:${K(27)}}
.tl .d{font-variant-numeric:tabular-nums;font-weight:800;font-size:${K(26)};color:var(--ink);margin-bottom:${K(6)}}
.demo-row{display:grid;grid-template-columns:${K(140)} 1fr ${K(150)};gap:${K(24)};padding:${K(26)} 0;border-bottom:1px solid var(--line);align-items:baseline;font-size:${K(38)};color:var(--body)}
.demo-row b{color:var(--ink);font-weight:800;font-variant-numeric:tabular-nums}
.demo-row em{font-style:normal;font-weight:800;color:var(--ink);font-size:${K(32)}}

/* ── 여백 보강: 아이콘·배지와 글자 사이, 줄 간격, 영역 ── */
.kicker{gap:${K(22)};margin-bottom:${K(18)}}
.sub{padding:${K(10)} ${K(22)}}
.subs{margin-top:${K(24)}}
.st{word-spacing:${K(12)};margin:0 0 0 ${K(20)};padding:${K(12)} ${K(20)}}
.card .tag{margin-bottom:${K(20)}}
.card .tag + .st{margin-left:${K(22)};margin-bottom:${K(20)}}
.card{padding:${K(36)} ${K(40)}}
.card h3{margin-bottom:${K(16)};line-height:1.4}
.card p{line-height:1.7}
.card p + p{margin-top:${K(14)}}
.legend{gap:${K(24)};margin-top:${K(26)}!important}
.legend li{gap:${K(24)};line-height:1.65;align-items:center}
.rows .row{padding:${K(14)} 0;gap:${K(40)}}
.rows b{margin-bottom:${K(6)};line-height:1.4}
.rows span{line-height:1.55}
.rows .when i{margin-top:${K(6)}}
.t td{padding:${K(18)} ${K(28)} ${K(18)} 0}
.t td .st{margin-left:0}
.flow{gap:${K(28)}}
.flow .card,.tl .card{padding:${K(28)} ${K(28)}}
.tl{gap:${K(24)}}
.tl .card p,.flow .card p{line-height:1.65}
.demo-row{padding:${K(30)} 0}
.bar3{margin:${K(14)} 0 ${K(22)}}
.kpi{margin:${K(12)} 0 ${K(22)}}
.lg{margin:0}
.lg summary{position:absolute;right:${K(160)};top:${K(96)};padding:${K(14)} ${K(26)};background:var(--paper)}

/* ── 디자인 정리: 선 줄이고 면으로 구분, 라벨은 회색, 진행 막대 ── */
.sub{background:none;border:0;padding:0;font-size:${K(30)};font-weight:600;color:var(--body)}
.subs{margin-top:${K(14)}}
.h{font-size:${K(60)};line-height:1.2}
.card{background:var(--paper-soft);border:1px solid transparent}
.card.soft{background:var(--paper);border:2px solid var(--line)}
.card.ink{background:var(--ink);border-color:var(--ink)}
.card .tag{color:var(--body);font-size:${K(26)};font-weight:700}
.card.ink .tag{color:var(--on-ink)!important}
.card h3{font-size:${K(38)}}
.rows .hd span{color:var(--body);font-weight:700}
.fill .card{min-height:${K(540)}}
.flow .card{min-height:${K(215)}}
.prog{position:absolute;left:${K(160)};bottom:${K(100)};height:${K(4)};background:var(--ink);margin-bottom:-1px;z-index:2}
.mk{background:var(--ad);border:${K(3)} solid var(--paper)}
.legend .mk{background:var(--ad)}

/* ── v8: Canva 발표 템플릿 패턴 ── */
.ic{display:block;width:${K(52)};height:${K(52)};color:var(--ink);margin-bottom:${K(12)}}
.card.ink .ic,.box .ch .ic{color:var(--on-ink)}
.flow .ic{display:inline-block;vertical-align:middle;width:${K(36)};height:${K(36)};margin:0 ${K(10)} ${K(4)} 0}
.gl{margin-top:${K(30)}}
.gl div{display:grid;grid-template-columns:${K(76)} ${K(360)} 1fr;gap:${K(24)};align-items:center;padding:${K(18)} 0;border-bottom:1px solid var(--line)}
.gl div:first-child{border-top:2px solid var(--ink)}
.gl .ic{width:${K(60)};height:${K(60)};margin:0}
.gl b{font-size:${K(36)};font-weight:800;color:var(--ink)}
.gl span{font-size:${K(30)};line-height:1.55;color:var(--body)}
.gl em{font-style:normal;color:var(--ink);font-weight:700}
.lg summary{top:${K(152)}!important}
.st{word-spacing:normal!important}
.st::first-letter{margin-right:${K(10)}}
.recap{display:grid;grid-template-columns:repeat(3,1fr);margin-top:${K(48)};border-top:2px solid var(--ink)}
.recap div{padding:${K(26)} ${K(28)} ${K(26)} 0}
.recap div + div{padding-left:${K(28)};border-left:1px solid var(--line)}
.recap b{display:block;font-size:${K(64)};font-weight:800;color:var(--ink);line-height:1.1;font-variant-numeric:tabular-nums}
.recap span{font-size:${K(28)};color:var(--body)}
.page{padding-top:${K(64)}}
.top{display:flex;align-items:center;gap:${K(16)};padding-bottom:${K(18)};border-bottom:2px solid var(--ink);margin-bottom:${K(34)}}
.top .no{display:inline-flex;align-items:center;justify-content:center;width:${K(46)};height:${K(46)};border-radius:${K(6)};background:var(--ink);color:var(--on-ink);font-size:${K(24)};font-weight:800}
.top .sec{font-size:${K(26)};font-weight:800;color:var(--ink)}
.top .doc{margin-left:auto;font-size:${K(22)};font-weight:600;color:var(--body)}
.box{padding:0!important;overflow:hidden;background:var(--paper);border:1px solid var(--line)}
.box .ch{background:var(--ink);padding:${K(22)} ${K(32)} ${K(24)};display:flex;flex-wrap:wrap;align-items:center;gap:${K(6)} ${K(16)}}
.box .ch .tag{width:100%;margin:0!important;color:var(--on-ink)!important;font-size:${K(24)}}
.box .ch h3{margin:0!important;color:var(--on-ink)!important;font-size:${K(38)}}
.box .ch .st{margin:0!important;background:var(--paper);color:var(--ink);border-color:var(--paper)}
.box.alt .ch{background:var(--line)}
.box.alt .ch .tag,.box.alt .ch h3{color:var(--ink)!important}
.box .cb{padding:${K(26)} ${K(32)} ${K(28)}}
.fill .box{min-height:${K(520)}}
.tl{padding-top:${K(6)}}
.tl::before{content:"";position:absolute;left:0;right:0;top:${K(20)};height:${K(3)};background:var(--line)}
.tl .card{background:none!important;border:0!important;padding:${K(56)} ${K(6)} 0!important;position:relative}
.tl .card::before{content:"";position:absolute;top:${K(8)};left:${K(6)};width:${K(26)};height:${K(26)};border-radius:${K(4)};background:var(--ink)}
.tl .card.soft::before{background:var(--paper);border:${K(4)} solid var(--ink);box-sizing:border-box}
.info{position:absolute;left:${K(160)};right:${K(160)};bottom:${K(120)};display:grid;grid-template-columns:repeat(3,1fr);border-top:2px solid var(--ink);padding-top:${K(20)}}
.info div{padding:0 ${K(28)};border-left:1px solid var(--line)}
.info div:first-child{padding-left:0;border-left:0}
.info b{display:block;font-size:${K(22)};font-weight:700;color:var(--body);margin-bottom:${K(6)}}
.info span{font-size:${K(30)};font-weight:800;color:var(--ink)}
.toc{display:grid;grid-template-columns:1fr 1fr;gap:${K(18)} ${K(64)};margin-top:${K(44)}}
.toc div{display:grid;grid-template-columns:${K(64)} 1fr auto;align-items:center;gap:${K(24)};padding:${K(22)} 0;border-bottom:1px solid var(--line)}
.toc i{font-style:normal;display:inline-flex;align-items:center;justify-content:center;width:${K(56)};height:${K(56)};border-radius:${K(6)};background:var(--ink);color:var(--on-ink);font-size:${K(28)};font-weight:800}
.toc b{font-size:${K(38)};font-weight:800;color:var(--ink)}
.toc span{font-size:${K(26)};font-weight:600;color:var(--body);font-variant-numeric:tabular-nums}
.end-links{margin-top:${K(40)};display:grid;gap:0;max-width:${K(1100)}}
.end-links div{display:grid;grid-template-columns:${K(260)} 1fr;gap:${K(24)};padding:${K(24)} 0;border-bottom:1px solid var(--line);font-size:${K(32)}}
.end-links b{color:var(--body);font-weight:700}
`;

const SECS = ["문제와 해결", "만든 과정", "동작하는 MVP", "기획안과의 차이", "검증 결과", "에이전트 작업 기록", "앞으로의 계획"];
const secNo = (kicker) => { const i = SECS.findIndex((x) => kicker.startsWith(x)); return i < 0 ? "" : String(i + 1); };
const box = (tag, title, body, cls = "", badge = "") => `
  <div class="card box ${cls}"><div class="ch"><span class="tag">${tag}</span><h3>${title}</h3>${badge}</div><div class="cb">${body}</div></div>`;

const ICON = {
  bot: '<rect x="4" y="8" width="16" height="12" rx="2"/><path d="M12 4v4"/><circle cx="12" cy="3" r="1"/><circle cx="9" cy="14" r="1"/><circle cx="15" cy="14" r="1"/>',
  gate: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
  up: '<path d="M12 16V4"/><path d="M7 9l5-5 5 5"/><path d="M4 20h16"/>',
  phone: '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>',
  person: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M16 16l5 5"/>',
  cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  trend: '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
  pen: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
  doc: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 12l2 2 4-4"/>',
};
const ic = (n, cls = "") => `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICON[n]}</svg>`;

const slide = ({ label, kicker, title, subs = [], body, meta = "", n }) => `
<section class="slide" aria-label="${label}"><div class="page">
  <header class="top">${secNo(kicker) ? `<span class="no">${secNo(kicker)}</span>` : ""}<span class="sec">${kicker}</span><span class="doc">한끗 · MVP 구현 결과 · 02반 민현성</span></header>
  <h2 class="h">${title}</h2>
  ${subs.length ? `<div class="subs">${subs.map((s) => `<p class="sub">${s}</p>`).join("")}</div>` : ""}
  ${body}
  <span class="pageno">${n} / ${N}</span>
</div></section>`;

const logs = (blocks) => (blocks.length ? `<details class="lg"><summary>증빙 로그 원문 ▾</summary><div class="logbox">${blocks.join("")}</div></details>` : "");
const mt = (n) => `style="margin-top:${K(n)};"`;

// 1 표지 — v5 그대로, 쪽수·목차줄만 교체
const cover = secs[0]
  .replace("1 / 13", `1 / ${N}`)
  .replace(/<div class="meta-line">[\s\S]*?<\/div>/, "")
  .replace("배포본 실제 화면 · 휴대폰 폭 390px", "배포본 실제 화면")
  .replace("height:calc(700 * var(--k));", "height:calc(620 * var(--k));")
  .replace(/<p class="body"[^>]*>KMU AI에이전트실무 2026 · 02반 · 민현성<\/p>/, "")
  .replace('<span class="pageno">', `<div class="info"><div><b>과목</b><span>KMU AI에이전트실무 2026</span></div><div><b>분반 · 발표</b><span>02반 · 민현성</span></div><div><b>서비스</b><span>한끗 · 모바일 웹</span></div></div><span class="pageno">`);

// 목차
const toc = slide({
  label: "발표 순서", kicker: "목차", n: 2,
  title: "발표 순서",
  body: `<div class="toc">${[["문제와 해결", "3"], ["만든 과정", "4–7"], ["동작하는 MVP", "8–9"], ["기획안과의 차이", "10"], ["검증 결과", "11–12"], ["에이전트 작업 기록", "13–14"], ["앞으로의 계획", "15"]].map(([t, p], i) => `<div><i>${i + 1}</i><b>${t}</b><span>${p}장</span></div>`).join("")}</div>`,
});

// 마무리
const sEnd = slide({
  label: "마무리", kicker: "마무리", n: 15,
  title: "감사합니다 · 질문 받겠습니다",
  body: `<div class="recap"><div><b>3개</b><span>핵심 기능 배포본 동작</span></div><div><b>4건</b><span>검증 · 3건 실행 1건 미실시</span></div><div><b>26건</b><span>10/1~27 자동 게시</span></div></div>
  <div class="end-links">
    <div><b>데모 영상</b><a class="link" href="https://drive.google.com/file/d/17eYPk3Q0dnIoR-c7ilwHbZVIrrNGAtpg/view?usp=sharing" target="_blank" rel="noopener">Google Drive · 1분 46초</a></div>
    <div><b>배포 사이트</b><a class="link" href="https://az2mz.vercel.app" target="_blank" rel="noopener">az2mz.vercel.app</a></div>
    <div><b>소스</b><a class="link" href="https://github.com/sgustjd2/aztomz" target="_blank" rel="noopener">github.com/sgustjd2/aztomz</a></div>
  </div>`,
});

// 2 문제와 해결
const s2 = slide({
  label: "문제와 해결", kicker: "문제와 해결", n: 2,
  title: "흩어진 답을 한 화면에 모은다",
  body: `
  <div class="g g3 big3" ${mt(44)}>
    ${box("누가", "30~50대 직장인·부모", "<p>대화 상대는 자녀·후배<br>찾아볼 시간이 부족함</p>")}
    ${box("어떤 상황에서", "대화 중 처음 듣는 말", "<p>'책없쾌'·'두쫀쿠' → 바로 뜻 확인<br>꺼내기 전 지난 유행인지 확인</p>")}
    ${box("무엇이 불편한가", "답이 세 곳에 흩어짐", "<p>뜻은 사전 · 이유는 기사 · 유행 여부는 SNS<br>2024년 글이 최신처럼 보임</p>")}
  </div>
  <div class="card ink" style="margin-top:${K(44)};padding:${K(52)} ${K(56)};">
    <span class="tag">한끗의 해법</span>
    <h3 style="font-size:${K(60)};margin:0;line-height:1.35;">뜻 · 지금 단계 · 근거 출처를 한 화면에, 1분 안에</h3>
  </div>`,
  meta: "기획안 2장 · docs/midterm/mvp-plan.html",
});

// 용어 한눈에
const term = (i, t, d) => `<div>${ic(i)}<b>${t}</b><span>${d}</span></div>`;
const sTerm = slide({
  label: "먼저 알아 둘 말", kicker: "만든 과정 · 용어", n: 4,
  title: "먼저 알아 둘 말 5개",
  body: `<div class="gl">
    ${term("bot", "Hermes(헤르메스)", "매일 밤 9시 반, 새 유행을 찾아 <em>초안을 쓰는 AI 비서</em>")}
    ${term("gate", "검증 게이트", "사이트에 올리기 전 <em>출처를 확인하는 검문소</em> · 통과한 것만 올라감")}
    ${term("search", "근거 대조", "설명 속 숫자·표현이 <em>출처 원문에 실제로 있는지</em> 글자로 맞춰 보기")}
    ${term("trend", "유행 단계", "<em>발견 → 상승 → 피크 → 하락</em> 중 지금 어디쯤인지")}
    ${term("cal", "신선도", "분석한 지 <em>14일이 지나면</em> '오래된 분석' 경고")}
  </div>`,
});

// 3 만든 과정 · 구조
const s3 = slide({
  label: "만든 과정과 구조", kicker: "만든 과정", n: 3,
  title: "수집은 에이전트, 판단은 사람",
  body: `
  <div class="flow" ${mt(32)}>
    <div class="card">${ic("bot")}<span class="tag">AI 비서 Hermes</span><h3>찾아서 초안</h3><p>매일 밤 9시 반<br>하루 한 분야</p></div><span class="arr">→</span>
    <div class="card soft">${ic("gate")}<span class="tag">검문소 · 프로그램</span><h3>출처 확인</h3><p>링크가 열리나<br>원문에 있는 말인가</p></div><span class="arr">→</span>
    <div class="card soft">${ic("up")}<span class="tag">프로그램</span><h3>통과만 게시</h3><p>사이트 자동 반영<br>기록 남김</p></div><span class="arr">→</span>
    <div class="card">${ic("phone")}<span class="tag">서비스</span><h3>휴대폰으로 보기</h3><p>az2mz.vercel.app</p></div>
  </div>
  <div class="card ink" style="margin-top:${K(20)};padding:${K(20)} ${K(32)};display:flex;gap:${K(24)};align-items:center;">
    ${ic("person")}<span class="tag" style="margin:0;">사람(나)</span><p style="margin:0;font-size:${K(30)};">애매해서 멈춘 후보 → 디스코드 버튼으로 게시·버리기 → 이유는 다음 수집이 참고</p>
  </div>
  <p class="lbl" style="margin-top:${K(30)};border:0;">프로젝트 흐름</p>
  <div class="tl">
    <div class="card"><div class="d">10/25</div><h3>문제 · 기획</h3><p>기능 3 · 제외 3</p></div>
    <div class="card"><div class="d">6~10월</div><h3>구현</h3><p>수집 · 검증 게이트 · 게시</p></div>
    <div class="card"><div class="d">10/08~24</div><h3>개선</h3><p>원문 대조 · 단계 다시 판단</p></div>
    <div class="card"><div class="d">10/28</div><h3>검증</h3><p>4건 실행 · 시연 녹화</p></div>
    <div class="card soft"><div class="d">~12/11</div><h3>기말</h3><p>테스트 3명 · 출처 교체</p></div>
  </div>`,
  meta: "기획안 5장(전체 흐름) · CLAUDE.md 크론 일람 · git log",
});


// 3-2 업데이트 이력 (9월~, git log 기준)
const hrow = (when, tag, a, b) => `
  <div class="row" style="grid-template-columns:${K(250)} ${K(300)} 1fr;">
    <div class="when">${when}</div><div><b>${tag}</b></div><div><b>${a}</b><span>${b}</span></div>
  </div>`;
const sHist = slide({
  label: "업데이트 이력", kicker: "만든 과정 · 업데이트 이력", n: 4,
  title: "9월 이후 게이트와 화면을 보강",
  subs: ["2026-09-01 이후 커밋 340건 · 주요 변경만"],
  body: `
  <div class="rows" ${mt(26)}>
    <div class="row hd" style="grid-template-columns:${K(250)} ${K(300)} 1fr;"><span>시기</span><span>영역</span><span>주요 변경</span></div>
    ${hrow("9/2 ~ 9/30", "블로그 홍보 채널", "AI 자체 점검 · 검색량 확인 · 예약 발행", "9/4 스스로 고치기 · 9/14 검색량 낮은 주제 거르기 · 9/24 예약 발행")}
    ${hrow("9/23", "에이전트 운영", "Hermes 모델을 Claude로 전환", "꺼지면 자동 재시작 · 매일 자동 업데이트")}
    ${hrow("10/08 ~ 10/09", "품질 게이트", "원문 대조 검사 추가", "182개 중 139개에서 출처에 없는 말 발견 → 검사 추가 · 29건 고침")}
    ${hrow("10/21 ~ 10/25", "화면 · 수집 운영", "화면 개편 · 검수 버튼 · 단계 다시 판단", "10/21 화면 개편 · 10/23 디스코드 검수 버튼 · 10/24 단계 다시 판단 하루 5건")}
  </div>`,
});


// 확장: 블로그 자동화
const sBlog = slide({
  label: "블로그 자동화 확장", kicker: "만든 과정 · 확장", n: 5,
  title: "같은 방식으로 블로그 발행까지 자동화",
  subs: ["누적 발행 기록 · 티스토리 294건 · 네이버 169건"],
  body: `
  <div class="flow" ${mt(34)}>
    <div class="card">${ic("search")}<span class="tag">AI</span><h3>조사</h3><p>진짜 출처만<br>본문까지 읽음</p></div><span class="arr">→</span>
    <div class="card">${ic("pen")}<span class="tag">AI</span><h3>글쓰기</h3><p>정해진 양식<br>구성은 매번 다름</p></div><span class="arr">→</span>
    <div class="card soft">${ic("doc")}<span class="tag">AI 점검</span><h3>스스로 고치기</h3><p>틀린 곳만<br>골라서 수정</p></div><span class="arr">→</span>
    <div class="card soft">${ic("gate")}<span class="tag">AI 검사관</span><h3>최종 확인</h3><p>과장 · 지어낸 말<br>있으면 반려</p></div><span class="arr">→</span>
    <div class="card">${ic("up")}<span class="tag">예약 발행</span><h3>올리기</h3><p>티스토리<br>네이버</p></div>
  </div>
  <div class="g g3" ${mt(36)}>
    ${box("매일 09:00", "집필 최대 6편", "<p>티스토리 1 · 네이버 5<br>서로 다른 주제</p>")}
    ${box("12 · 15 · 18시", "검증 통과분만 발행", "<p>글 사이 20~40분 간격<br>본문이 바뀌면 재검증</p>")}
    <div class="card ink"><span class="tag">사람(나)</span><h3>로그인 · 캡차</h3><p>자동으로 풀지 않음<br>막히면 그날 해당 채널만 중단</p></div>
  </div>
`,
});

// 4 동작하는 MVP · 기능 3개 (실제 화면)
const f = (i, nth) => (figs(i)[nth] || "").replace("<figure", `<figure style="margin:0;"`);
const cardFig = (tag, title, fig, lines) => `
  <div class="card box"><div class="ch" style="padding:${K(16)} ${K(24)};"><h3 style="font-size:${K(32)};">${tag} · ${title}</h3></div><div class="cb" style="padding:${K(20)} ${K(22)} ${K(22)};">
    <div>${fig}</div>
    <ul class="legend" style="margin-top:${K(16)};gap:${K(8)};">${lines.map((l, i) => `<li><span class="mk">${i + 1}</span><span>${l}</span></li>`).join("")}</ul>
  </div></div>`;
const s4 = slide({
  label: "동작하는 MVP 기능 3개", kicker: "동작하는 MVP", n: 4,
  title: "기능 3개가 배포본에서 동작",
  subs: ["기획안의 핵심 기능이 실제로 동작"],
  body: `<div class="g g3" ${mt(26)}>
  ${cardFig("기능 1", "목록에서 발견", f(2, 0), ["<b>분류 칩 7개</b> · 항목 수", "카드마다 <b>유행 단계</b>", "카드마다 <b>분석일</b>"])}
  ${cardFig("기능 2", "1분 상세", f(3, 0), ["<b>쉬운 뜻</b> 한 줄", "<b>수집일 · 분석일</b>", "<b>지금 단계</b> + 근거"])}
  ${cardFig("기능 3", "신선도 표시", f(4, 0), ["14일 경과 → <b>오래된 분석</b> 경고", "수집일 20일 경과 표시"])}
  </div>`,
  meta: "배포본 az2mz.vercel.app · 데모 영상 프레임 02·04·07 (2026-10-28 녹화)",
});

// 5 데모
const s5 = slide({
  label: "데모", kicker: "동작하는 MVP · 데모", n: 5,
  title: "영상 1분 46초, 같은 순서로 라이브",
  subs: ["데모(영상 또는 수업 중 라이브 시연)"],
  body: `
  <div style="display:grid;grid-template-columns:${K(560)} 1fr;gap:${K(64)};margin-top:${K(36)};align-items:start;">
    <div>
      <a class="btn on" style="display:block;text-align:center;font-size:${K(32)};" href="https://drive.google.com/file/d/17eYPk3Q0dnIoR-c7ilwHbZVIrrNGAtpg/view?usp=sharing" target="_blank" rel="noopener">데모 영상 보기 · 1분 46초</a>
      <a class="btn" style="display:block;text-align:center;margin-top:${K(20)};font-size:${K(32)};" href="https://az2mz.vercel.app" target="_blank" rel="noopener">az2mz.vercel.app</a>
      <p class="body" style="margin-top:${K(28)};">수업 중 라이브 시연 가능<br>영상이 안 열리면 배포 사이트에서 같은 순서로 시연</p>
    </div>
    <div>
      <div class="demo-row" style="border-top:2px solid var(--ink);"><b>0:00</b><span>홈 첫 화면 · 오늘의 한끗</span><em>기능 3</em></div>
      <div class="demo-row"><b>0:11</b><span>분류 칩 디저트 → 신조어</span><em>기능 1</em></div>
      <div class="demo-row"><b>0:27</b><span>MZ 사전 검색 · 지난 유행어</span><em>기능 1·3</em></div>
      <div class="demo-row"><b>0:40</b><span>'야르' 상세 · 뜻 · 단계</span><em>기능 2</em></div>
      <div class="demo-row"><b>1:02</b><span>참고 출처 → 원문 기사</span><em>기능 2</em></div>
      <div class="demo-row"><b>1:25</b><span>20일 지난 항목 · 경고</span><em>기능 3</em></div>
    </div>
  </div>`,
  meta: "시각표 docs/midterm/w9/demo/scenes.md · 배포본을 1920x1080으로 녹화(읽기만)",
});

// 6 기획안과의 차이
const col = (tag, title, items) => `
  <div class="card box ${tag.startsWith("▲") ? "alt" : ""}"><div class="ch"><span class="tag">${tag}</span><h3>${title}</h3></div><div class="cb">
    ${items.map(([a, b], i) => `<p style="font-size:${K(30)};margin-top:${K(i ? 26 : 0)};color:var(--ink);font-weight:700;">${a}</p><p style="font-size:${K(28)};margin-top:${K(6)};">이유 · ${b}</p>`).join("")}
  </div></div>`;
const s6 = slide({
  label: "기획안과의 차이", kicker: "기획안과의 차이", n: 6,
  title: "핵심은 유지, 표시·수집량이 변경",
  subs: ["계획과 달라진 점과 그 이유"],
  body: `<div class="g g3 fill" ${mt(34)}>
  ${col("● 그대로", "계획대로", [["핵심 기능 3개 · 배포본 동작", "기획안 그대로 구현"], ["광고·후기 분석은 범위 밖", "기획안에서 '하지 않을 것'으로 정함"]])}
  ${col("◆ 달라짐", "표시 방식 · 건수", [["'갱신 필요' → '오래된 분석' 배너 + 사전 '지난 유행어' 분리", "10/21 디자인 개편 때 칩이 빠짐"], ["데이터 158 → 159건", "10/23 자동 게시 1건, 검증 통과분만"]])}
  ${col("▲ 덜 됨", "기말 전 보완", [["목록 키워드 검색 없음 · MZ 사전에만", "이번 주 작업에서 빠짐 → 기말 전 추가"], ["수집 후보 10/24~27 0건 · 재판정 4일 9건", "실행 기록은 매일 있음, 0건 원인은 미분석 → 기말 전 분석"]])}
  </div>`,
  meta: "012f446 · frontend/list.html · runs.jsonl · restage.jsonl",
});

// 7 검증 1·2
const s7 = slide({
  label: "검증 결과 1 2", kicker: "검증 결과 1 · 2", n: 7,
  title: "링크 366개 중 2개 안 열림, 자동 게시 26건",
  subs: ["검증 3건 이상 · 결과와 근거(실행 결과, 화면, 수치)"],
  body: `
  <div class="g g2 fill" ${mt(30)}>
    <div class="card box "><div class="ch"><span class="tag">검증 1</span><h3>출처 링크가 열리나</h3><span class="st">▲ 미달</span></div><div class="cb">
      <div class="kpi">2 / 366<small>안 열리는 링크</small></div>
      <p><b style="color:var(--ink);">해 본 것</b> 출처 링크 366개를 모두 열어 봄 · 의심 5개는 브라우저로 다시 확인</p>
      <p style="margin-top:${K(10)};"><b style="color:var(--ink);">결과</b> 목표 0개 → 사라진 링크 1개 · 막혔을 수 있는 링크 4개</p>
    </div></div>
    <div class="card box "><div class="ch"><span class="tag">검증 2</span><h3>AI 비서가 매일 돌았나</h3><span class="st on">● 통과</span></div><div class="cb">
      <div class="kpi">26건<small>10/1~27 자동 게시</small></div>
      <p><b style="color:var(--ink);">해 본 것</b> 실행 기록 · 디스코드 보고 · 저장 기록(git) 비교</p>
      <p style="margin-top:${K(10)};"><b style="color:var(--ink);">결과</b> 최근 14일 3건 · 멈춘 후보는 이유 기록</p>
    </div></div>
  </div>
  ${logs(pres(7))}`,
  meta: "check-links.log · link-recheck.log · git-auto-commits.log · hermes-reports.log",
});

// 8 검증 3·4
const s8 = slide({
  label: "검증 결과 3 4", kicker: "검증 결과 3 · 4", n: 8,
  title: "프로그램은 통과, 사람이 보니 1건 틀림",
  subs: ["검증 3건 이상 · 결과와 근거(실행 결과, 화면, 수치)"],
  body: `
  <div class="g g2 fill" ${mt(30)}>
    <div class="card box "><div class="ch"><span class="tag">검증 3</span><h3>설명이 원문과 같나</h3><span class="st">▲ 미달</span></div><div class="cb">
      <div class="bar3"><i class="a" style="width:50%;">일치 5</i><i class="b" style="width:40%;">부분 4</i><i class="c" style="width:10%;">1</i></div>
      <p><b style="color:var(--ink);">해 본 것</b> 10건을 프로그램으로 대조 · 원문을 직접 읽고 비교</p>
      <p style="margin-top:${K(10)};"><b style="color:var(--ink);">틀린 1건</b> 훠궈 가게 — 원문은 '고기 = 한우 · 육수 = 닭', 한끗은 '한우 육수'로 바꿔 씀</p>
      <p style="margin-top:${K(10)};"><b style="color:var(--ink);">배운 점</b> 글자만 맞춰 보는 검사는 이런 바꿔치기를 못 잡음 → 사람이 일부를 직접 확인</p>
    </div></div>
    <div class="card box alt"><div class="ch"><span class="tag">검증 4</span><h3>1분 안에 이해되나</h3><span class="st">○ 미실시</span></div><div class="cb">
      <div class="kpi">0명<small>사람 테스트</small></div>
      <p><b style="color:var(--ink);">대신 한 것</b> 휴대폰 화면에서 뜻·단계까지 가는 길 11/11 통과</p>
      <p style="margin-top:${K(10)};">탭 4번 + 검색어 입력 1번 · 화면 밖 넘침 없음</p>
      <p style="margin-top:${K(10)};"><b style="color:var(--ink);">다음</b> 기록지 준비됨 → 기말 전 3명 실시</p>
    </div></div>
  </div>
  ${logs([...pres(8), ...pres(9)])}`,
  meta: "grounding-check.log · check-source.log · one-minute-check.log · usability-test-sheet.md",
});

// 9 에이전트 기록 1
const pair = (when, who, ask, fix) => `
  <div class="row" style="grid-template-columns:${K(330)} 1fr 1fr;">
    <div class="when">${when}<i>${who}</i></div><div><b>${ask[0]}</b><span>${ask[1]}</span></div><div><b>${fix[0]}</b><span>${fix[1]}</span></div>
  </div>`;
const s9 = slide({
  label: "에이전트 작업 기록 요청과 확인", kicker: "에이전트 작업 기록 1", n: 9,
  title: "AI가 한 일을 내가 확인하고 규칙으로 막음",
  subs: ["에이전트에게 시킨 주요 요청 · 사람이 확인하거나 고친 것"],
  body: `
  <div class="rows" ${mt(26)}>
    <div class="row hd" style="grid-template-columns:${K(330)} 1fr 1fr;"><span>언제 · 누가</span><span>시킨 주요 요청</span><span>사람이 확인·고친 것</span></div>
    ${pair("매일 21:30", "HERMES", ["유행 찾아서 올리기", "매일 밤 · 10월 26건 게시"], ["10/08 182개 중 139개에 출처에 없는 말", "→ 원문 대조 검사 추가"])}
    ${pair("10/24~", "HERMES", ["유행 단계 다시 판단", "4일간 9건"], ["약과를 하루에 두 번 판단", "→ 14일 안에는 다시 안 함"])}
    ${pair("10/23~", "HERMES", ["애매한 후보는 버튼으로 묻기", "게시 · 버리기 · 나중에"], ["보고 숫자를 AI가 직접 셈", "→ 프로그램이 센 숫자만 보고"])}
    ${pair("6~10월", "CLAUDE CODE", ["검사 프로그램 만들기", "데이터 형식 · 동시 작업 잠금 · 원문 대조"], ["07/11 내부 임시값이 화면에 그대로 6건", "→ 데이터 형식 검사에 추가"])}
  </div>
  ${logs([...pres(10), ...pres(11)])}`,
  meta: "hermes/skills/hangeut · learnings.md · git log --oneline",
});

// 10 에이전트 기록 2
const stuck = (when, a, b, c) => `
  <div class="row" style="grid-template-columns:${K(190)} 1fr 1fr;">
    <div class="when">${when}</div><div><b>${a}</b><span>${b}</span></div><div><b>${c}</b></div>
  </div>`;
const s10 = slide({
  label: "에이전트 작업 기록 막힌 곳과 복구", kicker: "에이전트 작업 기록 2", n: 10,
  title: "막히면 원인 확인 후 재발 방지",
  subs: ["막힌 곳과 복구한 방법"],
  body: `
  <div class="rows" ${mt(26)}>
    <div class="row hd" style="grid-template-columns:${K(190)} 1fr 1fr;"><span>언제</span><span>막힌 곳 · 원인</span><span>복구한 방법</span></div>
    ${stuck("10/22", "수집 · 재시도 모두 실패", "원인 · AI 사용 한도 초과(429)", "다른 AI(Claude)로 자동 대체")}
    ${stuck("10/23", "프로그램이 끝날 때 비정상 종료", "원인 · Windows에서 종료 명령 오류(exit 127)", "종료 방식 변경")}
    ${stuck("08/16", "두 자동 작업이 동시에 저장 → 충돌", "원인 · 같은 저장소를 동시에 수정", "잠금 파일 · 한 번에 하나만")}
    ${stuck("06/16", "밤 9시대 수집 누락", "원인 · AI 서버 혼잡(503)", "20분 뒤 자동 재시도(21:50)")}
  </div>
  ${logs(pres(12))}`,
  meta: "hermes-reports.log · 8f89f73 · 28f3b2c · 막힌 일은 learnings.md에 한 줄씩 기록",
});

// 11 앞으로의 계획
const s11 = slide({
  label: "앞으로의 계획", kicker: "앞으로의 계획", n: 11,
  title: "검증에서 모자란 곳부터 보완",
  subs: ["기말까지 완성할 것 · 공개 형태 · 소스 공개"],
  body: `
  <div class="g g2 fill" ${mt(30)}>
    <div class="card box"><div class="ch"><span class="tag">기말까지</span><h3>완성할 것</h3></div><div class="cb">
      <p style="color:var(--ink);font-weight:800;">1분 이해 테스트 3명</p><p>기록지 준비됨 · 실시 후 화면 수정</p>
      <p style="color:var(--ink);font-weight:800;margin-top:${K(20)};">불통 출처 2개 · 서술 5건</p><p>모드큐·카페인 교체 · 조광 외 4건 수정</p>
      <p style="color:var(--ink);font-weight:800;margin-top:${K(20)};">목록 검색 · 신선도</p><p>14일 넘은 트렌드 149 / 159건 갱신</p>
    </div></div>
    <div class="card box"><div class="ch"><span class="tag">공개</span><h3>공개 형태 · 소스 공개</h3></div><div class="cb">
      <p style="color:var(--ink);font-weight:800;">모바일 웹 · <a class="link" href="https://az2mz.vercel.app" target="_blank" rel="noopener">az2mz.vercel.app</a></p><p>가입 없이 누구나</p>
      <p style="color:var(--ink);font-weight:800;margin-top:${K(20)};">소스 공개 중 · <a class="link" href="https://github.com/sgustjd2/aztomz" target="_blank" rel="noopener">github.com/sgustjd2/aztomz</a></p>
      <table class="t" data-fill="repo-check" style="margin-top:${K(10)};"><tbody>
        <tr><td class="k">README.md · .gitignore</td><td><span class="st on">● 있음</span></td></tr>
        <tr><td class="k">LICENSE · .env.example</td><td><span class="st">▲ 미커밋 · 기말 전 커밋</span></td></tr>
        <tr><td class="k">비밀정보</td><td><span class="st on">● 0건 · 780 커밋 검색</span></td></tr>
      </tbody></table>
    </div></div>
  </div>`,
  meta: "gh repo view(PUBLIC) · git status · git log -p --all 키 패턴 · evidence/README.md 5절",
});

let k = 0;
const out = head + css + "</style>\n</head>\n<body>\n" + [cover, toc, s2, sTerm, s3, sHist, sBlog, s4, s5, s6, s7, s8, s9, s10, s11, sEnd].join("\n").replace(/<span class="pageno">[^<]*<\/span>/g, () => { ++k; return `<i class="prog" style="width:calc(${k} / ${N} * 1600 * var(--k))"></i><span class="pageno">${k} / ${N}</span>`; }) + "\n</body>\n</html>\n";
fs.writeFileSync(new URL("hangeut-mvp-result-v9.html", dir), out);
console.log("v9 bytes", Buffer.byteLength(out));
