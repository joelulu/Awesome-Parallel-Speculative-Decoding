import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

const BASE = process.env.ATLAS_URL ?? 'http://127.0.0.1:5173/Awesome-Parallel-Speculative-Decoding/';
const OUT = process.env.ATLAS_OUT ?? 'assets';
// 专题站点的枢纽节点不同，聚焦点要能换。
const FOCUS = process.env.ATLAS_FOCUS ?? 'DSpark';
const sleep = ms => new Promise(r => setTimeout(r, ms));
fs.mkdirSync(OUT, { recursive: true });

const chrome = ['C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].find(p => fs.existsSync(p));
if (!chrome) { console.error('未找到 Chrome/Edge，可通过 CHROME_PATH 指定'); process.exit(1); }

try { await fetch(BASE, { method: 'HEAD' }); }
catch { console.error(`站点不可达：${BASE}\n请先在另一个终端运行 npm run dev`); process.exit(1); }

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH ?? chrome,
  headless: true,
  args: ['--hide-scrollbars', '--font-render-hinting=none'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 1500, deviceScaleFactor: 1.5 });
await page.goto(BASE, { waitUntil: 'networkidle2', timeout: 90000 });
await sleep(4000);

const bottom = sel => page.evaluate(s => {
  const r = document.querySelector(s)?.getBoundingClientRect();
  return r ? Math.ceil(r.bottom) : null;
}, sel);

async function shoot(name, clip) {
  await page.screenshot({ path: `${OUT}/${name}`, clip });
  console.log(`${name}  ${clip.width}x${clip.height}  ${(fs.statSync(`${OUT}/${name}`).size / 1024).toFixed(0)}KB`);
}

await shoot('atlas-globe.png', { x: 0, y: 0, width: 1440, height: await bottom('.globe-frame') });

for (const node of await page.$$('.globe-node')) {
  const label = await page.evaluate(el => el.getAttribute('aria-label'), node);
  if (label === `聚焦 ${FOCUS}`) { await node.click(); break; }
}
await sleep(2500);
await shoot('atlas-node-relations.png', { x: 0, y: 300, width: 1440, height: 1055 });

await browser.close();
console.log('截图已更新到 assets/，README 直接引用即可');
