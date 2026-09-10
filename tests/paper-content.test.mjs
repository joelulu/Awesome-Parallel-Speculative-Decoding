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
test('every referenced thumbnail is a real JPEG inside the public directory', async () => {
  for (const paper of Object.values(data.metadata)) {
    if (!paper.thumbnail) continue;
    const bytes = await readFile(new URL(`../public/${paper.thumbnail}`, import.meta.url));
    assert.equal(bytes[0], 0xff);
    assert.equal(bytes[1], 0xd8);
    assert.ok(bytes.length > 1000);
  }
});
test('mismatched translated-abstract sources prevent publication', () => {
  const abstracts = { ...data.abstracts, dflash: { ...data.abstracts.dflash, sourceUrl: 'https://example.com/wrong' } };
  assert.ok(validateData({...data, abstracts}).some(error => error.includes('provenance mismatch')));
});
