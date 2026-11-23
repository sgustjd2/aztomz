#!/usr/bin/env node
/* ============================================================
   검색수요 게이트 — 네이버 검색광고 키워드도구 API 로 주제 후보의 월간 검색수를 조회
   (결정적 · LLM 없음)

   왜: 9월 71편 전부 조회수 1 → 일일 물량 배치 중단(2026-09-13). 재개 조건 중 하나가
   "주제 선정에 검색수요 게이트를 박는 것"(seo-playbook.md §1). 네이버 검색광고 키워드도구는
   한국에서 유일하게 '월간 검색수 절대값'을 준다. 이걸 발행 전에 확인해 아무도 안 찾는 주제를
   거른다. 물량이 아니라 검색수요가 조회수 레버다.

   자격증명(.env 또는 셸 환경변수 — .env 는 gitignore):
     NAVER_AD_API_KEY   = 검색광고 API 액세스 라이선스
     NAVER_AD_SECRET    = 비밀키(서명용)
     NAVER_AD_CUSTOMER  = CUSTOMER_ID(숫자)
   발급: searchad.naver.com 로그인 → 도구 → API 사용 관리(무료). 광고 집행 없이 조회만 가능.

   실행:
     node backend/scripts/keyword-demand.mjs "가을 제철 디저트" "추석 용돈 시세"
     node backend/scripts/keyword-demand.mjs --min=300 "밀키트 추천"      # 임계값 상향
     node backend/scripts/keyword-demand.mjs --json "n8n 자동화"          # 파이프라인용
     node backend/scripts/keyword-demand.mjs --selftest                   # 네트워크 없이 로직 점검

   종료코드: 모든 키워드가 임계값(--min, 기본 100 = PC+모바일 월간합) 이상이면 0, 하나라도
   미달이면 1 → `keyword-demand.mjs "<주제>" && 집필` 식으로 게이트에 그대로 쓸 수 있다.
   자격증명 없으면 2(설정 안내 출력).
   ============================================================ */
import { createHmac } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
try { process.loadEnvFile(join(repoRoot, '.env')); } catch { /* .env 없으면 셸 환경변수만 */ }

const argv = process.argv.slice(2);
const has = (f) => argv.includes(`--${f}`);
const flag = (n) => (argv.find((a) => a.startsWith(`--${n}=`)) || '').split('=').slice(1).join('=');

const BASE = 'https://api.searchad.naver.com';
const PATH = '/keywordstool';
const MIN = Number(flag('min')) || 100;   // ponytail: 신규 저권위 블로그 롱테일 기준 월 100. --min= 로 조정.

// base64( HMAC-SHA256( secret, `${ts}.${method}.${uri}` ) ) — 네이버 공식 서명 포맷
function sign(ts, method, uri, secret) {
  return createHmac('sha256', secret).update(`${ts}.${method}.${uri}`).digest('base64');
}

// 네이버는 <10 을 문자열 "< 10" 으로 준다. 숫자면 그대로, "< 10" 류는 5 로 본다.
function parseCount(v) {
  if (typeof v === 'number') return v;
  const s = String(v ?? '');
  if (s.includes('<')) return 5;
  const n = Number(s.replace(/[^\d]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

const norm = (s) => s.replace(/\s+/g, '').toUpperCase();

async function demand(keyword, creds) {
  const ts = Date.now().toString();
  const sig = sign(ts, 'GET', PATH, creds.secret);
  const url = `${BASE}${PATH}?hintKeywords=${encodeURIComponent(keyword.replace(/\s+/g, ''))}&showDetail=1`;
  const res = await fetch(url, {
    headers: {
      'X-Timestamp': ts,
      'X-API-KEY': creds.key,
      'X-Customer': creds.customer,
      'X-Signature': sig,
    },
  });
  if (res.status === 429) throw new Error('429 (초당 3회 초과) — 잠시 후 재시도');
  if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 200)}`);
  const list = (await res.json()).keywordList || [];
  const want = norm(keyword);
  const exact = list.find((k) => norm(k.relKeyword) === want);
  const pc = exact ? parseCount(exact.monthlyPcQcCnt) : 0;
  const mob = exact ? parseCount(exact.monthlyMobileQcCnt) : 0;
  // 경쟁정도(광고주 수요: 낮음/중간/높음)와 월평균 클릭수 — 수익 가능성 판단용
  const comp = exact ? String(exact.compIdx ?? '') : '';
  const clk = exact ? parseCount(exact.monthlyAveMobileClkCnt) : 0;
  return { keyword, found: !!exact, pc, mobile: mob, total: pc + mob, compIdx: comp, monthlyAveMobileClkCnt: clk };
}

// 모바일 3위 예상 입찰가(원) — 광고 단가 가늠용. 키워드 전체를 한 번에 POST(호출 1번). 70원 ≈ 최저 입찰가(광고 가치 거의 없음).
// 실패하면 null 을 돌려 "단가 미확인"으로 남긴다.
async function bid3Map(keywords, creds) {
  const uri = '/estimate/average-position-bid/keyword';
  const ts = Date.now().toString();
  try {
    const res = await fetch(`${BASE}${uri}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Timestamp': ts, 'X-API-KEY': creds.key, 'X-Customer': creds.customer,
        'X-Signature': sign(ts, 'POST', uri, creds.secret),
      },
      body: JSON.stringify({ device: 'MOBILE', items: keywords.map((k) => ({ key: k.replace(/\s+/g, ''), position: 3 })) }),
    });
    if (!res.ok) return null;
    const j = await res.json();
    const m = new Map();
    for (const e of j.estimate || []) m.set(norm(String(e.keyword ?? e.key ?? '')), Number(e.bid));
    return m;
  } catch { return null; }
}

// 블로그 문서 수 — 네이버 검색 API(openapi) total. NAVER_CLIENT_ID/SECRET 에 '검색' API 가 추가돼야 한다. 안 되면 null("문서수 미확인").
async function blogDocs(keyword) {
  const id = process.env.NAVER_CLIENT_ID, sec = process.env.NAVER_CLIENT_SECRET;
  if (!id || !sec) return null;
  try {
    const res = await fetch(`https://openapi.naver.com/v1/search/blog.json?query=${encodeURIComponent(keyword)}&display=1`, {
      headers: { 'X-Naver-Client-Id': id, 'X-Naver-Client-Secret': sec },
    });
    if (!res.ok) return null;
    const t = Number((await res.json()).total);
    return Number.isFinite(t) ? t : null;
  } catch { return null; }
}

function selftest() {
  const A = (c, m) => { if (!c) throw new Error('SELFTEST FAIL: ' + m); };
  A(parseCount('< 10') === 5, '"< 10" → 5');
  A(parseCount(1200) === 1200, '숫자 그대로');
  A(parseCount('1,200') === 1200, '콤마 제거');
  A(parseCount(undefined) === 0 && parseCount(null) === 0, '누락 → 0');
  A(norm('가을 디저트') === '가을디저트', '공백 제거');
  const s1 = sign('1700000000000', 'GET', PATH, 'k');
  const s2 = sign('1700000000000', 'GET', PATH, 'k');
  A(s1 === s2 && s1.length === 44 && s1.endsWith('='), '서명 결정적·44자 base64');
  A(sign('1700000000001', 'GET', PATH, 'k') !== s1, 'ts 다르면 서명 다름');
  console.log('✅ selftest 통과 (parseCount · norm · sign)');
}

async function main() {
  if (has('selftest')) return selftest();

  const keywords = argv.filter((a) => !a.startsWith('--'));
  if (!keywords.length) {
    console.error('사용법: node backend/scripts/keyword-demand.mjs "<주제>" ["<주제2>" ...]  [--min=N] [--json]');
    process.exit(2);
  }

  const creds = {
    key: process.env.NAVER_AD_API_KEY,
    secret: process.env.NAVER_AD_SECRET,
    customer: process.env.NAVER_AD_CUSTOMER,
  };
  if (!creds.key || !creds.secret || !creds.customer) {
    console.error('❌ 네이버 검색광고 API 자격증명 없음.');
    console.error('   .env(gitignore) 또는 환경변수에 3개를 넣어라:');
    console.error('     NAVER_AD_API_KEY=... / NAVER_AD_SECRET=... / NAVER_AD_CUSTOMER=...');
    console.error('   발급: searchad.naver.com → 도구 → API 사용 관리(무료, 광고집행 불필요).');
    process.exit(2);
  }

  const results = [];
  for (const kw of keywords) {
    try {
      results.push(await demand(kw, creds));
    } catch (e) {
      results.push({ keyword: kw, error: String(e.message || e) });
    }
    if (kw !== keywords.at(-1)) await new Promise((r) => setTimeout(r, 350)); // ≤3/sec
  }

  // 광고 단가(bid3)·문서 수 보강 — 실패해도 조용히 넘기지 않고 "미확인"으로 표시한다.
  const bids = await bid3Map(keywords, creds);
  for (const r of results) {
    if (r.error) continue;
    const b = bids?.get(norm(r.keyword));
    r.bid3 = Number.isFinite(b) ? b : null;
    r.docs = await blogDocs(r.keyword);
    r.competitionRatio = r.docs != null && r.total > 0 ? Math.round((r.docs / r.total) * 10) / 10 : null;
    await new Promise((x) => setTimeout(x, 120));
  }

  if (has('json')) {
    console.log(JSON.stringify({ min: MIN, results }, null, 2));
  } else {
    for (const r of results) {
      if (r.error) { console.log(`⚠️  ${r.keyword} — 조회 실패: ${r.error}`); continue; }
      const pass = r.total >= MIN;
      const mark = pass ? '✅' : (r.found ? '❌' : '❌無');
      const note = r.found ? '' : ' (정확일치 없음 — 검색어 표현 재검토)';
      console.log(`${mark} ${r.keyword} — 월 ${r.total.toLocaleString()} (PC ${r.pc.toLocaleString()} / 모바일 ${r.mobile.toLocaleString()}) · 경쟁 ${r.compIdx || '-'} · 월평균 모바일 클릭 ${r.monthlyAveMobileClkCnt.toLocaleString()} · bid3 ${r.bid3 != null ? r.bid3.toLocaleString() + '원' : '단가 미확인'} · ${r.docs != null ? '문서수 ' + r.docs.toLocaleString() + (r.competitionRatio != null ? ` (경쟁비 ${r.competitionRatio})` : '') : '문서수 미확인'}${note}`);
    }
    console.log(`\n임계값 --min=${MIN} (PC+모바일 월간합). ✅=통과 · ❌=미달 · ❌無=키워드 미등록(사실상 저수요).`);
  }

  const allPass = results.every((r) => !r.error && r.total >= MIN);
  process.exit(allPass ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
