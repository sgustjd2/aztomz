#!/usr/bin/env node
/* ============================================================
   한끗 — 상세 정적 페이지 생성 (검색엔진용, 특히 JS를 잘 실행하지 않는 네이버)
   frontend/trend.html 을 틀로 삼아 항목마다 frontend/trend/<id>.html 을 쓴다.
   · <head>: 항목별 title·description·canonical·OG·JSON-LD(Article+BreadcrumbList)
   · <main>: 제목·뜻·점수·판단·본문·판매처·추천·출처·관련 항목을 미리 채운 HTML(JS 없이 읽힘)
   · 브라우저에서는 기존 trend.html 스크립트가 그대로 돌아 화면을 다시 그린다(HG_TREND_ID 로 항목 지정)
   refresh.mjs 가 trends.js 를 만들 때마다 함께 호출한다. 데이터에서 빠진 항목의 페이지는 지운다.
   단독 실행: node backend/scripts/build-static-pages.mjs   (레포 루트에서)
   ============================================================ */
import { readFile, writeFile, mkdir, readdir, unlink } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { SITE_URL } from './build-sitemap.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const jsonPath = join(repoRoot, 'backend', 'data', 'trends.json');
const templatePath = join(repoRoot, 'frontend', 'trend.html');
const outDir = join(repoRoot, 'frontend', 'trend');

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const trunc = (s, n) => { s = String(s || '').trim().replace(/\s+/g, ' '); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
const fmt = (iso) => (iso ? String(iso).replace(/-/g, '.') : '');
const SAT = { pos: '긍정', neg: '부정', mix: '혼재', none: '판단 불가' };
export const isSafeId = (id) => /^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(id || '');
export const staticPath = (id) => `trend/${encodeURIComponent(id)}.html`;
const summary = (t) => t.excerpt || t.def || t.stageMsg || t.verdict || t.pull || '';
const lines = (v) => [].concat(v ?? []).flat(Infinity).filter((x) => typeof x === 'string' && x.trim());

// trend.html applySeo() 와 같은 규칙(브라우저에서 다시 그릴 때도 같은 값이 된다)
export function seoFor(t) {
  const title = t.type === '신뢰분석'
    ? `${t.title} 광고일까 진짜일까? 후기 분석 | 한끗`
    : t.cat === '신조어'
      ? `${t.title} 뜻${t.example ? '·예문' : ''} — MZ 사전 | 한끗`
      : `${t.title} — 요즘 ${t.cat} 트렌드 | 한끗`;
  const lead = t.type === '신뢰분석'
    ? `광고 의심도 ${t.ad}·후기 신뢰도 ${t.trust}(추정치). `
    : (t.stage ? `유행 단계: ${t.stage}. ` : '');
  const description = trunc(lead + (t.def || trunc(summary(t), 150)), 155);
  const im = t.video && t.video.youtube ? `https://i.ytimg.com/vi/${t.video.youtube}/hqdefault.jpg`
    : (t.images && t.images[0] ? (typeof t.images[0] === 'string' ? t.images[0] : t.images[0].u) : '');
  const image = im && (/^assets\//.test(im) || im.includes('i.ytimg.com')) ? (/^https?:/.test(im) ? im : `${SITE_URL}/${im}`) : `${SITE_URL}/og.png`;
  return { title, description, image, url: `${SITE_URL}/${staticPath(t.id)}` };
}

function jsonLd(t, s) {
  const org = { '@type': 'Organization', name: '한끗', url: SITE_URL + '/' };
  const crumb2 = t.type === '신뢰분석'
    ? { '@type': 'ListItem', position: 2, name: '광고일까 진짜일까', item: `${SITE_URL}/list.html?type=ad` }
    : { '@type': 'ListItem', position: 2, name: t.cat, item: `${SITE_URL}/list.html?type=trend&cat=${encodeURIComponent(t.cat)}` };
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'Article', headline: t.title, description: s.description, image: s.image, inLanguage: 'ko-KR',
        articleSection: t.cat, keywords: (t.tags || []).join(', '),
        datePublished: t.collectedAt || t.analyzedAt, dateModified: t.analyzedAt || t.collectedAt,
        author: org, publisher: org, mainEntityOfPage: s.url },
      { '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: '홈', item: SITE_URL + '/' }, crumb2,
        { '@type': 'ListItem', position: 3, name: t.title, item: s.url }] },
    ],
  }).replace(/</g, '\\u003c');
}

// JS 없이 읽히는 본문. 브라우저에서는 trend.html 스크립트가 #main 을 통째로 다시 그린다.
function bodyHTML(t, all) {
  const out = [];
  const listHref = t.type === '신뢰분석' ? 'list.html?type=ad' : `list.html?type=trend&amp;cat=${encodeURIComponent(t.cat)}`;
  out.push(`<header class="detail-header"><div class="crumb"><a href="index.html">홈</a> <span aria-hidden="true">/</span> <a href="${listHref}">${t.type === '신뢰분석' ? '광고일까 진짜일까' : esc(t.cat)}</a></div>`);
  out.push(`<div class="detail-title-group"><div class="d-head"><span class="kicker">${esc(t.cat)}${t.buzz ? ` · ${esc(t.buzz)}` : ''}</span></div>`);
  out.push(`<h1 class="d-title">${esc(t.title)}</h1>`);
  if (t.def) out.push(`<p class="d-def">${esc(t.def)}</p>`);
  const dates = [t.collectedAt && `수집 ${fmt(t.collectedAt)}`, t.analyzedAt && `분석 ${fmt(t.analyzedAt)}`].filter(Boolean).join(' · ');
  out.push(`<p class="freshline">${t.label ? `${esc(t.label)} · ` : ''}${dates}</p>`);
  if ((t.tags || []).length) out.push(`<p class="tags">${t.tags.map((g) => `<a class="tag-chip" href="index.html?tag=${encodeURIComponent(g)}">#${esc(g)}</a>`).join(' ')}</p>`);
  out.push('</div></header>');
  if (t.type === '신뢰분석') {
    out.push('<section id="judgment"><h2>한끗 판단</h2>');
    out.push(`<p>광고 의심도 <b>${esc(t.ad)}</b>/100 · 실제 후기 신뢰도 <b>${esc(t.trust)}</b>/100 · 만족도 ${esc(SAT[t.sat] || '판단 불가')} — 점수는 공개 정보 기반 추정치이며 확정 판정이 아닙니다.</p>`);
    const R = t.reasons || {};
    if (lines(R.ad).length) out.push(`<p><b>광고 의심도 근거</b> ${esc(lines(R.ad).join(' '))}</p>`);
    if (lines(R.trust).length) out.push(`<p><b>후기 신뢰도 근거</b> ${esc(lines(R.trust).join(' '))}</p>`);
    if (t.satTxt || lines(R.sat).length) out.push(`<p><b>만족도</b> ${esc([t.satTxt, ...lines(R.sat)].filter(Boolean).join(' '))}</p>`);
    if (t.verdict) out.push(`<p class="verdict">${esc(t.verdict)}</p>`);
    out.push('</section>');
  } else {
    if (t.stage) out.push(`<p><b>유행 단계</b> ${esc(t.stage)}${t.stageMsg ? ` — ${esc(t.stageMsg)}` : ''}</p>`);
    if (t.verdict) out.push(`<p class="verdict">${esc(t.verdict)}</p>`);
  }
  if (t.excerpt) out.push(`<p>${esc(t.excerpt)}</p>`);
  if (t.pull) out.push(`<blockquote class="pull">${esc(t.pull)}</blockquote>`);
  if (t.example) out.push(`<p><b>이렇게 써요</b> “${esc(t.example)}”</p>`);
  if (t.pureKorean) out.push(`<p><b>예쁜 우리말로 바꾼다면</b> ${esc(t.pureKorean)}</p>`);
  if (t.prompt) out.push(`<section id="prompt"><h2>프롬프트</h2><pre>${esc(t.prompt)}</pre></section>`);
  if ((t.article || []).length) {
    out.push('<section class="article" id="story"><h2>자세히 읽기</h2>');
    for (const b of t.article) {
      if (!Array.isArray(b)) continue;
      if (b[0] === 'h') out.push(`<h3>${esc(b[1])}</h3>`);
      else if (b[0] === 'p') out.push(`<p>${esc(b[1])}</p>`);
      else if (b[0] === 'q') out.push(`<blockquote>${esc(b[1])}</blockquote>`);
      else if (b[0] === 'ul') out.push(`<ul>${[].concat(b[1]).map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`);
    }
    out.push('</section>');
  }
  if ((t.shops || []).length) {
    out.push('<section id="places"><h2>어디서 사 먹지?</h2><ul>');
    for (const s of t.shops) out.push(`<li><b>${esc(s.name)}</b>${s.area ? ` — ${esc(s.area)}` : ''}${s.rep ? ` · ${esc(s.rep)}` : ''}${s.note ? `<br>${esc(s.note)}` : ''}</li>`);
    out.push('</ul><p>메뉴·가격·영업은 방문 전 다시 확인하세요.</p></section>');
  }
  if ((t.recs || []).length) {
    out.push('<section id="recommendations"><h2>이런 분께</h2><ul>');
    for (const r of t.recs) out.push(`<li>${esc(r[0])} — ${esc(r[1])}</li>`);
    out.push('</ul></section>');
  }
  if ((t.src || []).length) {
    out.push(`<section id="sources"><h2>참고 출처 ${t.src.length}개</h2><ul>`);
    for (const [name, url] of t.src) if (/^https?:\/\//.test(url || '')) out.push(`<li><a href="${esc(url)}" target="_blank" rel="noopener nofollow">${esc(name)}</a></li>`);
    out.push('</ul></section>');
  }
  const related = all.filter((x) => x.id !== t.id && x.cat === t.cat && isSafeId(x.id)).slice(0, 6);
  if (related.length) {
    out.push(`<section><h2>${t.cat === '신조어' ? '관련 사전 항목' : '함께 보기'}</h2><ul>`);
    for (const x of related) out.push(`<li><a href="${staticPath(x.id)}">${esc(x.title)}</a></li>`);
    out.push('</ul></section>');
  }
  out.push('<p class="disc footer-disclaimer">점수는 공개 정보 기반 <b>추정치</b>이며 확정 판정이 아닙니다.</p>');
  return out.join('\n');
}

function setMeta(html, attr, key, value) {
  const re = new RegExp(`<meta ${attr}="${key}" content="[^"]*" />`);
  if (re.test(html)) return html.replace(re, `<meta ${attr}="${key}" content="${esc(value)}" />`);
  return html.replace('</head>', `<meta ${attr}="${key}" content="${esc(value)}" />\n</head>`);
}

export function pageHTML(template, t, all) {
  const s = seoFor(t);
  let h = template;
  const must = (needle) => { if (!h.includes(needle)) throw new Error(`trend.html 틀에서 '${needle}'을 찾지 못함`); };
  must('<meta charset="UTF-8" />'); must('<main id="main" tabindex="-1"></main>'); must('</head>');
  h = h.replace('<meta charset="UTF-8" />', '<meta charset="UTF-8" />\n<base href="/" />');   // 상대 경로(assets/·data/·list.html…)를 사이트 루트 기준으로
  h = h.replace(/<title>[^<]*<\/title>/, `<title>${esc(s.title)}</title>`);
  h = setMeta(h, 'name', 'description', s.description);
  h = setMeta(h, 'property', 'og:title', s.title);
  h = setMeta(h, 'property', 'og:description', s.description);
  h = setMeta(h, 'property', 'og:type', 'article');
  h = setMeta(h, 'property', 'og:image', s.image);
  h = setMeta(h, 'property', 'og:url', s.url);
  h = setMeta(h, 'name', 'twitter:title', s.title);
  h = setMeta(h, 'name', 'twitter:description', s.description);
  h = setMeta(h, 'name', 'twitter:image', s.image);
  h = h.replace('</head>', `<link rel="canonical" href="${esc(s.url)}" />\n<script type="application/ld+json" data-seo-ld>${jsonLd(t, s)}</script>\n<script>window.HG_TREND_ID=${JSON.stringify(t.id)};</script>\n</head>`);
  h = h.replace('<main id="main" tabindex="-1"></main>', `<main id="main" tabindex="-1">\n${bodyHTML(t, all)}\n</main>`);
  // 안내 주석은 DOCTYPE 뒤에(앞에 두면 일부 브라우저가 호환 모드로 그린다)
  return h.replace(/^<!DOCTYPE html>\n/i, '<!DOCTYPE html>\n<!-- AUTO-GENERATED by backend/scripts/build-static-pages.mjs — 편집 금지. 틀: frontend/trend.html, 원본: backend/data/trends.json -->\n');
}

export async function writeStaticPages(data, template) {
  template = template ?? await readFile(templatePath, 'utf8');
  const all = (data.trends || []).filter((t) => isSafeId(t.id));
  await mkdir(outDir, { recursive: true });
  const keep = new Set();
  let written = 0;
  for (const t of all) {
    const name = `${t.id}.html`;
    keep.add(name);
    const html = pageHTML(template, t, all);
    const path = join(outDir, name);
    const prev = await readFile(path, 'utf8').catch(() => null);
    if (prev !== html) { await writeFile(path, html, 'utf8'); written++; }
  }
  let removed = 0;
  for (const f of await readdir(outDir)) if (f.endsWith('.html') && !keep.has(f)) { await unlink(join(outDir, f)); removed++; }
  return { pages: all.length, written, removed, skipped: (data.trends || []).length - all.length };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const data = JSON.parse(await readFile(jsonPath, 'utf8'));
  const r = await writeStaticPages(data);
  console.log(`✓ static pages: ${r.pages}개 (새로 씀 ${r.written}, 지움 ${r.removed}${r.skipped ? `, id 형식 문제로 건너뜀 ${r.skipped}` : ''}) → frontend/trend/`);
}
