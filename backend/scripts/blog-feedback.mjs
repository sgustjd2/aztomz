#!/usr/bin/env node
/* ============================================================
   노래 추천 피드백 — 진화 루프

   발행된 글의 곡에 좋았다/별로였다를 남기면, 그 감상을 LLM 이 **기준**으로 압축해
   backend/blog/feedback/music-lessons.md 에 한 줄로 쌓는다.
   그 파일은 다음 글의 아웃라인 단계에 통째로 주입되므로, 쓸수록 취향이 뾰족해진다.

   실행 (레포 루트에서):
     node backend/scripts/blog-feedback.mjs --list                     # 최근 추천 곡 보기
     node backend/scripts/blog-feedback.mjs --good="Lamp - 榕樹" --note="이런 결이 맞다"
     node backend/scripts/blog-feedback.mjs --bad="XX - YY" --note="홍보곡이 섞였다"
     node backend/scripts/blog-feedback.mjs --lesson="직접 쓴 교훈 한 줄"   # LLM 없이 바로 추가
   ============================================================ */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { ask, MODEL } from './lib/llm.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const fbDir = join(repoRoot, 'backend', 'blog', 'feedback');
const logPath = join(fbDir, 'song-log.json');
const lessonsPath = join(fbDir, 'music-lessons.md');

const argv = process.argv.slice(2);
const flag = (n) => { const h = argv.find((a) => a.startsWith(`--${n}=`)); return h ? h.slice(n.length + 3) : null; };
const today = new Date().toISOString().slice(0, 10);

const readLog = async () => (existsSync(logPath) ? JSON.parse(await readFile(logPath, 'utf8')) : { songs: [] });

/* ── 추천 이력 보기 */
if (argv.includes('--list')) {
  const log = await readLog();
  if (!log.songs.length) { console.log('· 아직 추천 이력이 없습니다.'); process.exit(0); }
  console.log(`추천 이력 ${log.songs.length}곡 (최근 20)\n`);
  for (const s of log.songs.slice(-20)) {
    const mark = s.rating === 'good' ? '👍' : s.rating === 'bad' ? '👎' : '  ';
    console.log(`${mark} ${s.artist} - ${s.title}  [${s.categoryId} · ${s.postedAt}]`);
  }
  process.exit(0);
}

/* ── 교훈 직접 추가 (LLM 안 씀) */
const manual = flag('lesson');
if (manual) {
  await appendLesson(`- [${today}] (수동) ${manual}`);
  console.log('✓ 교훈 추가됨');
  process.exit(0);
}

/* ── 곡 평가 → LLM 이 '기준'으로 압축 → 교훈 적립 */
const good = (flag('good') || '').split(';').map((s) => s.trim()).filter(Boolean);
const bad = (flag('bad') || '').split(';').map((s) => s.trim()).filter(Boolean);
const note = flag('note') || '';

if (!good.length && !bad.length) {
  console.error('사용법:\n  --list\n  --good="아티스트 - 곡명" [--note="..."]\n  --bad="아티스트 - 곡명" [--note="..."]\n  --lesson="교훈 한 줄"\n  (여러 곡은 세미콜론으로 구분)');
  process.exit(1);
}

// 로그에 평가 반영
const log = await readLog();
const mark = (list, rating) => {
  for (const label of list) {
    const hit = log.songs.find((s) => `${s.artist} - ${s.title}`.toLowerCase() === label.toLowerCase());
    if (hit) { hit.rating = rating; hit.ratedAt = today; }
    else log.songs.push({ ...parseLabel(label), categoryId: '(수동)', postedAt: today, rating, ratedAt: today });
  }
};
function parseLabel(label) {
  const i = label.indexOf(' - ');
  return i < 0 ? { artist: '', title: label } : { artist: label.slice(0, i).trim(), title: label.slice(i + 3).trim() };
}
mark(good, 'good');
mark(bad, 'bad');
await mkdir(fbDir, { recursive: true });
await writeFile(logPath, JSON.stringify(log, null, 2) + '\n', 'utf8');

// 감상 → 다음 선곡에 쓸 '기준' 한 줄로 압축
const existing = existsSync(lessonsPath) ? await readFile(lessonsPath, 'utf8') : '';
const prompt = `너는 음악 큐레이션 시스템의 학습 담당이다.
아래 피드백을 보고, **다음에 곡을 고를 때 쓸 기준**을 한 줄로 뽑아라.

좋았던 곡: ${good.join(', ') || '(없음)'}
별로였던 곡: ${bad.join(', ') || '(없음)'}
사람이 남긴 메모: ${note || '(없음)'}

규칙:
- "이 곡이 좋았다" 같은 감상은 쓰지 마라. **선곡 기준**을 뽑아야 한다.
- 이미 있는 교훈과 겹치면 "SKIP" 한 단어만 출력해라.
- 한 줄, 120자 이내, 한국어. 앞에 "- [날짜] (카테고리)" 같은 접두사는 붙이지 마라.
- 근거가 된 곡이 있으면 문장 끝에 "(근거: 곡명)" 으로 붙여라.

이미 쌓인 교훈:
${existing.split('## 교훈')[1] || '(없음)'}`;

const out = String(await ask(prompt, { model: MODEL.review, maxTokens: 300, temperature: 0.3 })).trim();

if (/^SKIP$/i.test(out)) {
  console.log('· 기존 교훈과 겹쳐 추가하지 않았습니다. (평가는 로그에 반영됨)');
} else {
  await appendLesson(`- [${today}] (선곡) ${out.replace(/^[-•]\s*/, '')}`);
  console.log(`✓ 교훈 적립: ${out}`);
}
console.log(`  로그: 👍${good.length} 👎${bad.length} → backend/blog/feedback/song-log.json`);

async function appendLesson(line) {
  await mkdir(fbDir, { recursive: true });
  const cur = existsSync(lessonsPath) ? await readFile(lessonsPath, 'utf8') : '# 음악 추천 — 누적 교훈\n\n## 교훈\n';
  await writeFile(lessonsPath, cur.trimEnd() + '\n' + line + '\n', 'utf8');
}
