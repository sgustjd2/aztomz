#!/usr/bin/env node
/* ============================================================
   한끗 트렌드 → 블로그 주제 선정 (결정적 · LLM 없음)

   Hermes 가 매일 21:30 수집·검증해 trends.json 에 넣은 항목 중 블로그로 쓸 1건을 고르고,
   에이전트 파이프라인이 그대로 먹을 수 있는 조사 파일로 내보낸다.

   왜 이 스크립트가 필요한가:
   · 조사가 이미 끝나 있다 — src 는 auto-build.mjs 가 생존·본문관련성까지 검증한 URL 이다.
     블로그 파이프라인이 같은 주제를 다시 검색할 이유가 없다.
   · 선정은 판단이 아니라 규칙이다 — LLM 에 맡기면 매번 다르게 고르고 중복도 못 막는다.

   실행:
     node backend/scripts/blog-pick-trend.mjs            # 오늘의 1건 골라 조사 파일 생성
     node backend/scripts/blog-pick-trend.mjs --id=<id>  # 특정 트렌드 지정
     node backend/scripts/blog-pick-trend.mjs --list     # 후보만 보여주고 파일은 안 만듦
     node backend/scripts/blog-pick-trend.mjs --dry      # 고르되 파일은 안 씀
   ============================================================ */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const trendsPath = join(repoRoot, 'backend', 'data', 'trends.json');
const researchDir = join(repoRoot, 'backend', 'blog', 'research');
const postedPath = join(repoRoot, 'backend', 'out', 'blog', 'posted.json');

/* Vercel 프로젝트 이름이 az2mz 라 배포 도메인도 az2mz.vercel.app 이다.
   aztomz.vercel.app 은 초기에 만들었다 버린 별개 프로젝트로, 2026-06-07 상태에서 멈춘 채
   아직 응답한다 — 그래서 링크가 깨진 게 아니라 '옛 데이터가 나오는' 형태로 조용히 틀렸다.
   블로그 4편이 그 도메인을 걸고 발행된 뒤에야 발견됨(2026-07-29). 도메인을 바꿀 땐
   두 곳(여기 + blog-build.mjs)을 같이 고쳐야 한다. */
const SITE = process.env.HANGEUT_SITE || 'https://az2mz.vercel.app';

const argv = process.argv.slice(2);
const has = (f) => argv.includes(`--${f}`);
const flag = (n) => (argv.find((a) => a.startsWith(`--${n}=`)) || '').split('=').slice(1).join('=');

/* 끝물은 블로그로 쓰지 않는다 — 지금 검색될 이유가 없는 주제다. */
const DYING = /하락|끝물|한물/;

/* 트렌드 cat → 블로그 카테고리 프로파일.
   신뢰분석(광고 의심도·후기 신뢰도 점수가 있는 것)은 성격이 완전히 달라 따로 간다. */
const catProfile = (t) => (t.type === '신뢰분석' ? 'hangeut-trust' : 'hangeut-trend');

/* 요일마다 다른 분야를 우선해 한 카테고리만 연달아 나가지 않게 한다.
   (Hermes 수집이 요일 로테이션이라 최신순으로만 뽑으면 같은 분야가 몰린다) */
const DOW_PREF = [
  ['AI 프롬프트'],          // 일
  ['디저트', '맛집'],        // 월
  ['맛집', '카페·핫플'],     // 화
  ['카페·핫플', '디저트'],   // 수
  ['신조어'],               // 목
  ['노래·챌린지'],           // 금
  ['패션'],                 // 토
];

function blogWorthy(t, postedIds) {
  if (postedIds.has(t.id)) return '이미 발행';
  if (!(t.src || []).length) return '출처 없음';
  if (!(t.article || []).length) return '본문(article) 없음';
  if (t.stage && DYING.test(t.stage)) return '한물감';
  if (!t.title || !t.verdict) return '제목/판단 없음';
  return null;
}

const main = async () => {
  const data = JSON.parse(await readFile(trendsPath, 'utf8'));
  const trends = data.trends || data;

  const posted = existsSync(postedPath)
    ? JSON.parse(await readFile(postedPath, 'utf8')) : {};
  const postedIds = new Set(Object.keys(posted));

  const candidates = [];
  const rejected = [];
  for (const t of trends) {
    const why = blogWorthy(t, postedIds);
    if (why) rejected.push({ id: t.id, why });
    else candidates.push(t);
  }

  if (!candidates.length) {
    console.error('✗ 블로그로 쓸 트렌드가 없습니다.');
    console.error(`  전체 ${trends.length}건 · 제외 사유: ` +
      Object.entries(rejected.reduce((a, r) => (a[r.why] = (a[r.why] || 0) + 1, a), {}))
        .map(([k, v]) => `${k} ${v}`).join(' · '));
    process.exit(1);
  }

  // 최신 우선(analyzedAt 내림차순)
  const byFresh = [...candidates].sort((a, b) =>
    String(b.analyzedAt || '').localeCompare(String(a.analyzedAt || '')));

  if (has('list')) {
    console.log(`블로그 가능 ${candidates.length}건 (전체 ${trends.length}건 중):`);
    byFresh.slice(0, 20).forEach((t) => console.log(
      `  ${t.analyzedAt} | ${t.type} | ${t.cat} | ${t.id} | ${t.title}`));
    if (candidates.length > 20) console.log(`  ... 외 ${candidates.length - 20}건`);
    return;
  }

  let picked;
  if (flag('id')) {
    picked = candidates.find((t) => t.id === flag('id'));
    if (!picked) {
      const why = rejected.find((r) => r.id === flag('id'));
      console.error(`✗ 후보에 없음: ${flag('id')}${why ? ` (${why.why})` : ''}`);
      process.exit(1);
    }
  } else {
    // 요일 선호 분야 → 없으면 최신순 전체에서
    const pref = DOW_PREF[new Date().getDay()];
    picked = byFresh.find((t) => pref.includes(t.cat)) || byFresh[0];
  }

  const profile = catProfile(picked);
  const detailUrl = `${SITE}/trend.html?id=${encodeURIComponent(picked.id)}`;

  /* 조사 파일 — 파이프라인(blog-writer/blog-assemble)이 그대로 쓴다.
     sources[].url 이 blog-assemble 의 URL 허용목록이 되므로, 트렌드가 검증한 출처만 넣는다. */
  const research = {
    keyword: picked.title,
    categoryId: profile,
    slug: picked.id,
    searchedAt: new Date().toISOString().slice(0, 10),
    origin: 'hermes-trends',
    note: 'Hermes 가 수집·분석하고 auto-build.mjs 가 출처까지 자동검증한 항목이다. '
      + '여기 있는 사실 밖으로 나가지 말 것 — 새로 검색해서 덧붙이지 않는다.',
    trend: {
      id: picked.id, type: picked.type, cat: picked.cat, title: picked.title,
      def: picked.def || null, excerpt: picked.excerpt || null, pull: picked.pull || null,
      verdict: picked.verdict, stage: picked.stage || null, stageMsg: picked.stageMsg || null,
      buzz: picked.buzz || null, label: picked.label || null,
      ad: Number.isFinite(picked.ad) ? picked.ad : null,
      trust: Number.isFinite(picked.trust) ? picked.trust : null,
      sat: picked.sat || null,
      satTxt: picked.satTxt || null,
      // 점수의 '근거'다 — {ad:[], trust:[], sat:[]}. 이게 없으면 글이 점수만 나열하고
      // 왜 그렇게 봤는지를 못 쓴다(2026-07-28 팩트체커 지적으로 추가).
      reasons: picked.reasons || null,
      recs: picked.recs || [], tags: picked.tags || [],
      article: picked.article || [],
      shops: picked.shops || [],
      prompt: picked.prompt || null,
      pureKorean: picked.pureKorean || null,
      // 신조어의 실제 예문. hangeut-trend 의 "실제로 어떻게 쓰나요" 절이 이걸 쓴다.
      example: picked.example || null,
      // {youtube: '<videoId>', cap: '...'} — md.mjs 의 [YT: id | 캡션] 임베드로 넣을 수 있다.
      // 단 oembed 200 인 것만(blog-assemble 이 검사한다).
      video: picked.video || null,
      collectedAt: picked.collectedAt || null, analyzedAt: picked.analyzedAt || null,
      detailUrl,
    },
    sources: [
      ...(picked.src || []).map(([name, url]) => ({
        title: String(name || '출처'), url: String(url),
        host: (() => { try { return new URL(String(url)).host; } catch { return ''; } })(),
        tier: 'press',
        kind: 'analysis',
        body: 'Hermes 수집 시 auto-build.mjs 가 생존(404)·본문 관련성을 검증한 출처다. '
          + '본문을 여기 다시 담지 않는다 — 이 글은 trend 필드의 분석을 근거로 쓴다.',
      })),
      /* 가게 링크도 조사 출처로 넣는다. auto-build 가 죽은 가게링크를 자동 제거하므로 살아있는 것만
         남아 있다. 디저트·맛집 글은 src 가 1개뿐인 경우가 많은데(2026-07-29 실측) 정작 '어디서 파나'
         가 독자에게 제일 필요하다. 단 kind:'shop' 으로 표시해 '분석 근거'와 구분한다 —
         개인 블로그 후기를 점수의 근거처럼 인용하면 안 된다. */
      ...(picked.shops || []).filter((s) => s && s.url).map((s) => ({
        title: `가게 참고 — ${s.name}`, url: String(s.url),
        host: (() => { try { return new URL(String(s.url)).host; } catch { return ''; } })(),
        tier: 'blog',
        kind: 'shop',
        body: `${s.name}(${s.area || ''}) 참고 링크. ${s.note || ''} `
          + '어디서 파는지 안내용이지 점수의 근거가 아니다 — 분석 근거로 인용하지 말 것.',
      })),
    ],
    internalLinkCandidates: [detailUrl],
    cannotSay: [
      '광고 의심도·후기 신뢰도는 추정치다. "확실히 광고다" 같은 확정 표현 금지.',
      '후기 신뢰도(믿을 만한가) 와 만족도(좋은가) 를 섞어 쓰지 말 것 — 별개 축이다.',
      'trend 필드에 없는 수치·날짜·가게·인물을 새로 만들지 말 것. 추가 검색도 하지 않는다.',
      `분석 기준일은 ${picked.analyzedAt || '미상'} 이다. "오늘 기준" 처럼 시점을 옮겨 쓰지 말 것.`,
    ],
  };

  if (has('dry')) {
    console.log(`· dry: ${picked.id} (${picked.type}/${picked.cat}) → ${profile}`);
    console.log(`  제목: ${picked.title}`);
    console.log(`  출처 ${research.sources.length}개 · article ${(picked.article || []).length}블록`);
    return;
  }

  await mkdir(researchDir, { recursive: true });
  const out = join(researchDir, `${picked.id}.json`);
  await writeFile(out, JSON.stringify(research, null, 2) + '\n', 'utf8');

  console.log(`✓ 오늘의 주제: ${picked.title}`);
  console.log(`  id ${picked.id} · ${picked.type}/${picked.cat} · 분석일 ${picked.analyzedAt}`);
  console.log(`  카테고리 프로파일: ${profile}`);
  console.log(`  출처 ${research.sources.length}개 · article ${(picked.article || []).length}블록`);
  console.log(`  조사 파일: backend/blog/research/${picked.id}.json`);
  console.log(`  남은 후보 ${candidates.length - 1}건`);
  console.log(`\n  다음: 파이프라인으로 집필 → node backend/scripts/blog-assemble.mjs ${picked.id} --research=${picked.id}`);
};

main().catch((e) => { console.error('✗', e.message); process.exit(1); });
