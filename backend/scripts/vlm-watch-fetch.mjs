#!/usr/bin/env node
/* ============================================================
   경량 VLM 워치 — HuggingFace image-text-to-text(비전-언어) 모델 중
   3070/4070 급 GPU 에서 돌아가는 경량 신규 모델만 골라 후보로 수집
   (결정적 · LLM 없음)

   용도(사용자 요청 2026-08-21):
     · 블로그 '이번 주 경량 VLM' 시리즈의 결정적 소스
     · 동시에, 이미지+텍스트 점검(예: "이 사진에 화재·연기가 있나?",
       "작업자가 안전고리를 착용했나?")을 로컬에서 돌릴 수 있는
       후보 모델 비교표(VRAM·라이선스·크기)를 프로젝트용으로 남긴다.

   왜 결정적으로 하나:
     · HuggingFace 목록 API 는 safetensors.total(정확한 파라미터 수)을 안 준다
       (개별 모델 엔드포인트에만 있음). 그래서 모델 id 의 크기 토큰(2B·3B·7B 등)을
       정규식으로 뽑아 경량 여부를 판단한다 — id 관례가 사실상 표준이다.
     · sort=trending 은 400 이 난다(dev-trending-fetch.mjs 와 동일 이슈). sort 생략 시
       서버가 trendingScore 내림차순으로 준다. 그 순서를 유지한 채
       (1) 경량(<= maxB B) (2) 최근 days 일 이내 생성 두 조건으로 좁힌다.
     · 크기를 못 읽는 모델(id 에 크기 토큰 없음)은 제외한다 — 27B 인지 2B 인지
       모른 채 '경량'이라 넘기면 안 된다(추측 금지).

   VRAM 추정(대략, 판단용이지 확정 아님):
     · fp16 ≈ paramsB × 2 GB,  int4(4비트 양자화) ≈ paramsB × 0.5 GB + 오버헤드 ~1.5GB
     · 3070 = 8GB, 4070 = 12GB. int4 기준으로 들어가는지 표시한다.

   두 가지 모드:
     · trending(기본) — 최근 days 일 이내 생성 + trendingScore 순. 블로그 '이번 주 경량 VLM'용.
     · popular       — 다운로드 순(생성일 무관). 검증된 경량 VLM 후보 — 프로젝트(안전점검) 선정용.

   실행:
     node backend/scripts/vlm-watch-fetch.mjs                    # trending, 최근 60일·<=8B
     node backend/scripts/vlm-watch-fetch.mjs --mode=popular     # 다운로드 순 검증 후보
     node backend/scripts/vlm-watch-fetch.mjs --days=90 --maxb=8
     node backend/scripts/vlm-watch-fetch.mjs --list
     node backend/scripts/vlm-watch-fetch.mjs --selftest
   ============================================================ */
import { writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const outDir = join(repoRoot, 'backend', 'blog', 'research', 'vlm-watch');

const argv = process.argv.slice(2);
const has = (f) => argv.includes(`--${f}`);
const flag = (n) => (argv.find((a) => a.startsWith(`--${n}=`)) || '').split('=').slice(1).join('=');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const DAY_MS = 86400000;

/* 모델 id/이름에서 파라미터 크기(단위 B=10억)를 뽑는다.
   "Qwen2.5-VL-3B-Instruct" → 3, "SmolVLM-256M" → 0.256, "InternVL2-1B" → 1,
   "0.5B" → 0.5, "1.5B" → 1.5. 못 찾으면 null(→ 제외). */
export function parseParamsB(id) {
  const s = String(id);
  // 큰 단위(B) 우선 — "3B", "3.8B", "72B"
  const b = s.match(/(\d+(?:\.\d+)?)\s*[Bb](?![a-zA-Z])/);
  if (b) return parseFloat(b[1]);
  // 백만 단위(M) — "256M", "500M" → B 로 환산
  const m = s.match(/(\d+(?:\.\d+)?)\s*[Mm](?![a-zA-Z])/);
  if (m) return parseFloat(m[1]) / 1000;
  return null;
}

/* int4(4비트) 기준 VRAM 대략 추정 — 오버헤드(KV캐시·활성값) 1.5GB 가산 */
function vramInt4GB(paramsB) {
  return Math.round((paramsB * 0.5 + 1.5) * 10) / 10;
}

function daysAgo(n, now = new Date()) {
  return new Date(now.getTime() - n * DAY_MS);
}

async function fetchVlm({ mode = 'trending', days = 60, maxB = 8, fetchLimit = 300, keepLimit = 20 } = {}) {
  // popular 모드는 downloads 순(이 정렬은 400 안 남 — trending 만 400). trending 모드는 sort 생략(=trendingScore 순).
  const sortQ = mode === 'popular' ? '&sort=downloads&direction=-1' : '';
  const url = `https://huggingface.co/api/models?pipeline_tag=image-text-to-text&limit=${fetchLimit}${sortQ}&full=true`;
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${url}`);
  const all = await res.json();
  const cutoff = daysAgo(days);

  const items = [];
  for (const m of all) {
    const paramsB = parseParamsB(m.id);
    if (paramsB == null) continue;            // 크기 못 읽으면 제외(추측 금지)
    if (paramsB > maxB) continue;             // 경량만
    if (mode === 'trending' && (!m.createdAt || new Date(m.createdAt) < cutoff)) continue; // trending: 최근만
    const lic = (m.tags || []).find((t) => t.startsWith('license:'));
    const int4 = vramInt4GB(paramsB);
    items.push({
      id: m.id,
      url: `https://huggingface.co/${m.id}`,
      createdAt: m.createdAt,
      trendingScore: m.trendingScore ?? null,
      likes: m.likes ?? null,
      downloads: m.downloads ?? null,
      paramsB,
      vramInt4GB: int4,
      fits3070: int4 <= 8,   // 8GB
      fits4070: int4 <= 12,  // 12GB
      license: lic ? lic.slice('license:'.length) : null,
      tags: (m.tags || []).filter((t) => !t.startsWith('license:')).slice(0, 8),
    });
  }
  const kept = items.slice(0, keepLimit);
  return {
    source: 'hf-vlm', mode, fetchedOk: true, sourceUrl: url,
    filter: { pipeline: 'image-text-to-text', maxParamsB: maxB, freshDays: mode === 'trending' ? days : null },
    items: kept,
    note: mode === 'popular'
      ? `image-text-to-text 모델을 다운로드 내림차순으로 받아 파라미터 <= ${maxB}B 인 것만 남김(생성일 무관 — 검증된 후보). 크기 못 읽는 모델 제외. VRAM 은 int4 기준 대략 추정(확정 아님).`
      : `image-text-to-text 모델을 trendingScore 내림차순으로 받아 (1) 파라미터 <= ${maxB}B (2) 최근 ${days}일 이내 생성 두 조건으로 좁힘. 크기 못 읽는 모델 제외. VRAM 은 int4 기준 대략 추정(확정 아님).`,
  };
}

function selftest() {
  const cases = [
    ['Qwen/Qwen2.5-VL-3B-Instruct', 3],
    ['HuggingFaceTB/SmolVLM-256M-Instruct', 0.256],
    ['OpenGVLab/InternVL2-1B', 1],
    ['some/model-0.5B', 0.5],
    ['org/Foo-1.5B-VL', 1.5],
    ['Qwen/Qwen3.8-27B', 27],
    ['vikhyatk/moondream2', null],   // 크기 토큰 없음 → null
  ];
  let ok = true;
  for (const [id, want] of cases) {
    const got = parseParamsB(id);
    const pass = got === want;
    if (!pass) ok = false;
    console.log(pass ? '✓' : '✗', id, '→', got, pass ? '' : `(기대: ${want})`);
  }
  // VRAM 추정 sanity: 3B int4 ≈ 3.0GB, 7B ≈ 5.0GB
  const v3 = vramInt4GB(3), v7 = vramInt4GB(7);
  const vram_ok = v3 === 3 && v7 === 5;
  console.log(vram_ok ? '✓' : '✗', `VRAM int4 추정 3B=${v3}GB 7B=${v7}GB`);
  console.log((ok && vram_ok) ? '\n자체검사 통과' : '\n자체검사 실패');
  process.exit((ok && vram_ok) ? 0 : 1);
}

const main = async () => {
  if (has('selftest')) return selftest();
  if (has('list')) {
    console.log('hf-vlm   HuggingFace image-text-to-text 경량 신규 모델   https://huggingface.co/api/models?pipeline_tag=image-text-to-text');
    console.log('옵션: --days=N(기본 60) --maxb=N(기본 8, 파라미터 상한 B)');
    return;
  }

  const mode = flag('mode') === 'popular' ? 'popular' : 'trending';
  const days = Number(flag('days')) || 60;
  const maxB = Number(flag('maxb')) || 8;
  const result = await fetchVlm({ mode, days, maxB });

  const scopeLabel = mode === 'popular' ? `다운로드순·<=${maxB}B` : `최근 ${days}일·<=${maxB}B`;
  if (!result.items.length) {
    console.error(`⚠ 후보 0건 (${scopeLabel}) — 조건에 맞는 경량 VLM 이 없거나 id 크기 토큰 관례가 바뀌었을 수 있다. --days 를 늘리거나 --mode=popular 를 써보라.`);
  } else {
    console.log(`✓ 경량 VLM 후보 ${result.items.length}건 [${mode}] (${scopeLabel})`);
    result.items.slice(0, 10).forEach((it) =>
      console.log(`  ${it.id}  (${it.paramsB}B · int4 ~${it.vramInt4GB}GB · 3070 ${it.fits3070 ? 'OK' : '✕'}/4070 ${it.fits4070 ? 'OK' : '✕'} · ${it.license || 'no-license'})`));
  }

  await mkdir(outDir, { recursive: true });
  const today = new Date().toISOString().slice(0, 10);
  const out = join(outDir, `hf-vlm-${mode}-${today}.json`);
  await writeFile(out, JSON.stringify(result, null, 2) + '\n', 'utf8');
  console.log(`\n후보 목록: backend/blog/research/vlm-watch/hf-vlm-${mode}-${today}.json`);
};

main().catch((e) => { console.error('✗', e.message); process.exit(1); });
