#!/usr/bin/env node
/* ============================================================
   발행 전 검증 — Claude Code(헤드리스)로 한 번 더 본다

   한끗 경로(blog-build.mjs)에는 게이트가 없었다. trends.json 을 그대로 렌더해서
   바로 발행됐다. 다주제 경로(post-build.mjs)만 자가검수를 받고 있었다.
   그 구멍을 메운다.

   Gemini 가 아니라 `claude -p` 를 쓰는 이유: Claude Code 는 CLAUDE.md 를 읽으므로
   이 프로젝트의 철칙(추정치 단정 금지 · 후기 신뢰도≠만족도 · 세대 비하 금지 ·
   거짓 신선도 금지)을 이미 알고 들어온다. 별도로 규칙을 다시 설명할 필요가 없다.

   실행 (레포 루트에서):
     node backend/scripts/blog-verify.mjs <id>          # 통과=exit 0, 반려=exit 1
     node backend/scripts/blog-verify.mjs <id> --warn   # 반려여도 exit 0 (경고만)

   비용: 호출당 대략 $0.2~0.4 (CLAUDE.md 컨텍스트 포함).
   ============================================================ */
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const outDir = join(repoRoot, 'backend', 'out', 'blog');
const trendsPath = join(repoRoot, 'backend', 'data', 'trends.json');

const argv = process.argv.slice(2);
const id = argv.find((a) => !a.startsWith('--'));
const WARN_ONLY = argv.includes('--warn');

if (!id) {
  console.error('사용법: node backend/scripts/blog-verify.mjs <id> [--warn]');
  process.exit(1);
}

const htmlPath = join(outDir, `${id}.html`);
const metaPath = join(outDir, `${id}.json`);
if (!existsSync(htmlPath) || !existsSync(metaPath)) {
  console.error(`✗ 빌드 결과가 없습니다: ${htmlPath}`);
  process.exit(1);
}

const html = await readFile(htmlPath, 'utf8');
const meta = JSON.parse(await readFile(metaPath, 'utf8'));

/* 한끗 글이면 원본 데이터를 같이 준다 — 본문이 원본을 왜곡했는지 대조하려면 원본이 있어야 한다. */
let trend = null;
if (existsSync(trendsPath)) {
  const data = JSON.parse(await readFile(trendsPath, 'utf8'));
  trend = (data.trends || data).find((t) => t.id === id) || null;
}

const prompt = `너는 발행 직전 마지막 검증자다. 이 글이 지금 공개 블로그에 올라간다.
CLAUDE.md 의 철칙을 알고 있을 테니 그대로 적용해라.

## 검증 항목 (하나라도 걸리면 반려)

1. **원본 왜곡** — 아래 원본 데이터(trend)가 있으면, 본문의 점수·판단·가게 정보가 원본과 어긋나지 않는지.
   점수를 부풀리거나, 원본에 없는 사실을 더했으면 반려.
2. **단정** — 광고 의심도·후기 신뢰도는 추정치다. "확실히 광고다", "믿을 수 있다" 같은 확정 표현은 반려.
3. **축 혼동** — 후기 신뢰도(믿을 만한가)와 만족도(좋은가)를 섞어 썼으면 반려.
4. **지어낸 것** — 원본·출처에 없는 수치·날짜·인용·고유명사. URL 을 지어냈으면 반려.
5. **저작권** — 가사 인용/번역, 남의 이미지 URL, 기사 본문 전재.
6. **사람** — 세대·성별·지역 비하. "아재" 를 공격적으로 쓴 경우.
7. **낚시 제목** — 본문이 뒷받침 못 하는 제목.

경미한 문체 문제는 반려 사유가 아니다. **사실·신뢰·권리 문제만** 잡아라.

## 제목
${meta.title}

## 본문(HTML)
${html.slice(0, 12000)}

${trend ? `## 원본 데이터 (trends.json)\n\`\`\`json\n${JSON.stringify(trend, null, 1).slice(0, 4000)}\n\`\`\`` : '## 원본 데이터\n(없음 — 다주제 글)'}

## 출력
JSON 만. 설명·머리말 없이.
{"pass": true|false, "problems": [{"severity":"blocker|warn","where":"어디","what":"무엇이","why":"왜 문제"}], "summary":"한 줄 총평"}
pass 는 blocker 가 하나도 없을 때만 true.`;

console.log(`🔍 발행 전 검증 — ${id} (claude -p)`);

/* Windows 에선 npm 배치(claude.cmd)를 써야 한다 — execFileSync('claude') 는 ENOENT.
   프롬프트는 인자가 아니라 **stdin** 으로 넘긴다(본문 포함 16KB 를 인자로 주면 길이 한계에 걸린다). */
const WIN = process.platform === 'win32';
const CLI = process.env.CLAUDE_BIN || (WIN ? 'claude.cmd' : 'claude');
// Node 20+ 는 보안상 .cmd 직접 실행을 막는다(EINVAL, CVE-2024-27980).
// shell:true 로 우회하면 인자 미이스케이프 경고가 뜨므로, cmd.exe 를 명시적으로 띄운다.
const [bin, preArgs] = WIN ? [process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', CLI]] : [CLI, []];

let raw;
try {
  raw = execFileSync(bin, [...preArgs, '-p', '--output-format', 'json'], {
    cwd: repoRoot, encoding: 'utf8', timeout: 300000, maxBuffer: 20 * 1024 * 1024,
    input: prompt, stdio: ['pipe', 'pipe', 'pipe'],
  });
} catch (e) {
  console.error(`⚠ claude 호출 실패: ${String(e.message).slice(0, 200)}`);
  process.exit(WARN_ONLY ? 0 : 1);
}

let verdict;
try {
  const outer = JSON.parse(raw);
  const text = String(outer.result || '').replace(/^```(?:json)?\s*|\s*```$/g, '').trim();
  // 모델이 "JSON 만" 지시를 어기고 앞뒤에 설명을 붙이는 일이 있다. 호출 비용은 이미 나갔으니
  // 통째로 버리지 말고 본문에서 JSON 객체를 건져낸다.
  try { verdict = JSON.parse(text); } catch {
    const s = text.indexOf('{'), e = text.lastIndexOf('}');
    if (s < 0 || e <= s) throw new Error('JSON 객체 없음');
    verdict = JSON.parse(text.slice(s, e + 1));
    console.warn('⚠ 응답에 설명이 섞여 있어 JSON 부분만 추출했습니다.');
  }
} catch {
  console.error('⚠ 검증 응답을 읽지 못했습니다:', String(raw).slice(0, 1200));
  process.exit(WARN_ONLY ? 0 : 1);
}

const problems = verdict.problems || [];
const blockers = problems.filter((p) => p.severity === 'blocker');
const warns = problems.filter((p) => p.severity !== 'blocker');

for (const p of blockers) console.error(`   ⛔ ${p.where}: ${p.what} — ${p.why}`);
for (const p of warns) console.warn(`   ⚠ ${p.where}: ${p.what}`);
if (verdict.summary) console.log(`   총평: ${verdict.summary}`);

if (blockers.length) {
  console.error(`\n✗ 검증 반려 — 차단 ${blockers.length}건. ${WARN_ONLY ? '(--warn 이라 계속 진행)' : '발행하지 않습니다.'}`);
  process.exit(WARN_ONLY ? 0 : 1);
}
console.log(`✓ 검증 통과${warns.length ? ` (경고 ${warns.length}건)` : ''}`);
