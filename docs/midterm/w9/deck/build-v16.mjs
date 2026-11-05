// v15(22장) → v16(15장): 5분 발표에 맞춰 줄임. 발표 순서·용어·에이전트 이름 정리·SOUL/SKILL 발췌·업데이트 이력·블로그 확장·마무리 7장을 빼고,
// 검증·계획 장에서 '고친 부분' 설명을 줄임. 필수 항목(데모·차이·검증·에이전트 기록·계획·공개)은 그대로. 사용: node build-v16.mjs
import fs from "node:fs";
const dir = new URL(".", import.meta.url);
let s = fs.readFileSync(new URL("hangeut-mvp-result-v15.html", dir), "utf8");
const rep = (a, b) => { if (!s.includes(a)) throw new Error("missing: " + a.slice(0, 70)); s = s.replace(a, b); };
const DROP = ["발표 순서", "먼저 알아 둘 말", "에이전트 이름 정리", "Hermes 성격 파일과 스킬 파일", "업데이트 이력", "블로그 자동화 확장", "마무리"];

// ── 고친 부분 설명 줄이기 ──
s = s.replace(/<p style="margin-top:calc\(10 \* var\(--k\)\);"><b style="color:var\(--ink\);">고친 1건<\/b>[^<]*<\/p>\s*/, "");
rep("처음 일치 5 · 일부 4 · 틀림 1 → 고친 뒤 10건 일치", "처음 일치 5 · 일부 4 · 틀림 1 → 고침");
rep("사람이 읽어 찾은 5건, 같은 날 고침", "사람이 읽어 보니 5건이 어긋남, 고침");
// 계획: '이미 고침' 카드와 목표 2개 빼기
s = s.replace(/<div class="card box"><div class="ch"><span class="tag">11\/2 끝냄<\/span>[\s\S]*?<\/div><\/div>\s*(?=<div class="card box">)/, "");
rep(`<div class="g g4 fill4" style="margin-top:calc(20 * var(--k));">`, `<div class="g g4 fill4" style="margin-top:calc(20 * var(--k));grid-template-columns:repeat(3,1fr);">`);
rep("급한 건 이미 고침, 남은 기간은 수집을 돌려 다듬기", "남은 기간은 수집을 돌려 보며 다듬기");
rep("기말까지 완성할 것 · 고친 것과 남은 것을 날짜별로 정리", "기말까지 완성할 것 · 날짜별 계획");
s = s.replace(/<div><b>0곳 유지<\/b>[\s\S]*?<\/div><div><b>0건 유지<\/b>[\s\S]*?<\/div>\s*(?=<div><b>0명)/, "");
rep(`<div class="gr">`, `<div class="gr" style="grid-template-columns:repeat(2,1fr);">`);

// ── 장 빼기 · 번호 다시 매기기 ──
for (const l of DROP) {
  const re = new RegExp(`\\s*<section class="slide" aria-label="${l}">[\\s\\S]*?</section>`);
  if (!re.test(s)) throw new Error("no " + l);
  s = s.replace(re, "");
}
const N = (s.match(/<section class="slide"/g) || []).length;
if (N !== 15) throw new Error("slides " + N);
let idx = 0;
s = s.replace(/<section class="slide"[\s\S]*?<\/section>/g, (sec) => {
  idx++;
  return sec
    .replace(/<i class="prog"[^>]*><\/i>/, `<i class="prog" style="width:calc(${idx} / ${N} * 1600 * var(--k))"></i>`)
    .replace(/<span class="pageno">[^<]*<\/span>/, `<span class="pageno">${idx} / ${N}</span>`);
});
fs.writeFileSync(new URL("hangeut-mvp-result-v16.html", dir), s);
console.log("v16 bytes", Buffer.byteLength(s), "slides", N);
