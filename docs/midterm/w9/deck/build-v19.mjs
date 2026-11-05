// v18(16장) → v19(18장): 해부도 움직이는 그림(GIF, 만든 과정 뒤)·Hermes 구성 그림(기존 구성도 뒤) 2장 추가. 사용: node build-v19.mjs
// 그림 원본: docs/diagrams/png/*.png → v19-img/encode.mjs 로 ≤250KB 변환(hermes.png · anatomy-q0.9.jpg)
import fs from "node:fs";
const dir = new URL(".", import.meta.url);
let s = fs.readFileSync(new URL("hangeut-mvp-result-v18.html", dir), "utf8");
const b64 = (f) => fs.readFileSync(new URL("v19-img/" + f, dir)).toString("base64");
const K = (n) => `calc(${n} * var(--k))`;

const anatomy = `<section class="slide" aria-label="한끗 프로젝트 해부도"><div class="page" style="padding:0;width:100%;height:100%;left:0;top:0;transform:none">
  <img src="data:image/gif;base64,${b64("anatomy.gif")}" alt="한끗 프로젝트 해부도: 수집 호퍼, 검증 게이트, 보류함, 날짜 도장, 서랍장 8칸(trends.json), 신선도 다이얼" style="position:absolute;inset:0;width:100%;height:100%;object-fit:contain">
  <i class="prog"></i><span class="pageno"></span>
</div></section>`;
const hermes = `<section class="slide" aria-label="AI 비서 Hermes 작동 구성"><div class="page">
  <header class="top"><span class="no">2</span><span class="sec">만든 과정 · AI 비서</span><span class="doc">한끗 · MVP 구현 결과 · 02반 민현성</span></header>
  <h2 class="h">AI 비서(Hermes)는 이렇게 일한다</h2>
  <img src="data:image/png;base64,${b64("hermes.png")}" alt="AI 비서 구성도: 디스코드·저녁 크론에서 Hermes 게이트웨이, AI 비서 에이전트, 자동 검증 게이트, trends.json, 배포본. 모델은 주 모델에서 한도에 걸리면 폴백" style="display:block;margin:${K(24)} auto 0;width:${K(1560)};height:auto">
  <i class="prog"></i><span class="pageno"></span>
</div></section>`;

const secs = s.match(/<section class="slide"[\s\S]*?<\/section>/g);
if (secs.length !== 16) throw new Error("slides " + secs.length);
if (!/aria-label="만든 과정과 구조"/.test(secs[2]) || !/aria-label="Hermes 구성도"/.test(secs[3])) throw new Error("order");
s = s.replace(secs[3], secs[3] + "\n" + hermes).replace(secs[2], secs[2] + "\n" + anatomy);

const N = (s.match(/<section class="slide"/g) || []).length;
let idx = 0;
s = s.replace(/<section class="slide"[\s\S]*?<\/section>/g, (sec) => {
  idx++;
  return sec
    .replace(/<i class="prog"[^>]*><\/i>/, `<i class="prog" style="width:calc(${idx} / ${N} * 1600 * var(--k))"></i>`)
    .replace(/<span class="pageno">[^<]*<\/span>/, `<span class="pageno">${idx} / ${N}</span>`);
});
if (N !== 18) throw new Error("N " + N);
fs.writeFileSync(new URL("hangeut-mvp-result-v19.html", dir), s);
console.log("v19 bytes", Buffer.byteLength(s), "slides", N);
