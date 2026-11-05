const { chromium } = require('E:/workspace/side_project/aztomz/backend/node_modules/playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage();
const urls=['https://sh-life.co.kr/entry/AI-숏폼-챌린지-틱톡·인스타를-평정한-유행-AI-필터-참여-가이드','https://modecue.com/posts/2026/2026-sheer-shirt-styling/','https://www.cafein21.co.kr/allarticle/17497','https://brunch.co.kr/@ojen1128/188','https://brunch.co.kr/@thetrippick/895','https://www.forbes.com/sites/joshweiss/2024/07/31/nsyncs-bye-bye-bye-choreographer-darrin-henson-reacts-to-dances-resurgence-in-deadpool--wolverine/'];
console.log('# run at '+new Date().toISOString());
console.log('# check-links.log 의 ❌·⚠️ 항목을 실제 브라우저(Playwright Chromium, headless)로 다시 연 결과: 상태 | 제목 | 본문 앞 60자 | URL');
for(const u of urls){try{const r=await p.goto(u,{waitUntil:'domcontentloaded',timeout:30000});const t=(await p.title()).slice(0,40);const body=((await p.evaluate(()=>document.body.innerText))||'').replace(/\s+/g,' ').slice(0,60);console.log(r.status(),'|',t,'|',body,'|',u.slice(0,80))}catch(e){console.log('ERR |',e.message.slice(0,50),'|',u.slice(0,80))}}
await b.close()})();
