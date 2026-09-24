#!/usr/bin/env node
/* ============================================================
   한끗 — 블로그 자동 발행 대기열 (티스토리 + 네이버, 서로 다른 글)

   blog-daily 가 만든 글은 meta.platform 으로 한 곳에만 배정된다("tistory" 기본 / "naver").
   이 스크립트는 **검증 통과 후 본문이 안 바뀐 글**(meta.verified.html == 현재 html 해시)만
   골라, 두 플랫폼을 번갈아(T→N→T→N…) 글 사이 랜덤 대기를 두고 하루 --max 편씩 올린다.
   같은 글이 두 플랫폼에 가는 일은 없다(양쪽 발행 기록 모두 확인).

   스팸 판정은 "짧은 시간 대량"이 핵심 신호라 속도를 조절한다. 캡차는 우회하지 않는다 —
   한 플랫폼이 실패하면(세션 만료·캡차 미해결) 그날 그 플랫폼만 멈추고 다른 쪽은 계속한다.

   실행 (레포 루트에서):
     node backend/scripts/blog-queue.mjs --list            # 대기열만 보기
     node backend/scripts/blog-queue.mjs                   # 발행 (기본: 플랫폼당 하루 5편·20~40분 간격·7일 이내)
     node backend/scripts/blog-queue.mjs --max=5 --gap=20-40 --max-age=7 --only=naver
     node backend/scripts/blog-queue.mjs --selftest
   스케줄: 매일 12:00·15:00·18:00 스케줄작업 AZ2MZ_Blog_Queue(tools/blog-queue.vbs). 18:00 회차는
   12:00 이후 늦게 검증된 글을 따라잡는다(하루 한도는 발행 기록으로 세므로 초과 안 함).
   ============================================================ */
import { existsSync, readFileSync, readdirSync, writeFileSync, unlinkSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const scripts = dirname(fileURLToPath(import.meta.url));
const outDir = join(scripts, '..', 'out', 'blog');
const lockPath = join(outDir, '.queue.lock');
const PLATFORMS = {
  tistory: { posted: join(outDir, 'posted.json'), script: join(scripts, 'blog-publish.mjs') },
  naver: { posted: join(outDir, 'posted-naver.json'), script: join(scripts, 'blog-publish-naver.mjs') },
};

const argv = process.argv.slice(2);
const has = (f) => argv.includes(`--${f}`);
const val = (k, d) => argv.find((a) => a.startsWith(`--${k}=`))?.split('=')[1] ?? d;

// 발행 기록의 at 은 UTC('YYYY-MM-DD HH:MM'). 하루 한도는 한국 날짜로 센다.
export const kstDay = (ms) => new Date(ms + 9 * 3600e3).toISOString().slice(0, 10);
const atMs = (at) => Date.parse(at.replace(' ', 'T') + 'Z');
export const sha1 = (s) => createHash('sha1').update(s).digest('hex');

/* posts: [{ id, meta, html }] → 플랫폼별 후보 id(최신 builtAt 먼저). */
export function candidates(posts, postedAll, platform, today, maxAgeDays) {
  const cutoff = Date.parse(today) - maxAgeDays * 864e5;
  return posts
    .filter(({ id, meta, html }) => (meta.platform || 'tistory') === platform
      && !postedAll.has(id)
      && meta.verified?.html === sha1(html)
      && meta.builtAt && Date.parse(meta.builtAt) >= cutoff)
    .sort((a, b) => b.meta.builtAt.localeCompare(a.meta.builtAt))
    .map((p) => p.id);
}

/* 두 목록을 T,N,T,N… 로 섞는다. */
export function interleave(a, b) {
  const out = [];
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (a[i]) out.push(['tistory', a[i]]);
    if (b[i]) out.push(['naver', b[i]]);
  }
  return out;
}

function loadPosts() {
  return readdirSync(outDir)
    .filter((f) => f.endsWith('.json') && existsSync(join(outDir, f.replace(/\.json$/, '.html'))))
    .map((f) => {
      const id = f.replace(/\.json$/, '');
      try {
        return { id, meta: JSON.parse(readFileSync(join(outDir, f), 'utf8')), html: readFileSync(join(outDir, `${id}.html`), 'utf8') };
      } catch { return null; }
    })
    .filter((p) => p?.meta?.title);
}

async function main() {
  const max = Number(val('max', 5));
  const maxAge = Number(val('max-age', 7));
  const [gapMin, gapMax] = val('gap', '20-40').split('-').map(Number);
  const only = val('only', '');
  const today = kstDay(Date.now());
  const read = (p) => (existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : {});
  const posted = Object.fromEntries(Object.entries(PLATFORMS).map(([k, v]) => [k, read(v.posted)]));
  const postedAll = new Set(Object.values(posted).flatMap(Object.keys));
  const posts = loadPosts();

  const plan = {};
  for (const p of Object.keys(PLATFORMS)) {
    const all = candidates(posts, postedAll, p, today, maxAge);
    const doneToday = Object.values(posted[p]).filter((v) => kstDay(atMs(v.at)) === today).length;
    plan[p] = only && only !== p ? [] : all.slice(0, Math.max(0, max - doneToday));
    console.log(`${p}: 후보 ${all.length}편 · 오늘 이미 ${doneToday}편 · 이번 ${plan[p].length}편${has('list') && all.length ? '\n  ' + all.join('\n  ') : ''}`);
  }
  // 애드포스트 미디어 등록은 네이버 공개 글 50편쯤에 신청하기로 함(2026-09-24 사용자 결정) — 그 시점을 로그로 알린다.
  const naverPublic = Object.values(posted.naver).filter((v) => !v.private).length;
  if (naverPublic >= 50) console.log(`📢 네이버 공개 글 ${naverPublic}편(이 스크립트 발행분) — 애드포스트 미디어 등록 신청 시점`);
  if (has('list')) return;

  // 12:00 회차가 아직 도는 중에 18:00 회차가 뜨면 같은 글을 두 번 올릴 수 있다 — 살아있는 실행이 있으면 양보.
  if (existsSync(lockPath)) {
    const pid = Number(readFileSync(lockPath, 'utf8'));
    try { process.kill(pid, 0); console.log(`· 다른 대기열 실행 중(pid ${pid}) — 이번 회차 건너뜀`); return; } catch { /* 죽은 락 */ }
  }
  writeFileSync(lockPath, String(process.pid));
  try {
    const stopped = new Set();
    // 티스토리 인증은 세션 쿠키라 idle 이면 끊긴다 — 회차마다 keepalive 로 갱신(발행할 글이 없어도).
    // 이미 끊겼으면 자동 로그인은 안 하므로(철칙) 그날 티스토리만 건너뛴다.
    if (!only || only === 'tistory') {
      const k = spawnSync(process.execPath, [PLATFORMS.tistory.script, '--keepalive'], { stdio: ['ignore', 'inherit', 'inherit'] });
      if (k.status !== 0) { stopped.add('tistory'); console.error('✗ 티스토리 세션 만료 — 오늘 티스토리 발행 건너뜀. 사람이: node backend/scripts/blog-publish.mjs --login'); }
    }
    const steps = interleave(plan.tistory, plan.naver);
    for (let i = 0; i < steps.length; i++) {
      const [p, id] = steps[i];
      if (stopped.has(p)) continue;
      console.log(`\n[${i + 1}/${steps.length}] ${p} · ${id}  (${new Date().toLocaleTimeString('ko-KR')})`);
      // 무인 실행: 창을 화면 밖에(게임·작업 방해 X), 표준입력 없음(확인 프롬프트가 멈추지 않게).
      const r = spawnSync(process.execPath, [PLATFORMS[p].script, id],
        { stdio: ['ignore', 'inherit', 'inherit'], env: { ...process.env, BLOG_OFFSCREEN: '1' } });
      if (r.status !== 0) { stopped.add(p); console.error(`✗ ${p} 실패 — 오늘 ${p} 대기열 중단(세션·캡차 확인)`); }
      if (i < steps.length - 1 && stopped.size < 2) {
        const min = gapMin + Math.random() * (gapMax - gapMin);
        console.log(`  · 다음 글까지 ${min.toFixed(0)}분 대기`);
        await new Promise((res) => setTimeout(res, min * 60000));
      }
    }
    if (stopped.size) process.exitCode = 1;
  } finally {
    try { unlinkSync(lockPath); } catch { /* 이미 없음 */ }
  }
}

function selftest() {
  const html = '<p>x</p>';
  const ok = (m) => ({ builtAt: '2026-09-24', verified: { html: sha1(html) }, ...m });
  const posts = [
    { id: 't1', meta: ok({}), html },
    { id: 'n1', meta: ok({ platform: 'naver' }), html },
    { id: 'n2', meta: ok({ platform: 'naver', builtAt: '2026-09-23' }), html },
    { id: 'stale', meta: ok({ platform: 'naver', builtAt: '2026-09-01' }), html },
    { id: 'edited', meta: ok({ platform: 'naver' }), html: '<p>고쳤음</p>' },
    { id: 'unverified', meta: { builtAt: '2026-09-24', platform: 'naver' }, html },
    { id: 'done', meta: ok({ platform: 'naver' }), html },
  ];
  const posted = new Set(['done']);
  const n = candidates(posts, posted, 'naver', '2026-09-24', 7);
  const t = candidates(posts, posted, 'tistory', '2026-09-24', 7);
  const mix = interleave(['a', 'b'], ['x']);
  const checks = [
    [JSON.stringify(n) === '["n1","n2"]', `naver 후보 ${JSON.stringify(n)}`],
    [JSON.stringify(t) === '["t1"]', `tistory 후보 ${JSON.stringify(t)}`],
    [JSON.stringify(mix) === '[["tistory","a"],["naver","x"],["tistory","b"]]', `interleave ${JSON.stringify(mix)}`],
    [kstDay(Date.parse('2026-09-24T16:00:00Z')) === '2026-09-25', 'KST 날짜 경계'],
  ];
  for (const [pass, msg] of checks) console.log(`${pass ? '✓' : '✗'} ${msg}`);
  if (checks.some(([pass]) => !pass)) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === (await import('node:url')).pathToFileURL(process.argv[1]).href) {
  if (has('selftest')) selftest();
  else await main();
}
