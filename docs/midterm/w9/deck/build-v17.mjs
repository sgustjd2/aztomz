// v16(15장) → v17(16장): 11/4 홈 화면 점검·수정(25ddc78, 4169dd2)을 '검증 5 · 화면 점검' 장으로 추가. 사용: node build-v17.mjs
import fs from "node:fs";
const dir = new URL(".", import.meta.url);
let s = fs.readFileSync(new URL("hangeut-mvp-result-v16.html", dir), "utf8");
const rep = (a, b) => { if (!s.includes(a)) throw new Error("missing: " + a.slice(0, 70)); s = s.replace(a, b); };
const img = (f) => "data:image/jpeg;base64," + fs.readFileSync(new URL("evidence-1104/" + f, dir)).toString("base64");

rep("검증 4개, 찾은 문제 중 급한 건 바로 고침", "검증 5개, 찾은 문제 중 급한 건 바로 고침");

const fig = (f, cap) => `<figure style="margin:0;text-align:center;"><img src="${img(f)}" alt="${cap} 휴대폰 390px 홈 '최근 분석' 화면" style="height:calc(380 * var(--k));width:auto;border:1px solid var(--line);border-radius:calc(8 * var(--k));"><figcaption style="margin-top:calc(8 * var(--k));font-size:calc(30 * var(--k));"><b style="color:var(--ink);">${cap}</b></figcaption></figure>`;

const slide = `
<section class="slide" aria-label="검증 결과 5"><div class="page">
  <header class="top"><span class="no">5</span><span class="sec">검증 결과 5 · 화면 점검</span><span class="doc">한끗 · MVP 구현 결과 · 02반 민현성</span></header>
  <h2 class="h">휴대폰 화면에서 깨진 곳 3개를 찾아 고침</h2>
  <div class="subs"><p class="sub">검증 3건 이상 · 결과와 근거(실행 결과, 화면, 수치)</p></div>
  <div class="g g2 fill" style="margin-top:calc(26 * var(--k));">
    <div class="card box"><div class="ch"><span class="tag">검증 5</span><h3>작은 화면에서 깨지나?</h3><span class="st on">● 고침</span></div><div class="cb">
      <div style="display:flex;gap:calc(28 * var(--k));justify-content:center;">${fig("before-390-ad.jpg", "고치기 전")}${fig("after-390-ad.jpg", "고친 뒤")}</div>
    </div></div>
    <div class="card box"><div class="ch"><span class="tag">11/4</span><h3>찾은 것과 고친 것</h3></div><div class="cb">
      <p><b style="color:var(--ink);">해 본 것</b> 화면 점검 스킬(stageshow)로 390 · 1280px 실제 화면 확인 → 검토 에이전트 재확인</p>
      <p style="margin-top:calc(12 * var(--k));"><b style="color:var(--ink);">① 분류 글자</b> 한 글자씩 줄바꿈 → 한 줄 (높이 56 → 19px)</p>
      <p style="margin-top:calc(8 * var(--k));"><b style="color:var(--ink);">② 기본 이미지</b> 표시가 그림을 덮음 → 숨김</p>
      <p style="margin-top:calc(8 * var(--k));"><b style="color:var(--ink);">③ 버튼 색</b> 대비 3.02 → 4.81 (기준 4.5 통과)</p>
      <p style="margin-top:calc(12 * var(--k));"><b style="color:var(--ink);">배포</b> 25ddc78 · 4169dd2 (파비콘 교체 포함)</p>
    </div></div>
  </div>
  <i class="prog"></i><span class="pageno"></span>
</div></section>`;

const re = /(<section class="slide" aria-label="검증 결과 3 4">[\s\S]*?<\/section>)/;
if (!re.test(s)) throw new Error("no 검증 3 4");
s = s.replace(re, `$1${slide}`);

const N = (s.match(/<section class="slide"/g) || []).length;
if (N !== 16) throw new Error("slides " + N);
let idx = 0;
s = s.replace(/<section class="slide"[\s\S]*?<\/section>/g, (sec) => {
  idx++;
  return sec
    .replace(/<i class="prog"[^>]*><\/i>/, `<i class="prog" style="width:calc(${idx} / ${N} * 1600 * var(--k))"></i>`)
    .replace(/<span class="pageno">[^<]*<\/span>/, `<span class="pageno">${idx} / ${N}</span>`);
});
fs.writeFileSync(new URL("hangeut-mvp-result-v17.html", dir), s);
console.log("v17 bytes", Buffer.byteLength(s), "slides", N);
