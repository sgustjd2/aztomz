const { chromium } = require(process.cwd() + '/node_modules/playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  for (const u of process.argv.slice(2)) {
    try { const r = await p.goto(u, { waitUntil: 'domcontentloaded', timeout: 30000 });
      const title = await p.title(); const txt = (await p.innerText('body').catch(() => '')).replace(/\s+/g, ' ').slice(0, 120);
      console.log(`${r && r.status()} | ${title.slice(0, 80)} | ${txt} | ${u}`);
    } catch (e) { console.log(`ERR ${e.message.split('\n')[0]} | ${u}`); }
  }
  await b.close();
})();
