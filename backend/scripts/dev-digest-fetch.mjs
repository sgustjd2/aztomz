#!/usr/bin/env node
/* ============================================================
   개발·IT 다이제스트 — 여러 개발 소스에서 최근 글/뉴스 후보 수집
   (결정적 · LLM 없음)

   소스(사용자 요청 2026-08-21):
     · geeknews   — GeekNews(news.hada.io) Atom 피드. AI 관련 항목 플래그.
     · inpa       — inpa.tistory.com RSS. 어제~오늘 작성분만.
     · goddaehee  — goddaehee.tistory.com RSS. 어제~오늘 작성분만.
     · github     — GitHub 주간 급상승 중 스킬/플러그인/확장 성격 레포(dev-trending 과 중복은 조사 단계에서 거른다).

   막힌 소스는 여기 없음(설계 결정 2026-08-21):
     · Threads @choi.openai — Meta ToS. 자동 스크래핑 금지(CLAUDE.md 철칙). AI 이슈는
       조사 단계에서 Claude Code WebSearch 로 공식/뉴스 출처에서 확보한다.
     · Yozm Wishket — Next.js SPA(RSS 없음). 자동 수집 제외, 인터랙티브 실행 때만 WebFetch 참고.

   실행:
     node backend/scripts/dev-digest-fetch.mjs               # 전체 소스 → 통합 파일 1개
     node backend/scripts/dev-digest-fetch.mjs --source=geeknews
     node backend/scripts/dev-digest-fetch.mjs --days=2      # 블로그 '최근' 창(기본 2일)
     node backend/scripts/dev-digest-fetch.mjs --selftest
   ============================================================ */
import { writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const outDir = join(repoRoot, 'backend', 'blog', 'research', 'dev-digest');

const argv = process.argv.slice(2);
const has = (f) => argv.includes(`--${f}`);
const flag = (n) => (argv.find((a) => a.startsWith(`--${n}=`)) || '').split('=').slice(1).join('=');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const DAY_MS = 86400000;

const AI_KW = /\b(ai|llm|gpt|claude|gemini|llama|qwen|모델|생성형|딥러닝|머신러닝|에이전트|agent|rag|vlm|트랜스포머|transformer|openai|anthropic|hugging\s?face|추론|inference)\b/i;

function decodeEntities(s) {
  return String(s || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
function tag(block, name) {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i'));
  return m ? decodeEntities(m[1]) : '';
}
/* Atom <link href="..."/> 또는 RSS <link>...</link> 둘 다 처리 */
function linkOf(block) {
  const href = block.match(/<link[^>]*\shref="([^"]+)"/i);
  if (href) return href[1];
  const txt = block.match(/<link>([\s\S]*?)<\/link>/i);
  return txt ? decodeEntities(txt[1]) : '';
}
function dateOf(block) {
  const raw = tag(block, 'pubDate') || tag(block, 'updated') || tag(block, 'published') || tag(block, 'dc:date');
  const d = raw ? new Date(raw) : null;
  return d && !isNaN(d) ? d : null;
}

/* RSS <item> · Atom <entry> 공통 파서 */
export function parseFeed(xml) {
  const isAtom = /<entry[\s>]/.test(xml);
  const splitter = isAtom ? '<entry' : '<item';
  const closer = isAtom ? '</entry>' : '</item>';
  const parts = xml.split(splitter).slice(1);
  const items = [];
  for (const raw of parts) {
    const block = raw.split(closer)[0];
    const title = tag(block, 'title');
    if (!title) continue;
    items.push({ title, url: linkOf(block), date: dateOf(block) });
  }
  return items;
}

async function fetchFeed(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${url}`);
  return parseFeed(await res.text());
}

/* ── GeekNews: 최근 항목 + AI 플래그 ─────────────────────────── */
async function fetchGeeknews(days) {
  const url = 'https://news.hada.io/rss/news';
  const cutoff = new Date(Date.now() - days * DAY_MS);
  const all = await fetchFeed(url);
  const recent = all.filter((x) => !x.date || x.date >= cutoff);
  const items = recent.map((x) => ({
    title: x.title, url: x.url,
    date: x.date ? x.date.toISOString() : null,
    aiRelated: AI_KW.test(x.title),
  }));
  return {
    source: 'geeknews', fetchedOk: true, sourceUrl: url, items,
    note: `GeekNews Atom 피드에서 최근 ${days}일 항목. aiRelated=true 는 제목 키워드 기준(본문은 조사 단계에서 확인).`,
  };
}

/* ── tistory 블로그: 어제~오늘(days 창) 작성분만 ────────────────── */
async function fetchTistory(sourceName, url, days) {
  const cutoff = new Date(Date.now() - days * DAY_MS);
  const all = await fetchFeed(url);
  const recent = all.filter((x) => x.date && x.date >= cutoff);
  const items = recent.map((x) => ({ title: x.title, url: x.url, date: x.date.toISOString() }));
  return {
    source: sourceName, fetchedOk: true, sourceUrl: url, items,
    note: `최근 ${days}일 이내 작성된 글만. 날짜 없는 항목은 제외. 0건이면 어제·오늘 새 글이 없다는 뜻.`,
  };
}

/* ── GitHub 주간 급상승 중 스킬/플러그인/확장 성격만 ───────────── */
/* dev-trending-fetch.mjs 를 import 하지 않는다 — 그 모듈은 top-level 에서 main() 을
   실행하며 --source 없으면 process.exit(1) 한다(import 만 해도 프로세스가 죽는다).
   그래서 파서는 여기 독립적으로 둔다(같은 정규식). */
function parseGithubRepos(html, limit) {
  const repos = [];
  const blocks = html.split('<article class="Box-row">').slice(1, limit + 1);
  for (const raw of blocks) {
    const b = raw.split('</article>')[0];
    const nameM = b.match(/href="\/([\w.-]+)\/([\w.-]+)"[^>]*class="Link"/);
    if (!nameM) continue;
    const descM = b.match(/<p class="col-9[^"]*">([\s\S]*?)<\/p>/);
    const starsWeekM = b.match(/([\d,]+)\s*stars this week/);
    repos.push({
      repo: `${nameM[1]}/${nameM[2]}`,
      url: `https://github.com/${nameM[1]}/${nameM[2]}`,
      description: descM ? descM[1].replace(/\s+/g, ' ').trim() : '',
      starsThisWeek: starsWeekM ? Number(starsWeekM[1].replace(/,/g, '')) : null,
    });
  }
  return repos;
}
async function fetchGithubPlugins(limit = 25) {
  const url = 'https://github.com/trending?since=weekly';
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${url}`);
  const html = await res.text();
  const repos = parseGithubRepos(html, limit);
  const PLUGIN_KW = /\b(plugin|extension|skill|add-?on|integration|sdk|cli|mcp|vscode|obsidian|raycast|neovim|zsh|action)\b/i;
  const items = repos
    .filter((r) => PLUGIN_KW.test(r.repo + ' ' + (r.description || '')))
    .map((r) => ({ repo: r.repo, url: r.url, description: r.description, starsThisWeek: r.starsThisWeek ?? null }));
  return {
    source: 'github', fetchedOk: true, sourceUrl: url, items,
    note: '주간 급상승 레포 중 plugin/extension/skill/cli/mcp 등 도구 성격 키워드가 잡힌 것만. dev-trending 과 겹치는 항목은 조사 단계에서 제외한다.',
  };
}

function selftest() {
  const rss = `<rss><channel>
    <item><title><![CDATA[테스트 글 AI 모델]]></title><link>https://ex.com/1</link><pubDate>Wed, 20 Aug 2026 09:00:00 +0900</pubDate></item>
    <item><title>일반 개발 글</title><link>https://ex.com/2</link><pubDate>Mon, 01 Jan 2001 00:00:00 +0900</pubDate></item>
  </channel></rss>`;
  const atom = `<feed xmlns="http://www.w3.org/2005/Atom">
    <entry><title>긱뉴스 LLM 소식</title><link href="https://news.hada.io/topic?id=1"/><updated>2026-08-20T09:00:00Z</updated></entry>
  </feed>`;
  const r = parseFeed(rss), a = parseFeed(atom);
  const ok = r.length === 2 && r[0].title === '테스트 글 AI 모델' && r[0].url === 'https://ex.com/1'
    && a.length === 1 && a[0].url === 'https://news.hada.io/topic?id=1'
    && AI_KW.test('테스트 글 AI 모델') && !AI_KW.test('일반 개발 글');
  console.log(ok ? '✓ 피드 파서(RSS/Atom) + AI 키워드' : '✗ 파서', JSON.stringify({ rss: r.length, atom: a.length }));
  console.log(ok ? '\n자체검사 통과' : '\n자체검사 실패');
  process.exit(ok ? 0 : 1);
}

const SOURCES = {
  geeknews: (days) => fetchGeeknews(days),
  inpa: (days) => fetchTistory('inpa', 'https://inpa.tistory.com/rss', days),
  goddaehee: (days) => fetchTistory('goddaehee', 'https://goddaehee.tistory.com/rss', days),
  github: () => fetchGithubPlugins(),
};

const main = async () => {
  if (has('selftest')) return selftest();
  if (has('list')) {
    console.log('geeknews    GeekNews Atom 피드(최근 N일, AI 플래그)');
    console.log('inpa        inpa.tistory 어제~오늘 작성분');
    console.log('goddaehee   goddaehee.tistory 어제~오늘 작성분');
    console.log('github      주간 급상승 중 스킬/플러그인/확장 레포');
    console.log('옵션: --days=N(기본 2) --source=<위 중 하나>(생략 시 전체)');
    return;
  }

  const days = Number(flag('days')) || 2;
  const only = flag('source');
  const names = only ? [only] : Object.keys(SOURCES);
  if (only && !SOURCES[only]) {
    console.error(`모르는 source: ${only} (가능: ${Object.keys(SOURCES).join(', ')})`);
    process.exit(1);
  }

  const results = {};
  for (const name of names) {
    try {
      results[name] = await SOURCES[name](days);
      const n = results[name].items.length;
      const extra = name === 'geeknews' ? ` (AI 관련 ${results[name].items.filter((i) => i.aiRelated).length})` : '';
      console.log(`✓ ${name}: ${n}건${extra}`);
    } catch (e) {
      results[name] = { source: name, fetchedOk: false, error: String(e.message).slice(0, 200), items: [] };
      console.error(`⚠ ${name}: 실패 — ${results[name].error}`);
    }
  }

  await mkdir(outDir, { recursive: true });
  const today = new Date().toISOString().slice(0, 10);
  const combined = { collectedAt: today, days, results };
  const out = join(outDir, only ? `${only}-${today}.json` : `digest-${today}.json`);
  await writeFile(out, JSON.stringify(combined, null, 2) + '\n', 'utf8');
  console.log(`\n후보 목록: backend/blog/research/dev-digest/${only ? only : 'digest'}-${today}.json`);
};

main().catch((e) => { console.error('✗', e.message); process.exit(1); });
