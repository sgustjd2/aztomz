#!/usr/bin/env node
/* ============================================================
   한끗 — 티스토리 초안 도우미 크롬 확장 로컬 브릿지 서버

   backend/out/blog/<slug>.{html,json} 을 크롬 확장(backend/tistory-extension/)이
   읽을 수 있게 로컬 HTTP 로 내려준다. 발행 자체(로그인·캡차·발행 버튼)는 여전히
   사람이 브라우저에서 직접 한다 — 이 서버는 "타이핑을 대신 해주는" 역할만 한다.

   ── 왜 필요한가 ──
   크롬 확장은 로컬 파일시스템을 직접 읽을 수 없다(보안상 당연히 막혀 있다).
   그래서 이 저장소의 backend/out/blog/ 를 읽어 확장에 fetch 로 넘겨주는 다리가 필요하다.

   실행: node backend/scripts/blog-extension-server.mjs [--port=8137]
   ============================================================ */
import { readFile, readdir } from 'node:fs/promises';
import { existsSync, createReadStream } from 'node:fs';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const outDir = join(repoRoot, 'backend', 'out', 'blog');
const postedPath = join(outDir, 'posted.json');

const PORT = Number((process.argv.find((a) => a.startsWith('--port=')) || '').slice('--port='.length)) || 8137;

async function readPosted() {
  return existsSync(postedPath) ? JSON.parse(await readFile(postedPath, 'utf8')) : {};
}

/* backend/out/blog/ 에서 "조립까지 끝난" 초안(.html + .json 둘 다 있는 것)만 후보로 본다.
   posted.json·.check.json·.error.png 등 부산물은 슬러그 후보에서 제외한다. */
export async function listPending(dir = outDir) {
  if (!existsSync(dir)) return [];
  const files = await readdir(dir);
  const posted = await readPosted();
  const slugs = files
    .filter((f) => f.endsWith('.json') && f !== 'posted.json' && !f.endsWith('.check.json'))
    .map((f) => f.slice(0, -'.json'.length))
    .filter((slug) => existsSync(join(dir, `${slug}.html`)));

  const out = [];
  for (const slug of slugs) {
    let meta;
    try { meta = JSON.parse(await readFile(join(dir, `${slug}.json`), 'utf8')); } catch { continue; }
    out.push({
      slug,
      title: meta.title || slug,
      category: meta.category || null,
      tags: meta.tags || [],
      hasCover: existsSync(join(dir, `${slug}.cover.png`)),
      published: Boolean(posted[slug]),
      publishedUrl: posted[slug]?.url || null,
    });
  }
  return out.sort((a, b) => Number(a.published) - Number(b.published)); // 미발행 먼저
}

/* <!--COVER--> 자리는 blog-publish.mjs 가 업로드한 CDN 마크업으로 채우는데,
   이 도구는 커버를 자동 업로드하지 않으므로(별도 절 참고) 빈 문자열로 치운다 —
   그대로 두면 티스토리 에디터에 HTML 주석이 그대로 텍스트로 보인다. */
export function stripCoverPlaceholder(html) {
  return html.replace('<!--COVER-->\n', '').replace('<!--COVER-->', '');
}

async function getDraft(slug) {
  const htmlPath = join(outDir, `${slug}.html`);
  const metaPath = join(outDir, `${slug}.json`);
  if (!existsSync(htmlPath) || !existsSync(metaPath)) return null;
  const rawHtml = await readFile(htmlPath, 'utf8');
  const meta = JSON.parse(await readFile(metaPath, 'utf8'));
  const body = stripCoverPlaceholder(rawHtml);
  return {
    slug,
    title: meta.title || slug,
    category: meta.category || null,
    tags: meta.tags || [],
    body,
    hasCover: existsSync(join(outDir, `${slug}.cover.png`)),
    hasUnresolvedFigures: /<!--FIG:/.test(body),
  };
}

async function markPublished({ slug, url, title }) {
  if (!slug || !url) throw new Error('slug, url 필수');
  const posted = await readPosted();
  posted[slug] = { at: new Date().toISOString().slice(0, 16).replace('T', ' '), url, title: title || posted[slug]?.title || slug };
  const { writeFile } = await import('node:fs/promises');
  await writeFile(postedPath, JSON.stringify(posted, null, 2) + '\n', 'utf8');
  return posted[slug];
}

function withCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function json(res, status, body) {
  withCors(res);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

async function readBody(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {};
}

async function handle(req, res) {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (req.method === 'OPTIONS') { withCors(res); res.writeHead(204); res.end(); return; }

  try {
    if (req.method === 'GET' && url.pathname === '/pending') {
      return json(res, 200, await listPending());
    }
    if (req.method === 'GET' && url.pathname.startsWith('/draft/')) {
      const slug = decodeURIComponent(url.pathname.slice('/draft/'.length));
      const draft = await getDraft(slug);
      return draft ? json(res, 200, draft) : json(res, 404, { error: `없음: ${slug}` });
    }
    if (req.method === 'GET' && url.pathname.startsWith('/cover/')) {
      const slug = decodeURIComponent(url.pathname.slice('/cover/'.length));
      const file = join(outDir, `${slug}.cover.png`);
      if (!existsSync(file)) return json(res, 404, { error: '커버 없음' });
      withCors(res);
      res.writeHead(200, { 'Content-Type': 'image/png' });
      return createReadStream(file).pipe(res);
    }
    if (req.method === 'POST' && url.pathname === '/mark-published') {
      const body = await readBody(req);
      const saved = await markPublished(body);
      return json(res, 200, { ok: true, saved });
    }
    return json(res, 404, { error: 'not found' });
  } catch (e) {
    return json(res, 500, { error: e.message });
  }
}

async function selftest() {
  const { mkdtemp, writeFile, rm } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const dir = await mkdtemp(join(tmpdir(), 'blog-ext-selftest-'));
  const a = (cond, label) => { if (!cond) throw new Error(`✗ ${label}`); console.log(`✓ ${label}`); };
  try {
    await writeFile(join(dir, 'foo.html'), '<!--COVER-->\n<p>본문</p>', 'utf8');
    await writeFile(join(dir, 'foo.json'), JSON.stringify({ title: '제목', category: 'AZTOMZ', tags: ['a'] }), 'utf8');
    await writeFile(join(dir, 'bar.json'), JSON.stringify({ title: '짝없음' }), 'utf8'); // .html 없음 — 제외돼야 함

    const pending = await listPending(dir);
    a(pending.length === 1 && pending[0].slug === 'foo', 'html+json 짝 있는 것만 후보로 잡힘');
    a(pending[0].hasCover === false, '커버 없으면 hasCover:false');

    a(stripCoverPlaceholder('<!--COVER-->\n<p>x</p>') === '<p>x</p>', 'COVER 자리표시자가 줄바꿈까지 제거됨');
    a(stripCoverPlaceholder('<p><!--COVER--></p>').includes('<!--COVER-->') === false, '줄바꿈 없이 붙어도 제거됨');

    console.log('\n전부 통과');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

const isMain = process.argv[1]
  && import.meta.url === (await import('node:url')).pathToFileURL(process.argv[1]).href;

if (isMain) {
  if (process.argv.includes('--selftest')) {
    await selftest();
  } else {
    createServer((req, res) => { handle(req, res).catch((e) => json(res, 500, { error: e.message })); })
      .listen(PORT, () => {
        console.log(`✓ 티스토리 초안 도우미 서버 http://localhost:${PORT}`);
        console.log(`  backend/out/blog/ 를 읽습니다. Ctrl+C 로 종료.`);
        console.log(`  확장 설치: chrome://extensions → 개발자 모드 → "압축해제된 확장 프로그램 로드" → backend/tistory-extension 선택`);
      });
  }
}
