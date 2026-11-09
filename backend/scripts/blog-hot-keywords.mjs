#!/usr/bin/env node
/* ============================================================
   지금 급상승 중인 검색어 후보 — 네이버 시간당 글 주제 선정의 참고 자료 (읽기 전용, 발행·쓰기 없음)

   출처: Google 트렌드 한국 급상승 RSS (https://trends.google.com/trending/rss?geo=KR)
         - 공개 RSS 피드이고 robots.txt 는 /explore 만 막는다. 로그인·키 없음.
         - blogchart.co.kr 는 약관(서비스 정보의 무단 상업적 이용 금지)·유료 영역 때문에 쓰지 않는다(2026-11-09).
   이 스크립트는 "무엇이 지금 화제인가"만 알려준다. 글의 사실·수치·문장은 여기서 가져오지 않는다 —
   고른 주제는 blog-hourly-naver 스킬이 따로 조사·팩트체크한다(주제 힌트일 뿐).

   걸러내는 것:
     1) 민감 주제 — 사건·사고·범죄·재난, 개인 신상/연예인 사생활, 정치·재판, 의료·금융 단정성
     2) 글감이 못 되는 것 — 퀴즈 정답·로또·경기 결과·날씨
     3) 이미 쓴 글과 겹치는 것 — posted-naver.json·posted.json·backend/out/blog/*.json(제목·태그·slug)·keywords.done.csv

   실행: node backend/scripts/blog-hot-keywords.mjs [--json] [--limit=10]
   실패해도 exit 0 (출처를 못 읽으면 "UNAVAILABLE" 만 출력 — 호출한 쪽은 기존 주제 선정으로 대체한다).
   ============================================================ */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const outDir = join(root, 'backend', 'out', 'blog');
const FEED = 'https://trends.google.com/trending/rss?geo=KR';
const args = process.argv.slice(2);
const has = (k) => args.includes(`--${k}`);
const val = (k, d) => (args.find((a) => a.startsWith(`--${k}=`)) || '').split('=')[1] ?? d;
const limit = Number(val('limit', 10));

const SENSITIVE = /사망|숨져|숨진|참변|사고|화재|폭발|추락|침몰|살인|폭행|성폭|성범죄|납치|실종|자살|극단|테러|전쟁|지진|태풍|폭우|재난|불륜|이혼|결별|열애|결혼설|사생활|루머|논란|의혹|고소|고발|구속|기소|체포|수사|재판|판결|선고|검찰|경찰|국회|대통령|탄핵|선거|여당|야당|의원|확진|감염|백신|암\b|수술|질환|증상|치료|처방|주가|코스피|코스닥|나스닥|환율|비트코인|코인|리플|이더리움|증시|급락|급등주|상한가|대출|금리|부고|별세|빈소|추모/;
const LOW_VALUE = /정답|퀴즈|로또|당첨번호|오늘의 ?운세|띠별|날씨|미세먼지|스코어|결과|중계|순위|라인업|vs\b|\bvs|경기|시청률|재방송|다시보기|몇부작|출연진/;

const norm = (s) => String(s || '').toLowerCase().replace(/[^0-9a-z가-힣]/g, '');

function readJson(p, d = {}) { try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return d; } }

function existingTexts() {
  const texts = [];
  for (const f of ['posted-naver.json', 'posted.json']) {
    for (const [id, v] of Object.entries(readJson(join(outDir, f)))) {
      texts.push(id, v?.title, v?.keyword);
    }
  }
  if (existsSync(outDir)) {
    for (const f of readdirSync(outDir).filter((n) => n.endsWith('.json') && !n.startsWith('.') && !/posted|queue|check|figures/.test(n))) {
      const m = readJson(join(outDir, f), null);
      if (!m || typeof m !== 'object') continue;
      texts.push(f.replace(/\.json$/, ''), m.title, m.keyword, ...(Array.isArray(m.tags) ? m.tags : []));
    }
  }
  const done = join(root, 'backend', 'blog', 'keywords.done.csv');
  if (existsSync(done)) for (const line of readFileSync(done, 'utf8').split('\n').slice(1)) texts.push(line.split(',')[0]);
  return texts.filter(Boolean).map(norm).filter((t) => t.length >= 2);
}

function parseItems(xml) {
  const items = [];
  for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const b = m[1];
    const pick = (re) => (b.match(re) || [])[1];
    const unesc = (s) => String(s || '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'");
    const title = unesc(pick(/<title>([\s\S]*?)<\/title>/)).trim();
    const traffic = Number((pick(/<ht:approx_traffic>([\s\S]*?)<\/ht:approx_traffic>/) || '0').replace(/[^0-9]/g, '')) || 0;
    const pubDate = pick(/<pubDate>([\s\S]*?)<\/pubDate>/);
    const news = [...b.matchAll(/<ht:news_item_title>([\s\S]*?)<\/ht:news_item_title>/g)].map((x) => unesc(x[1]).trim()).slice(0, 3);
    if (title) items.push({ keyword: title, traffic, pubDate, news });
  }
  return items;
}

async function main() {
  let xml;
  try {
    const res = await fetch(FEED, { headers: { 'user-agent': 'Mozilla/5.0 (az2mz blog topic helper)' }, signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    xml = await res.text();
  } catch (e) {
    console.log(`UNAVAILABLE: 급상승 피드를 읽지 못했습니다(${e.message}) — 기존 주제 선정(한끗 트렌드 → 백로그 → 발굴)으로 진행하세요.`);
    return;
  }
  const items = parseItems(xml);
  if (!items.length) { console.log('UNAVAILABLE: 피드에 항목이 없습니다 — 기존 주제 선정으로 진행하세요.'); return; }

  const existing = existingTexts();
  const kept = [];
  const dropped = { sensitive: 0, lowValue: 0, duplicate: 0 };
  for (const it of items) {
    const blob = [it.keyword, ...it.news].join(' ');
    if (SENSITIVE.test(blob)) { dropped.sensitive++; continue; }
    if (LOW_VALUE.test(it.keyword)) { dropped.lowValue++; continue; }
    const k = norm(it.keyword);
    if (k.length < 2) continue;
    if (existing.some((t) => t.includes(k) || (t.length >= 4 && k.includes(t)))) { dropped.duplicate++; continue; }
    kept.push(it);
  }
  kept.sort((a, b) => b.traffic - a.traffic);
  const top = kept.slice(0, limit);
  if (has('json')) { console.log(JSON.stringify({ source: FEED, fetched: items.length, dropped, candidates: top }, null, 2)); return; }
  console.log(`급상승 ${items.length}건 → 후보 ${kept.length}건 (제외: 민감 ${dropped.sensitive} · 글감 아님 ${dropped.lowValue} · 이미 다룸 ${dropped.duplicate})`);
  top.forEach((c, i) => console.log(`${i + 1}. ${c.keyword}  (검색량 ${c.traffic}+)${c.news[0] ? '  — 기사: ' + c.news[0] : ''}`));
  console.log('\n※ 주제 힌트일 뿐이다. 기사 문장·수치를 글에 가져오지 말고, 고른 주제는 직접 조사·팩트체크해라.');
}

main().catch((e) => console.log(`UNAVAILABLE: ${e.message}`));
