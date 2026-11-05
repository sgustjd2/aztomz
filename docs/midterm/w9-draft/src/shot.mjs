import { chromium } from 'playwright';
const [url, out] = process.argv.slice(2);
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 2000, height: 1200 } });
await p.goto(url, { waitUntil: 'networkidle' }); await p.evaluate(() => document.fonts.ready);
const secs = await p.$$('section');
for (let i = 0; i < secs.length; i++) await secs[i].screenshot({ path: `${out}/s${i + 1}.png` });
await b.close(); console.log(secs.length);
