// v17 → v18: 발표 전 문구 점검 — 날짜로 읽히는 '11/11'·옛 검증 수 '4건'·시점마다 바뀌는 커밋 수 정리, 화면의 '발표 핵심' 표시 제거. 사용: node build-v18.mjs
import fs from "node:fs";
const dir = new URL(".", import.meta.url);
let s = fs.readFileSync(new URL("hangeut-mvp-result-v17.html", dir), "utf8");
const rep = (a, b) => { if (!s.includes(a)) throw new Error("missing: " + a.slice(0, 70)); s = s.replace(a, b); };

rep("휴대폰 화면 경로 점검 11/11 통과", "휴대폰 화면 경로 점검 11개 모두 통과");
rep(`<div class="d">10/28</div><h3>검증</h3><p>4건 실행 · 시연 녹화</p>`, `<div class="d">10/28~11/4</div><h3>검증</h3><p>5건 실행 · 시연 녹화</p>`);
rep("● 0건 · 801 커밋 검색", "● 0건 · 전체 커밋 검색");
s = s.replace(/<span class="keymark">[^<]*<\/span>/g, "");

fs.writeFileSync(new URL("hangeut-mvp-result-v18.html", dir), s);
console.log("v18 bytes", Buffer.byteLength(s), "slides", (s.match(/<section class="slide"/g) || []).length);
