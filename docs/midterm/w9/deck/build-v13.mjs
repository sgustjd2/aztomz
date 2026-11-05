// v12(18장) → v13(20장): 에이전트 16개 이름 정리(7장) + 핵심 에이전트 4개 발췌(8장) 추가, '고구미봇' 이름 제거. 사용: node build-v13.mjs
// 이름·분류: E:\workspace\side_project\hermes\skills\hangeut\*\SKILL.md 의 description · docs/hermes.md 스킬 표
// 발췌는 SKILL.md 줄의 일부 그대로(굵게 ** 만 제외) — check.mjs 가 원본 파일과 대조한다.
import fs from "node:fs";
const dir = new URL(".", import.meta.url);
let s = fs.readFileSync(new URL("hangeut-mvp-result-v12.html", dir), "utf8");
const K = (n) => `calc(${n} * var(--k))`;
const px = (css) => css.replace(/(?<![\w.-])(\d+(?:\.\d+)?)px/g, (m, n) => (+n <= 2 ? m : K(n)));
const esc = (t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// ── 1) '고구미봇' 제거 ──
const rep = (a, b) => { if (!s.includes(a)) throw new Error("missing: " + a.slice(0, 60)); s = s.replace(a, b); };
rep("# 고구미봇 — 한끗 트렌드 분석가", "한끗(트렌드 번역소)의 전속 분석가입니다.");
rep("AI 비서(고구미봇)의 성격 · 원칙 규칙", "AI 비서(Hermes)의 성격 · 원칙 규칙");
rep("성격 파일 · SOUL.md", "성격 파일 · SOUL.md (AI 비서의 역할 소개서)");

// ── 2) 7장: 에이전트 16개 이름 정리 ──
const groups = [
  ["수집", [["수집 총괄", "hangeut-run"], ["◆ 수집 담당", "hangeut-collect"], ["유행 음악 담당", "hangeut-bgm"], ["주간 트렌드 담당", "hangeut-pulse"]]],
  ["분석 · 정리", [["광고·신뢰 분석", "hangeut-review"], ["정리 담당", "hangeut-curate"], ["본문 작성", "hangeut-write"], ["가게 조사", "hangeut-shops"]]],
  ["검증", [["최신성 검증", "hangeut-verify"], ["◆ 출처 검증", "hangeut-source"], ["◆ 단계 재판정", "hangeut-restage"]]],
  ["게시 · 운영", [["게시 담당", "hangeut-build"], ["◆ 검수 담당", "hangeut-approve"], ["블로그 발행", "hangeut-blog"], ["디자인 제안", "hangeut-design"], ["학습 기록", "hangeut-learn"]]],
];
if (groups.reduce((a, g) => a + g[1].length, 0) !== 16) throw new Error("agents != 16");
const col = ([label, items]) => `<div class="ac"><p class="al">${label} · ${items.length}개</p>${items.map(([n, id]) => `<div class="ai"><b>${n}</b><span>${id}</span></div>`).join("")}</div>`;
const secs = s.match(/<section class="slide"[\s\S]*?<\/section>/g);
if (secs.length !== 18) throw new Error("expected 18, got " + secs.length);
const hdrOf = (sec) => secs[4].match(/<header class="top">[\s\S]*?<\/header>/)[0].replace(/<span class="sec">[^<]*<\/span>/, `<span class="sec">${sec}</span>`);
const sec7 = `<section class="slide" aria-label="에이전트 이름 정리"><div class="page">
  ${hdrOf("만든 과정 · 에이전트 이름")}
  <h2 class="h">AI 비서 Hermes의 에이전트 16개, 역할별로 정리</h2>
  <div class="ag4">${groups.map(col).join("")}</div>
  <p class="aband"><b>◆ 다음 장에서 자세히</b> 4개 · Claude Code 쪽 에이전트 7개는 블로그 집필 5(조사·정리·집필·SEO·팩트체크) · 디자인 점검 · 문서 정리</p>
  <i class="prog"></i><span class="pageno"></span>
</div></section>`;

// ── 3) 8장: 핵심 에이전트 4개 + 실제 SKILL.md 줄 ──
const key = [
  ["수집 담당", "hangeut-collect", "요일마다 분야 하나를 골라 후보 2~4건 수집", "오늘 요일에 배정된 '한 분야'(요일 로테이션)에서\nSNS 화제 트렌드 2~4건을 가볍게 수집한다.\n전 분야 몰아치기 금지."],
  ["출처 검증", "hangeut-source", "링크가 열리고 본문이 맞는지 확인", "링크가 살아있고(200) + 본문이 실제로 그 트렌드를 다루는 정확한 출처인지 확인.\n무관·죽은 링크는 진짜 출처로 교체·제거."],
  ["단계 재판정", "hangeut-restage", "매일 오래된 트렌드 5건의 유행 단계를 다시 판단", "매일 21:05 크론이 5건씩 돌리고\n봇은 판단과 근거 URL만 만든다."],
  ["검수 담당", "hangeut-approve", "보류된 후보를 디스코드 버튼으로 사람에게 확인", "자동 수집에서 보류된 트렌드 후보를 하나씩 버튼 카드(게시/버리기/나중에)로 보여주고,\n누른 버튼대로 결정적 스크립트로 처리한다."],
];
const kc = ([n, id, role, ex]) => `<div class="kc"><p class="kt"><b>${n}</b><span>${id}</span></p><p class="kr">${role}</p><pre class="term"><span class="f">hermes/skills/hangeut/${id}/SKILL.md</span>${esc(ex)}</pre></div>`;
const sec8 = `<section class="slide" aria-label="핵심 에이전트 4개"><div class="page">
  ${hdrOf("만든 과정 · 핵심 에이전트")}
  <h2 class="h">핵심 에이전트 4개: 수집 · 출처 검증 · 재판정 · 검수</h2>
  <div class="g g2 kg">${key.map(kc).join("")}</div>
  <i class="prog"></i><span class="keymark">◆ 발표 핵심</span><span class="pageno"></span>
</div></section>`;
const fix = (sec) => sec.replace(/style="([^"]*)"/g, (_, css) => `style="${px(css)}"`);
s = s.replace(secs[5], secs[5] + "\n" + fix(sec7) + "\n" + fix(sec8));

// ── 4) 번호 다시 매기기(총 20장) · 목차 · 핵심 장 ──
let idx = 0;
s = s.replace(/<section class="slide"[\s\S]*?<\/section>/g, (sec) => {
  idx++;
  const bar = `<i class="prog" style="width:calc(${idx} / 20 * 1600 * var(--k))"></i>`;
  return sec
    .replace(/<i class="prog"[^>]*><\/i>/, bar)
    .replace(/<span class="pageno">[^<]*<\/span>/, `<span class="pageno">${idx} / 20</span>`);
});
if (idx !== 20) throw new Error("slides " + idx);
// 목차: 뒤에서부터 바꿔 겹치지 않게
rep("<span>17장</span>", "<span>19장</span>");
rep("<span>15–16장</span>", "<span>17–18장</span>");
rep("<span>13–14장</span>", "<span>15–16장</span>");
rep("<span>12장</span>", "<span>14장</span>");
rep("<span>10–11장</span>", "<span>12–13장</span>");
rep("<span>4–9장</span>", "<span>4–11장</span>");
rep("1 · 6 · 10 · 11 · 12 · 13 · 15 · 17장", "1 · 6 · 8 · 12 · 13 · 14 · 15 · 17 · 19장");

rep("</style>", px(`
/* ── v13: 에이전트 이름 정리 · 핵심 에이전트 ── */
.ag4{display:grid;grid-template-columns:repeat(4,1fr);gap:36px;margin-top:30px}
.ac .al{margin:0 0 6px;padding-bottom:12px;border-bottom:2px solid var(--ink);font-size:30px;font-weight:800;color:var(--ink);line-height:1.3}
.ai{padding:12px 0;border-bottom:1px solid var(--line)}
.ai b{display:block;font-size:30px;font-weight:700;color:var(--ink);line-height:1.35}
.ai span{display:block;font-size:27px;color:var(--body);line-height:1.5;font-variant-numeric:tabular-nums}
.aband{margin:24px 0 0;padding:16px 26px;background:var(--paper-soft);border-radius:var(--r);font-size:27px;line-height:1.5;color:var(--body)}
.aband b{color:var(--ink);font-weight:800;margin-right:12px}
.kg{margin-top:14px;gap:22px}
.kc{border:1px solid var(--line);border-radius:var(--r);padding:12px 26px 14px;background:var(--paper)}
.kc .kt{margin:0;display:flex;align-items:baseline;gap:16px;flex-wrap:wrap}
.kc .kt b{font-size:34px;font-weight:800;color:var(--ink);line-height:1.3}
.kc .kt span{font-size:27px;color:var(--body);line-height:1.5}
.kc .kr{margin:4px 0 12px;font-size:28px;line-height:1.5;color:var(--body)}
.kc .term{font-size:27px;line-height:1.5;padding:14px 18px;margin:0}
.kc .term .f{font-size:27px;word-break:break-all;margin-bottom:6px;padding-bottom:6px}
</style>`));

fs.writeFileSync(new URL("hangeut-mvp-result-v13.html", dir), s);
console.log("v13 bytes", Buffer.byteLength(s), "slides", idx, "고구미 left:", (s.match(/고구미/g) || []).length);
