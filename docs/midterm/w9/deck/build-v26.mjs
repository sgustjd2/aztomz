// v25(18장) → v26(16장): 같은 파이프라인이 3·4·5·6장에서 네 번 나오던 것을 줄이고 그림 장을 키움. 내용·숫자는 그대로.
//  · 3장 '만든 과정'(글 상자 4개 + 프로젝트 흐름) 삭제 → 타임라인은 10장 '기획안과의 차이' 소제목 아래 가로 띠로 이동
//  · 5장 '구성도'(상자 9개) 삭제 → 내용은 6장 AI 비서 그림에 번호 표식 6개 + 설명 6칸으로 이동
//  · 4장 해부도에 하단 캡션 한 줄, 9장 데모 시간표 → 휴대폰 캡처 5장 띠
// 사용: node build-v26.mjs
import fs from "node:fs";
const dir = new URL(".", import.meta.url);
let s = fs.readFileSync(new URL("hangeut-mvp-result-v25.html", dir), "utf8");
if ((s.match(/<section class="slide"/g) || []).length !== 18) throw new Error("v25 must have 18 slides");
const rep = (a, b) => { if (!s.includes(a)) throw new Error("missing: " + a.slice(0, 70)); s = s.replace(a, () => b); };
const addCss = (css) => { const i = s.lastIndexOf("</style>", s.indexOf("</head>")); if (i < 0) throw new Error("no style"); s = s.slice(0, i) + css + s.slice(i); };
const jpg = (f) => "data:image/jpeg;base64," + fs.readFileSync(new URL("../evidence/" + f, dir)).toString("base64");
const secRe = (label) => new RegExp(`<section class="slide" aria-label="${label}">[\\s\\S]*?<\\/section>`);
const delSec = (label) => { if (!secRe(label).test(s)) throw new Error("no section " + label); s = s.replace(secRe(label), ""); };
const editSec = (label, fn) => { const m = s.match(secRe(label)); if (!m) throw new Error("no section " + label); s = s.replace(m[0], () => fn(m[0])); };
const repIn = (sec, a, b) => { if (!sec.includes(a)) throw new Error("missing in sec: " + a.slice(0, 70)); return sec.replace(a, () => b); };

// 0) CSS 추가(제품 토큰 색만)
addCss(`
/* v26 */
.v22c-r{padding:calc(10 * var(--k)) 0}
.v22c-r.hd{padding-bottom:calc(10 * var(--k))}
.tl2{display:grid;grid-template-columns:repeat(5,1fr);gap:calc(24 * var(--k));margin-top:calc(36 * var(--k))}
.tl2 > div{position:relative;border-top:calc(3 * var(--k)) solid var(--line);padding-top:calc(22 * var(--k))}
.tl2 > div::before{content:"";position:absolute;left:0;top:calc(-12 * var(--k));width:calc(21 * var(--k));height:calc(21 * var(--k));border-radius:calc(4 * var(--k));background:var(--ink)}
.tl2 > div.soft::before{background:var(--paper);border:calc(4 * var(--k)) solid var(--ink);box-sizing:border-box}
.tl2 b{display:block;font-size:calc(30 * var(--k));font-weight:600;line-height:1.4;color:var(--ink);font-variant-numeric:tabular-nums}
.tl2 b i{font-style:normal;margin-right:calc(10 * var(--k))}
.tl2 p{margin:calc(4 * var(--k)) 0 0;font-size:calc(27 * var(--k));line-height:1.5;color:var(--body)}
.hfig{position:relative;margin:calc(12 * var(--k)) auto 0;overflow:hidden}
.hfig img{position:absolute;left:0;top:0;width:100%;height:auto;display:block}
.hstrip{display:grid;grid-template-columns:repeat(3,1fr);gap:calc(8 * var(--k)) calc(24 * var(--k));margin-top:calc(14 * var(--k))}
.hstrip > div{display:grid;grid-template-columns:calc(48 * var(--k)) 1fr;gap:calc(14 * var(--k));align-items:start;padding:calc(8 * var(--k)) 0;border-top:1px solid var(--line)}
.hstrip .mk{position:static;transform:none}
.hstrip p{margin:0;font-size:calc(28 * var(--k));line-height:1.5;color:var(--body)}
.hstrip p b{color:var(--ink);font-weight:600;margin-right:calc(8 * var(--k))}
.dtop{display:flex;align-items:center;gap:calc(20 * var(--k));margin-top:calc(22 * var(--k))}
.dtop .btn{white-space:nowrap}
.dtop p{margin:0 0 0 calc(12 * var(--k));font-size:calc(30 * var(--k));line-height:1.5;color:var(--body)}
.dph{display:grid;grid-template-columns:repeat(5,1fr);gap:calc(24 * var(--k));margin-top:calc(26 * var(--k))}
.dph figure{margin:0}
.dph .fr{height:calc(340 * var(--k));border:1px solid var(--line);border-radius:calc(8 * var(--k));overflow:hidden;background:var(--paper-soft)}
.dph .fr img{display:block;width:100%;height:100%;object-fit:cover;object-position:top}
.dph .fr.ct img{object-fit:contain;object-position:center}
.dph figcaption{margin-top:calc(10 * var(--k))}
.dph figcaption b{display:block;font-size:calc(30 * var(--k));font-weight:600;line-height:1.4;color:var(--ink);font-variant-numeric:tabular-nums}
.dph figcaption span{display:block;font-size:calc(27 * var(--k));line-height:1.5;color:var(--body)}
.dph figcaption em{display:block;font-style:normal;font-size:calc(27 * var(--k));font-weight:600;line-height:1.5;color:var(--ink)}
`);

// 1) 3장 삭제, 타임라인은 10장으로
delSec("만든 과정과 구조");
// 2) 5장 삭제
delSec("Hermes 구성도");

// 3) 4장(해부도) 하단 캡션
editSec("한끗 프로젝트 해부도", (x) => {
    return repIn(x, `<i class="prog"`, `<p style="position:absolute;left:calc(160 * var(--k));bottom:calc(124 * var(--k));margin:0;font-size:calc(28 * var(--k));line-height:1.5;color:var(--ink);">트렌드 카드 분류기 — 후보가 들어와 검문·도장을 거쳐 서랍(trends.json)에 꽂힘</p>\n  <i class="prog"`);
});

// 4) 6장 AI 비서: 그림 + 번호 표식 + 설명 6칸
editSec("AI 비서 Hermes 작동 구성", (x) => {
  const m = x.match(/<img src="(data:image\/png;base64,[A-Za-z0-9+/=]+)"/);
  if (!m) throw new Error("no hermes img");
  const W = 1300, H = Math.round(W * 770 / 2000); // 원본 2000x875에서 아래 범례 줄(y>770)만 잘라 냄
  const mk = (n, X, Y) => `<span class="mk" style="left:${(X / 20).toFixed(2)}%;top:${(Y / 7.7).toFixed(2)}%;">${n}</span>`;
  const marks = [mk(1, 350, 203), mk(1, 350, 578), mk(2, 1162, 490), mk(3, 1147, 153), mk(4, 1569, 378), mk(5, 1569, 690), mk(6, 1422, 215), mk(6, 219, 125)].join("");
  const cell = (n, who, what) => `<div><span class="mk">${n}</span><p><b>${who}</b>${what}</p></div>`;
  const strip = [
    cell(1, "신호", "21:05 재판정 · 21:30 수집 · 디스코드 말"),
    cell(2, "Hermes", "웹·뉴스·유튜브·인스타·X 검색 → 초안 → 저장"),
    cell(3, "모델", "주 모델이 한도에 걸리면 Claude로 대체"),
    cell(4, "프로그램", "중복·형식·출처 생존·주제 관련성·근거 대조"),
    cell(5, "프로그램", "통과분만 trends.json 게시 → 배포본 자동 반영"),
    cell(6, "사람(나)", "보류 후보를 디스코드 버튼으로 게시·버리기·나중에"),
  ].join("");
  x = repIn(x, `<span class="sec">만든 과정 · AI 비서</span>`, `<span class="sec">만든 과정 · AI 비서</span><span style="margin-left:auto;font-size:calc(27 * var(--k));font-weight:600;color:var(--body);">수집·초안은 Hermes, 검문은 프로그램, 결정은 사람</span>`);
  return x.replace(/\n  <img [^>]*>/, () => `
  <div class="hfig" style="width:calc(${W} * var(--k));height:calc(${H} * var(--k));"><img src="${m[1]}" alt="AI 비서 구성도: 디스코드·저녁 크론에서 Hermes 게이트웨이, AI 비서 에이전트, 모델(주 모델에서 한도에 걸리면 폴백), 자동 검증 게이트, trends.json, 배포본. 번호 1~6은 아래 설명 칸">${marks}</div>
  <div class="hstrip">${strip}</div>`);
});

// 5) 9장 데모: 시간표 → 휴대폰 캡처 띠
editSec("데모", (x) => {
  const fig = (f, alt, t, what, fn, ct) => `<figure><div class="fr${ct ? " ct" : ""}"><img src="${jpg(f)}" alt="${alt}"></div><figcaption><b>${t}</b><span>${what}</span><em>${fn}</em></figcaption></figure>`;
  const strip = `<div class="dph">${[
    fig("m01-home.jpg", "휴대폰 홈 첫 화면: 오늘의 한끗과 분류 칩", "0:00 · 0:11", "홈 첫 화면 · 분류 칩 디저트 → 신조어", "기능 1·3"),
    fig("m02-dictionary-search.jpg", "휴대폰 MZ 사전 검색 화면", "0:27", "MZ 사전 검색 · 지난 유행어", "기능 1·3"),
    fig("m03-detail-top.jpg", "휴대폰 '야르' 상세 화면: 뜻과 유행 단계", "0:40", "'야르' 상세 · 뜻 · 단계", "기능 2"),
    fig("m04-detail-sources.jpg", "휴대폰 상세의 참고 출처 3개 목록", "1:02", "참고 출처 → 원문 기사", "기능 2", true),
    fig("m05-ad-detail-top.jpg", "휴대폰 상세 화면: 분석 20일 지난 항목의 오래된 분석 경고", "1:25", "20일 지난 항목 · 경고", "기능 3"),
  ].join("")}</div>`;
  const re = /\n  <div style="display:grid;grid-template-columns:calc\(560 \* var\(--k\)\) 1fr;[\s\S]*?\n  <i class="prog"/;
  if (!re.test(x)) throw new Error("demo body");
  const btns = x.match(/<a class="btn on"[\s\S]*?<\/a>/)[0] + "\n      " + x.match(/<a class="btn" [\s\S]*?<\/a>/)[0].replace(/margin-top:calc\(20 \* var\(--k\)\);/, "");
  return x.replace(re, () => `\n  <div class="dtop">\n      ${btns}\n      <p>영상이 안 열리면 배포 사이트에서 같은 순서로 시연</p>\n  </div>\n  ${strip}\n  <i class="prog"`);
});

// 6) 10장 기획안과의 차이: 프로젝트 흐름 가로 띠
editSec("기획안과의 차이", (x) => {
  const c = (d, t, l, soft) => `<div${soft ? ' class="soft"' : ""}><b><i>${d}</i>${t}</b><p>${l}</p></div>`;
  const band = `<div class="tl2">${[
    c("10/25", "문제 · 기획", "기능 3개 · 안 할 것 3개"),
    c("6~10월", "구현", "수집 · 검증 게이트 · 게시"),
    c("10/08~24", "개선", "원문 대조 · 단계 재판정"),
    c("10/28~11/4", "검증", "검증 5가지 · 시연 녹화"),
    c("~12/11", "기말", "사람 테스트 · 수집 개선", true),
  ].join("")}</div>`;
  return repIn(x, `<div class="v22c" style="margin-top:calc(28 * var(--k));">`, `${band}\n  <div class="v22c" style="margin-top:calc(24 * var(--k));">`);
});

// 7) 장 번호·진행 막대 재번호
const N = (s.match(/<section class="slide"/g) || []).length;
if (N !== 16) throw new Error("slides " + N);
let idx = 0;
s = s.replace(/<section class="slide"[\s\S]*?<\/section>/g, (sec) => {
  idx++;
  return sec
    .replace(/<i class="prog"[^>]*><\/i>/, `<i class="prog" style="width:calc(${idx} / ${N} * 1600 * var(--k))"></i>`)
    .replace(/<span class="pageno">[^<]*<\/span>/, `<span class="pageno">${idx} / ${N}</span>`);
});
fs.writeFileSync(new URL("hangeut-mvp-result-v26.html", dir), s);
console.log("v26 bytes", Buffer.byteLength(s), "slides", N);
