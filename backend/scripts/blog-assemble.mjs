#!/usr/bin/env node
/* ============================================================
   에이전트 산출물 조립 — 마크다운 + 메타 → 발행용 HTML

   에이전트 파이프라인(조사 → 정리 → 글쓰기 → SEO → 검증)의 마지막 결정적 단계.
   LLM 은 마크다운만 쓰고, HTML 변환·살균·기계검사는 여기서 코드가 한다.

   입력:  backend/out/blog/<slug>.md      (글쓰기 에이전트)
          backend/out/blog/<slug>.json    (SEO 에이전트 — title/tags/desc/category)
   출력:  backend/out/blog/<slug>.html    (blog-publish.mjs 가 그대로 받는 형식)

   실행: node backend/scripts/blog-assemble.mjs <slug>
   ============================================================ */
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { md2html } from './lib/md.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const outDir = join(repoRoot, 'backend', 'out', 'blog');
const researchDir = join(repoRoot, 'backend', 'blog', 'research');

const slug = process.argv.slice(2).find((a) => !a.startsWith('--'));
if (!slug) { console.error('사용법: node backend/scripts/blog-assemble.mjs <slug>'); process.exit(1); }

const mdPath = join(outDir, `${slug}.md`);
const metaPath = join(outDir, `${slug}.json`);
for (const p of [mdPath, metaPath]) {
  if (!existsSync(p)) { console.error(`✗ 없음: ${p}`); process.exit(1); }
}

const md = await readFile(mdPath, 'utf8');
const meta = JSON.parse(await readFile(metaPath, 'utf8'));

/* 허용 URL — 조사 파일에 실제로 있던 것만. 여기 없는 링크는 지어낸 링크다.
   LLM 검증은 누락에 약하므로(링크를 다 빼도 통과시킨다) 문자열로 직접 센다. */
/* 조사 파일은 기본적으로 slug 와 같은 이름이지만, 한 조사로 곡별 글 여러 편을 뽑을 땐
   slug 가 달라진다(city-pop-80s-still-fresh 조사 → yasuha-friday-chinatown 글).
   post-build.mjs 와 같은 --research= 규약으로 지정한다. */
const rArg = (process.argv.find((a) => a.startsWith('--research=')) || '').slice('--research='.length);
const rPath = rArg
  ? (rArg.endsWith('.json') ? rArg : join(researchDir, `${rArg}.json`))
  : join(researchDir, `${slug}.json`);
if (rArg && !existsSync(rPath)) { console.error(`✗ 조사 파일 없음: ${rPath}`); process.exit(1); }
const research = existsSync(rPath) ? JSON.parse(await readFile(rPath, 'utf8')) : null;
// relatedVideos(리믹스·커버)도 songs 와 동급 출처다 — 여기 빠지면 정상 임베드/링크가 '지어낸 URL'로 오탐된다.
const allSongEntries = (research?.songs || []).flatMap((s) => [s, ...(s.relatedVideos || [])]);
// ai-prompt-pack 은 '사실 검증'이 아니라 '트렌드 발굴' 조사를 쓴다(프로파일 pipeline.trendResearch).
// 그 산출물은 sources[] 가 아니라 candidates[].evidence[] 구조라, 여기 빼면 멀쩡한 근거 링크가
// 전부 '지어낸 URL'로 막힌다(2026-07-30 실측 — 키링 프롬프트 팩 첫 조립에서 걸림).
const allEvidence = (research?.candidates || []).flatMap((c) => c.evidence || []);
const allowed = [
  ...(research?.sources || []).map((s) => s.url),
  ...allEvidence.map((e) => e.url),
  ...allSongEntries.map((s) => s.url),
  ...allSongEntries.map((s) => s.lyricsUrl),  // 가사는 인용 금지 → 공식 가사 페이지 '링크'가 필수다
  ...(meta.internalLinks || []),
].filter(Boolean);

const problems = [];
// 코드블록 안 URL(예: 에러 메시지의 localhost:8080, 샘플 코드의 예시 주소)은 인용 링크가 아니라
// 예시 텍스트다 — "지어낸 URL" 검사에서 빼지 않으면 web-error/dev-tool 류 글이 전부 막힌다.
const mdWithoutCode = md.replace(/```[\s\S]*?```/g, '');
const inText = [...mdWithoutCode.matchAll(/https?:\/\/[^\s)"'\]]+/g)].map((m) => m[0].replace(/[.,)]+$/, ''));
if (allowed.length) {
  const used = allowed.filter((u) => md.includes(u)).length;
  const need = Math.min(3, allowed.length);
  if (used < need) problems.push(`출처 링크 ${used}개 (최소 ${need}개 필요) — 조사 파일의 url 을 그대로 본문에 넣어야 한다`);
  const invented = [...new Set(inText.filter((u) => !allowed.some((a) => u.startsWith(a) || a.startsWith(u))))];
  if (invented.length) problems.push(`조사에 없는 URL: ${invented.slice(0, 5).join(' , ')}`);
}
if (/```[\s\S]*?```/.test(md) === false && /코드/.test(meta.title || '')) {
  problems.push('제목은 코드를 다루는데 본문에 코드블록이 없다');
}

/* 말투 — 프로파일의 tone.formality 를 지켰는지 기계로 센다.
   00_common.md 가 "프로파일의 tone.formality 를 따른다"고만 하는 간접 지시라 그냥 무시되는 일이
   있었다(2026-07-28 실측: 해요체 프로파일인데 합니다체 31 / 해요체 0). LLM 검수는 이런 걸 잘 놓친다. */
const profPath = meta.categoryId
  ? join(repoRoot, 'backend', 'blog', 'categories', `${meta.categoryId}.json`) : null;
if (profPath && existsSync(profPath)) {
  const prof = JSON.parse(await readFile(profPath, 'utf8'));
  const want = prof?.tone?.formality;
  if (want) {
    const prose = mdWithoutCode.replace(/\[IMG:[^\]]*\]/g, '');
    const hap = (prose.match(/니다[.!?]/g) || []).length;      // 합니다체
    const haeyo = (prose.match(/(어요|에요|예요|아요)[.!?]/g) || []).length;  // 해요체
    if (want.includes('해요') && hap > haeyo) {
      problems.push(`말투가 프로파일과 다르다 — 해요체여야 하는데 합니다체 ${hap} / 해요체 ${haeyo}`);
    } else if (want.includes('습니다') && haeyo > hap) {
      problems.push(`말투가 프로파일과 다르다 — 합니다체여야 하는데 해요체 ${haeyo} / 합니다체 ${hap}`);
    }
  }
}

/* 본문 그림 — [FIG: id | 캡션 | 출처명 | 출처URL] 이 메타 figures[] 와 짝이 맞는지.
   짝이 안 맞으면 발행 때 빈 자리로 사라지고(조용한 실패), 출처 없는 자료화면이 새면 저작권 문제다. */
const figRefs = [...md.matchAll(/^\s*\[FIG:\s*([A-Za-z0-9_-]+)\s*(?:\|([^\]]*))?\]\s*$/gim)]
  .map((m) => ({ id: m[1], rest: (m[2] || '').split('|').map((s) => s.trim()) }));
const figDefs = new Map((meta.figures || []).map((f) => [f.id, f]));
for (const ref of figRefs) {
  const def = figDefs.get(ref.id);
  if (!def) { problems.push(`본문 [FIG: ${ref.id}] 인데 메타 figures 에 정의가 없다`); continue; }
  if (def.kind === 'shot') {
    // 남의 화면을 찍은 것이다 — 출처 URL 이 캡션에 없으면 안 된다. 그리고 그 URL 은
    // 우리가 이미 인용 중인 출처여야 한다(아무 페이지나 찍어 올리는 걸 막는다).
    const capUrl = ref.rest.find((s) => /^https?:\/\//.test(s));
    if (!capUrl) problems.push(`[FIG: ${ref.id}] 는 화면 캡처(shot)인데 캡션에 출처 URL 이 없다`);
    else if (allowed.length && !allowed.some((a) => capUrl.startsWith(a) || a.startsWith(capUrl))) {
      problems.push(`[FIG: ${ref.id}] 캡션의 출처 URL 이 조사에 없다: ${capUrl}`);
    }
    if (def.url && capUrl && !(def.url.startsWith(capUrl) || capUrl.startsWith(def.url))) {
      problems.push(`[FIG: ${ref.id}] 캡처한 주소(${def.url})와 캡션 출처(${capUrl})가 다르다`);
    }
  }
}
for (const f of figDefs.keys()) {
  if (!figRefs.some((r) => r.id === f)) problems.push(`메타 figures 의 "${f}" 가 본문에 안 쓰였다`);
}

/* 영상 임베드 — 조사에 있는 영상만, 그리고 실제로 임베드가 되는 것만.
   oembed 401/404 인 영상을 넣으면 독자에게 '재생 없음' 검은 상자가 뜬다(CLAUDE.md 철칙). */
const embedIds = [...new Set([...md.matchAll(/^\s*\[YT:\s*([A-Za-z0-9_-]{11})\s*(?:\||\])/gim)].map((m) => m[1]))];
const songIds = allSongEntries
  .map((s) => s.videoId || (/[?&]v=([A-Za-z0-9_-]{11})/.exec(s.url || '') || [])[1])
  .filter(Boolean);
for (const id of embedIds) {
  if (songIds.length && !songIds.includes(id)) {
    problems.push(`조사에 없는 영상 임베드: ${id} — 조사 파일의 곡 영상만 넣을 수 있다`);
    continue;
  }
  const r = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`,
    { signal: AbortSignal.timeout(15000) }).catch(() => null);
  if (!r || !r.ok) problems.push(`임베드 불가 영상: ${id} (oembed ${r ? r.status : '요청 실패'}) — 넣으면 '재생 없음'으로 뜬다`);
}

/* 트렌드 글(광고/신뢰 점수가 없는 type)인데 상세페이지 CTA 에서 "점수"를 보라고 안내하면,
   독자가 링크를 타도 약속한 점수가 없다 — trend.html 은 신뢰분석이 아니면 '유행 단계' 박스만
   렌더한다(clown/purple 실측 반려 2건). trend.html 링크가 걸린 문단에 '점수'가 있으면 막는다. */
const tType = research?.trend?.type;
const isTrend = tType && tType !== '신뢰분석'
  && research?.trend?.ad == null && research?.trend?.trust == null;
if (isTrend) {
  for (const para of md.split(/\n{2,}/)) {
    if (/trend\.html\?id=/.test(para) && /점수/.test(para)) {
      problems.push('트렌드 글인데 상세페이지 CTA 에 "점수" 안내가 있다 — 트렌드엔 점수가 없다. "유행 단계와 한끗 판단"으로 고쳐라');
      break;
    }
  }
}

if (problems.length) {
  console.error('✗ 조립 중단 — 기계검사 위반:');
  problems.forEach((p) => console.error(`   ✗ ${p}`));
  process.exit(1);
}

/* builtAt 이 오늘이 아니면 경고(하드코딩 실수로 어제 날짜가 박히는 사고가 반복됐다). 전날 초안을
   다음날 올리는 정상 케이스도 있어 막지는 않고 알리기만 한다. */
if (meta.builtAt && meta.builtAt !== new Date().toISOString().slice(0, 10)) {
  console.warn(`  ⚠ meta.builtAt(${meta.builtAt}) 가 오늘이 아니다 — 의도한 게 아니면 고쳐라`);
}

const today = new Date().toISOString().slice(0, 10);
/* 각주는 '작성일'만 남긴다 — 예전엔 "사실 확인이 안 된 항목은 본문에 그렇게 표시했습니다"를
   늘 붙였는데, 정작 본문에 그런 표시가 없는 경우가 대부분이라 거짓 고지였다(반복 지적). */
const html = '<!--COVER-->\n' + md2html(md)
  + `\n<p style="font-size:.85em;color:#6b7280;margin-top:2em">${today} 작성</p>\n`;

await writeFile(join(outDir, `${slug}.html`), html, 'utf8');

const text = html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
console.log(`✓ 조립 완료: backend/out/blog/${slug}.html`);
console.log(`  본문 ${text.length}자 · h2 ${(html.match(/<h2>/g) || []).length}개 · 링크 ${(html.match(/<a /g) || []).length}개`);
console.log(`  다음: node backend/scripts/blog-verify.mjs ${slug} && node backend/scripts/blog-publish.mjs ${slug}`);
