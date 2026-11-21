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
import { createHmac } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const outDir = join(root, 'backend', 'out', 'blog');
const FEED = 'https://trends.google.com/trending/rss?geo=KR';
const args = process.argv.slice(2);
const has = (k) => args.includes(`--${k}`);
const val = (k, d) => (args.find((a) => a.startsWith(`--${k}=`)) || '').split('=')[1] ?? d;
const limit = Number(val('limit', 10));
try { process.loadEnvFile(join(root, '.env')); } catch { /* .env 없으면 셸 환경변수만 */ }

/* ── 시각 유형별 씨앗 단어 (2026-11-21): 이 씨앗으로 '많이 검색하는' / '급상승' 키워드를 뽑는다 ── */
const SEEDS = {
  '07:05': ['지원금', '신청', '감면', '환급', '바우처'],
  '09:05': ['할인', '세일', '예매', '요금 인상', '쿠폰'],
  '11:05': ['맛집', '웨이팅', '점심', '카페', '브런치'],
  '13:15': ['가전', '필터', '교체 주기', '소모품', '수리비'],
  '17:25': ['난방비', '타이어', '배터리 점검', '공과금', '관리비'],
  '19:35': ['근교 여행', '주차', '입장료', '숙박', '축제'],
  '21:35': ['세탁', '청소', '보관', '살림', '제철'],
};
const slot = val('slot', '');
const seeds = SEEDS[slot] || [];

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

const cnt = (v) => (typeof v === 'number' ? v : String(v ?? '').includes('<') ? 5 : Number(String(v ?? '').replace(/[^\d]/g, '')) || 0);

/* 검색광고 keywordstool: 씨앗의 연관 키워드와 월간 검색수·경쟁정도(compIdx). 키가 없으면 null */
async function adKeywords() {
  const key = process.env.NAVER_AD_API_KEY, secret = process.env.NAVER_AD_SECRET, customer = process.env.NAVER_AD_CUSTOMER;
  if (!key || !secret || !customer) return null;
  const all = new Map();
  for (const seed of seeds) {
    const ts = Date.now().toString();
    const sig = createHmac('sha256', secret).update(`${ts}.GET./keywordstool`).digest('base64');
    const res = await fetch(`https://api.searchad.naver.com/keywordstool?hintKeywords=${encodeURIComponent(seed.replace(/\s+/g, ''))}&showDetail=1`, {
      headers: { 'X-Timestamp': ts, 'X-API-KEY': key, 'X-Customer': customer, 'X-Signature': sig }, signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`검색광고 API ${res.status}`);
    for (const k of (await res.json()).keywordList || []) {
      const total = cnt(k.monthlyPcQcCnt) + cnt(k.monthlyMobileQcCnt);
      if (!all.has(k.relKeyword) || all.get(k.relKeyword).total < total) all.set(k.relKeyword, { keyword: k.relKeyword, total, comp: k.compIdx || '' });
    }
    await new Promise((r) => setTimeout(r, 400));   // 초당 3회 제한
  }
  return [...all.values()];
}

/* DataLab 검색어트렌드: 최근 7일 평균 ÷ 그 전 4주 평균. 키가 없으면 null. 5개씩 묶어 호출 */
async function dlRise(keywords) {
  // DataLab 은 꺼 둔다(2026-11-21): API 가 NAVER API HUB 로 옮겨져 개발자센터 키는 401. 2주 뒤 성과를 보고 재검토 — 켜려면 ENABLE_DATALAB=1
  if (!process.env.ENABLE_DATALAB) return null;
  const id = process.env.NAVER_CLIENT_ID, sec = process.env.NAVER_CLIENT_SECRET;
  if (!id || !sec) return null;
  const fmt = (d) => new Date(d.getTime() + 9 * 3600e3).toISOString().slice(0, 10);
  const end = new Date(Date.now() - 86400e3), start = new Date(end.getTime() - 34 * 86400e3);
  const out = new Map();
  for (let i = 0; i < keywords.length; i += 5) {
    const chunk = keywords.slice(i, i + 5);
    const res = await fetch('https://openapi.naver.com/v1/datalab/search', {
      method: 'POST', headers: { 'X-Naver-Client-Id': id, 'X-Naver-Client-Secret': sec, 'Content-Type': 'application/json' },
      body: JSON.stringify({ startDate: fmt(start), endDate: fmt(end), timeUnit: 'date', keywordGroups: chunk.map((k) => ({ groupName: k, keywords: [k] })) }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`DataLab API ${res.status}`);
    for (const r of (await res.json()).results || []) {
      const d = r.data || [];
      const recent = d.slice(-7), prev = d.slice(0, -7);
      const avg = (a) => (a.length ? a.reduce((x, y) => x + y.ratio, 0) / a.length : 0);
      const base = avg(prev);
      out.set(r.title, { recent: avg(recent), base, rise: base > 0 ? avg(recent) / base : (avg(recent) > 0 ? 99 : 0) });
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  return out;
}

async function naverSection() {
  if (!seeds.length) { console.log('[네이버 검색 키워드] UNAVAILABLE: --slot 없음(씨앗 단어 없음)'); return; }
  console.log(`[씨앗 단어: ${seeds.join(' · ')}]`);
  const existing = existingTexts();
  const usable = (kw) => !SENSITIVE.test(kw) && !LOW_VALUE.test(kw) && !existing.some((t) => { const k = norm(kw); return k.length >= 2 && (t.includes(k) || (t.length >= 4 && k.includes(t))); });
  let ad = null;
  try { ad = await adKeywords(); } catch (e) { console.log(`[많이 검색하는 키워드] UNAVAILABLE: ${e.message}`); }
  if (ad === null && !process.env.NAVER_AD_API_KEY) console.log('[많이 검색하는 키워드] UNAVAILABLE: 키 없음(NAVER_AD_API_KEY·SECRET·CUSTOMER) — 수요 미확인');
  let pool = [];
  if (ad) {
    pool = ad.filter((k) => k.total >= 100 && usable(k.keyword)).sort((a, b) => b.total - a.total).slice(0, 20);
    console.log(`[많이 검색하는 키워드 — 월간 검색수 순, 이미 쓴·민감 주제 제외]`);
    pool.slice(0, 15).forEach((k, i) => console.log(`${i + 1}. ${k.keyword}  (월 ${k.total.toLocaleString()} · 경쟁 ${k.comp || '-'})`));
  }
  let rise = null;
  try { rise = await dlRise((pool.length ? pool.map((k) => k.keyword) : seeds.filter(usable))); } catch (e) { console.log(`[급상승 키워드] UNAVAILABLE: ${e.message}`); }
  if (rise === null) console.log('[급상승 키워드] 사용 안 함(DataLab 꺼 둠) — 오름폭 미확인. 급상승은 아래 Google 트렌드를 본다');
  if (rise) {
    console.log('[급상승 키워드 — 최근 7일 ÷ 직전 4주 평균, 오름폭 큰 순]');
    [...rise.entries()].filter(([, v]) => v.recent > 0).sort((a, b) => b[1].rise - a[1].rise).slice(0, 10)
      .forEach(([k, v], i) => console.log(`${i + 1}. ${k}  (×${v.rise.toFixed(2)})`));
  }
  console.log('');
}

async function main() {
  await naverSection().catch((e) => console.log(`[네이버 검색 키워드] UNAVAILABLE: ${e.message}`));
  console.log('[Google 트렌드 급상승 — 보조]');
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
