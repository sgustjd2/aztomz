#!/usr/bin/env node
/* ============================================================
   AI 4사(Anthropic·OpenAI·Google DeepMind·xAI) 공식 발표 후보 수집 (결정적 · LLM 없음)

   왜 이 스크립트가 필요한가:
   · "AI 동향" 카테고리는 일반 웹서치로 조사하다가 존재하지 않는 사실을 지어낸 사고가
     여러 번 났다(learnings.md 참고 — 네이버 "AuthGR" 조어를 믿을 뻔한 사례 등).
   · 대신 각 회사가 **직접 운영하는 1차 출처**(공식 뉴스룸 RSS/HTML)만 결정적으로 fetch 해서
     "최근 후보 목록"만 뽑는다. 후보를 고르고 본문을 읽어 조사 파일로 만드는 건
     blog-researcher(에이전트)가 이어받는다 — 이 스크립트는 목록만 담당한다.
   · 2026-08-08 조사 실측: Anthropic 은 RSS 없음(HTML 파싱 필요) · OpenAI 는 뉴스룸 HTML이
     403이라 RSS 필수(openai.com/news/rss.xml) · Google 은 두 채널(DeepMind blog + AI 블로그)
     이 따로 있고 RSS 둘 다 있음 · xAI 는 도메인 전체가 403 + RSS 없음 — 이 스크립트로는
     못 가져온다(별도 방법 필요, `--company=xai` 는 빈 목록 + 경고를 낸다).

   실행:
     node backend/scripts/ai-watch-fetch.mjs --company=anthropic
     node backend/scripts/ai-watch-fetch.mjs --company=openai
     node backend/scripts/ai-watch-fetch.mjs --company=google
     node backend/scripts/ai-watch-fetch.mjs --company=xai      # 경고만 내고 빈 목록
     node backend/scripts/ai-watch-fetch.mjs --list             # 4사 전체 요약만
     node backend/scripts/ai-watch-fetch.mjs --selftest         # 오프라인 파서 자체검사
   ============================================================ */
import { writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const outDir = join(repoRoot, 'backend', 'blog', 'research', 'ai-watch');

const argv = process.argv.slice(2);
const has = (f) => argv.includes(`--${f}`);
const flag = (n) => (argv.find((a) => a.startsWith(`--${n}=`)) || '').split('=').slice(1).join('=');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

/* ── 회사별 소스 설정 (2026-08-08 조사로 확정된 URL 만 — 추측 금지) ──────────── */
const COMPANIES = {
  anthropic: {
    name: 'Anthropic', kind: 'html', url: 'https://www.anthropic.com/news',
    // 신모델·기능 발표만 거르려는 힌트. HTML 구조가 바뀌면 이 필터가 무력화될 수 있으니
    // 결과가 비어 있으면(예: 0건) 그대로 보고하고 조용히 넘어가지 않는다.
    modelTagHint: ['Product'],
    note: 'RSS 없음 — HTML 직접 파싱. platform.claude.com/docs/en/release-notes/overview 는 API 릴리스노트(별도 채널, 미포함).',
  },
  openai: {
    name: 'OpenAI', kind: 'rss', url: 'https://openai.com/news/rss.xml',
    note: '뉴스룸 HTML은 403 — RSS 필수. 노이즈(파트너십·기업 사례)가 많아 blog-researcher 가 제목으로 골라야 한다. 모델 세부는 developers.openai.com/api/docs/changelog(별도 채널) 참고 가능.',
  },
  google: {
    name: 'Google DeepMind', kind: 'rss', url: 'https://deepmind.google/blog/rss.xml',
    note: '4사 중 가장 안정적. blog.google/technology/ai/rss/ 도 있으나(Gemini 마케팅 블로그) DeepMind 쪽이 연구/모델 발표 위주라 우선.',
  },
  xai: {
    name: 'xAI', kind: 'blocked',
    note: '2026-08-08 확인: x.ai 도메인 전체가 이 환경에서 403(RSS 포함). WebFetch 로 못 가져온다. 사람이 직접 x.ai/news 를 확인하거나 다른 접근 경로가 필요하다 — 이 스크립트가 자동으로 대체 안 한다(지어낼 여지를 만들지 않기 위해 의도적으로 빈 목록만 반환).',
  },
};

async function fetchText(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${url}`);
  return res.text();
}

/* RSS 2.0 <item> 파싱 — 의존성 없이 정규식으로 충분하다(구조가 단순).
   CDATA·일반 텍스트 둘 다 받는다. */
function parseRss(xml, limit = 10) {
  const items = [];
  const blocks = xml.split(/<item[\s>]/i).slice(1);
  for (const raw of blocks.slice(0, limit)) {
    const body = raw.split(/<\/item>/i)[0];
    const grab = (tag) => {
      const m = body.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'));
      if (!m) return '';
      return m[1].replace(/^<!\[CDATA\[([\s\S]*)\]\]>$/, '$1').trim();
    };
    const title = grab('title');
    const link = grab('link') || grab('guid');
    const pubDate = grab('pubDate');
    if (title && link) items.push({ title, url: link.trim(), publishedAt: pubDate || null });
  }
  return items;
}

/* Anthropic HTML — /news 목록 페이지의 카드 구조를 파싱.
   href="/news/<slug>" 앵커 주변에서 제목·날짜·태그를 뽑는다. 구조가 바뀌면 0건이 나올 수
   있는데, 그때 지어내지 말고 "0건 확인됨 — 파서 점검 필요"로 정직하게 보고한다. */
function parseAnthropicHtml(html, limit = 10) {
  const items = [];
  const seen = new Set();
  const re = /href="(\/news\/[a-z0-9-]+)"[^>]*>([\s\S]{0,400}?)<\/a>/gi;
  let m;
  while ((m = re.exec(html)) && items.length < limit * 3) {
    const href = m[1];
    if (seen.has(href) || href === '/news') continue;
    seen.add(href);
    const chunk = m[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (!chunk || chunk.length < 4) continue;
    items.push({ title: chunk.slice(0, 200), url: `https://www.anthropic.com${href}`, publishedAt: null });
  }
  return items.slice(0, limit);
}

async function fetchCompany(key) {
  const c = COMPANIES[key];
  if (!c) throw new Error(`모르는 회사: ${key} (가능: ${Object.keys(COMPANIES).join(', ')})`);
  if (c.kind === 'blocked') {
    return { company: key, name: c.name, fetchedOk: false, items: [], note: c.note };
  }
  const raw = await fetchText(c.url);
  const items = c.kind === 'rss' ? parseRss(raw) : parseAnthropicHtml(raw);
  return { company: key, name: c.name, fetchedOk: true, sourceUrl: c.url, items, note: c.note };
}

async function selftest() {
  const sampleRss = `<?xml version="1.0"?><rss><channel>
    <item><title>Test Post One</title><link>https://example.com/1</link><pubDate>Sat, 08 Aug 2026 00:00:00 GMT</pubDate></item>
    <item><title><![CDATA[Test <b>Two</b>]]></title><link>https://example.com/2</link><pubDate>Fri, 07 Aug 2026 00:00:00 GMT</pubDate></item>
  </channel></rss>`;
  const rssItems = parseRss(sampleRss);
  const rssOk = rssItems.length === 2 && rssItems[0].title === 'Test Post One' && rssItems[1].title === 'Test <b>Two</b>';
  console.log(rssOk ? '✓ RSS 파서' : '✗ RSS 파서', JSON.stringify(rssItems));

  const sampleHtml = `<div><a href="/news/claude-opus-5">Introducing Claude Opus 5</a></div>
    <div><a href="/news/tino-cuellar">Tino Cuéllar joins Anthropic</a></div>
    <a href="/news">전체보기</a>`;
  const htmlItems = parseAnthropicHtml(sampleHtml);
  const htmlOk = htmlItems.length === 2 && htmlItems[0].url === 'https://www.anthropic.com/news/claude-opus-5';
  console.log(htmlOk ? '✓ Anthropic HTML 파서' : '✗ Anthropic HTML 파서', JSON.stringify(htmlItems));

  const allOk = rssOk && htmlOk;
  console.log(allOk ? '\n자체검사 통과' : '\n자체검사 실패');
  process.exit(allOk ? 0 : 1);
}

const main = async () => {
  if (has('selftest')) return selftest();

  if (has('list')) {
    for (const key of Object.keys(COMPANIES)) {
      const c = COMPANIES[key];
      console.log(`${key.padEnd(10)} ${c.name.padEnd(18)} ${c.kind.padEnd(8)} ${c.url || '(접근 불가)'}`);
    }
    return;
  }

  const company = flag('company');
  if (!company) {
    console.error('사용법: node backend/scripts/ai-watch-fetch.mjs --company=<anthropic|openai|google|xai> | --list | --selftest');
    process.exit(1);
  }

  const result = await fetchCompany(company);
  if (!result.fetchedOk) {
    console.error(`✗ ${result.name}: 접근 불가 — ${result.note}`);
    // 빈 결과라도 파일로 남긴다 — 호출자(에이전트)가 "시도했다가 막혔다"를 알 수 있게.
  } else if (!result.items.length) {
    console.error(`⚠ ${result.name}: fetch 는 됐는데 항목 0건 — 파서가 페이지 구조 변경으로 깨졌을 수 있다. 직접 확인 필요.`);
  } else {
    console.log(`✓ ${result.name}: 후보 ${result.items.length}건`);
    result.items.slice(0, 5).forEach((it) => console.log(`  ${it.publishedAt || '(날짜 미상)'} | ${it.title}`));
  }

  await mkdir(outDir, { recursive: true });
  const out = join(outDir, `${company}-${new Date().toISOString().slice(0, 10)}.json`);
  await writeFile(out, JSON.stringify(result, null, 2) + '\n', 'utf8');
  console.log(`\n후보 목록: backend/blog/research/ai-watch/${company}-${new Date().toISOString().slice(0, 10)}.json`);
  console.log('다음: blog-researcher 에이전트가 이 목록에서 1건을 골라 본문을 직접 fetch 해 조사 파일을 만든다.');
};

main().catch((e) => { console.error('✗', e.message); process.exit(1); });
