#!/usr/bin/env node
/* ============================================================
   한끗 — 블로그 자동 발행 대기열 (티스토리 + 네이버, 서로 다른 글)

   blog-daily 가 만든 글은 meta.platform 으로 한 곳에만 배정된다("tistory" 기본 / "naver").
   이 스크립트는 **검증 통과 후 본문이 안 바뀐 글**(meta.verified.html == 현재 html 해시)만
   골라, 두 플랫폼을 번갈아(T→N→T→N…) 하루 티스토리 1편·네이버 9편까지 올린다.
   같은 글이 두 플랫폼에 가는 일은 없다(양쪽 발행 기록 모두 확인).

   스팸 판정은 "짧은 시간 대량"이 핵심 신호라 속도를 조절한다. 캡차는 우회하지 않는다 —
   한 플랫폼이 실패하면(세션 만료·캡차 미해결) 그날 그 플랫폼만 멈추고 다른 쪽은 계속한다.

   실행 (레포 루트에서):
     node backend/scripts/blog-queue.mjs --list            # 대기열만 보기
     node backend/scripts/blog-queue.mjs                   # 발행 (기본: T1/N7·네이버 회차 간격 100분 이상·7일 이내)
     node backend/scripts/blog-queue.mjs --max-tistory=1 --max-naver=16 --max-per-run=1 --max-age=7
     node backend/scripts/blog-queue.mjs --max=5 --only=naver # --max는 양 플랫폼 공통 한도로 유지
     node backend/scripts/blog-queue.mjs --selftest
   스케줄: 매일 09:00~18:00 매시간 스케줄작업 AZ2MZ_Blog_Queue(tools/blog-queue.vbs). 회차당 한 편씩,
   하루 한도는 발행 기록으로 세므로 초과하지 않는다.
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

/* ── 유사도 검사(2026-11-10 네이버 보호조치 후): 새 글을 최근 30일에 올린 네이버 글과 비교한다 ──
   제목(글자 2-gram), 소제목(h2) 구조, 본문(단어 3-gram), 태그를 보고 기준을 넘으면 발행하지 않는다. */
const strip = (h) => h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ');
const grams = (arr, n) => { const o = new Set(); for (let i = 0; i + n <= arr.length; i++) o.add(arr.slice(i, i + n).join(' ')); return o; };
const jac = (a, b) => { if (!a.size || !b.size) return 0; let c = 0; for (const x of a) if (b.has(x)) c++; return c / (a.size + b.size - c); };
const normT = (s) => String(s || '').toLowerCase().replace(/[^0-9a-z가-힣]/g, '');
export function fingerprint({ meta, html }) {
  const t = normT(meta.title);
  return {
    title: grams([...t], 2),
    h2: new Set([...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/g)].flatMap((m) => strip(m[1]).toLowerCase().replace(/[^0-9a-z가-힣 ]/g, '').split(/\s+/)).filter((w) => w.length >= 2)),
    body: grams(strip(html).split(/\s+/).filter(Boolean), 3),
    tags: new Set((meta.tags || []).map(normT)),
  };
}
export const SIM_LIMIT = { title: 0.5, h2: 0.3, body: 0.3, tags: 5 };   // h2 는 소제목 단어 집합의 자카드(소제목 틀이 닮았는지)
/* 반환: 걸린 이유 문자열, 통과면 ''. recent = [{id, fp}] */
export function similarTo(fp, recent) {
  for (const r of recent) {
    const t = jac(fp.title, r.fp.title);
    if (t >= SIM_LIMIT.title) return `제목 유사(${t.toFixed(2)}) ↔ ${r.id}`;
    const h = jac(fp.h2, r.fp.h2);
    if (fp.h2.size >= 8 && h >= SIM_LIMIT.h2) return `소제목 틀 유사(${h.toFixed(2)}) ↔ ${r.id}`;
    const b = jac(fp.body, r.fp.body);
    if (b >= SIM_LIMIT.body) return `본문 유사(${b.toFixed(2)}) ↔ ${r.id}`;
    const tg = [...fp.tags].filter((x) => r.fp.tags.has(x)).length;
    if (tg >= SIM_LIMIT.tags) return `태그 ${tg}개 겹침 ↔ ${r.id}`;
  }
  return '';
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
  // 기본 일일 분배는 티스토리 1편 + 네이버 7편(총 8편)이다(2026-11-10 네이버 계정 보호조치 후 16→7). 네이버는 하루 7개 시각(07:45·10:05·12:25·14:45·17:05·19:25·21:45)마다 /blog-hourly-naver 가 1편씩 만들고 바로 --max-per-run=1 로 올린다. 마지막 네이버 발행 후 --min-gap(기본 100분)이 안 지났으면 건너뛴다.
  // 기존 --max 옵션은 명시되면 양 플랫폼 공통 한도로 적용한다.
  const sharedMax = val('max', undefined);
  const maxByPlatform = {
    tistory: Number(val('max-tistory', sharedMax ?? 1)),
    naver: Number(val('max-naver', sharedMax ?? 7)),
  };
  // 네이버 계정 보호조치 중 — backend/out/blog/.naver-hold 파일이 있으면 네이버 발행을 전부 막는다(지우면 재개, 2026-11-10).
  if (existsSync(join(outDir, '.naver-hold'))) { maxByPlatform.naver = 0; console.log('⏸ naver 보류 중(.naver-hold) — 네이버는 발행하지 않습니다'); }
  const maxPerRun = Number(val('max-per-run', Number.POSITIVE_INFINITY));
  const maxAge = Number(val('max-age', 7));
  const [gapMin, gapMax] = val('gap', '20-40').split('-').map(Number);
  const only = val('only', '');
  const today = kstDay(Date.now());
  const read = (p) => (existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : {});
  const posted = Object.fromEntries(Object.entries(PLATFORMS).map(([k, v]) => [k, read(v.posted)]));
  const skipped = read(join(outDir, 'queue-skipped.json'));
  const postedAll = new Set(Object.values(posted).flatMap(Object.keys));
  const posts = loadPosts();

  let changedSkipped = false;
  const plan = {};
  for (const p of Object.keys(PLATFORMS)) {
    let all = candidates(posts, postedAll, p, today, maxAge)
      .filter((id) => !skipped[p]?.[id]);
    if (p === 'naver') {
      // 최근 30일에 올린 네이버 글과 비교 — 기준을 넘으면 queue-skipped.json 에 보류 표시(파일은 지우지 않는다)
      const byId = new Map(posts.map((x) => [x.id, x]));
      const cutoff = Date.now() - 30 * 864e5;
      const recent = Object.entries(posted.naver).filter(([, v]) => atMs(v.at) >= cutoff)
        .map(([id]) => byId.get(id)).filter(Boolean).map((x) => ({ id: x.id, fp: fingerprint(x) }));
      const kept = [];
      for (const id of all) {
        const why = similarTo(fingerprint(byId.get(id)), recent);
        if (why) { skipped.naver = { ...(skipped.naver || {}), [id]: `유사도 보류: ${why}` }; console.log(`  · ${id} 보류 — ${why}`); changedSkipped = true; }
        else kept.push(id);
      }
      all = kept;
    }
    const doneToday = Object.values(posted[p]).filter((v) => kstDay(atMs(v.at)) === today).length;
    plan[p] = only && only !== p ? [] : all.slice(0, Math.max(0, maxByPlatform[p] - doneToday));
    if (p === 'naver' && plan[p].length) {   // 회차 사이 최소 간격 — 연달아 올리지 않는다(기본 100분)
      const last = Math.max(0, ...Object.values(posted.naver).map((v) => atMs(v.at)));
      const minGap = Number(val('min-gap', 100));
      if (Date.now() - last < minGap * 60000) { console.log(`  · 마지막 네이버 발행 후 ${minGap}분이 안 지났다 — 이번 회차 건너뜀`); plan[p] = []; }
    }
    console.log(`${p}: 후보 ${all.length}편 · 오늘 이미 ${doneToday}편 · 이번 ${plan[p].length}편${has('list') && all.length ? '\n  ' + all.join('\n  ') : ''}`);
  }
  // 애드포스트 미디어 등록은 네이버 공개 글 50편쯤에 신청하기로 함(2026-09-24 사용자 결정) — 그 시점을 로그로 알린다.
  const naverPublic = Object.values(posted.naver).filter((v) => !v.private).length;
  if (naverPublic >= 50) console.log(`📢 네이버 공개 글 ${naverPublic}편(이 스크립트 발행분) — 애드포스트 미디어 등록 신청 시점`);
  if (changedSkipped && !has('list')) writeFileSync(join(outDir, 'queue-skipped.json'), JSON.stringify(skipped, null, 2) + '\n', 'utf8');
  if (has('list')) return;

  // 12:00 회차가 아직 도는 중에 18:00 회차가 뜨면 같은 글을 두 번 올릴 수 있다 — 살아있는 실행이 있으면 양보.
  if (existsSync(lockPath)) {
    const pid = Number(readFileSync(lockPath, 'utf8'));
    try { process.kill(pid, 0); console.log(`· 다른 대기열 실행 중(pid ${pid}) — 이번 회차 건너뜀`); return; } catch { /* 죽은 락 */ }
  }
  writeFileSync(lockPath, String(process.pid));
  try {
    const stopped = new Set();
    // 발행할 티스토리 글이 있을 때 사전 세션 확인을 한다. 만료된 경우
    // --daily-session 이 저장 자동완성/단일 계정 선택으로 자동 로그인을 시도한다.
    // 추가 인증·CAPTCHA 등 사람 확인이 필요하면 그날 티스토리만 중단한다.
    if ((!only || only === 'tistory') && plan.tistory.length > 0) {
      const k = spawnSync(process.execPath, [PLATFORMS.tistory.script, '--daily-session'], { stdio: ['ignore', 'inherit', 'inherit'] });
      if (k.status !== 0) { stopped.add('tistory'); console.error('✗ 티스토리 세션 확인/자동 로그인 실패 — 추가 인증이 필요할 수 있어 오늘 티스토리 발행을 건너뜁니다.'); }
    }
    const steps = interleave(plan.tistory, plan.naver);
    let publishedThisRun = 0;
    for (let i = 0; i < steps.length && publishedThisRun < maxPerRun; i++) {
      const [p, id] = steps[i];
      if (stopped.has(p)) continue;
      console.log(`\n[${i + 1}/${steps.length}] ${p} · ${id}  (${new Date().toLocaleTimeString('ko-KR')})`);
      // 무인 실행: 창을 화면 밖에(게임·작업 방해 X), 표준입력 없음(확인 프롬프트가 멈추지 않게).
      // 사람이 붙어 있을 땐 BLOG_OFFSCREEN=0 으로 창을 보이게 — 티스토리 캡차를 직접 풀 수 있게.
      const r = spawnSync(process.execPath, [PLATFORMS[p].script, id],
        { stdio: ['ignore', 'inherit', 'inherit'], env: process.env });
      if (r.status !== 0) { stopped.add(p); console.error(`✗ ${p} 실패 — 오늘 ${p} 대기열 중단(세션·캡차 확인)`); }
      else publishedThisRun++;
      if (i < steps.length - 1 && stopped.size < 2 && publishedThisRun < maxPerRun && r.status === 0) {
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
