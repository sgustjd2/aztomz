// v23 → v24: 11장(검증 4줄 요약)을 "5개월 실제 운영에서 센 숫자"로 교체(사용자 요청: 더 유의미한 결과).
// 숫자 출처(2026-11-05 집계, 다시 셀 때는 아래 명령 그대로):
//  · 152일 중 120일 / 게시 90회·153건 / 광고·진짜 재확인 125회 : git log 의 "auto: 트렌드 자동 게시|광고/진짜 일일 재확인|유행 단계 재판정" 커밋이 있는 날(6/7~11/5), "트렌드 자동 게시(검증통과 N)"의 N 합
//  · 194건·출처 371개·출처 없는 항목 0 : backend/data/trends.json
//  · 502편(티스토리 302 · 네이버 200) : backend/out/blog/posted.json · posted-naver.json
//  · 팩트체크 290회·문제 1,429건·심각 315건 : backend/out/blog/*.check.json (blog-verify 결과, severity blocker/high/error = 심각)
//  · 182개 중 139개 : backend/out/audit/trends-audit-2026-10-08.md (10/8 전수 감사)
// 사용: node build-v24.mjs
import fs from "node:fs";
const dir = new URL(".", import.meta.url);
let s = fs.readFileSync(new URL("hangeut-mvp-result-v23.html", dir), "utf8");

const T = [
  ["120 / 152일", "트렌드 데이터가 자동으로 바뀐 날", "6/7~11/5 · 게시·재확인·재판정 커밋"],
  ["153건", "AI가 찾아 검증 통과 후 자동 게시", "게시 90회 · 광고/진짜 재확인 125회"],
  ["194건", "사이트 데이터 · 출처 371개", "출처가 없는 항목 0건"],
  ["502편", "같은 구조로 블로그 자동 발행", "티스토리 302 · 네이버 200"],
  ["1,429건", "AI 팩트체커가 초안에서 찾은 문제", "초안 290편 점검 · 그중 심각 315건"],
  ["139 / 182", "10/8 전수 감사: 출처에 없는 말", "→ 원문 대조 게이트를 만든 계기"],
];
const slide = `<section class="slide" aria-label="운영 결과 숫자"><div class="page">
  <header class="top"><span class="no">5</span><span class="sec">검증 결과 · 숫자로 본 결과</span><span class="doc">한끗 · MVP 구현 결과 · 02반 민현성</span></header>
  <h2 class="h">5개월 실제로 돌려 본 결과</h2>
  <div class="subs"><p class="sub purpose"><b class="pk">평가표 · 검증 결과</b>실제 운영 기록에서 센 숫자 — 무엇을 얼마나 해냈나 (11/5 기준)</p></div>
  <div class="v24k">
    ${T.map(([n, a, b]) => `<div class="v24t"><div class="v24n">${n}</div><b>${a}</b><span>${b}</span></div>`).join("\n    ")}
  </div>
  <p class="aband"><b>남은 것</b> 10/24~11/3 새 수집 0건 · 처음 보는 사람 테스트 0명 → 17장 계획</p>
  <p class="v24src">근거: git 자동 커밋 기록 · trends.json · 블로그 발행 기록 · 팩트체크 결과 파일 290개 · 10/8 감사 보고서</p>
  <i class="prog"></i><span class="pageno"></span>
</div></section>`;

const re = /<section class="slide" aria-label="검증 결과 한눈에">[\s\S]*?<\/section>/;
if (!re.test(s)) throw new Error("slide 11 not found");
s = s.replace(re, slide);

// 장 번호·진행 막대 다시 매기기
const N = (s.match(/<section class="slide"/g) || []).length;
let idx = 0;
s = s.replace(/<section class="slide"[\s\S]*?<\/section>/g, (sec) => {
  idx++;
  return sec
    .replace(/<i class="prog"[^>]*><\/i>/, `<i class="prog" style="width:calc(${idx} / ${N} * 1600 * var(--k))"></i>`)
    .replace(/<span class="pageno">[^<]*<\/span>/, `<span class="pageno">${idx} / ${N}</span>`);
});

const css = `<style id="v24">
.v24k{display:grid;grid-template-columns:repeat(3,1fr);gap:calc(24 * var(--k));margin-top:calc(28 * var(--k))}
.v24t{border:1px solid var(--line);border-radius:var(--r);padding:calc(24 * var(--k)) calc(28 * var(--k));background:var(--paper)}
.v24n{font-size:calc(60 * var(--k));font-weight:600;line-height:1.1;color:var(--ink);font-variant-numeric:tabular-nums;white-space:nowrap}
.v24t b{display:block;margin-top:calc(12 * var(--k));font-size:calc(29 * var(--k));font-weight:600;color:var(--ink);line-height:1.4}
.v24t span{display:block;margin-top:calc(4 * var(--k));font-size:calc(27 * var(--k));color:var(--body);line-height:1.5}
.v24src{margin:calc(12 * var(--k)) 0 0;font-size:calc(27 * var(--k));color:var(--body);line-height:1.5}
</style>`;
s = s.replace("</head>", css + "</head>");
if (N !== 18) throw new Error("N " + N);
fs.writeFileSync(new URL("hangeut-mvp-result-v24.html", dir), s);
console.log("v24 bytes", Buffer.byteLength(s), "slides", N);
