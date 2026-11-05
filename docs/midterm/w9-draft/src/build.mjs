// 9주차 구현 결과 덱(초안, 양식 공개 전). 실행: node src/build.mjs src mvp-result-draft.html — 공용 head/body 스타일 + extra.css + sections.html, 화면 캡처는 data URI로 넣어 HTML 한 파일로.
import { readFileSync, writeFileSync } from 'node:fs';
const [S, out] = process.argv.slice(2);
const W = S;  // 원본·이미지가 한 폴더(src/)에 있음
const head = readFileSync(S + '/head.html', 'utf8').replace('<title>단테랩스 슬라이드</title>', '<title>한끗 — MVP 구현 결과 · 02반 민현성</title>');
let style = readFileSync(S + '/body.html', 'utf8');
style = style.slice(0, style.indexOf('</style></head>')).split('\n').filter(l => !l.includes('on-navy .point')).join('\n');
const extra = readFileSync(W + '/extra.css', 'utf8');
const body = readFileSync(W + '/sections.html', 'utf8').replace(/\{\{IMG:([\w-]+)\}\}/g, (_, n) => 'data:image/jpeg;base64,' + readFileSync(`${W}/${n}.jpg`).toString('base64'));
writeFileSync(out, head + style + '\n' + extra + '</style></head>\n' + body);
