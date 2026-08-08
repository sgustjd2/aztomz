#!/usr/bin/env node
/* ============================================================
   개발 트렌드 — GitHub 급상승 레포 · HuggingFace 트렌딩 모델/데이터셋 후보 수집
   (결정적 · LLM 없음)

   사용자 요청(2026-08-08): "최신 기준을 현재 날짜에서 일주일전까지 게시물 기준으로" —
   그냥 인기 있는 걸 주는 게 아니라 **최근 7일 안에 나온/오른 것만** 후보로 남긴다.

   · GitHub — /trending?since=weekly 자체가 "이번 주 stars 증가량" 기준이라 별도 날짜 필터가
     필요 없다. 공식 API 는 이 알고리즘을 노출하지 않는다(Search API sort=stars 는 누적 스타
     기준이라 다른 신호 — 2026-08 리서치로 이미 확인됨). HTML 카드를 정규식으로 파싱한다.
   · HuggingFace — sort 파라미터에 "trending" 을 직접 주면 400 이 난다(2026-08-08 확인,
     실측: `{"error":"✖ Invalid sort parameter: trending"}`). sort 생략 시 서버가
     trendingScore 내림차순으로 준다. 그런데 이 점수는 시간 감쇠가 약해서 데이터셋 쪽은
     오래된 고전(squad·imdb·hh-rlhf 등)이 그대로 상위에 남는다(2026-08-08 실측: no-sort 상위
     100건 중 createdAt 7일 이내는 12건뿐, 나머지는 2022~2024년 생성). 그래서 trending 순서를
     유지한 채 **createdAt 이 최근 7일 이내인 것만** 남긴다 — "요즘 뜨는 것"이 아니라
     "요즘 나온 것 중 뜨는 것"으로 좁힌다. 데이터셋은 7일 이내 신규가 드물어 0건이 정상일
     수 있다 — 억지로 채우지 않는다.

   실행:
     node backend/scripts/dev-trending-fetch.mjs --source=github
     node backend/scripts/dev-trending-fetch.mjs --source=hf-models
     node backend/scripts/dev-trending-fetch.mjs --source=hf-datasets
     node backend/scripts/dev-trending-fetch.mjs --list
     node backend/scripts/dev-trending-fetch.mjs --selftest
   ============================================================ */
import { writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const outDir = join(repoRoot, 'backend', 'blog', 'research', 'dev-trending');

const argv = process.argv.slice(2);
const has = (f) => argv.includes(`--${f}`);
const flag = (n) => (argv.find((a) => a.startsWith(`--${n}=`)) || '').split('=').slice(1).join('=');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const DAY_MS = 86400000;
const FRESH_DAYS = 7;

function daysAgo(n, now = new Date()) {
  return new Date(now.getTime() - n * DAY_MS);
}

/* ── GitHub 급상승(주간) ─────────────────────────────────────────── */
function parseGithubTrending(html, limit = 15) {
  const items = [];
  const blocks = html.split('<article class="Box-row">').slice(1);
  for (const raw of blocks.slice(0, limit)) {
    const block = raw.split('</article>')[0];

    const nameM = block.match(
      /href="\/([\w.-]+)\/([\w.-]+)"[^>]*class="Link"[\s\S]*?<span[^>]*class="text-normal">\s*[\w.-]+\s*\/\s*<\/span>\s*([\w.-]+)<\/a>/
    );
    if (!nameM) continue;
    const [, owner, repo] = nameM;

    const descM = block.match(/<p class="col-9[^"]*">([\s\S]*?)<\/p>/);
    const description = descM ? descM[1].replace(/\s+/g, ' ').trim() : '';

    const langM = block.match(/itemprop="programmingLanguage">([^<]+)</);
    const language = langM ? langM[1].trim() : null;

    const starsWeekM = block.match(/([\d,]+)\s*stars this week/);
    const starsThisWeek = starsWeekM ? Number(starsWeekM[1].replace(/,/g, '')) : null;

    const totalStarsM = block.match(/stargazers"[^>]*>[\s\S]*?<\/svg>\s*([\d,]+)</);
    const totalStars = totalStarsM ? Number(totalStarsM[1].replace(/,/g, '')) : null;

    items.push({
      repo: `${owner}/${repo}`,
      url: `https://github.com/${owner}/${repo}`,
      description, language, starsThisWeek, totalStars,
    });
  }
  return items;
}

async function fetchGithub(limit = 15) {
  const url = 'https://github.com/trending?since=weekly';
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${url}`);
  const html = await res.text();
  const items = parseGithubTrending(html, limit);
  return {
    source: 'github', fetchedOk: true, sourceUrl: url, items,
    note: '/trending?since=weekly HTML 파싱. "N stars this week" 는 위클리 페이지 자체 정의라 추가 날짜 필터가 필요 없다.',
  };
}

/* ── HuggingFace 트렌딩 모델/데이터셋 (7일 이내 생성만) ──────────────── */
async function fetchHfFresh(kind, { fetchLimit = 100, keepLimit = 15 } = {}) {
  const url = `https://huggingface.co/api/${kind}?limit=${fetchLimit}&full=true`;
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${url}`);
  const all = await res.json();
  const cutoff = daysAgo(FRESH_DAYS);
  // 서버가 이미 trendingScore 내림차순으로 준다 — freshDays 로 걸러도 순서는 유지된다.
  const fresh = all.filter((x) => x.createdAt && new Date(x.createdAt) >= cutoff);
  const base = kind === 'datasets' ? 'https://huggingface.co/datasets/' : 'https://huggingface.co/';
  const items = fresh.slice(0, keepLimit).map((x) => ({
    id: x.id,
    url: `${base}${x.id}`,
    createdAt: x.createdAt,
    lastModified: x.lastModified || null,
    trendingScore: x.trendingScore ?? null,
    likes: x.likes ?? null,
    downloads: x.downloads ?? null,
    pipelineTag: x.pipeline_tag || null,
    tags: (x.tags || []).slice(0, 8),
  }));
  return {
    source: kind === 'datasets' ? 'hf-datasets' : 'hf-models', fetchedOk: true, sourceUrl: url, items,
    note: `no-sort(trendingScore 내림차순) 상위 ${fetchLimit}건 중 createdAt 최근 ${FRESH_DAYS}일 이내인 것만 남김. `
      + (kind === 'datasets' ? '데이터셋은 신규가 드물어 0건이 정상일 수 있음 — 억지로 채우지 않음.' : ''),
  };
}

async function selftest() {
  const sampleHtml = `
    <article class="Box-row">
      <h2 class="h3 lh-condensed">
        <a href="/octocat/hello-world" data-view-component="true" class="Link"><svg>x</svg>
          <span data-view-component="true" class="text-normal">
            octocat /
</span>
          hello-world</a>  </h2>
        <p class="col-9 color-fg-muted my-1 tmp-pr-4">
          A sample repository for testing.
        </p>
      <div class="f6 color-fg-muted mt-2">
          <span class="tmp-mr-3 d-inline-block ml-0 tmp-ml-0">
      <span class="repo-language-color" style="background-color: #3572A5"></span>
      <span itemprop="programmingLanguage">Python</span>
    </span>
          <a href="/octocat/hello-world/stargazers" data-view-component="true" class="tmp-mr-3 Link Link--muted d-inline-block"><svg>y</svg>
            12,345</a>
          <a href="/octocat/hello-world/forks" data-view-component="true" class="tmp-mr-3 Link Link--muted d-inline-block"><svg>z</svg>
            678</a>
          <span data-view-component="true" class="tmp-mr-3 d-inline-block">
            <svg>w</svg>
            1,234 stars this week
</span>  </div>
    </article>`;
  const items = parseGithubTrending(sampleHtml);
  const ok = items.length === 1
    && items[0].repo === 'octocat/hello-world'
    && items[0].language === 'Python'
    && items[0].starsThisWeek === 1234
    && items[0].totalStars === 12345
    && items[0].description === 'A sample repository for testing.';
  console.log(ok ? '✓ GitHub 파서' : '✗ GitHub 파서', JSON.stringify(items));
  console.log(ok ? '\n자체검사 통과' : '\n자체검사 실패');
  process.exit(ok ? 0 : 1);
}

const main = async () => {
  if (has('selftest')) return selftest();

  if (has('list')) {
    console.log('github        GitHub 급상승 레포(주간)                 https://github.com/trending?since=weekly');
    console.log('hf-models     HuggingFace 트렌딩 모델(7일 이내 생성)     https://huggingface.co/api/models');
    console.log('hf-datasets   HuggingFace 트렌딩 데이터셋(7일 이내 생성)  https://huggingface.co/api/datasets');
    return;
  }

  const source = flag('source');
  if (!source) {
    console.error('사용법: node backend/scripts/dev-trending-fetch.mjs --source=<github|hf-models|hf-datasets> | --list | --selftest');
    process.exit(1);
  }

  let result;
  if (source === 'github') result = await fetchGithub();
  else if (source === 'hf-models') result = await fetchHfFresh('models');
  else if (source === 'hf-datasets') result = await fetchHfFresh('datasets');
  else {
    console.error(`모르는 source: ${source} (가능: github, hf-models, hf-datasets)`);
    process.exit(1);
  }

  if (!result.items.length) {
    console.error(`⚠ ${source}: 후보 0건 — 최근 ${FRESH_DAYS}일 조건에 맞는 게 없거나 파서가 페이지 구조 변경으로 깨졌을 수 있다.`);
  } else {
    console.log(`✓ ${source}: 후보 ${result.items.length}건`);
    result.items.slice(0, 5).forEach((it) => console.log(`  ${it.repo || it.id}`));
  }

  await mkdir(outDir, { recursive: true });
  const today = new Date().toISOString().slice(0, 10);
  const out = join(outDir, `${source}-${today}.json`);
  await writeFile(out, JSON.stringify(result, null, 2) + '\n', 'utf8');
  console.log(`\n후보 목록: backend/blog/research/dev-trending/${source}-${today}.json`);
};

main().catch((e) => { console.error('✗', e.message); process.exit(1); });
