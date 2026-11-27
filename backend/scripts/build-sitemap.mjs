#!/usr/bin/env node
/* ============================================================
   한끗 — sitemap.xml 생성 (검색엔진 색인용)
   backend/data/trends.json 을 읽어 frontend/sitemap.xml 을 쓴다.
   refresh.mjs 가 trends.js 를 만들 때마다 함께 호출하므로 사람이 따로 돌릴 필요 없다.
   단독 실행: node backend/scripts/build-sitemap.mjs   (레포 루트에서)
   ============================================================ */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

export const SITE_URL = 'https://az2mz.vercel.app';
const CATEGORIES = ['맛집', '디저트', '카페·핫플', '신조어', '노래·챌린지', '패션', 'AI 프롬프트'];

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const jsonPath = join(repoRoot, 'backend', 'data', 'trends.json');
const outPath = join(repoRoot, 'frontend', 'sitemap.xml');

const xmlEsc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || '');

export function buildSitemap(data) {
  const trends = data.trends || [];
  const latest = (list) => list.map((t) => t.analyzedAt || t.collectedAt).filter(isDate).sort().pop() || data.generatedAt;
  const urls = [
    { loc: '/', lastmod: data.generatedAt },
    { loc: '/list.html?type=ad', lastmod: latest(trends.filter((t) => t.type === '신뢰분석')) },
    { loc: '/list.html?type=trend', lastmod: latest(trends.filter((t) => t.type === '트렌드')) },
    ...CATEGORIES
      .filter((c) => trends.some((t) => t.type === '트렌드' && t.cat === c))
      .map((c) => ({ loc: `/list.html?type=trend&cat=${encodeURIComponent(c)}`, lastmod: latest(trends.filter((t) => t.type === '트렌드' && t.cat === c)) })),
    { loc: '/dictionary.html', lastmod: latest(trends.filter((t) => t.cat === '신조어')) },
    { loc: '/pulse.html' },
    ...trends.map((t) => ({ loc: `/trend.html?id=${encodeURIComponent(t.id)}`, lastmod: t.analyzedAt || t.collectedAt })),
  ];
  const body = urls.map(({ loc, lastmod }) =>
    `  <url><loc>${xmlEsc(SITE_URL + loc)}</loc>${isDate(lastmod) ? `<lastmod>${lastmod}</lastmod>` : ''}</url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

export async function writeSitemap(data) {
  const xml = buildSitemap(data);
  await writeFile(outPath, xml, 'utf8');
  return (xml.match(/<url>/g) || []).length;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const data = JSON.parse(await readFile(jsonPath, 'utf8'));
  console.log(`✓ sitemap: ${await writeSitemap(data)} urls → frontend/sitemap.xml`);
}
