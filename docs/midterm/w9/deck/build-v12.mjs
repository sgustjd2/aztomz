// v11(17장) → v12(18장): 실제 Hermes SOUL.md · hangeut-restage SKILL.md 발췌 + 설명 1장(7장) 추가. 사용: node build-v12.mjs
// 발췌는 원본 파일의 줄 일부를 그대로 옮긴 것(굵게 표시 ** 만 뺌). check.mjs가 원본 파일과 대조한다.
// 원본: E:\workspace\side_project\hermes\SOUL.md · hermes\skills\hangeut\hangeut-restage\SKILL.md
import fs from "node:fs";
const dir = new URL(".", import.meta.url);
let s = fs.readFileSync(new URL("hangeut-mvp-result-v11.html", dir), "utf8");
const K = (n) => `calc(${n} * var(--k))`;
const px = (css) => css.replace(/(?<![\w.-])(\d+(?:\.\d+)?)px/g, (m, n) => (+n <= 2 ? m : K(n)));

const soul = `# 고구미봇 — 한끗 트렌드 분석가
최신성에 집착한다.
한물갔으면 솔직히 "한물갔다"고 말한다.
모든 판단은 추정치임을 밝히고 단정하지 않는다.
틀린 판정·받은 피드백을 \`learnings.md\`에 기록하고 다음 분석에 반드시 반영한다.`;
const skill = `name: hangeut-restage
봇은 판단과 근거 URL만 만든다.
\`trends.json\`·git은 \`restage.mjs\`가 검증하고 반영한다(봇이 직접 고치지 않는다).
검색 결과에 실제로 나온 URL만
애매하면 보수적으로(더 늦은 쪽으로 단정하지 말고, 근거가 약하면 그 항목은 판정에서 뺀다).`;
const esc = (t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const panel = (label, file, body, why) => `<div class="sk">
      <p class="lbl2">${label}</p>
      <pre class="term"><span class="f">${file}</span>${esc(body)}</pre>
      <ul class="why">${why.map((w) => `<li>${w}</li>`).join("")}</ul>
    </div>`;

const secs = s.match(/<section class="slide"[\s\S]*?<\/section>/g);
if (secs.length !== 17) throw new Error("expected 17, got " + secs.length);
const hdr = secs[4].match(/<header class="top">[\s\S]*?<\/header>/)[0].replace(/<span class="sec">[^<]*<\/span>/, '<span class="sec">만든 과정 · 실제 파일</span>');
const sec7 = `<section class="slide" aria-label="Hermes 성격 파일과 스킬 파일"><div class="page">
  ${hdr}
  <h2 class="h">AI 비서의 성격과 일은 파일 두 개로 정함</h2>
  <div class="g g2 sks">
    ${panel("성격 파일 · SOUL.md", "hermes/SOUL.md", soul, ["AI 비서(고구미봇)의 성격 · 원칙 규칙", "최신성 · 정직 · 자기개선을 글로 고정"])}
    ${panel("일 파일(스킬) · hangeut-restage", "hermes/skills/hangeut/hangeut-restage/SKILL.md", skill, ["매일 21:05, 오래된 트렌드 5건의 단계를 다시 판단", "AI는 판단과 근거 링크까지, 저장은 프로그램"])}
  </div>
  <i class="prog" style="width:calc(7 / 18 * 1600 * var(--k))"></i><span class="pageno">7 / 18</span>
</div></section>`;
s = s.replace(secs[4 + 1], secs[4 + 1] + "\n" + sec7.replace(/style="([^"]*)"/g, (_, css) => `style="${px(css)}"`));

let idx = 0;
s = s.replace(/<section class="slide"[\s\S]*?<\/section>/g, (sec) => {
  idx++;
  return sec
    .replace(/calc\((\d+) \/ 1[78] \* 1600 \* var\(--k\)\)/, () => `calc(${idx} / 18 * 1600 * var(--k))`)
    .replace(/(<span class="pageno">)\d+ \/ 1[78](<\/span>)/, `$1${idx} / 18$2`);
});
if (idx !== 18) throw new Error("slides " + idx);
const rep = (a, b) => { if (!s.includes(a)) throw new Error("missing: " + a.slice(0, 60)); s = s.replace(a, b); };
rep("<span>4–8장</span>", "<span>4–9장</span>");
rep("<span>9–10장</span>", "<span>10–11장</span>");
rep("<span>11장</span>", "<span>12장</span>");
rep("<span>12–13장</span>", "<span>13–14장</span>");
rep("<span>14–15장</span>", "<span>15–16장</span>");
rep("<span>16장</span>", "<span>17장</span>");
rep("1 · 6 · 9 · 10 · 11 · 12 · 14 · 16장", "1 · 6 · 10 · 11 · 12 · 13 · 15 · 17장");

rep("</style>", px(`
/* ── v12: 실제 SOUL.md · SKILL.md 발췌 장 ── */
.sks{margin-top:34px;gap:40px;align-items:start}
.sk .lbl2{margin:0 0 14px;font-size:32px;font-weight:800;color:var(--ink);line-height:1.3}
.sk .term{min-height:420px;font-size:27px;line-height:1.5}
.sk .term .f{font-size:27px;word-break:break-all}
.sk .why{list-style:none;margin:20px 0 0;padding:0;display:flex;flex-direction:column;gap:8px}
.sk .why li{font-size:30px;line-height:1.5;color:var(--body);padding-left:34px;position:relative}
.sk .why li::before{content:"";position:absolute;left:4px;top:18px;width:14px;height:14px;background:var(--ink);border-radius:2px}
</style>`));

fs.writeFileSync(new URL("hangeut-mvp-result-v12.html", dir), s);
console.log("v12 bytes", Buffer.byteLength(s), "slides", idx);
