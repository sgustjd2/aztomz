// v14(22장) → v15(22장): 11/2에 링크 3개 교체·틀린 설명 5건 수정·LICENSE/.env.example 커밋을 마친 결과를 덱에 반영.
// 검증 한눈에·검증 1~4·계획 2장·소스 공개 표·타임라인 문구를 '이미 고침 / 남은 것'으로 바꾼다. 3명 사람 테스트는 '1~2명, 못 하면 직접 반복'으로 낮춤.
// 새 근거: evidence-1102/check-links-after.log · grounding-after.log · git log (d356291). 사용: node build-v15.mjs
import fs from "node:fs";
const dir = new URL(".", import.meta.url);
let s = fs.readFileSync(new URL("hangeut-mvp-result-v14.html", dir), "utf8");
const rep = (a, b) => { if (!s.includes(a)) throw new Error("missing: " + a.slice(0, 70)); s = s.replace(a, b); };
const esc = (t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const modSec = (label, fn) => {
  const re = new RegExp(`<section class="slide" aria-label="${label}">[\\s\\S]*?</section>`);
  const m = s.match(re); if (!m) throw new Error("no section " + label);
  s = s.replace(m[0], fn(m[0]));
};
const mod = (sec, a, b) => { if (!sec.includes(a)) throw new Error("missing in sec: " + a.slice(0, 70)); return sec.replace(a, b); };

// 로그에서 줄을 그대로 뽑는다(check.mjs 가 원본 로그와 줄 단위로 대조)
const log = (f) => fs.readFileSync(new URL("evidence-1102/" + f, dir), "utf8").split(/\r?\n/);
const pick = (lines, re) => { const l = lines.find((x) => re.test(x)); if (!l) throw new Error("log line not found: " + re); return l; };
const links = log("check-links-after.log"), grd = log("grounding-after.log");
const term = (f, ls) => `<pre class="term"><span class="f">${f}</span>${esc(ls.join("\n"))}</pre>`;
const before = log("check-links.log"), src = log("source-recheck.log");
const GIT = "d356291 fix: 안 열리는 출처 3곳 교체 + 출처에 없는 서술 5건 수정, LICENSE·.env.example 추가";
const termLinks = term("check-links.log (처음) → check-links-after.log (고친 뒤) · git log --oneline", [
  pick(before, /^❌ 404/), pick(before, /^❌ 410/), pick(before, /^결과: 죽은 링크/), pick(links, /^결과: 죽은 링크/), GIT,
]);
const termGrd = term("source-recheck.log (처음) · grounding-after.log (고친 뒤) · git log --oneline", [
  "고기는 본앤 브래드 투뿔 한우를 사용한다고 합니다.", "국물 자체를 제주 구엄닭으로 낸 육수라 깊이가 다릅니다.", pick(src, /'9월 14' 0/), pick(src, /'가격' 0/), pick(grd, /^합계: 8건/), GIT,
]);

// ── 5장 타임라인 ──
rep("<p>테스트 3명 · 출처 교체</p>", "<p>사람 테스트 · 수집 개선</p>");

// ── 15장 검증 한눈에 ──
modSec("검증 결과 한눈에", (x) => {
  x = mod(x, "검증 4개, 만든 건 동작하고 보완할 곳도 찾음", "검증 4개, 찾은 문제 중 급한 건 바로 고침");
  x = mod(x, `<span class="st">▲ 미달</span></div><div class="cb"><div class="kpi">3 / 368</div><p class="lead"><b>근거로 단 링크 3개가 안 열림</b></p><p>100개 중 약 1개꼴 · 목표는 0개</p>`,
    `<span class="st on">● 고침</span></div><div class="cb"><div class="kpi">3 → 0</div><p class="lead"><b>안 열리던 링크 3개를 바꿔 다시 점검</b></p><p>처음 368개 중 3개 · 고친 뒤 367개 중 0개</p>`);
  x = mod(x, `<span class="st">▲ 미달</span></div><div class="cb"><div class="kpi">5 · 4 · 1</div><p class="lead"><b>10건 중 5건 일치 · 4건 일부 다름 · 1건 틀림</b></p><p>프로그램 검사는 10건 모두 통과</p>`,
    `<span class="st on">● 고침</span></div><div class="cb"><div class="kpi">5 → 10건</div><p class="lead"><b>원문과 일치하는 설명 (표본 10건)</b></p><p>어긋난 5건을 고쳐 출처 본문과 다시 대조</p>`);
  x = mod(x, "<p>대신 휴대폰 화면 경로 점검 11/11 통과</p>", "<p>대신 휴대폰 화면 경로 점검 11/11 통과 · 기말 전 1~2명 목표</p>");
  x = mod(x, "만든 기능은 동작함 · 링크 3곳 · 설명 5건 · 사람 테스트가 모자라 기말 전에 채움 (11/2 측정)", "만든 기능은 동작함 · 링크 3곳과 설명 5건은 11/2에 고침 · 사람 테스트와 수집 개선이 남음");
  return x;
});

// ── 16장 검증 1·2 ──
modSec("검증 결과 1 2", (x) => {
  x = mod(x, "링크 3곳이 안 열리고, 새 글은 10/14부터 급감", "링크 3곳은 고쳤고, 새 글은 10/14부터 급감");
  x = mod(x, `<h3>출처 링크가 열리나?</h3><span class="st">▲ 미달</span>`, `<h3>출처 링크가 열리나?</h3><span class="st on">● 고침</span>`);
  x = mod(x, `<div class="kpi">3 / 368<small>안 열리는 링크</small></div>`, `<div class="kpi">3 → 0<small>안 열리는 링크</small></div>`);
  x = mod(x, `aria-label="출처 링크 368개 중 정상 364개, 확인 못 함 1개, 안 열림 3개"><i class="ok" style="flex:364"></i><i class="q" style="flex:1"></i><i class="bad" style="flex:3"></i>`,
    `aria-label="고친 뒤 출처 링크 367개 중 정상 366개, 확인 못 함 1개, 안 열림 0개"><i class="ok" style="flex:366"></i><i class="q" style="flex:1"></i>`);
  x = mod(x, `<p class="ml"><b>정상 364</b> · 확인 못 함 1 · <b>안 열림 3</b></p>`, `<p class="ml">고친 뒤 <b>정상 366</b> · 확인 못 함 1 · <b>안 열림 0</b></p>`);
  x = mod(x, "근거로 단 링크 368개를 모두 열어 봄 · 안 열린 건 브라우저로 한 번 더 확인", "링크 368개를 모두 열어 봄 → 안 열린 3곳 교체 → 367개 다시 점검");
  x = mod(x, "눌러도 빈 화면인 곳 3곳(삭제 2 · 로그인 벽 1) · 목표 0곳 못 채움", "처음엔 빈 화면인 곳 3곳(삭제 2 · 로그인 벽 1) → 읽히는 출처로 바꿔 0곳 · 확인 못 한 1곳은 Forbes(봇 차단)");
  const o = x.match(/<pre class="term"><span class="f">check-links\.log \(11\/2\) → link-recheck\.log<\/span>[\s\S]*?<\/pre>/);
  if (!o) throw new Error("old links term");
  return x.replace(o[0], termLinks);
});

// ── 17장 검증 3·4 ──
modSec("검증 결과 3 4", (x) => {
  x = mod(x, "프로그램은 통과, 사람이 읽으니 1건 틀림", "사람이 읽어 찾은 5건, 같은 날 고침");
  x = mod(x, `<h3>설명이 원문과 같나?</h3><span class="st">▲ 미달</span>`, `<h3>설명이 원문과 같나?</h3><span class="st on">● 고침</span>`);
  x = mod(x, `<i class="a" style="width:50%;">일치 5</i>`, `<i class="a" style="width:50%;">처음 일치 5</i>`);
  x = mod(x, "</b> 일치 5 · 일부 다름 4 · 틀림 1</p>", "</b> 처음 일치 5 · 일부 4 · 틀림 1 → 고친 뒤 10건 일치</p>");
  x = mod(x, `>틀린 1건</b> 훠궈 가게 — 출처는 "고기는 한우 · 국물은 닭", 한끗은 "한우 육수"`, `>고친 1건</b> 훠궈 가게 — 출처 "고기는 한우 · 국물은 닭"을 "한우 육수"로 바꿔 쓴 것`);
  x = mod(x, `<div class="seg" style="grid-template-columns:repeat(3,1fr)"><i class="e"></i><i class="e"></i><i class="e"></i></div><b class="v">0 / 3</b>`, `<div class="seg" style="grid-template-columns:repeat(2,1fr)"><i class="e"></i><i class="e"></i></div><b class="v">0 / 2</b>`);
  x = mod(x, "사람이 이해하는지는 못 잼 → 기말 전 3명 테스트", "사람이 이해하는지는 못 잼 → 기말 전 1~2명, 못 하면 같은 점검을 직접 반복");
  const o = x.match(/<pre class="term"><span class="f">grounding-check\.log · source-recheck\.log[^<]*<\/span>[\s\S]*?<\/pre>/);
  if (!o) throw new Error("old grounding term");
  return x.replace(o[0], termGrd);
});

// ── 20장 계획 ──
const ph = (when, name, items) => `<div class="card box"><div class="ch"><span class="tag">${when}</span><h3>${name}</h3></div><div class="cb">${items.map((t) => `<p class="pi">${t}</p>`).join("")}</div></div>`;
modSec("앞으로의 계획 기말까지 완성할 것", (x) => {
  x = mod(x, "5주를 작게 나눠, 확실한 것부터", "급한 건 이미 고침, 남은 기간은 수집을 돌려 다듬기");
  x = mod(x, "기말까지 완성할 것 · 이번 검증에서 모자란 곳을 날짜별로 정리", "기말까지 완성할 것 · 고친 것과 남은 것을 날짜별로 정리");
  x = mod(x, ph("11/3~11/9", "바로 고칠 것", ["안 열리는 링크 3개 교체", "틀린 설명 5건 수정", "LICENSE · .env.example 커밋"]), ph("11/2 끝냄", "이미 고침", ["안 열리던 링크 3개 교체", "틀린 설명 5건 수정", "LICENSE · .env.example 올림"]));
  x = mod(x, ph("11/10~11/23", "사람 테스트", ["3명에게 1분 테스트", "막힌 곳 화면 수정", "재판정 반복 오류 수정"]), ph("11/3~11/16", "수집 돌려 보기", ["수집 0건 원인 조정", "재판정 같은 5건 반복 수정", "매일 게시 건수 기록"]));
  x = mod(x, ph("11/24~12/6", "수집 · 검색", ["수집 0건 원인 한 가지 조정", "목록 키워드 검색 추가"]), ph("11/17~11/30", "검색 · 확인", ["목록 키워드 검색 추가", "가능하면 1~2명 1분 테스트", "못 하면 직접 반복 점검"]));
  x = mod(x, ph("12/7~12/11", "마무리", ["링크 · 설명 표본 다시 점검", "숫자 갱신 후 제출"]), ph("12/1~12/11", "마무리", ["새 표본으로 링크 · 설명 점검", "숫자 갱신 후 제출"]));
  x = mod(x, `<div><b>3곳 → 0곳</b><span>안 열리는 링크</span></div><div><b>1건 → 0건</b><span>틀린 설명 (표본 10건)</span></div><div><b>0명 → 3명</b><span>사람 테스트</span></div>`,
    `<div><b>0곳 유지</b><span>안 열리는 링크 · 11/2 고침</span></div><div><b>0건 유지</b><span>틀린 설명 · 새 표본으로 확인</span></div><div><b>0명 → 1~2명</b><span>사람 테스트 · 못 하면 직접 반복</span></div>`);
  return x;
});

// ── 21장 공개 · 소스 ──
modSec("앞으로의 계획 공개 형태와 소스 공개", (x) => {
  x = mod(x, "웹은 이미 공개, 소스는 파일 2개만 남음", "웹과 소스 모두 공개, 필수 파일도 올림");
  x = mod(x, `<span class="st">▲ 미커밋 · 11/9까지 커밋</span>`, `<span class="st on">● 있음 · 11/2 올림</span>`);
  return x;
});

fs.writeFileSync(new URL("hangeut-mvp-result-v15.html", dir), s);
console.log("v15 bytes", Buffer.byteLength(s), "slides", (s.match(/<section class="slide"/g) || []).length);
