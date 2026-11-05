// v24 → v25: 발표용 UI 점검 — 요소 단위 정리(버튼·토글·반복 머리줄·대비). 내용·숫자·장 구성·이미지는 그대로.
//  · 반복 머리줄 '한끗 · MVP 구현 결과 · 02반 민현성'(16장) 제거 — 표지·<title>·뷰어가 이미 말해 줌
//  · 1장 영상 버튼: 화면 한가운데 가리던 큰 버튼 → 오른쪽 아래 작은 라벨
//  · 9장: 라이브 시연 안내 3번 반복 중 1줄 제거, 마지막 시간표 줄이 하단 줄 넘던 것 간격 조정
//  · '증빙 로그 원문 ▾' 토글: 열림/닫힘 문구 구분, 키보드 포커스 표시, 13장 로그 상자 안쪽 스크롤 제거
//  · 대비: 번호 표시·'1' 막대·'덜 됨' 글자 #e54756 → 제품 토큰 #cf3a4d(흰 글자 4.8:1), 상태 글자는 잉크색+아이콘만 색
// 사용: node build-v25.mjs
import fs from "node:fs";
const dir = new URL(".", import.meta.url);
let s = fs.readFileSync(new URL("hangeut-mvp-result-v24.html", dir), "utf8");
const N = (s.match(/<section class="slide"/g) || []).length;
if (N !== 18) throw new Error("slides " + N);
const rep = (a, b) => { if (!s.includes(a)) throw new Error("missing: " + a.slice(0, 70)); s = s.replace(a, b); };
const repAll = (re, b, want) => { const n = (s.match(re) || []).length; if (n !== want) throw new Error(`${re} found ${n}, want ${want}`); s = s.replace(re, b); };

// 1) 반복 머리줄
repAll(/<span class="doc">[^<]*<\/span>/g, "", 16);

// 2) 증빙 로그 토글 문구(열림/닫힘)
repAll(/<summary>증빙 로그 원문 ▾<\/summary>/g, `<summary><span class="lo">증빙 로그 원문 보기</span><span class="lc">증빙 로그 닫기</span></summary>`, 4);

// 3) 9장 라이브 시연 안내 중복 줄
rep(`<p class="body" style="margin-top:calc(28 * var(--k));">수업 중 라이브 시연 가능<br>영상이 안 열리면 배포 사이트에서 같은 순서로 시연</p>`,
    `<p class="body" style="margin-top:calc(28 * var(--k));">영상이 안 열리면 배포 사이트에서 같은 순서로 시연</p>`);

// 3-2) 8장 번호 표시가 가리키는 글자(분석일·단계 등)를 덮던 것 → 대상 옆 빈 곳으로(이미지는 그대로, 번호 위치만)
rep(`left:96%; top:17.5%;">1`, `left:95%; top:6%;">1`);
rep(`left:9%; top:66%;">2`, `left:32%; top:65.7%;">2`);
rep(`left:18.5%; top:94%;">3`, `left:27%; top:92.5%;">3`);
rep(`left:90%; top:23%;">1`, `left:56%; top:12.6%;">1`);
rep(`left:82%; top:31%;">2`, `left:64.7%; top:40.7%;">2`);
rep(`left:23%; top:86%;">3`, `left:35.6%; top:83.6%;">3`);
rep(`left:54%; top:35.5%;">2`, `left:77.6%; top:35.5%;">2`);

// 4) 스타일 덮어쓰기
rep(`</head>`, `<style id="v25">
/* 1장: 영상 라벨을 화면 위 가운데 → 오른쪽 아래로(제품 화면을 가리지 않게) */
.thumb .play{left:auto;top:auto;right:calc(24 * var(--k));bottom:calc(16 * var(--k));transform:none;font-size:calc(30 * var(--k));padding:calc(20 * var(--k)) calc(28 * var(--k));gap:calc(16 * var(--k))}
.thumb .play i{border-width:calc(12 * var(--k)) 0 calc(12 * var(--k)) calc(20 * var(--k))}
/* 9장: 시간표 줄 간격을 줄여 마지막 줄이 하단 줄을 넘지 않게 */
.demo-row{padding:calc(22 * var(--k)) 0}
/* 증빙 로그 토글 */
.lg summary .lc{display:none}
.lg[open] summary .lo{display:none}
.lg[open] summary .lc{display:inline}
.lg summary:hover{background:var(--paper-soft)}
.lg summary:focus-visible{outline:calc(3 * var(--k)) solid var(--ad);outline-offset:2px}
.lg .logbox{padding:calc(8 * var(--k)) calc(16 * var(--k));gap:calc(4 * var(--k))}
.lg .term{padding:calc(4 * var(--k)) calc(12 * var(--k))}
/* 대비 */
.mk,.legend .mk{background:#cf3a4d}
.bar3 i.c{background:#cf3a4d}
.stx.ok,.stx.fix{color:var(--ink)}
.stx.ok .ico{color:#21885a}
.stx.warn{color:#cf3a4d}
.stx.none{color:var(--body)}
</style></head>`);

fs.writeFileSync(new URL("hangeut-mvp-result-v25.html", dir), s);
console.log("v25 bytes", Buffer.byteLength(s), "slides", (s.match(/<section class="slide"/g) || []).length);
