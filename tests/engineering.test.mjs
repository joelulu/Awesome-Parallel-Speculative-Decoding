import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const radar = JSON.parse(await readFile(new URL('../src/data/engineering.json', import.meta.url),'utf8'));

test('engineering radar keeps PR/Issue references separately from research methods', async () => {
  const methods = JSON.parse(await readFile(new URL('../src/data/methods.json', import.meta.url),'utf8'));
  assert.equal(methods.length, 60, 'the paper method atlas remains intact at this 2026-10-17 snapshot');
  assert.equal(radar.asOf, '2026-10-17');
  const repos = new Map(radar.projects.map(project => [project.id, project.url]));
  assert.equal(repos.size, radar.projects.length);
  assert.ok(repos.size >= 5);
  const ids = new Set();
  for (const item of radar.events) {
    assert.ok(!ids.has(item.id), 'duplicate PR/Issue ' + item.id);
    ids.add(item.id);
    assert.ok(repos.has(item.repo), item.id + ' refers to unknown project');
    assert.match(item.id, /^[a-z]+-\d+$/);
    assert.ok(['pr','issue'].includes(item.kind), item.id);
    assert.ok(['open','merged'].includes(item.status), item.id);
    assert.ok(['P0','P1','P2'].includes(item.priority), item.id);
    assert.match(item.date, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(item.date <= radar.asOf, 'future PR date ' + item.id);
    assert.ok(item.title && item.summary && item.caveat, item.id);
    const suffix = item.kind === 'issue' ? '/issues/' : '/pull/';
    assert.ok(item.url.startsWith(repos.get(item.repo) + suffix), item.url);
    assert.equal(new URL(item.url).protocol, 'https:');
  }
  assert.equal(ids.size, 23);
});
