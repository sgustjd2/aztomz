#!/usr/bin/env node
/* ============================================================
   블로그 카테고리 프로파일 생성 마법사

   새 주제로 자동화를 넓힐 때 이걸 돌리면 backend/blog/categories/<id>.json 이 만들어진다.
   티스토리에 실제로 있는 카테고리명을 넣어야 하므로, 모르면 먼저:
     node backend/scripts/blog-publish.mjs <아무_id> --categories

   실행: node backend/scripts/category-new.mjs   (레포 루트에서)
   ============================================================ */
import { readdir, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, basename } from 'node:path';
import { createInterface } from 'node:readline/promises';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const catDir = join(repoRoot, 'backend', 'blog', 'categories');
const structDir = join(repoRoot, 'backend', 'blog', 'structures');

const rl = createInterface({ input: process.stdin, output: process.stdout });

const ask = async (q, dflt) => {
  const a = (await rl.question(dflt ? `${q} [${dflt}]: ` : `${q}: `)).trim();
  return a || dflt || '';
};
const askList = async (q, dflt) => {
  const a = await ask(`${q} (쉼표로 구분)`, dflt);
  return a.split(',').map((s) => s.trim()).filter(Boolean);
};

const structures = (await readdir(structDir)).filter((f) => f.endsWith('.md')).map((f) => basename(f, '.md'));
const INTENTS = ['정보형', '비교형', '구매형', '문제해결형', '경험공유형'];

console.log('\n새 카테고리 프로파일을 만듭니다. 엔터만 치면 [기본값]이 들어갑니다.\n');

const id = await ask('프로파일 id (영문 kebab-case, 파일명이 됩니다)');
if (!id) { console.error('✗ id 는 필수입니다.'); rl.close(); process.exit(1); }
if (existsSync(join(catDir, `${id}.json`))) {
  console.error(`✗ 이미 있습니다: backend/blog/categories/${id}.json`); rl.close(); process.exit(1);
}

const tistoryCategory = await ask('티스토리 카테고리명 (--categories 로 확인한 이름 그대로)');
if (!tistoryCategory) { console.error('✗ 카테고리명은 필수입니다 — 틀리면 발행이 실패합니다.'); rl.close(); process.exit(1); }

console.log(`\n구조 템플릿: ${structures.join(' / ')}`);
const structureTemplate = await ask('구조 템플릿', structures.includes('howto') ? 'howto' : structures[0]);
if (!structures.includes(structureTemplate)) {
  console.error(`✗ 없는 템플릿입니다. backend/blog/structures/ 에 ${structureTemplate}.md 를 먼저 만드세요.`);
  rl.close(); process.exit(1);
}

console.log(`\n검색의도: ${INTENTS.join(' / ')}`);
const searchIntent = await ask('검색의도', '정보형');

const profile = {
  id,
  tistoryCategory,
  persona: await ask('\n페르소나 (누가 쓰는 글인가)', '실무에서 직접 겪어본 개발자'),
  readerProfile: await ask('독자 (누가 검색해서 오는가)', '같은 문제를 겪고 있는 실무자'),
  searchIntent,
  structureTemplate,
  tone: {
    formality: await ask('말투', '해요체'),
    emoji: (await ask('이모지 사용? (y/N)', 'n')).toLowerCase().startsWith('y'),
    sentenceMax: Number(await ask('한 문단 최대 문장 수', '3')) || 3,
  },
  mustInclude: await askList('\n반드시 들어갈 것', '구체적 근거, 단점 최소 1개'),
  banned: await askList('금지 표현', '무조건, 완벽한, 최고의, 강추'),
  wordCount: (await ask('분량 (최소-최대)', '1500-2200')).split('-').map((n) => Number(n.trim()) || 0),
  imagePolicy: {
    min: Number(await ask('이미지 최소 장수', '1')) || 1,
    altRequired: true,
    ownOnly: true,
  },
  ctaType: await ask('CTA', '관련글 내부링크 2개'),
  affiliateDisclosure: (await ask('제휴 링크 고지 필요? (y/N)', 'n')).toLowerCase().startsWith('y'),
  publishDefault: (await ask('\n기본 발행 방식 (draft=비공개 저장 / public=바로 공개)', 'draft')) === 'public' ? 'public' : 'draft',
};

rl.close();

await mkdir(catDir, { recursive: true });
const file = join(catDir, `${id}.json`);
await writeFile(file, JSON.stringify(profile, null, 2) + '\n', 'utf8');

console.log(`\n✓ 만들었습니다: backend/blog/categories/${id}.json`);
console.log(`  구조: ${structureTemplate} · 카테고리: ${tistoryCategory} · 기본발행: ${profile.publishDefault}`);
if (profile.publishDefault === 'public') {
  console.log('  ⚠ 바로 공개로 설정했습니다. 코드·사실확인이 필요한 주제면 draft 를 권합니다.');
}
