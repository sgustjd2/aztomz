// v10(16장) → v11(17장): 기획안 5장의 'Hermes 구성도'를 발표 덱에 큰 도식으로 추가(6장). 사용: node build-v11.mjs
// 내용 출처: docs/midterm/mvp-plan.html 5장(기능 구현 ② 전체 흐름) · CLAUDE.md 크론 일람(21:05 재판정 · 21:30 수집)
import fs from "node:fs";
const dir = new URL(".", import.meta.url);
let s = fs.readFileSync(new URL("hangeut-mvp-result-v10.html", dir), "utf8");
const K = (n) => `calc(${n} * var(--k))`;
const px = (css) => css.replace(/(?<![\w.-])(\d+(?:\.\d+)?)px/g, (m, n) => (+n <= 2 ? m : K(n)));

// ── 새 장: 캔버스 1600 x 690 도식 (글자 27px 이상) ──
const box = (cls, x, y, w, h, tag, title, desc, center) =>
  `<div class="hb2 ${cls}${center ? " c" : ""}" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px;"><b>${tag} · ${title}</b>${desc ? `<span>${desc}</span>` : ""}</div>`;
const diagram = `<div class="hmap">
    <svg viewBox="0 0 1600 690" aria-hidden="true"><defs><marker id="ah2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#172540"/></marker></defs>
      <g fill="none" stroke="#172540" stroke-width="2.5" marker-end="url(#ah2)">
        <path d="M800 120 V133 H240 V146"/><path d="M480 206 H558"/><path d="M1040 206 H1118"/>
        <path d="M1360 266 V286 H800 V306"/><path d="M800 426 V446 H380 V466"/><path d="M800 446 H1220 V466"/>
      </g></svg>
    ${box("ag", 430, 0, 740, 120, "Hermes", "매일 밤 21:30 하루 수집 지휘", "요일 분야 1개 · 후보 2~4건", true)}
    ${box("ag", 0, 146, 480, 120, "Hermes", "① 수집", "웹·뉴스·유튜브·인스타·X 검색 요약")}
    ${box("ag", 560, 146, 480, 120, "Hermes", "② 초안", "뜻 · 지금 단계 · 출처 (본문 근거만)")}
    ${box("ag", 1120, 146, 480, 120, "Hermes", "③ 정리", "사이트에 올릴 형식으로 저장")}
    ${box("pg", 300, 306, 1000, 120, "프로그램", "자동 검증 게이트", "중복 · 형식 · 출처 생존 · 주제 관련성 · 근거 대조", true)}
    <span class="br" style="left:590px;top:446px;">통과</span><span class="br" style="left:1010px;top:446px;">보류</span>
    ${box("pg", 0, 466, 760, 120, "프로그램", "사이트 자동 배포", "통과분만 게시 · 실행 기록 남김")}
    ${box("hu", 840, 466, 760, 120, "사람(나)", "디스코드 검수 버튼", "게시 · 버리기 · 나중에 + 이유 → 다음 수집의 교훈")}
    <p class="loop"><b>매일 21:05</b> 오래된 트렌드 5건 유행 단계 재판정 → 같은 검증을 거쳐 반영</p>
  </div>`;

// 기존 5장(만든 과정)의 머리줄을 그대로 복사해 새 장 머리줄로
const secs = s.match(/<section class="slide"[\s\S]*?<\/section>/g);
if (secs.length !== 16) throw new Error("expected 16 slides, got " + secs.length);
const hdr = secs[4].match(/<header class="top">[\s\S]*?<\/header>/)[0].replace(/<span class="sec">[^<]*<\/span>/, '<span class="sec">만든 과정 · 구성도</span>');
const sec6raw = `<section class="slide" aria-label="Hermes 구성도"><div class="page">
  ${hdr}
  <h2 class="h">수집·초안은 Hermes, 검문은 프로그램, 결정은 사람</h2>
  ${diagram}
  <i class="prog" style="width:calc(6 / 17 * 1600 * var(--k))"></i><span class="keymark">◆ 발표 핵심</span><span class="pageno">6 / 17</span>
</div></section>`;
const sec6 = sec6raw.replace(/style="([^"]*)"/g, (_, css) => `style="${px(css)}"`);
s = s.replace(secs[4], secs[4] + "\n" + sec6);

// ── 번호 다시 매기기: 새 장 뒤의 기존 장은 +1, 총 17장 ──
let idx = 0;
s = s.replace(/<section class="slide"[\s\S]*?<\/section>/g, (sec) => {
  idx++;
  return sec
    .replace(/calc\((\d+) \/ 1[67] \* 1600 \* var\(--k\)\)/, () => `calc(${idx} / 17 * 1600 * var(--k))`)
    .replace(/(<span class="pageno">)\d+ \/ 1[67](<\/span>)/, `$1${idx} / 17$2`);
});
if (idx !== 17) throw new Error("slides " + idx);
const rep = (a, b) => { if (!s.includes(a)) throw new Error("missing: " + a.slice(0, 60)); s = s.replace(a, b); };
// 목차 장 범위 · 핵심 장 목록 (v10 번호 → v11 번호)
rep("<span>4–7장</span>", "<span>4–8장</span>");
rep("<span>8–9장</span>", "<span>9–10장</span>");
rep("<span>10장</span>", "<span>11장</span>");
rep("<span>11–12장</span>", "<span>12–13장</span>");
rep("<span>13–14장</span>", "<span>14–15장</span>");
rep("<span>15장</span>", "<span>16장</span>");
rep("1 · 8 · 9 · 10 · 11 · 13 · 15장", "1 · 6 · 9 · 10 · 11 · 12 · 14 · 16장");
// 기존 핵심 표시는 번호가 아니라 장에 붙어 있어 그대로 따라감. 구 5장(만든 과정 요약)은 핵심 아님 → 새 6장이 대신 핵심

rep("</style>", px(`
/* ── v11: Hermes 구성도 장 ── */
.hmap{position:relative;width:1600px;height:690px;margin-top:36px}
.hmap svg{position:absolute;inset:0;width:1600px;height:690px;overflow:visible}
.hb2{position:absolute;box-sizing:border-box;border-radius:var(--r);padding:12px 22px;display:flex;flex-direction:column;justify-content:center}
.hb2.c{align-items:center;text-align:center}
.hb2 em{font-style:normal;font-size:27px;font-weight:700;line-height:1.3}
.hb2 b{font-size:34px;font-weight:800;line-height:1.3}
.hb2 span{font-size:27px;line-height:1.5;font-weight:500}
.hb2.ag{background:var(--ink);color:var(--on-ink)}
.hb2.pg{background:var(--paper-soft);color:var(--ink);border:2px solid var(--ink)}
.hb2.hu{background:var(--paper);color:var(--ink);border:4px solid var(--ad)}
.hb2.pg em,.hb2.hu em{color:var(--body)}
.hb2.pg span,.hb2.hu span{color:var(--body)}
.hmap .br{position:absolute;transform:translate(-50%,-50%);background:var(--paper);border:2px solid var(--ink);border-radius:6px;padding:2px 16px;font-size:27px;font-weight:800;color:var(--ink);line-height:1.4}
.hmap .loop{position:absolute;left:0;right:0;top:620px;margin:0;font-size:30px;line-height:1.5;color:var(--body);text-align:center}
.hmap .loop b{color:var(--ink);font-weight:800;margin-right:14px}
</style>`));

fs.writeFileSync(new URL("hangeut-mvp-result-v11.html", dir), s);
console.log("v11 bytes", Buffer.byteLength(s), "slides", idx);
