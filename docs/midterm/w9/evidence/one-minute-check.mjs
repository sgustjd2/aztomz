#!/usr/bin/env node
// 검증 01(1분 이해)의 '대체' 자동 점검 — 사람 테스트를 대신하지 못한다(이해했는지는 못 잰다).
// 배포 사이트를 모바일 375px로 열어, 과제 경로를 실제로 클릭해 가며 '뜻·지금 단계·출처 링크'까지
// 몇 번 탭으로 닿는지, 각 요소가 화면에 있는지를 기록한다. 읽기 전용(사이트에 아무것도 쓰지 않음).
// 사용(레포 루트): node docs/midterm/w9/evidence/one-minute-check.mjs [단어=야르] [URL=https://az2mz.vercel.app]
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const { chromium, devices } = createRequire(join(here, '../../../../backend/package.json'))('playwright');
const WORD = process.argv[2] || '야르';
const BASE = (process.argv[3] || 'https://az2mz.vercel.app').replace(/\/$/, '');
const shot = (p, name) => p.screenshot({ path: join(here, name), type: 'jpeg', quality: 70 });

const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices['iPhone 13'], viewport: { width: 375, height: 812 } });
const page = await ctx.newPage();
const results = [];
const check = (flow, step, ok, detail = '') => { results.push({ flow, step, ok, detail }); console.log(`${ok ? '✅' : '❌'} [${flow}] ${step}${detail ? ' — ' + detail : ''}`); };
const visibleText = async (sel) => { const l = page.locator(sel).first(); return (await l.count()) && (await l.isVisible()) ? (await l.innerText()).trim() : ''; };

// ── 과제 A: "'야르'가 무슨 뜻이고 지금 유행 중인지 찾아보세요" (홈 → 메뉴 → MZ 사전 검색 → 상세)
let taps = 0, t0 = Date.now();
await page.goto(BASE + '/', { waitUntil: 'networkidle' });
const generatedAt = await page.evaluate(() => window.H && H.generatedAt);
check('A', '홈 열림', (await page.title()).length > 0, `generatedAt=${generatedAt}`);
await shot(page, 'm01-home.jpg');
await page.locator('.nav-toggle').click(); taps++;
await page.locator('#mastNav a[href="dictionary.html"]').click(); taps++;
await page.waitForURL(/dictionary\.html/);
check('A', '메뉴 → MZ 사전 이동', true, `탭 ${taps}`);
await page.locator('#q').fill(WORD);   // 입력 1회(탭 수에 안 셈)
const hits = page.locator('.dword');
await hits.first().waitFor();
const hitCount = await hits.count();
const firstTerm = (await hits.first().locator('.dw-term').innerText()).trim();
const firstDef = (await hits.first().locator('.dw-def').innerText()).trim();
check('A', `사전 검색 '${WORD}'`, hitCount > 0 && firstTerm.includes(WORD), `결과 ${hitCount}개 · 첫 카드 '${firstTerm}' · 목록에서 뜻 바로 보임: "${firstDef.slice(0, 40)}…"`);
await shot(page, 'm02-dictionary-search.jpg');
await hits.first().click(); taps++;
await page.waitForURL(/trend\.html\?id=/);
await page.waitForSelector('.stage-box, .scores');
const stage = await visibleText('.stage-box .sb-v');
check('A', '상세 — 지금 단계 표시', !!stage, `단계 '${stage}' · ${page.url().replace(BASE, '')}`);
await shot(page, 'm03-detail-top.jpg');
const srcSummary = page.locator('#sources summary');
await srcSummary.scrollIntoViewIfNeeded();
await srcSummary.click(); taps++;
const srcLinks = await page.locator('#sources .src-list a').evaluateAll((as) => as.filter((a) => a.offsetParent).map((a) => a.href));
check('A', '상세 — 출처 링크 펼침', srcLinks.length > 0, `출처 ${srcLinks.length}개`);
await page.locator('#sources').screenshot({ path: join(here, 'm04-detail-sources.jpg'), type: 'jpeg', quality: 70 });
const timeA = Date.now() - t0;
check('A', '과제 A 경로', true, `탭 ${taps}회 + 검색어 입력 1회 · 자동화 소요 ${(timeA / 1000).toFixed(1)}초(사람 시간 아님)`);
const tapsA = taps;

// ── 과제 B: "홈에서 '광고일까 진짜일까' 항목 하나를 열어 광고 의심도·후기 신뢰도와 출처를 찾으세요"
taps = 0; t0 = Date.now();
await page.goto(BASE + '/', { waitUntil: 'networkidle' });
await page.locator('.nav-toggle').click(); taps++;
await page.locator('#mastNav a[href="list.html?type=ad"]').click(); taps++;
await page.waitForURL(/list\.html/);
const card = page.locator('a[href*="trend.html?id="]:visible').first();
await card.waitFor();
await card.click(); taps++;
await page.waitForURL(/trend\.html\?id=/);
await page.waitForSelector('.scores, .stage-box');
const ad = await visibleText('.score.ad .s-num'), trust = await visibleText('.score.trust .s-num');
check('B', '상세 — 광고 의심도·후기 신뢰도', !!ad && !!trust, `광고 ${ad.replace(/\s+/g, '')} · 신뢰 ${trust.replace(/\s+/g, '')} · ${page.url().replace(BASE, '')}`);
const verdict = await visibleText('.verdict');
check('B', '상세 — 한끗 판단 문장', !!verdict, verdict.slice(0, 50) + '…');
await shot(page, 'm05-ad-detail-top.jpg');
await page.locator('#sources summary').scrollIntoViewIfNeeded();
await page.locator('#sources summary').click(); taps++;
const srcB = await page.locator('#sources .src-list a').evaluateAll((as) => as.filter((a) => a.offsetParent).length);
check('B', '상세 — 출처 링크 펼침', srcB > 0, `출처 ${srcB}개`);
const timeB = Date.now() - t0;
check('B', '과제 B 경로', true, `탭 ${taps}회 · 자동화 소요 ${(timeB / 1000).toFixed(1)}초(사람 시간 아님)`);

// 가로 넘침(375px에서 옆으로 밀리는지) — 마지막 페이지 기준
const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
check('B', '375px 가로 넘침 없음', overflow <= 0, `scrollWidth-innerWidth=${overflow}px`);

await browser.close();
const fail = results.filter((r) => !r.ok).length;
console.log(`\n요약: 점검 ${results.length}개 중 실패 ${fail} · 과제 A 탭 ${tapsA}회+입력 1 · 과제 B 탭 ${taps}회`);
process.exitCode = fail ? 1 : 0;
