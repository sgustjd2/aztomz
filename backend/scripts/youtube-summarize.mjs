#!/usr/bin/env node
/* ============================================================
   유튜브 채널 새 영상 → 한국어 상세 요약 (Gemini)

   Gemini 2.5 는 유튜브 URL 을 그대로 받아 **영상을 직접 본다**(video+audio 토큰으로).
   그래서 자막 스크래핑·yt-dlp·transcript API 가 전혀 필요 없다 — 새 의존성 0.

   흐름:  RSS(쿼터·키 불필요, 최근 15개) → 아직 요약 안 한 영상만 → Gemini 요약 →
          youtube-summaries/<날짜>-<videoId>.md 저장 → 인덱스(README) 재생성.

   이미 요약한 영상은 파일 존재로 판별한다(별도 seen 파일 없음 — 파일 지우면 자동 재요약).
   한 영상이 실패(503/타임아웃)해도 다음 영상으로 넘어가고, 실패분은 다음 실행 때 다시 시도된다.

   사용:
     node backend/scripts/youtube-summarize.mjs                 # 기본 채널(@aiDotEngineer) 새 영상 요약
     node backend/scripts/youtube-summarize.mjs --dry           # API 호출·쓰기 없이 대상만 출력
     node backend/scripts/youtube-summarize.mjs --limit=3       # 이번 실행 최대 3개(비용 가드, 기본 6)
     node backend/scripts/youtube-summarize.mjs --lowres        # 영상 토큰 절감(발표는 음성이 내용)
     node backend/scripts/youtube-summarize.mjs --channel=UC... # 다른 채널
     node backend/scripts/youtube-summarize.mjs --selftest      # 오프라인 파서 자가검사(API 없음)

   env: GEMINI_API_KEY (hermes/.env 또는 process.env — Actions 에선 secrets)
   ============================================================ */
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { ask, MODEL } from './lib/llm.mjs';
import { env } from './lib/env.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const val = (k, d = null) => { const a = args.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };

const DRY = has('--dry');
const LOWRES = has('--lowres');
const LIMIT = Number(val('limit', '6'));
const CHANNEL = val('channel', 'UCLKPca3kwwd-B59HNr-_lvA');   // AI Engineer (@aiDotEngineer)
const OUT_DIR = join(repoRoot, val('out', 'youtube-summaries'));
const MODEL_ID = val('model', MODEL.draft);                  // gemini-2.5-flash

/* ── RSS 파서 (XML 의존성 없이 — 채널 피드는 형식이 고정적이라 정규식으로 충분) ── */
const DECODE = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&apos;': "'" };
const decode = (s) => (s || '').replace(/&(amp|lt|gt|quot|#39|apos);/g, (m) => DECODE[m]).trim();
const pick = (block, tag) => { const m = block.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`)); return m ? m[1] : ''; };

/** 채널 RSS xml → [{videoId, title, publishedAt(YYYY-MM-DD), author}] (최신순, 최대 15) */
function parseFeed(xml) {
  const out = [];
  for (const m of xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)) {
    const e = m[1];
    const videoId = pick(e, 'yt:videoId').trim();
    if (!videoId) continue;
    out.push({
      videoId,
      title: decode(pick(e, 'title')),
      publishedAt: pick(e, 'published').slice(0, 10),
      author: decode(pick(e, 'name')),
    });
  }
  return out;
}

async function fetchFeed(channelId) {
  const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
  // YouTube RSS 는 멀쩡한 채널에도 간헐적 404/5xx 를 뱉는다(한 세션에 404·500 실측). 재시도로 버틴다.
  let last = 0;
  for (let i = 0; i < 5; i++) {
    const res = await fetch(url, {
      headers: { 'user-agent': 'Mozilla/5.0 (aztomz youtube-summarize)' },
      signal: AbortSignal.timeout(20000),
    });
    if (res.ok) return parseFeed(await res.text());
    last = res.status;
    if (i < 4) await new Promise((r) => setTimeout(r, 2000 * 2 ** i));   // 2·4·8·16s
  }
  throw new Error(`RSS ${last} (5회 재시도 실패) — 채널ID(${channelId}) 확인 필요`);
}

/* ── YouTube Data API 경로 (키 있으면 이게 주 경로 — RSS 보다 안정적) ── */
const YT_API = 'https://www.googleapis.com/youtube/v3';
async function listViaApi(channelId, key) {
  const chRes = await fetch(`${YT_API}/channels?part=contentDetails&id=${channelId}&key=${key}`,
    { signal: AbortSignal.timeout(20000) });
  if (!chRes.ok) throw new Error(`channels ${chRes.status}`);
  const uploads = (await chRes.json()).items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!uploads) throw new Error(`업로드 재생목록 없음 — 채널ID(${channelId}) 확인`);
  // 최근 50개(쿼터 ~2단위). RSS 의 15개 창보다 넓어 대량 업로드일에도 덜 놓친다.
  const res = await fetch(`${YT_API}/playlistItems?part=snippet,contentDetails&maxResults=50&playlistId=${uploads}&key=${key}`,
    { signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`playlistItems ${res.status}`);
  const out = [];
  for (const it of (await res.json()).items || []) {
    const vid = it.contentDetails?.videoId;
    const title = it.snippet?.title || '';
    if (!vid || title === 'Private video' || title === 'Deleted video') continue;   // 삭제·비공개분 스킵
    out.push({
      videoId: vid,
      title: decode(title),
      publishedAt: (it.contentDetails?.videoPublishedAt || it.snippet?.publishedAt || '').slice(0, 10),
      author: it.snippet?.videoOwnerChannelTitle || 'AI Engineer',
    });
  }
  return out;
}

/** 키 있으면 API(안정), 없으면 RSS(키 불필요·간헐 실패). */
async function listRecent(channelId) {
  const key = env('YOUTUBE_API_KEY', { required: false });
  if (key) {
    try { return await listViaApi(channelId, key); }
    catch (e) { console.warn(`  ⚠ API 조회 실패(${String(e.message).slice(0, 60)}) — RSS 로 폴백`); }
  }
  return fetchFeed(channelId);
}

/* ── 이미 요약한 videoId 집합 (파일명이 곧 seen) ── */
function seenIds() {
  if (!existsSync(OUT_DIR)) return new Set();
  const ids = new Set();
  for (const f of readdirSync(OUT_DIR)) {
    const m = f.match(/-([A-Za-z0-9_-]{11})\.md$/);
    if (m) ids.add(m[1]);
  }
  return ids;
}

/* ── 요약 프롬프트 (영상 내용에만 근거, 지어내기 금지) ── */
function prompt(v) {
  return `당신은 AI 엔지니어링 컨퍼런스 발표를 한국어로 정리하는 전문 요약가입니다.
아래 영상을 실제로 보고, **영상에 나온 내용에만 근거해** 상세히 정리하세요.
영상에 없는 사실·수치·인명을 지어내지 마세요. 모르면 "영상에서 불명"으로 두세요.

영상 제목: ${v.title}

다음 마크다운 형식으로 한국어로 작성(제목 헤더는 빼고 ## 섹션부터):

## 한 줄 요약
핵심을 한 문장으로.

## 발표자·소속
누가, 어디 소속인지(영상/화면에 나온 대로).

## 핵심 주장
- 3~6개. 각 항목 2~3문장, 근거·맥락 포함.

## 세부 내용
발표 흐름을 따라 문단으로 상세히. 데모·수치·아키텍처·도구·코드가 나오면 구체적으로.

## 인상적인 대목
- 기억할 만한 관점이나 문장. 인용은 짧게(한 문장 이내), 큰따옴표로.

## 실무 적용 포인트
- 엔지니어가 바로 참고할 수 있는 것 2~4개.

만약 음성·자막이 전혀 없어 내용 파악이 불가능하면, 위 형식 대신
"> ⚠️ 요약 불가: 영상에 음성/자막이 없어 내용을 파악할 수 없습니다." 한 줄만 출력하세요.`;
}

async function summarize(v) {
  const url = `https://www.youtube.com/watch?v=${v.videoId}`;
  const text = await ask(prompt(v), {
    model: MODEL_ID,
    temperature: 0.3,
    maxTokens: 16384,
    parts: [{ fileData: { fileUri: url } }],
    ...(LOWRES ? { mediaResolution: 'MEDIA_RESOLUTION_LOW' } : {}),
  });
  return text.trim();
}

function writeSummary(v, body) {
  const today = new Date().toISOString().slice(0, 10);
  const file = join(OUT_DIR, `${v.publishedAt}-${v.videoId}.md`);
  const md = `---
title: ${JSON.stringify(v.title)}
videoId: ${v.videoId}
url: https://www.youtube.com/watch?v=${v.videoId}
channel: ${JSON.stringify(v.author || 'AI Engineer')}
publishedAt: ${v.publishedAt}
summarizedAt: ${today}
model: ${MODEL_ID}
---

# ${v.title}

🔗 https://youtu.be/${v.videoId} · 📅 ${v.publishedAt} · 🎙 ${v.author || 'AI Engineer'}

${body}
`;
  writeFileSync(file, md, 'utf8');
  return file;
}

/** youtube-summaries/README.md 인덱스 재생성(최신 발행순). */
function rebuildIndex() {
  const rows = [];
  for (const f of readdirSync(OUT_DIR)) {
    if (!f.endsWith('.md') || f === 'README.md') continue;
    const fm = readFileSync(join(OUT_DIR, f), 'utf8').slice(0, 500);
    const title = (fm.match(/^title:\s*(.+)$/m)?.[1] || f).replace(/^"|"$/g, '');
    const pub = fm.match(/^publishedAt:\s*(.+)$/m)?.[1] || '';
    rows.push({ f, title, pub });
  }
  rows.sort((a, b) => b.pub.localeCompare(a.pub) || b.f.localeCompare(a.f));
  const body = `# AI Engineer 영상 요약

채널 [AI Engineer](https://www.youtube.com/@aiDotEngineer) 의 새 영상을 Gemini 로 자동 요약한 모음입니다.
생성: \`backend/scripts/youtube-summarize.mjs\` (GitHub Actions \`youtube-summary\` 크론).

총 **${rows.length}개**.

| 발행일 | 제목 |
|---|---|
${rows.map((r) => `| ${r.pub} | [${r.title.replace(/\|/g, '\\|')}](${r.f}) |`).join('\n')}
`;
  writeFileSync(join(OUT_DIR, 'README.md'), body, 'utf8');
}

async function main() {
  console.log(`▶ 채널 ${CHANNEL} 조회…`);
  const feed = await listRecent(CHANNEL);
  const seen = seenIds();
  const fresh = feed.filter((v) => !seen.has(v.videoId));
  console.log(`  피드 ${feed.length}건 · 기존 ${seen.size}건 · 신규 ${fresh.length}건`);

  const todo = fresh.slice(0, LIMIT);
  if (fresh.length > LIMIT) console.log(`  ⚠ 신규 ${fresh.length}건 중 ${LIMIT}건만 처리(--limit). 나머지는 다음 실행에서.`);
  if (!todo.length) { console.log('처리할 신규 영상 없음.'); return; }

  if (DRY) {
    console.log('\n[--dry] 요약 대상:');
    todo.forEach((v) => console.log(`  ${v.publishedAt}  ${v.videoId}  ${v.title}`));
    return;
  }

  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
  let ok = 0;
  for (const v of todo) {
    process.stdout.write(`  · ${v.title.slice(0, 60)}… `);
    try {
      const file = writeSummary(v, await summarize(v));
      ok++;
      console.log(`✅ → ${file.replace(repoRoot + '\\', '').replace(repoRoot + '/', '')}`);
    } catch (e) {
      console.log(`❌ ${String(e.message).slice(0, 100)} — 건너뜀(다음 실행 재시도)`);
    }
  }
  if (ok) rebuildIndex();
  console.log(`\n완료: ${ok}/${todo.length} 요약.`);
}

/* ── 오프라인 자가검사 (API 없음): node youtube-summarize.mjs --selftest ── */
function selftest() {
  const a = (cond, msg) => { if (!cond) { console.error('✗', msg); process.exitCode = 1; } else console.log('✓', msg); };
  const xml = `<feed><title>AI Engineer</title>
    <entry><yt:videoId>1UmZHb_E_SM</yt:videoId><title>Web Data &amp; AI — Oxylabs</title>
      <author><name>AI Engineer</name></author><published>2026-08-14T17:00:03+00:00</published></entry>
    <entry><yt:videoId>Ot4OPrPH4xY</yt:videoId><title>Context-as-a-Service</title>
      <author><name>AI Engineer</name></author><published>2026-08-13T10:00:00+00:00</published></entry>
  </feed>`;
  const p = parseFeed(xml);
  a(p.length === 2, `엔트리 2건 파싱 (got ${p.length})`);
  a(p[0].videoId === '1UmZHb_E_SM', 'videoId 추출');
  a(p[0].title === 'Web Data & AI — Oxylabs', `제목 엔티티 디코드 (got "${p[0].title}")`);
  a(p[0].publishedAt === '2026-08-14', 'publishedAt 10자리');
  // 채널 최상위 <title>AI Engineer</title> 가 엔트리로 새지 않아야 한다(entry 블록만 파싱)
  a(!p.some((v) => v.title === 'AI Engineer'), '피드 채널 제목이 영상으로 오인되지 않음');
  // seen 정규식: 파일명에서 11자리 videoId 복원
  const m = '2026-08-14-1UmZHb_E_SM.md'.match(/-([A-Za-z0-9_-]{11})\.md$/);
  a(m && m[1] === '1UmZHb_E_SM', 'seen: 파일명→videoId 복원');
}

if (has('--selftest')) selftest();
else main().catch((e) => { console.error('✗', e.message); process.exit(1); });
