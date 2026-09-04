#!/usr/bin/env node
/* ============================================================
   자체 피드백 → 반영 — 집필 직후, 검증(blog-verify) 전에 스스로 고친다

   파이프라인: 조사 → 집필 → [blog-selfreview] → blog-verify → 발행
   blog-verify 는 통과/반려만 하는 '게이트'라 실제 수정은 안 한다. 이 단계가 그 앞에서
   초안을 냉정하게 자기비평하고 **실제 결함만 외과적으로 고쳐** 넣는다.

   왜 전면 재작성이 아니라 find/replace 인가:
   · LLM 이 본문을 통째로 다시 쓰면 멀쩡한 데까지 흔들리고(드리프트) 새 오류가 섞인다.
   · 그래서 LLM 은 '어디를 무엇으로' 만 정확히 집어내게 하고(edits[].find/replace),
     적용은 스크립트가 결정적으로 한다. find 가 본문에 없으면 건너뛴다(오적용 방지).
   · 고친 뒤 blog-assemble 을 다시 돌려 기계 게이트(링크·해요체·트렌드 CTA 점수)로 재검한다.

   실행 (레포 루트에서):
     node backend/scripts/blog-selfreview.mjs <slug>            # 자기비평→반영→재조립
     node backend/scripts/blog-selfreview.mjs <slug> --dry      # 제안만, 파일 안 고침
     node backend/scripts/blog-selfreview.mjs --selftest        # 적용 로직만 오프라인 점검

   비용: claude -p 1회 ≈ $0.2~0.4 (blog-verify 와 별개).
   ============================================================ */
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const outDir = join(repoRoot, 'backend', 'out', 'blog');
const researchDir = join(repoRoot, 'backend', 'blog', 'research');

/* 결정적 적용기 — LLM 이 준 edits 를 본문에 반영한다. find 가 정확히(첫 1회) 있을 때만.
   중복이 많은 짧은 find 는 위험하니, 너무 짧거나(<8자) 여러 번 나오는 건 건너뛴다. */
export function applyEdits(md, edits) {
  let out = md;
  const applied = [], skipped = [];
  for (const e of edits || []) {
    const find = e && typeof e.find === 'string' ? e.find : '';
    const replace = e && typeof e.replace === 'string' ? e.replace : '';
    if (!find || find.length < 8) { skipped.push({ ...e, reason: 'find 너무 짧음' }); continue; }
    const first = out.indexOf(find);
    if (first < 0) { skipped.push({ ...e, reason: 'find 본문에 없음' }); continue; }
    if (out.indexOf(find, first + find.length) >= 0) { skipped.push({ ...e, reason: 'find 여러 번 등장(모호)' }); continue; }
    if (find === replace) { skipped.push({ ...e, reason: 'find==replace' }); continue; }
    out = out.slice(0, first) + replace + out.slice(first + find.length);
    applied.push(e);
  }
  return { md: out, applied, skipped };
}

if (process.argv.includes('--selftest')) {
  const md = '가나다 라마바 사아자. 화제성만 놓고 보면 후기가 많은 셈이에요. 끝.';
  const r = applyEdits(md, [
    { find: '화제성만 놓고 보면 후기가 많은 셈이에요', replace: '화제성은 높지만 후기 표본은 아직 적어요' }, // 적용
    { find: '없는문장입니다요', replace: 'x' },   // skip: 없음
    { find: '가나다', replace: 'y' },             // skip: <8자
  ]);
  const ok = r.applied.length === 1 && r.skipped.length === 2
    && r.md.includes('후기 표본은 아직 적어요') && !r.md.includes('후기가 많은 셈');
  console.log(ok ? '✓ selftest 통과' : '✗ selftest 실패');
  console.log(JSON.stringify(r, null, 1));
  process.exit(ok ? 0 : 1);
}

const argv = process.argv.slice(2);
const slug = argv.find((a) => !a.startsWith('--'));
const DRY = argv.includes('--dry');
if (!slug) { console.error('사용법: node backend/scripts/blog-selfreview.mjs <slug> [--dry]'); process.exit(1); }

const mdPath = join(outDir, `${slug}.md`);
const metaPath = join(outDir, `${slug}.json`);
for (const p of [mdPath, metaPath]) {
  if (!existsSync(p)) { console.error(`✗ 없음: ${p}`); process.exit(1); }
}
const md = await readFile(mdPath, 'utf8');
const meta = JSON.parse(await readFile(metaPath, 'utf8'));
const rPath = join(researchDir, `${slug}.json`);
const research = existsSync(rPath) ? await readFile(rPath, 'utf8') : '(조사 파일 없음)';

const prompt = `너는 방금 쓴 블로그 초안을 발행 전에 **냉정하게 자기비평하고 실제 결함만 외과적으로 고치는** 편집자다.
CLAUDE.md 철칙과 backend/blog/structures/hangeut-*.md 의 "반복 결함" 규칙을 알고 있을 것이다. 그대로 적용해라.

## 잡아야 할 결함 (사실·신뢰·권리·양산성 — 문체 미세수정은 대상 아님)
- 조사(아래 research) 밖 사실 창작: 없는 수치·가게·인물·날짜·URL.
- 축 혼동: 후기 신뢰도(믿을 만한가) ≠ 만족도(좋은가) 를 섞음. 점수 단정("확실히 광고/믿을 수 있다").
- reasons 가 null 인데 광고/신뢰 '신호'(협찬·품앗이 등)를 지어냄.
- 트렌드 글(광고/신뢰 점수 없는 type)인데 상세페이지 CTA 에서 "점수"를 보라고 안내.
- 묵은 데이터인데 현재형: research.cannotSay 에 "현재형 금지" 경고가 있으면 과거 시제로.
- 표본이 얇은데 과장(후기 적은데 "많다"), 화제성(buzz)을 만족도 근거로 치환.
- 단일 출처의 조어를 업계 합의처럼 격상, 읽을 수 없는 소셜(틱톡 discover 등)로 어원 단정.
- 저작권(가사·남의 이미지·기사 전재), 세대·지역 비하, 본문이 못 받치는 낚시 제목.
- 기술 글이면 eli5 비유가 개념을 왜곡했는지.

## 방식
- **전면 재작성 금지.** 고칠 곳마다 정확한 원문 조각(find, 12자 이상 권장, 본문에 딱 1번 나오는 구절)과 고친 문장(replace)을 준다.
- 진짜 결함만. 멀쩡하면 edits 를 비운다(빈 배열이 정상적이고 바람직한 결과다).

## 카테고리
${meta.categoryId || '?'} / 제목: ${meta.title || ''}

## 초안(마크다운)
${md.slice(0, 12000)}

## 근거(조사 파일)
\`\`\`json
${String(research).slice(0, 6000)}
\`\`\`

## 출력
JSON 만. 설명·머리말 없이.
{"assessment":"한 줄 자기비평","edits":[{"where":"어느 문단","issue":"무엇이 문제","find":"본문 정확한 원문 조각","replace":"고친 문장"}],"metaEdits":{"title":"바꿀 때만","desc":"바꿀 때만"}}`;

console.log(`🪞 자체 피드백 — ${slug} (claude -p)`);

const WIN = process.platform === 'win32';
const CLI = process.env.CLAUDE_BIN || (WIN ? 'claude.cmd' : 'claude');
const [bin, preArgs] = WIN ? [process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', CLI]] : [CLI, []];

let raw;
try {
  raw = execFileSync(bin, [...preArgs, '-p', '--output-format', 'json'], {
    cwd: repoRoot, encoding: 'utf8', timeout: 300000, maxBuffer: 20 * 1024 * 1024, windowsHide: true,
    input: prompt, stdio: ['pipe', 'pipe', 'pipe'],
  });
} catch (e) {
  console.error(`⚠ claude 호출 실패: ${String(e.message).slice(0, 200)} — 자체 피드백 건너뜀(비치명적)`);
  process.exit(0); // 자체 피드백 실패는 발행을 막지 않는다(뒤의 blog-verify 가 최종 게이트).
}

let out;
try {
  const outer = JSON.parse(raw);
  const text = String(outer.result || '').replace(/^```(?:json)?\s*|\s*```$/g, '').trim();
  try { out = JSON.parse(text); } catch {
    const s = text.indexOf('{'), e = text.lastIndexOf('}');
    if (s < 0 || e <= s) throw new Error('JSON 없음');
    out = JSON.parse(text.slice(s, e + 1));
  }
} catch {
  console.error('⚠ 응답을 읽지 못했습니다 — 자체 피드백 건너뜀:', String(raw).slice(0, 800));
  process.exit(0);
}

if (out.assessment) console.log(`   자기비평: ${out.assessment}`);
const { md: revised, applied, skipped } = applyEdits(md, out.edits);

for (const e of applied) console.log(`   ✎ ${e.where || ''}: ${e.issue || ''}`);
for (const e of skipped) console.warn(`   ⤷ 건너뜀(${e.reason}): ${e.issue || e.find?.slice(0, 30) || ''}`);

const metaEdits = out.metaEdits || {};
let metaChanged = false;
if (metaEdits.title && metaEdits.title !== meta.title) { meta.title = metaEdits.title; if (meta.coverSpec) meta.coverSpec.title = metaEdits.title; metaChanged = true; }
if (metaEdits.desc && metaEdits.desc !== meta.desc) { meta.desc = metaEdits.desc; metaChanged = true; }

if (!applied.length && !metaChanged) {
  console.log('✓ 반영할 결함 없음 — 초안 유지');
  process.exit(0);
}
if (DRY) {
  console.log(`· dry: 적용 예정 ${applied.length}건${metaChanged ? ' + 메타' : ''} (파일 안 고침)`);
  process.exit(0);
}

if (applied.length) await writeFile(mdPath, revised, 'utf8');
if (metaChanged) await writeFile(metaPath, JSON.stringify(meta, null, 2) + '\n', 'utf8');
console.log(`✓ 반영 완료: 본문 ${applied.length}건${metaChanged ? ' · 메타 갱신' : ''} → 재조립`);

// 고친 걸 실제 html 에 반영하고 기계 게이트(링크·해요체·트렌드 CTA 점수)로 재검한다.
try {
  const r = execFileSync(process.execPath, [join(repoRoot, 'backend', 'scripts', 'blog-assemble.mjs'), slug, `--research=${slug}`],
    { cwd: repoRoot, encoding: 'utf8', windowsHide: true });
  console.log('   ' + r.trim().split('\n').slice(-1)[0]);
} catch (e) {
  const msg = String(e.stdout || '') + String(e.stderr || e.message || '');
  console.warn(`⚠ 재조립이 기계검사에 걸렸다 — 자체수정이 새 문제를 냈을 수 있다. 확인 후 수동 조립:\n   node backend/scripts/blog-assemble.mjs ${slug} --research=${slug}\n   ${msg.slice(0, 300)}`);
  process.exit(1);
}
