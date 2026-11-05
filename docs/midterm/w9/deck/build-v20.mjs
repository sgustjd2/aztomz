// v19(18장) → v20: unslop(github.com/heydamir/unslop, CC BY 4.0) 다듬기 판(polish mode — 브랜드·장 구성·내용 유지).
// 감사에서 찾은 것만 고친다:
//  1 간격  — padding·margin·gap 값을 4px 격자로(1920 기준 calc(N * --k)의 N을 4의 배수로)
//  2 색    — 거의 모든 상자 머리(.box .ch)가 남색으로 칠해져 강조가 사라짐 → 머리는 옅은 면 + 선, 남색 채움은 장마다 한 곳(해법 상자·사람 줄)만
//          — 4개가 나란한 SKILL.md 발췌(.term)도 남색 → 옅은 면에 남색 글자
//  3 기호  — 이름표 앞 ●◆▲○ 글자 → 작은 상태 칸(완료=초록, 달라짐=남색, 덜 됨=빨강, 미실시=빈 칸)
//  5 글자  — 굵기 800·700 → 600 (위계는 크기와 색으로; 500까지 내리면 check.mjs가 굵은 이름표를 본문으로 보고 줄간격 1.5를 요구해 600에서 멈춤)
// 사용: node build-v20.mjs
import fs from "node:fs";
const dir = new URL(".", import.meta.url);
let s = fs.readFileSync(new URL("hangeut-mvp-result-v19.html", dir), "utf8");

// 1·5: 스타일 블록 안에서만 값 바꾸기
const SPACE = /\b(padding|margin|gap|row-gap|column-gap)(-(top|right|bottom|left))?\s*:[^;}]*/g;
const snap = (n) => (n <= 2 ? n : Math.round(n / 4) * 4);
let snapped = 0, weights = 0;
s = s.replace(/<style([^>]*)>([\s\S]*?)<\/style>/g, (_, attr, css) => {
  css = css.replace(SPACE, (decl) =>
    decl.replace(/calc\((\d+(?:\.\d+)?) \* var\(--k\)\)/g, (m, n) => {
      const v = snap(+n);
      if (v !== +n) snapped++;
      return `calc(${v} * var(--k))`;
    }),
  );
  css = css.replace(/font-weight:\s*(800|700)/g, (m, w) => (weights++, `font-weight:600`));
  return `<style${attr}>${css}</style>`;
});

// 3: 이름표 앞 글자 기호 → 상태 칸
const MARK = { "●": "ok", "◆": "chg", "▲": "warn", "○": "none" };
let marks = 0;
s = s.replace(/(<span class="(?:tag|st(?: on)?)">)([●◆▲○]) /g, (m, open, g) => (marks++, `${open}<i class="mk2 ${MARK[g]}" aria-hidden="true"></i>`));
// 이름표 문맥에 맞게: 장 10의 '그대로'는 완료가 아니라 유지 → 남색 칸
s = s.replace('<i class="mk2 ok" aria-hidden="true"></i>그대로', '<i class="mk2 chg" aria-hidden="true"></i>그대로');

// 2·3: 덧붙이는 스타일 (styles.css 토큰 색만: --ink #172540 · --line · --paper-soft · --trust #21885a · --ad)
const css = `<style id="unslop-v20">
/* unslop by @heydamir (CC BY 4.0) — polish pass */
.box .ch{background:var(--paper-soft);border-bottom:1px solid var(--line)}
.box .ch .tag{color:var(--body)!important}
.box .ch h3{color:var(--ink)!important}
.box .ch .st,.box .ch .st.on,.rows .st.on,.st.on{background:transparent;color:var(--ink);border-color:var(--line)}
.box.alt .ch{background:var(--paper-soft)}
.kc .term,.sk .term{background:var(--paper-soft);color:var(--ink);border:1px solid var(--line)}
.kc .term .f,.sk .term .f{color:var(--ink);border-bottom-color:var(--line)}
.mk2{display:inline-block;width:calc(16 * var(--k));height:calc(16 * var(--k));border-radius:calc(3 * var(--k));margin-right:calc(8 * var(--k));vertical-align:calc(-1 * var(--k));border:calc(2 * var(--k)) solid var(--body);background:transparent}
.mk2.ok{background:#21885a;border-color:#21885a}
.mk2.chg{background:var(--ink);border-color:var(--ink)}
.mk2.warn{background:var(--ad);border-color:var(--ad)}
</style>`;
s = s.replace("</head>", css + "</head>");

const N = (s.match(/<section class="slide"/g) || []).length;
if (N !== 18) throw new Error("N " + N);
fs.writeFileSync(new URL("hangeut-mvp-result-v20.html", dir), s);
console.log("v20 bytes", Buffer.byteLength(s), "slides", N, { snapped, weights, marks });
