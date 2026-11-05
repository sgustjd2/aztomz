// 한끗 MVP 결과 슬라이드(4판, 한끗 제품 디자인) 자동 점검 — classroom 제출 규칙 + 디자인 규칙 + 가독성
// 실행: node docs/midterm/w9/deck/check.mjs [--shots=<폴더>]   (실패가 있으면 exit 1)
// 정적: 파일 크기 · 이미지 크기 · 저장소 API · 링크 target · 키 패턴 · <title> · 이모지 · 느낌표 · blur · 그라디언트
// 렌더(1280x720 · 1920x1080 · 1100x620): 장 수 · 각 장 높이 == 뷰포트 · 장 시작 위치 == n*뷰포트 · 장 번호 "n / N" ·
//   가로 스크롤 0 · 장/하단 줄 침범 0 · 하단 줄 잘림 0 · 색은 frontend/assets/styles.css :root 값만 · 알약·그림자·이탤릭·고정폭·세리프 없음 · 글자 크기·줄간격
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const fileArg = process.argv.find(a => a.startsWith('--file='));
const FILE = path.join(HERE, fileArg ? fileArg.slice(7) : 'hangeut-mvp-result.html');
const EXPECT_N = (fs.readFileSync(FILE, 'utf8').match(/<section class="slide"/g) || []).length;
const TITLE = '한끗 MVP 구현 결과 · 02반 민현성';
const require = createRequire(path.resolve(HERE, '../../../../backend/package.json'));
const { chromium } = require('playwright');
const shotsArg = process.argv.find(a => a.startsWith('--shots='));
const SHOTS = shotsArg ? shotsArg.slice(8) : null;

const fails = [];
const ok = (cond, msg) => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${msg}`); if (!cond) fails.push(msg); };

// 허용 색 = 한끗 제품 디자인 토큰(frontend/assets/styles.css 첫 :root)의 색 값(+ 투명)
const tokens = fs.readFileSync(path.resolve(HERE, '../../../../frontend/assets/styles.css'), 'utf8').match(/:root\s*\{[\s\S]*?\}/)[0];
const norm = (r, g, b, a = 1) => `${+r},${+g},${+b},${Math.round(+a * 100) / 100}`;
const allowed = new Set(['0,0,0,0']);
for (let [, h] of tokens.matchAll(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g)) {
  if (h.length === 3) h = [...h].map(c => c + c).join('');
  allowed.add(norm(...[0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16))));
}
for (const [, r, g, b, a] of tokens.matchAll(/rgba\(\s*(\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/g)) allowed.add(norm(r, g, b, a));

const html = fs.readFileSync(FILE, 'utf8');
const bytes = fs.statSync(FILE).size;
ok(bytes <= 10 * 1024 * 1024, `파일 크기 ${(bytes / 1024).toFixed(0)}KB ≤ 10MB`);
const imgs = [...html.matchAll(/data:image\/(?!gif)\w+;base64,([A-Za-z0-9+/=]+)/g)].map(m => Math.floor(m[1].length * 3 / 4));
const gifs = [...html.matchAll(/data:image\/gif;base64,([A-Za-z0-9+/=]+)/g)].map(m => Math.floor(m[1].length * 3 / 4));
ok(gifs.every(n => n <= 2 * 1024 * 1024), `움직이는 그림(GIF) ${gifs.length}개 모두 ≤ 2MB`);
ok(imgs.every(n => n <= 250 * 1024), `내장 이미지 ${imgs.length}개 모두 ≤ 250KB (최대 ${Math.max(0, ...imgs) / 1024 | 0}KB)`);
ok(bytes <= 4 * 1024 * 1024, `파일 크기 목표 ≤ 4MB`);
ok(!/localStorage|sessionStorage|document\.cookie/.test(html), 'localStorage·sessionStorage·cookie 사용 없음');
const anchors = [...html.matchAll(/<a\b[^>]*>/g)].map(m => m[0]);
const bad = anchors.filter(a => !/target="_blank"/.test(a) || !/rel="[^"]*noopener/.test(a));
ok(bad.length === 0, `링크 ${anchors.length}개 모두 target="_blank" rel="noopener"${bad.length ? ' — 위반: ' + bad.join(' ') : ''}`);
ok(!/#VIDEO_URL/.test(html), '영상 링크 자리(#VIDEO_URL) 남지 않음');
const text = html.replace(/data:[^"')]+/g, '');
const keyRe = /(sk-[A-Za-z0-9_-]{20,}|AIza[0-9A-Za-z_-]{35}|ghp_[A-Za-z0-9]{36}|github_pat_\w{20,}|xox[bap]-[\w-]{10,}|-----BEGIN [A-Z ]*PRIVATE KEY|(api[_-]?key|token|secret|password)\s*[:=]\s*["'][^"']{8,})/i;
ok(!keyRe.test(text), '키·토큰·비밀번호 패턴 없음');
ok(text.includes(`<title>${TITLE}</title>`), `<title> = "${TITLE}"`);
// 터미널 블록(pre.term)은 로그 원문 그대로라 기호가 섞일 수 있음 — 그 밖의 글에만 이모지·문장형 '~다.' 금지
const prose = text.replace(/<style[\s\S]*?<\/style>/g, '').replace(/<pre class="term">[\s\S]*?<\/pre>/g, '').replace(/<[^>]+>/g, ' ');
ok(!/\p{Extended_Pictographic}/u.test(prose), '이모지 0개 (터미널 출력 제외)');
const sentences = prose.match(/[가-힣]+다\.(?=\s|$)/g) || [];
ok(sentences.length === 0, `문장형 '~다.' 0개 — 개조식${sentences.length ? ' — ' + sentences.join(', ') : ''}`);
// 터미널 블록의 줄은 evidence 로그·git 기록에 그대로 있어야 함(요약·수정 금지)
const { execSync } = await import('child_process');
const EV = path.resolve(HERE, '../evidence');
const EV2 = path.join(HERE, 'evidence-1102'); // 11/2 에 새로 잰 근거 로그
const corpus = fs.readdirSync(EV).filter(f => f.endsWith('.log')).map(f => fs.readFileSync(path.join(EV, f), 'utf8')).join('\n')
  + '\n' + (fs.existsSync(EV2) ? fs.readdirSync(EV2).filter(f => f.endsWith('.log')).map(f => fs.readFileSync(path.join(EV2, f), 'utf8')).join('\n') : '')
  + '\n' + execSync('git log --all --oneline', { cwd: HERE, encoding: 'utf8', maxBuffer: 64 << 20 })
  // Hermes 원본 파일(성격 SOUL.md · 스킬 SKILL.md) — 발췌는 줄의 일부이고 굵게 표시(**)만 뺀 것
  + '\n' + ['SOUL.md', ...['restage','collect','source','approve'].map(n => 'skills/hangeut/hangeut-' + n + '/SKILL.md')].map(f => { try { return fs.readFileSync(path.join('E:/workspace/side_project/hermes', f), 'utf8').replace(/\*\*/g, ''); } catch { return ''; } }).join('\n');
const decode = s => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const termLines = [...text.matchAll(/<pre class="term">(?:<span class="f">[^<]*<\/span>)?([\s\S]*?)<\/pre>/g)].flatMap(m => decode(m[1]).split('\n')).filter(Boolean);
const notFound = termLines.filter(l => !corpus.includes(l));
ok(termLines.length > 0 && notFound.length === 0, `터미널 출력 ${termLines.length}줄 모두 원본 로그·git 기록과 일치${notFound.length ? ' — 없음: ' + notFound.join(' | ') : ''}`);
ok(!/backdrop-filter|filter:\s*blur/.test(text), 'backdrop-filter·blur 없음');
ok(!/(linear|radial|conic)-gradient/.test(text), '그라디언트 없음');
const srcRefs = [...text.matchAll(/(?:src|href)="([^"#][^"]*)"/g)].map(m => m[1]).filter(u => !/^(https:|data:)/.test(u));
ok(srcRefs.length === 0, `외부 로컬 파일 참조 없음${srcRefs.length ? ' — ' + srcRefs.join(', ') : ''}`);

const browser = await chromium.launch();
for (const [w, h] of [[1280, 720], [1920, 1080], [1100, 620]]) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.goto('file:///' + FILE.replace(/\\/g, '/'), { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const r = await page.evaluate(() => {
    const secs = [...document.querySelectorAll('body > section')];
    const vw = document.documentElement.clientWidth, vh = innerHeight;
    const rgb = s => { const m = s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[\s,/]+/).filter(Boolean); return `${+p[0]},${+p[1]},${+p[2]},${Math.round((p[3] === undefined ? 1 : +p[3]) * 100) / 100}`; };
    const colors = new Map(), radius = [], fontBad = [], sizeBad = [];
    for (const e of document.body.querySelectorAll('*')) {
      if (e.tagName === 'SCRIPT' || e.tagName === 'IMG') continue;
      const cs = getComputedStyle(e);
      for (const p of ['color', 'backgroundColor', 'borderTopColor', 'borderBottomColor', 'borderLeftColor', 'borderRightColor']) {
        const c = rgb(cs[p]); if (c && !colors.has(c)) colors.set(c, `${e.tagName.toLowerCase()}.${e.className || ''} ${p}`);
      }
      // 알약 금지: 모서리가 상자 높이의 절반에 가까우면 알약 · 그림자 금지
      const rad = parseFloat(cs.borderTopLeftRadius), bh = e.getBoundingClientRect().height;
      if (rad > 12 || (bh && rad >= bh / 2 - 1 && rad > 0)) radius.push(`${e.tagName.toLowerCase()}.${e.className} ${cs.borderTopLeftRadius}`);
      if (cs.boxShadow !== 'none') radius.push(`그림자 ${e.tagName.toLowerCase()}.${e.className}`);
      const own = [...e.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join('');
      if (!own) continue;
      const fs = parseFloat(cs.fontSize), first = cs.fontFamily.split(',')[0].replace(/["']/g, '').trim();
      // 한끗 제품 글꼴(Pretendard)만 — 세리프·고정폭·이탤릭 없음
      if ((!/^Pretendard/.test(first) && !e.closest('pre.term')) || cs.fontStyle !== 'normal') fontBad.push(`${e.tagName.toLowerCase()}.${e.className} "${own.slice(0, 16)}" ${first} ${cs.fontStyle}`);
      const sentence = /[가-힣]/.test(own) && own.length >= 12 && !/kicker|meta-line|src|st|btn|col-label|ev2|fn/.test(e.className) && e.tagName !== 'TH';
      if (fs < 18) sizeBad.push(`${e.tagName.toLowerCase()}.${e.className} ${fs}px "${own.slice(0, 12)}"`);
      if (fs < 40 && cs.fontWeight < 600 && parseFloat(cs.lineHeight) / fs < 1.49) sizeBad.push(`줄간격 ${e.tagName.toLowerCase()}.${e.className} ${(parseFloat(cs.lineHeight) / fs).toFixed(2)}`);
      if (sentence && cs.fontWeight < 600 && fs < 26 && !e.closest('.crit,.page > .meta-line,figcaption.src,pre.term')) sizeBad.push(`본문<26 ${e.tagName.toLowerCase()}.${e.className} ${fs}px "${own.slice(0, 12)}"`);
    }
    const titles = [...document.querySelectorAll('.h')].map(e => parseFloat(getComputedStyle(e).fontSize));
    return {
      n: secs.length, vw, vh, hScroll: document.documentElement.scrollWidth - vw,
      colors: [...colors].filter(([c]) => !window.__allowed?.has(c)), radius, fontBad, sizeBad, titles,
      body: getComputedStyle(document.querySelector('.body, .small, .item span')).fontFamily,
      bg: rgb(getComputedStyle(document.querySelector('.slide')).backgroundColor),
      secs: secs.map((s, i) => {
        const b = s.getBoundingClientRect(), top = b.top + scrollY;
        const no = s.querySelector('.pageno')?.textContent.trim() || '';
        const meta = s.querySelector('.meta-line'), mb = meta?.getBoundingClientRect();
        const metaCut = meta ? meta.scrollWidth > meta.clientWidth + 1 : false;
        const pg = s.querySelector('.page');
        const over = [...pg.querySelectorAll('*')].filter(e => {
          const eb = e.getBoundingClientRect(); if (!eb.width || !eb.height) return false;
          const outSec = eb.right > b.right + 1 || eb.left < b.left - 1 || eb.bottom > b.bottom + 1 || eb.top < b.top - 1;
          const onMeta = mb && !e.closest('.meta-line') && !e.classList.contains('corner') && !e.classList.contains('pageno') && !e.classList.contains('keymark') && e.parentElement === pg && eb.bottom > mb.top - 2;
          // 하단 선(장 아래 100/1080) 아래로 내려간 본문 글자 — 로그 펼침 상자·장 번호·진행 막대·표지 정보 바 제외
          const pb = pg.getBoundingClientRect(), lineY = pb.bottom - pb.height * 100 / 1080;
          const own = [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
          const belowLine = own && !e.closest('.logbox,.pageno,.keymark,.info,details') && eb.bottom > lineY + 2;
          return outSec || onMeta || belowLine;
        }).map(e => e.tagName.toLowerCase() + '.' + String(e.className).split(' ')[0]);
        return { i: i + 1, top: Math.round(top), h: b.height, w: b.width, no, metaCut, over: over.slice(0, 5) };
      }),
    };
  });
  const badColors = r.colors.filter(([c]) => !allowed.has(c));
  const tag = `[${w}x${h}]`;
  ok(r.n === EXPECT_N, `${tag} section ${r.n}장 (${EXPECT_N})`);
  ok(r.hScroll <= 0, `${tag} 가로 스크롤 0 (${r.hScroll})`);
  for (const s of r.secs) {
    ok(Math.abs(s.h - r.vh) <= 1 && Math.abs(s.w - r.vw) <= 1, `${tag} ${s.i}장 크기 ${s.w.toFixed(1)}x${s.h.toFixed(1)} == 뷰포트 ${r.vw}x${r.vh}`);
    ok(Math.abs(s.top - (s.i - 1) * r.vh) <= 1, `${tag} ${s.i}장 시작 ${s.top} == ${(s.i - 1) * r.vh}`);
    ok(s.no === `${s.i} / ${r.n}`, `${tag} ${s.i}장 장 번호 "${s.no}"`);
    ok(s.over.length === 0, `${tag} ${s.i}장 넘침·하단 줄 침범 0${s.over.length ? ' — ' + s.over.join(', ') : ''}`);
    ok(!s.metaCut, `${tag} ${s.i}장 하단 근거 줄 잘림 없음`);
  }
  if (w === 1920) {
    ok(badColors.length === 0, `색은 styles.css 토큰 값만${badColors.length ? ' — ' + badColors.map(([c, where]) => `rgba(${c}) @ ${where}`).join(' | ') : ''}`);
    ok(r.radius.length === 0, `알약 모서리·그림자 없음 (모서리 ≤ 12px)${r.radius.length ? ' — ' + r.radius.slice(0, 3).join(', ') : ''}`);
    ok(/^Pretendard/.test(r.body.split(',')[0].replace(/["']/g, '')), `본문 글꼴 Pretendard (${r.body.split(',')[0]})`);
    ok(r.fontBad.length === 0, `모든 글자 Pretendard · 이탤릭 없음${r.fontBad.length ? ' — ' + r.fontBad.slice(0, 4).join(' | ') : ''}`);
    ok(r.bg === '255,255,255,1', `바탕 흰색(--paper) — 크림·오프화이트 아님 (${r.bg})`);
    ok(r.titles.every(t => t >= 56), `장 제목 ≥ 56px (${Math.min(...r.titles)}px)`);
    ok(r.sizeBad.length === 0, `글자 ≥ 18px · 본문 ≥ 26px · 줄간격 ≥ 1.5${r.sizeBad.length ? ' — ' + r.sizeBad.slice(0, 5).join(' | ') : ''}`);
  }
  // --strict1280: 1280px에서 글자 18px 미만 0개(접힌 로그 펼친 상태 포함) — v10 발표본 기준
  if (w === 1280 && process.argv.includes('--strict1280')) {
    const small = await page.evaluate(() => {
      document.querySelectorAll('details').forEach(d => { d.open = true; });
      const out = [];
      for (const e of document.body.querySelectorAll('*')) {
        if (e.tagName === 'SCRIPT' || !e.getClientRects().length) continue;
        if (![...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) continue;
        const px = parseFloat(getComputedStyle(e).fontSize);
        if (px < 17.95) out.push(`${e.tagName.toLowerCase()}.${e.className} ${px.toFixed(1)}px`);
      }
      document.querySelectorAll('details').forEach(d => { d.open = false; });
      return out;
    });
    ok(small.length === 0, `1280px 글자 18px 미만 0개 (${small.length}개${small.length ? ' — ' + [...new Set(small)].slice(0, 6).join(' | ') : ''})`);
  }
  if (SHOTS) {
    fs.mkdirSync(SHOTS, { recursive: true });
    for (let i = 0; i < r.n; i++) {
      await page.evaluate(y => window.scrollTo(0, y), i * r.vh);
      await page.screenshot({ path: path.join(SHOTS, `${w}-${String(i + 1).padStart(2, '0')}.png`) });
    }
  }
  await page.close();
}
await browser.close();
console.log(fails.length ? `\n실패 ${fails.length}건` : '\n모두 통과');
process.exitCode = fails.length ? 1 : 0;
