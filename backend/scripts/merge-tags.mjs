#!/usr/bin/env node
// 일회성: 각 트렌드에 자동 해시태그(tags) 주입 — 분야·지역·키워드. 이후 refresh.mjs.
// tags는 '#' 없는 단어로 저장(렌더 시 #붙임, 필터는 단어로). 지역 태그로 지역 필터, 분야 태그로 분야 필터 가능.
import { readFileSync, writeFileSync } from 'node:fs';

const TAGS = {
  'dubai-choco': ['디저트', '편의점', '초콜릿'],
  'nudake': ['카페', '성수', '디저트카페'],
  'betong': ['베이커리', '성수', '소금빵'],
  'ube': ['디저트', '우베', '보라디저트'],
  'yakgwa': ['디저트', '약과', '전통디저트'],
  'shanghai-buttertteok': ['디저트', '상하이버터떡', '떡'],
  'pickbake': ['베이커리', '성수', '에그타르트'],
  'im-donut-seongsu': ['디저트', '성수', '도넛'],
  'east-bagel-dasan': ['베이커리', '다산', '남양주', '베이글'],
  'nanrijabeth': ['신조어', '밈', '유행어'],
  'illit-itsme': ['노래챌린지', '아일릿', '챌린지', 'K팝'],
  'balloon-pants': ['패션', '벌룬팬츠', '와이드팬츠'],
  'ai-fashion-portrait': ['AI프롬프트', 'AI화보', '챗GPT'],
  'ai-ghibli-style': ['AI프롬프트', '지브리풍', '챗GPT'],
  'ai-scribble-prompt': ['AI프롬프트', '하찮은그림', '낙서풍'],
};

const path = 'backend/data/trends.json';
const data = JSON.parse(readFileSync(path, 'utf-8'));
let n = 0;
for (const t of data.trends) {
  if (TAGS[t.id]) { t.tags = TAGS[t.id]; n++; }
}
writeFileSync(path, JSON.stringify(data, null, 2) + '\n', 'utf-8');
console.log(`✓ tags ${n}개 트렌드에 주입`);
// 태그별 개수(필터 미리보기)
const counts = {};
for (const t of data.trends) for (const tag of (t.tags || [])) counts[tag] = (counts[tag] || 0) + 1;
console.log('태그 분포:', Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([k, v]) => `#${k}(${v})`).join(' '));
