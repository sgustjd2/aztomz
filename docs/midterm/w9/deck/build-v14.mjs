// v13(20장) → v14(22장): ① 숫자를 11/2 기준으로 다시 잰 값으로 고침 ② 검증 결과를 쉬운 말로 다시 쓰고 '한눈에' 장 추가
// ③ 앞으로의 계획을 날짜·목표가 있는 현실적인 계획으로 바꾸고 2장으로 나눔. 사용: node build-v14.mjs
// 새로 잰 근거: docs/midterm/w9/deck/evidence-1102/*.log (check.mjs 가 발췌 줄을 원본 로그와 대조)
import fs from "node:fs";
const dir = new URL(".", import.meta.url);
let s = fs.readFileSync(new URL("hangeut-mvp-result-v13.html", dir), "utf8");
const K = (n) => `calc(${n} * var(--k))`;
const px = (css) => css.replace(/(?<![\w.-])(\d+(?:\.\d+)?)px/g, (m, n) => (+n <= 2 ? m : K(n)));
const inl = (h) => h.replace(/style="([^"]*)"/g, (_, css) => `style="${px(css)}"`);
const esc = (t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const rep = (a, b) => { if (!s.includes(a)) throw new Error("missing: " + a.slice(0, 70)); s = s.replace(a, b); };

// ── ① 바뀐 숫자 고치기 ──
rep("2026-09-01 이후 커밋 340건 · 주요 변경만", "2026-09-01 이후 커밋 357건(11/2 기준) · 주요 변경만");
rep("182개 중 139개에서 출처에 없는 말 발견 → 검사 추가 · 29건 고침", "182개 중 139개에서 출처에 없는 말 발견 → 검사 추가 · 신뢰분석 29건은 원문 대조로 정정");
rep("누적 발행 기록 · 티스토리 294건 · 네이버 169건", "누적 발행 기록(11/2 기준) · 티스토리 298건 · 네이버 183건");
rep("수집 후보 10/24~27 0건 · 재판정 4일 9건", "수집 후보 10/24~11/1 0건 · 재판정 9일 11건");
rep("이유 · 실행 기록은 매일 있음, 0건 원인은 미분석 → 기말 전 분석", "이유 · 수집은 근거 부족으로 보류, 재판정은 같은 5건을 되풀이 → 기말 전 고침");
rep("<span>4일간 9건</span>", "<span>9일간 11건 (목표 하루 5건)</span>");
rep("<span>10/1~27 자동 게시</span>", "<span>10/1~11/1 자동 게시</span>");

// ── ② 검증 결과: 한눈에 + 쉬운 말 상세 2장 ──
const secs = s.match(/<section class="slide"[\s\S]*?<\/section>/g);
if (secs.length !== 20) throw new Error("expected 20, got " + secs.length);
const hdrV = secs[14].match(/<header class="top">[\s\S]*?<\/header>/)[0];
const hdrP = secs[18].match(/<header class="top">[\s\S]*?<\/header>/)[0];
const hdr = (h, sec) => h.replace(/<span class="sec">[^<]*<\/span>/, `<span class="sec">${sec}</span>`);
const SUBV = `<div class="subs"><p class="sub">검증 3건 이상 · 결과와 근거(실행 결과, 화면, 수치)</p></div>`;
const term = (f, body) => `<pre class="term"><span class="f">${f}</span>${esc(body)}</pre>`;

const sum = (tag, q, st, kpi, lead, rest) => `<div class="card box"><div class="ch"><span class="tag">${tag}</span><h3>${q}</h3>${st}</div><div class="cb"><div class="kpi">${kpi}</div><p class="lead"><b>${lead}</b></p><p>${rest}</p></div></div>`;
const secA = `<section class="slide" aria-label="검증 결과 한눈에"><div class="page">
  ${hdr(hdrV, "검증 결과 · 한눈에")}
  <h2 class="h">검증 4개, 만든 건 동작하고 보완할 곳도 찾음</h2>
  ${SUBV}
  <div class="g g4 fill4" style="margin-top:22px;">
    ${sum("검증 1", "출처 링크가 열리나?", `<span class="st">▲ 미달</span>`, "3 / 368", "근거로 단 링크 3개가 안 열림", "100개 중 약 1개꼴 · 목표는 0개")}
    ${sum("검증 2", "AI 비서가 매일 돌았나?", `<span class="st on">● 통과</span>`, "26건", "10월에 사람 손 없이 26건 게시", "10/14 이후 3건 · 10/24부터 새 글 0건")}
    ${sum("검증 3", "설명이 원문과 같나?", `<span class="st">▲ 미달</span>`, "5 · 4 · 1", "10건 중 5건 일치 · 4건 일부 다름 · 1건 틀림", "프로그램 검사는 10건 모두 통과")}
    ${sum("검증 4", "1분 안에 이해되나?", `<span class="st">○ 미실시</span>`, "0명", "사람 테스트는 아직 못 함", "대신 휴대폰 화면 경로 점검 11/11 통과")}
  </div>
  <p class="aband"><b>한 줄 결론</b> 만든 기능은 동작함 · 링크 3곳 · 설명 5건 · 사람 테스트가 모자라 기말 전에 채움 (11/2 측정)</p>
  <i class="prog"></i><span class="keymark">◆ 발표 핵심</span><span class="pageno"></span>
</div></section>`;

// 일별 게시: 커밋 날짜 기준(git-auto-commits.log) — 10/12 분은 10/13 아침 보충 실행이라 10/13에 1건
const DAYS = [3, 3, 2, 2, 1, 2, 2, 2, 1, 2, 2, 0, 1, 1, 0, 0, 0, "X", 1, 0, 0, "X", 1, 0, 0, 0, 0, 0, 0, 0, 0, 0]; // 10/1 ~ 11/1 (32일)
const total = DAYS.reduce((a, d) => a + (d === "X" ? 0 : d), 0), late = DAYS.slice(13).reduce((a, d) => a + (d === "X" ? 0 : d), 0), early = total - late;
if (total !== 26 || late !== 3 || early !== 23 || DAYS.length !== 32) throw new Error(`게시 합계 불일치 ${total}/${late}/${early}`);
const bars = DAYS.map((d, i) => d === "X" ? `<i class="x" title="${i < 31 ? "10/" + (i + 1) : ""} 수집 실패·실행 없음"></i>` : `<i style="height:${(d / 3) * 100}%" title="${i < 31 ? "10/" + (i + 1) : "11/1"} 게시 ${d}건"></i>`).join("");
const L = (arr) => arr.join("\n");

const secB = `<section class="slide" aria-label="검증 결과 1 2"><div class="page">
  ${hdr(hdrV, "검증 결과 1 · 2")}
  <h2 class="h">링크 3곳이 안 열리고, 새 글은 10/14부터 급감</h2>
  ${SUBV}
  <div class="g g2 fill" style="margin-top:26px;">
    <div class="card box"><div class="ch"><span class="tag">검증 1</span><h3>출처 링크가 열리나?</h3><span class="st">▲ 미달</span></div><div class="cb">
      <div class="kpi">3 / 368<small>안 열리는 링크</small></div>
      <div class="meter" role="img" aria-label="출처 링크 368개 중 정상 364개, 확인 못 함 1개, 안 열림 3개"><i class="ok" style="flex:364"></i><i class="q" style="flex:1"></i><i class="bad" style="flex:3"></i></div>
      <p class="ml"><b>정상 364</b> · 확인 못 함 1 · <b>안 열림 3</b></p>
      <p><b style="color:var(--ink);">해 본 것</b> 근거로 단 링크 368개를 모두 열어 봄 · 안 열린 건 브라우저로 한 번 더 확인</p>
      <p style="margin-top:10px;"><b style="color:var(--ink);">결과</b> 눌러도 빈 화면인 곳 3곳(삭제 2 · 로그인 벽 1) · 목표 0곳 못 채움</p>
    </div></div>
    <div class="card box"><div class="ch"><span class="tag">검증 2</span><h3>AI 비서가 매일 돌았나?</h3><span class="st on">● 통과</span></div><div class="cb">
      <div class="kpi">26건<small>10월 자동 게시</small></div>
      <div class="days" style="grid-template-columns:repeat(32,1fr)" role="img" aria-label="10월 1일부터 11월 1일까지 일별 자동 게시 수. 10월 13일까지 23건, 10월 14일 이후 3건, 수집 실패·미실행 2일">
        <span class="recent" style="left:40.625%"><em>10/14~ 3건</em></span>${bars}</div>
      <div class="axis"><span>10/1</span><span style="left:40.625%">10/14</span><span>11/1</span></div>
      <p class="dl"><i></i>수집 안 돈 날 2일 · 10/18 · 10/22</p>
      <p><b style="color:var(--ink);">해 본 것</b> 실행 기록 · 디스코드 보고 · 저장 기록(git) 비교</p>
      <p style="margin-top:10px;"><b style="color:var(--ink);">결과</b> 10/13까지 23건 → 이후 3건 · 10/24~11/1 새 글 0건</p>
    </div></div>
  </div>
  <details class="lg"><summary>증빙 로그 원문 ▾</summary><div class="logbox">${term("check-links.log (11/2) → link-recheck.log",
    L(["❌ 404  [ai-hug-challenge] AI 라이프  https://sh-life.co.kr/entry/AI-숏폼-챌린지-틱톡·인스타를-평정한-유행-AI-필터-참여-가이드", "❌ 410  [sheer-items] 모드큐  https://modecue.com/posts/2026/2026-sheer-shirt-styling/", "⚠️  403  [coffee-trend-rise-2026] 2026 커피 트렌드 코드(카페인 웹진)  https://www.cafein21.co.kr/allarticle/17497", "결과: 죽은 링크(404/410) 2개, 의심(차단 가능) 4개, 전체 368개", "404 | Page Not Found - sh라이프"]))}${term("git-auto-commits.log · pipeline-stats.log · restage-skip.log",
    L(["7c6457d 2026-10-23 21:36 auto: 트렌드 자동 게시(검증통과 1) 2026-10-23", "# 검증통과 합계 26", "합계: 실행 10 · 후보 1 · 게시 1 · 보류 0 · 중복 0 · 사람 승인 0 · 버림 0", "💤 오늘은 게시할 만한 후보가 없어요 — 검색 결과에서 이번 주 유행을 뒷받침할 근거가 부족해 보류했어요."]))}</div></details>
  <i class="prog"></i><span class="pageno"></span>
</div></section>`;

const secC = `<section class="slide" aria-label="검증 결과 3 4"><div class="page">
  ${hdr(hdrV, "검증 결과 3 · 4")}
  <h2 class="h">프로그램은 통과, 사람이 읽으니 1건 틀림</h2>
  ${SUBV}
  <div class="g g2 fill" style="margin-top:26px;">
    <div class="card box"><div class="ch"><span class="tag">검증 3</span><h3>설명이 원문과 같나?</h3><span class="st">▲ 미달</span></div><div class="cb">
      <div class="bar3"><i class="a" style="width:50%;">일치 5</i><i class="b" style="width:40%;">일부 4</i><i class="c" style="width:10%;">1</i></div>
      <p><b style="color:var(--ink);">해 본 것</b> 새 글·시연 글 10건의 설명을 출처 글과 직접 대조</p>
      <p style="margin-top:10px;"><b style="color:var(--ink);">결과</b> 일치 5 · 일부 다름 4 · 틀림 1</p>
      <p style="margin-top:10px;"><b style="color:var(--ink);">틀린 1건</b> 훠궈 가게 — 출처는 "고기는 한우 · 국물은 닭", 한끗은 "한우 육수"</p>
      <p style="margin-top:10px;"><b style="color:var(--ink);">쉽게 말하면</b> 프로그램 검사는 10건 통과, 글자만 봐서 뜻이 바뀐 건 놓침</p>
    </div></div>
    <div class="card box alt"><div class="ch"><span class="tag">검증 4</span><h3>1분 안에 이해되나?</h3><span class="st">○ 미실시</span></div><div class="cb">
      <div class="kpi">0명<small>사람 테스트</small></div>
      <div class="hbs">${`<div class="hb"><span class="rl">사람</span><div class="seg" style="grid-template-columns:repeat(3,1fr)"><i class="e"></i><i class="e"></i><i class="e"></i></div><b class="v">0 / 3</b></div><div class="hb"><span class="rl">자동 점검</span><div class="seg" style="grid-template-columns:repeat(11,1fr)">${"<i></i>".repeat(11)}</div><b class="v">11 / 11</b></div>`}</div>
      <p><b style="color:var(--ink);">대신 한 것</b> 휴대폰 크기 화면에서 뜻 · 단계 · 출처까지 가는 길을 눌러 봄 (11/2 다시 실행)</p>
      <p style="margin-top:10px;"><b style="color:var(--ink);">한계</b> 사람이 이해하는지는 못 잼 → 기말 전 3명 테스트</p>
    </div></div>
  </div>
  <details class="lg"><summary>증빙 로그 원문 ▾</summary><div class="logbox">${term("grounding-check.log · source-recheck.log (11/2, 조광 논현 출처 직접 읽음)",
    L(["✅ 통과  jogwang-nonhyeon-hwoguo  (출처 3 · 읽힘 3)", "합계: 10건 · 통과 10 · 보류감 0 · 본문 0 0", "고기는 본앤 브래드 투뿔 한우를 사용한다고 합니다.", "국물 자체를 제주 구엄닭으로 낸 육수라 깊이가 다릅니다.", "'9월 14' 0", "'가격' 0"]))}${term("one-minute-check.log (11/2)",
    L(["✅ [A] 메뉴 → MZ 사전 이동 — 탭 2", "✅ [A] 상세 — 지금 단계 표시 — 단계 '피크 → 하락' · /trend.html?id=yareu", "✅ [A] 상세 — 출처 링크 펼침 — 출처 3개", "✅ [B] 375px 가로 넘침 없음 — scrollWidth-innerWidth=0px", "요약: 점검 11개 중 실패 0 · 과제 A 탭 4회+입력 1 · 과제 B 탭 4회"]))}</div></details>
  <i class="prog"></i><span class="pageno"></span>
</div></section>`;

// ── ③ 앞으로의 계획: 날짜·목표가 있는 계획 + 공개/소스 장 ──
const ph = (when, name, items) => `<div class="card box"><div class="ch"><span class="tag">${when}</span><h3>${name}</h3></div><div class="cb">${items.map((t) => `<p class="pi">${t}</p>`).join("")}</div></div>`;
const goal = (n, l) => `<div><b>${n}</b><span>${l}</span></div>`;
const secP1 = `<section class="slide" aria-label="앞으로의 계획 기말까지 완성할 것"><div class="page">
  ${hdr(hdrP, "앞으로의 계획 · 기말까지")}
  <h2 class="h">5주를 작게 나눠, 확실한 것부터</h2>
  <div class="subs"><p class="sub">기말까지 완성할 것 · 이번 검증에서 모자란 곳을 날짜별로 정리</p></div>
  <div class="g g4 fill4" style="margin-top:20px;">
    ${ph("11/3~11/9", "바로 고칠 것", ["안 열리는 링크 3개 교체", "틀린 설명 5건 수정", "LICENSE · .env.example 커밋"])}
    ${ph("11/10~11/23", "사람 테스트", ["3명에게 1분 테스트", "막힌 곳 화면 수정", "재판정 반복 오류 수정"])}
    ${ph("11/24~12/6", "수집 · 검색", ["수집 0건 원인 한 가지 조정", "목록 키워드 검색 추가"])}
    ${ph("12/7~12/11", "마무리", ["링크 · 설명 표본 다시 점검", "숫자 갱신 후 제출"])}
  </div>
  <div class="goals"><p class="gl">12/11 목표 (11/2 → 12/11)</p><div class="gr">${goal("3곳 → 0곳", "안 열리는 링크")}${goal("1건 → 0건", "틀린 설명 (표본 10건)")}${goal("0명 → 3명", "사람 테스트")}${goal("11건 → 40건", "14일 안에 다시 본 트렌드")}</div></div>
  <i class="prog"></i><span class="keymark">◆ 발표 핵심</span><span class="pageno"></span>
</div></section>`;
const secP2 = `<section class="slide" aria-label="앞으로의 계획 공개 형태와 소스 공개"><div class="page">
  ${hdr(hdrP, "앞으로의 계획 · 공개")}
  <h2 class="h">웹은 이미 공개, 소스는 파일 2개만 남음</h2>
  <div class="subs"><p class="sub">어떤 형태로 어디에 공개 · 소스 공개 여부·주소</p></div>
  <div class="g g2 fill" style="margin-top:30px;">
    <div class="card box"><div class="ch"><span class="tag">공개 형태</span><h3>모바일 웹</h3></div><div class="cb">
      <p style="color:var(--ink);font-weight:800;"><a class="link" href="https://az2mz.vercel.app" target="_blank" rel="noopener">az2mz.vercel.app</a></p><p>가입 없이 누구나 · 지금도 접속됨</p>
      <p style="color:var(--ink);font-weight:800;margin-top:20px;">이어서 하는 일</p><p>고친 내용은 올리면 자동 배포</p>
    </div></div>
    <div class="card box"><div class="ch"><span class="tag">소스 공개</span><h3>공개 중</h3></div><div class="cb">
      <p style="color:var(--ink);font-weight:800;"><a class="link" href="https://github.com/sgustjd2/aztomz" target="_blank" rel="noopener">github.com/sgustjd2/aztomz</a></p>
      <table class="t" data-fill="repo-check" style="margin-top:10px;"><tbody>
        <tr><td class="k">README.md · .gitignore</td><td><span class="st on">● 있음</span></td></tr>
        <tr><td class="k">LICENSE · .env.example</td><td><span class="st">▲ 미커밋 · 11/9까지 커밋</span></td></tr>
        <tr><td class="k">비밀정보</td><td><span class="st on">● 0건 · 801 커밋 검색</span></td></tr>
      </tbody></table>
    </div></div>
  </div>
  <i class="prog"></i><span class="pageno"></span>
</div></section>`;

s = s.replace(secs[14], inl(secA) + "\n" + inl(secB) + "\n" + inl(secC)).replace(secs[15], "").replace(secs[18], inl(secP1) + "\n" + inl(secP2));

// ── 번호 · 목차 · 핵심 장 ──
let idx = 0;
s = s.replace(/<section class="slide"[\s\S]*?<\/section>/g, (sec) => {
  idx++;
  return sec
    .replace(/<i class="prog"[^>]*><\/i>/, `<i class="prog" style="width:calc(${idx} / 22 * 1600 * var(--k))"></i>`)
    .replace(/<span class="pageno">[^<]*<\/span>/, `<span class="pageno">${idx} / 22</span>`);
});
if (idx !== 22) throw new Error("slides " + idx);
rep("<span>19장</span>", "<span>20–21장</span>");
rep("<span>17–18장</span>", "<span>18–19장</span>");
rep("<span>15–16장</span>", "<span>15–17장</span>");
rep("1 · 6 · 8 · 12 · 13 · 14 · 15 · 17 · 19장", "1 · 6 · 8 · 12 · 13 · 14 · 15 · 18 · 20장");

rep("</style>", px(`
/* ── v14: 검증 한눈에 · 계획 ── */
.g4{display:grid;grid-template-columns:repeat(4,1fr);gap:22px}
.fill4 .box{min-height:470px}
.g4 .box .ch{padding:18px 24px 20px}
.g4 .box .ch h3{font-size:34px}
.g4 .box .cb{padding:20px 24px 22px}
.g4 .kpi{font-size:64px;margin:0 0 14px;letter-spacing:-0.03em}
.g4 .cb p{font-size:28px;line-height:1.5;margin:0}
.g4 .cb p.lead{color:var(--ink);margin:0 0 8px}
.g4 .cb p.pi{color:var(--ink);font-weight:700;font-size:30px;line-height:1.45;padding:12px 0;border-bottom:1px solid var(--line)}
.g4 .cb p.pi:last-child{border-bottom:0}
.goals{margin-top:22px;border-top:2px solid var(--ink);padding-top:12px}
.goals .gl{margin:0 0 8px;font-size:27px;font-weight:800;color:var(--ink);line-height:1.5}
.goals .gr{display:grid;grid-template-columns:repeat(4,1fr);gap:22px}
.goals .gr b{display:block;font-size:40px;font-weight:800;color:var(--ink);line-height:1.2;font-variant-numeric:tabular-nums}
.goals .gr span{font-size:27px;line-height:1.5;color:var(--body)}
</style>`));
if ((s.match(/780 커밋/g) || []).length) throw new Error("780 커밋 남음");

fs.writeFileSync(new URL("hangeut-mvp-result-v14.html", dir), s);
console.log("v14 bytes", Buffer.byteLength(s), "slides", idx);
