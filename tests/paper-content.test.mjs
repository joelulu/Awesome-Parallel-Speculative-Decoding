import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { loadData, validateData } from '../scripts/validate-data.mjs';
const data = await loadData();
test('Chinese summaries link to their fetched primary sources', () => {
  for (const [id, abstract] of Object.entries(data.abstracts)) {
    assert.match(abstract.text, /[\u4e00-\u9fff]/);
    assert.equal(abstract.sourceUrl, data.metadata[id].sourceUrl);
    assert.equal(data.metadata[id].status, 'fetched');
  }
});
test('every arXiv paper has a rendered PDF cover and every thumbnail is a JPEG', async () => {
  for (const [id, paper] of Object.entries(data.metadata)) {
    if (paper.pdfUrl?.startsWith('https://arxiv.org/pdf/')) {
      assert.equal(paper.thumbnail, `papers/${id}.jpg`, `${id} should use its PDF cover`);
    }
    if (!paper.thumbnail) continue;
    assert.ok(paper.thumbnail.endsWith('.jpg'), `${id} should not use a generated info-card SVG`);
    let bytes;
    try {
      bytes = await readFile(new URL(`../public/${paper.thumbnail}`, import.meta.url));
    } catch (error) {
      if (error.code === 'ENOENT' && !process.env.CI) continue;
      throw error;
    }
    assert.equal(bytes[0], 0xff, `${id} cover should have a JPEG signature`);
    assert.equal(bytes[1], 0xd8, `${id} cover should have a JPEG signature`);
    assert.ok(bytes.length > 1000);
  }
});
test('mismatched translated-abstract sources prevent publication', () => {
  const abstracts = { ...data.abstracts, dflash: { ...data.abstracts.dflash, sourceUrl: 'https://example.com/wrong' } };
  assert.ok(validateData({...data, abstracts}).some(error => error.includes('provenance mismatch')));
});
