// script-<판>.md → 같은 이름 .pdf (A4). 간단 마크다운만 처리: 제목·문단·목록·표·인용·굵게/기울임·구분선. 사용: node script-pdf.mjs script-v20.md
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(HERE, '../../../../backend/package.json'));
const { chromium } = require('playwright');

const md = fs.readFileSync(path.join(HERE, process.argv[2] || 'script-v18.md'), 'utf8');
const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const inl = (t) => esc(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\*(.+?)\*/g, '<i>$1</i>');
const out = [];
let list = false, table = null;
const flush = () => {
  if (list) { out.push('</ul>'); list = false; }
  if (table) { out.push('<table>' + table.map((r, i) => '<tr>' + r.map((c) => `<${i ? 'td' : 'th'}>${inl(c)}</${i ? 'td' : 'th'}>`).join('') + '</tr>').join('') + '</table>'); table = null; }
};
for (const line of md.split(/\r?\n/)) {
  if (/^\|/.test(line)) {
    if (/^\|[-| ]+\|$/.test(line)) continue;
    (table ||= []).push(line.slice(1, -1).split('|').map((c) => c.trim()));
    continue;
  }
  if (/^- /.test(line)) { if (!list) { flush(); out.push('<ul>'); list = true; } out.push(`<li>${inl(line.slice(2))}</li>`); continue; }
  flush();
  let m;
  if ((m = line.match(/^(#{1,3}) (.*)/))) out.push(`<h${m[1].length}>${inl(m[2])}</h${m[1].length}>`);
  else if (/^---$/.test(line)) out.push('<hr>');
  else if (/^> /.test(line)) out.push(`<p class="note">${inl(line.slice(2))}</p>`);
  else if (line.trim()) out.push(`<p>${inl(line)}</p>`);
}
flush();

const html = `<!doctype html><html lang="ko"><meta charset="utf-8"><style>
@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css');
body{font-family:Pretendard,'Malgun Gothic',sans-serif;color:#111827;font-size:11pt;line-height:1.7}
h1{font-size:18pt;margin:0 0 8pt}h2{font-size:13pt;margin:16pt 0 4pt;padding-top:6pt;border-top:1px solid #e5e7eb;break-after:avoid}
p{margin:3pt 0}.note{color:#4b5563;font-size:10pt}hr{border:0;margin:6pt 0}
table{border-collapse:collapse;width:100%;font-size:9.5pt;margin:6pt 0}th,td{border:1px solid #d1d5db;padding:4pt 6pt;text-align:left;vertical-align:top}th{background:#f3f4f6}
tr{break-inside:avoid}ul{margin:4pt 0;padding-left:16pt}
</style><body>${out.join('\n')}</body></html>`;

const b = await chromium.launch();
const p = await b.newPage();
await p.setContent(html, { waitUntil: 'networkidle' });
await p.pdf({ path: path.join(HERE, (process.argv[2] || 'script-v18.md').replace(/.md$/, '.pdf')), format: 'A4', margin: { top: '16mm', bottom: '16mm', left: '16mm', right: '16mm' }, displayHeaderFooter: true, headerTemplate: '<span></span>', footerTemplate: '<div style="font-size:8pt;width:100%;text-align:center;color:#6b7280"><span class="pageNumber"></span> / <span class="totalPages"></span></div>' });
await b.close();
console.log('ok');
