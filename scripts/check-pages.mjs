import { chromium } from 'playwright';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import path from 'node:path';

const workspace = process.env.GITHUB_WORKSPACE;
const output = process.env.PAGES_AUDIT_OUTPUT || path.join(workspace, '.cache/pages-audit');
await mkdir(output, { recursive: true });
const read = async name => JSON.parse(await readFile(path.join(workspace, 'src/data', name + '.json'), 'utf8'));
const [methods, metadata, briefs] = await Promise.all(['methods', 'paper-metadata', 'briefs'].map(read));
const brief = [...briefs].sort((a, b) => b.date.localeCompare(a.date))[0];
const recentPapers = [...briefs].sort((a, b) => b.date.localeCompare(a.date)).find(item => item.items.length > 0);
const ids = [...new Set((recentPapers?.items ?? []).flatMap(item => item.methodIds))];
const base = process.env.PAGES_URL || 'https://joelulu.github.io/Awesome-Parallel-Speculative-Decoding/';
const url = new URL(base);
url.searchParams.set('deployment', process.env.GITHUB_SHA);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, timezoneId: 'Asia/Shanghai', reducedMotion: 'reduce' });
const pageErrors = [];
page.on('pageerror', error => pageErrors.push(error.message));
try {
  let ready = false;
  for (let attempt = 0; attempt < 6; attempt++) {
    await page.goto(url.href, { waitUntil: 'networkidle', timeout: 45000 });
    await page.locator('#daily .brief-intro h3').waitFor();
    const title = await page.locator('#daily .brief-intro h3').textContent();
    const count = await page.locator('.intro-meta').textContent();
    const hasDefaultGlobe = await page.getByRole('button', { name: '星球关系图', exact: true, pressed: true }).count();
    const hasResearchDetails = await page.locator('.globe-frame[data-research-details]').count();
    if (title === brief.title && count.includes(methods.length + '') && hasDefaultGlobe && hasResearchDetails) { ready = true; break; }
    await page.waitForTimeout(5000);
  }
  assert.ok(ready, 'Pages has not served the expected catalog/brief yet');
  await page.getByRole('button', { name: '聚焦 DFlash', exact: true }).waitFor();
  assert.equal(await page.locator('.globe-stage').evaluate(element => getComputedStyle(element).backgroundColor), 'rgb(9, 15, 29)');
  await page.screenshot({ path: path.join(output, 'home.png') });
  await page.getByRole('button', { name: '平行时间线', exact: true }).click();
  await page.locator('.react-flow__node[data-id="dspine"]').waitFor();
  assert.equal(await page.locator('#daily .brief-list > li').count(), Math.min(5, brief.items.length));
  await page.locator('#daily').screenshot({ path: path.join(output, 'daily.png') });

  await page.getByRole('button', { name: '查看全部方法' }).click();
  for (const id of ids) {
    const method = methods.find(method => method.id === id);
    const card = page.locator('#method-' + id);
    assert.equal(await card.count(), 1, id + ' must have a paper card');
    assert.equal(await card.locator('h3 a').getAttribute('href'), method.paperUrl || metadata[id].sourceUrl);
    const image = card.locator('.paper-preview img');
    await image.scrollIntoViewIfNeeded();
    await page.waitForFunction(id => {
      const image = document.querySelector('#method-' + id + ' .paper-preview img');
      return image?.complete && image.naturalWidth > 0;
    }, id);
    assert.ok((await card.locator('.paper-abstract').textContent()).match(/[\u4e00-\u9fff]/));
    assert.ok((await card.locator('.paper-byline').textContent()).includes(method.date));
  }

  await page.locator('#method-dspine .abstract-toggle').click();
  await page.locator('#method-dspine').screenshot({ path: path.join(output, 'dspine-card.png') });
  await page.locator('#method-dspine .paper-actions button').filter({ hasText: '在脉络图中定位' }).click();
  const node = page.locator('.react-flow__node[data-id="dspine"] .timeline-read');
  await node.hover();
  const tooltip = node.locator('.timeline-node-tooltip');
  assert.ok((await tooltip.textContent()).includes('逐层'));
  await page.waitForFunction(() => getComputedStyle(document.querySelector('.react-flow__node[data-id="dspine"] .timeline-node-tooltip')).opacity === '1');
  await page.locator('#research-map').screenshot({ path: path.join(output, 'research-map.png') });
  await node.click();
  await page.locator('#method-dspine.highlighted').waitFor();
  assert.equal(new URL(page.url()).hash, '#method-dspine');

  const search = page.getByRole('textbox', { name: '搜索方法、问题或关键词' });
  await search.fill('UBTree');
  await page.waitForFunction(() => document.querySelectorAll('.cards-grid .method-card').length === 1);
  assert.equal(await page.locator('#method-ubtree').count(), 1);
  await search.fill('');
  await page.locator('.map-legend button').filter({ hasText: '多模态与扩展' }).click();
  await page.waitForFunction(() => [...document.querySelectorAll('.cards-grid .paper-primary-tag')].every(element => element.textContent === '多模态与扩展'));
  const cardIds = await page.locator('.cards-grid .method-card').evaluateAll(elements => elements.map(element => element.id.replace('method-', '')));
  assert.ok(cardIds.length > 0);
  assert.ok(cardIds.every(id => methods.find(method => method.id === id)?.category === 'extensions'));

  const methodIds = methods.map(method => method.id);
  const boxes = await page.locator('.react-flow__node').evaluateAll((elements, ids) =>
    elements.filter(element => ids.includes(element.dataset.id)).map(element => {
      const box = element.getBoundingClientRect();
      return { id: element.dataset.id, x: box.x, y: box.y, width: box.width, height: box.height };
    }), methodIds);
  assert.equal(boxes.length, methods.length);
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    const a = boxes[i], b = boxes[j];
    assert.ok(!(a.x < b.x + b.width - 1 && b.x < a.x + a.width - 1 &&
      a.y < b.y + b.height - 1 && b.y < a.y + a.height - 1), a.id + ' overlaps ' + b.id);
  }
  assert.equal(await page.locator('.timeline-new-badge').count(), 3);

  await page.getByRole('button', { name: '星球关系图', exact: true }).click();
  await page.getByRole('button', { name: '返回全图', exact: true }).click();
  assert.equal(await page.locator('.globe-node').count(), methods.length);
  const ddtree = page.getByRole('button', { name: '聚焦 DDTree', exact: true });
  const searchMap = page.getByRole('textbox', { name: '搜索方法、问题或关键词' });
  await searchMap.fill('DDTree');
  await searchMap.press('Enter');
  await page.locator('.globe-stage .globe-node[aria-pressed=true][aria-label="聚焦 DDTree"]').waitFor();
  assert.ok((await page.locator('.globe-node').count()) < methods.length);
  assert.equal(await ddtree.getAttribute('aria-pressed'), 'true');
  const research = page.getByRole('article', { name: 'DDTree 研究详情' });
  assert.ok((await research.locator('time').textContent()).includes('2026 年 4 月'));
  assert.ok(await research.getByRole('button', { name: '原版 DFlash', exact: true }).isVisible());
  assert.ok((await research.locator('.globe-benchmark-context').textContent()).includes('Table 1'));
  const rootNode = page.getByRole('button', { name: '聚焦 DFlash', exact: true });
  assert.ok((await rootNode.boundingBox()).x < (await ddtree.boundingBox()).x);
  const rootPosition = await rootNode.getAttribute('style');
  await page.getByRole('button', { name: '放大星球视图' }).click();
  assert.notEqual(await rootNode.getAttribute('style'), rootPosition);
  await page.locator('.globe-selection summary').filter({ hasText: '连线证据' }).click();
  assert.ok(await page.locator('.globe-selection details a[href="https://arxiv.org/abs/2604.12989"]').first().isVisible());
  await page.locator('.globe-frame').screenshot({ path: path.join(output, 'research-globe.png') });
  await page.getByRole('button', { name: '论文引用', exact: true }).click();
  const citation = page.locator('.globe-edges [data-source="ddtree"][data-target="dflash"][data-relation="cites"]');
  assert.equal(await citation.count(), 1);
  assert.ok(await citation.getAttribute('marker-end'));
  await page.locator('.globe-selection summary').filter({ hasText: '连线证据' }).click();
  assert.ok(await page.getByRole('link', { name: '§1，引文 [4]' }).isVisible());
  await page.locator('.globe-selection summary').filter({ hasText: '同方向方法' }).click();
  assert.ok(await page.locator('.globe-peers button').count() > 0);
  await page.getByRole('link', { name: '阅读方法卡片', exact: true }).click();
  await page.locator('#method-ddtree.highlighted').waitFor();
  await page.getByRole('button', { name: '平行时间线', exact: true }).click();
  await page.locator('.react-flow__node[data-id="ddtree"]').waitFor();

  assert.deepEqual(pageErrors, []);
  const report = { commit: process.env.GITHUB_SHA, url: url.href, status: 'success', methods: methods.length,
    brief: brief.date, checkedFeaturedCards: ids, checks: ['home', 'dark globe by default', 'daily', 'real covers', 'Chinese abstracts', 'map hover', 'map-to-card link', 'search', 'direction filter', 'no overlap', 'NEW badges', 'globe switch', 'globe search focus', 'globe zoom', 'upstream layout', 'globe evidence', 'citation direction and source', 'same-topic methods', 'globe paper card', 'no page errors'] };
  await writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  await page.screenshot({ path: path.join(output, 'failure.png'), fullPage: true }).catch(() => {});
  throw error;
} finally {
  await browser.close();
}
