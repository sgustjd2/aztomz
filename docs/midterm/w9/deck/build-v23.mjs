// v22 → v23: 10~18장 제목 아래 줄을 "이 장이 평가표 어느 항목이고 무엇을 보여 주나" 한 줄로 바꿈(사용자 요청).
// 앞쪽 = 평가표·과제 안내의 항목 이름(그대로), 뒤쪽 = 이 장이 보여 주는 것. 사용: node build-v23.mjs
import fs from "node:fs";
const dir = new URL(".", import.meta.url);
let s = fs.readFileSync(new URL("hangeut-mvp-result-v22.html", dir), "utf8");

const PURPOSE = {
  "기획안과의 차이": ["평가표 · 기획안과의 차이", "처음 기획과 비교해 그대로 둔 것 · 바뀐 것 · 덜 된 것과 이유"],
  "검증 결과 한눈에": ["평가표 · 검증 결과", "만든 것이 제대로 되는지 직접 시험한 5가지 요약"],
  "검증 결과 1 2": ["평가표 · 검증 결과", "검증 1·2의 증거 — 링크 368개 점검 결과와 날짜별 게시 건수"],
  "검증 결과 3 4": ["평가표 · 검증 결과", "검증 3·4의 증거 — 설명 10건 원문 대조와 사람 테스트 현황"],
  "검증 결과 5": ["평가표 · 검증 결과", "검증 5의 증거 — 휴대폰 화면 고치기 전 · 후"],
  "에이전트 작업 기록 요청과 확인": ["평가표 · 에이전트 작업 기록", "AI에게 시킨 일과, 내가 실수를 찾아 규칙으로 막은 것"],
  "에이전트 작업 기록 막힌 곳과 복구": ["평가표 · 에이전트 작업 기록", "자동화가 멈춘 날 · 원인 · 복구한 방법"],
  "앞으로의 계획 기말까지 완성할 것": ["필수 · 앞으로의 계획", "기말(12/11)까지 날짜별로 할 일과 목표 숫자"],
  "앞으로의 계획 공개 형태와 소스 공개": ["필수 · 앞으로의 계획 · 소스 공개 가산점", "누구나 쓰게 공개한 곳과 소스 공개 상태"],
};
let n = 0;
for (const [label, [tag, text]] of Object.entries(PURPOSE)) {
  const re = new RegExp(`(<section class="slide" aria-label="${label}"><div class="page">[\\s\\S]*?)<div class="subs">[\\s\\S]*?</div>`);
  if (!re.test(s)) throw new Error("slide not found: " + label);
  s = s.replace(re, (m, head) => (n++, `${head}<div class="subs"><p class="sub purpose"><b class="pk">${tag}</b>${text}</p></div>`));
}

const css = `<style id="v23">
.sub.purpose{font-weight:500;color:var(--body)}
.sub.purpose .pk{font-weight:600;color:var(--ink);margin-right:calc(16 * var(--k));padding-right:calc(16 * var(--k));border-right:1px solid var(--line)}
</style>`;
s = s.replace("</head>", css + "</head>");

const N = (s.match(/<section class="slide"/g) || []).length;
if (N !== 18 || n !== 9) throw new Error(`N ${N} n ${n}`);
fs.writeFileSync(new URL("hangeut-mvp-result-v23.html", dir), s);
console.log("v23 bytes", Buffer.byteLength(s), "slides", N, "purpose lines", n);
