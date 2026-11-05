// 그림 2장을 덱용으로 줄이기(≤250KB). 사용: node v19-img/encode.mjs
import { createRequire } from "module";
import fs from "fs";
const require = createRequire(new URL("../../../../../backend/package.json", import.meta.url));
const { chromium } = require("playwright");
const dir = new URL(".", import.meta.url);
const src = (n) => fs.readFileSync(new URL(`../../../../diagrams/png/${n}`, import.meta.url)).toString("base64");
const b = await chromium.launch(); const p = await b.newPage();
async function enc(name, crop, outW, mime, q, out) {
  const r = await p.evaluate(async ([d, crop, outW, mime, q]) => {
    const im = new Image(); im.src = "data:image/png;base64," + d; await im.decode();
    const [x, y, w, h] = crop; const k = outW / w;
    const c = document.createElement("canvas"); c.width = outW; c.height = Math.round(h * k);
    c.getContext("2d").drawImage(im, x, y, w, h, 0, 0, c.width, c.height);
    const u = c.toDataURL(mime, q); return { u: u.split(",")[1], w: c.width, h: c.height };
  }, [src(name), crop, outW, mime, q]);
  const buf = Buffer.from(r.u, "base64"); fs.writeFileSync(new URL(out, dir), buf);
  console.log(out, r.w + "x" + r.h, (buf.length / 1024 | 0) + "KB");
}
await enc("hermes-agent-slide.png", [0, 60, 2560, 1120], 2000, "image/png", 1, "hermes.png");
for (const q of [0.9, 0.85, 0.8]) await enc("hangeut-anatomy-slide.png", [0, 0, 2560, 1440], 2200, "image/jpeg", q, `anatomy-q${q}.jpg`);
await b.close();
