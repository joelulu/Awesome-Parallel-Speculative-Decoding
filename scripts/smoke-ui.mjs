import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

const BASE = process.env.ATLAS_URL ?? 'http://127.0.0.1:5173/Awesome-Parallel-Speculative-Decoding/';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const chrome = ['C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].find(p => fs.existsSync(p));
if (!chrome) { console.error('未找到 Chrome/Edge，可通过 CHROME_PATH 指定'); process.exit(1); }

try { await fetch(BASE, { method: 'HEAD' }); }
catch { console.error(`站点不可达：${BASE}\n请先运行 npm run dev`); process.exit(1); }

const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH ?? chrome, headless: true, args: ['--hide-scrollbars'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 1000 });
await page.goto(BASE, { waitUntil: 'networkidle2', timeout: 90000 });
await sleep(3500);

let fails = 0;
const check = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`); if (!ok) fails++; };

async function backToAll() {
  for (const b of await page.$$('button')) {
    const t = await page.evaluate(el => el.textContent.trim(), b);
    if (t.includes('返回全图')) { await b.click(); await sleep(1200); return true; }
  }
  return false;
}

async function clickNode(name) {
  const find = async () => {
    for (const n of await page.$$('.globe-node')) {
      if (await page.evaluate(el => el.getAttribute('aria-label'), n) === `聚焦 ${name}`) return n;
    }
    return null;
  };
  let hit = await find();
  if (!hit) {
    const left = await backToAll();
    if (left) check(true, `局部视图下可退出并重新定位 ${name}`);
    hit = await find();
  }
  if (!hit) return false;
  await hit.click();
  await sleep(1200);
  return true;
}

const state = () => page.evaluate(() => ({
  heading: document.querySelector('.globe-selection h3')?.textContent?.trim() ?? null,
  cards: document.querySelectorAll('.globe-research-card').length,
  cardLabel: document.querySelector('.globe-research-card')?.getAttribute('aria-label') ?? null,
  pressed: [...document.querySelectorAll('.globe-node[aria-pressed="true"]')].map(n => n.getAttribute('aria-label')),
}));

// 连续切换的节点链。专题站点的枢纽不同，用 ATLAS_CHAIN 覆盖。
const chain = (process.env.ATLAS_CHAIN ?? 'JetSpec,JetSpec++,DSpark,JetSpec')
  .split(',').map(name => name.trim()).filter(Boolean);

for (const name of chain) {
  if (!await clickNode(name)) { check(false, `节点可点击：${name}`); continue; }
  check(true, `节点可点击：${name}`);
  const s = await state();
  check(s.heading === name, `详情卡标题同步：${name}`);
  check(s.cards === 1, `只渲染一张详情卡：${s.cards} 张`);
  check(s.cardLabel?.startsWith(name), `卡片 aria-label 同步：${s.cardLabel}`);
  check(s.pressed.length === 1 && s.pressed[0] === `聚焦 ${name}`, `唯一选中态`);
}

const linked = await page.evaluate(() => {
  const link = document.querySelector('.globe-research-block .globe-method-link');
  if (!link) return null;
  const label = link.textContent.trim();
  link.click();
  return label;
});
await sleep(1200);
check(Boolean(linked), `卡片内存在方法互跳入口：${linked}`);
if (linked) check((await state()).heading === linked, `基线双向跳转生效：${linked}`);

const views = await page.evaluate(() => {
  const labels = [...document.querySelectorAll('button')].map(b => b.textContent.trim());
  return { timeline: labels.some(t => t.includes('平行时间线')), globe: labels.some(t => t.includes('星球关系图')) };
});
check(views.timeline && views.globe, `双视图切换入口齐全`);

console.log(fails === 0 ? '\n全部通过' : `\n${fails} 项失败`);
await browser.close();
process.exit(fails === 0 ? 0 : 1);
