import test from 'node:test';
import assert from 'node:assert/strict';
import { loadData } from '../scripts/validate-data.mjs';
import { buildTimeline, comparePublication } from '../src/lib/timeline.mjs';
const { methods, categories } = await loadData();
const timeline = buildTimeline(methods, categories);

test('every method is present once, with DFlash left of all successors', () => {
  const nodes = [timeline.root, ...timeline.methods];
  assert.equal(nodes.length, methods.length);
  assert.equal(new Set(nodes.map(node => node.id)).size, methods.length);
  for (const node of timeline.methods) assert.ok(node.x > timeline.root.x + timeline.root.width);
});
test('each lane follows publication order without overlapping method names', () => {
  for (const category of categories) {
    const nodes = timeline.methods.filter(node => node.method.category === category.id).sort((a, b) => a.x - b.x);
    assert.deepEqual(nodes.map(node => node.id), [...nodes].sort((a, b) => comparePublication(a.method, b.method)).map(node => node.id));
    for (let i = 1; i < nodes.length; i++) assert.ok(nodes[i].x >= nodes[i - 1].x + nodes[i - 1].width);
  }
});
test('later months sit to the right across different research lanes', () => {
  for (const a of timeline.methods) for (const b of timeline.methods) {
    if (a.method.date && b.method.date && a.method.date.slice(0, 7) < b.method.date.slice(0, 7)) assert.ok(a.x + a.width <= b.x);
  }
});
test('time links move forward and resolve to visible nodes', () => {
  const nodes = new Map([timeline.root, ...timeline.categories, ...timeline.methods].map(node => [node.id, node]));
  for (const edge of timeline.edges) {
    assert.ok(nodes.has(edge.source) && nodes.has(edge.target));
    assert.ok(nodes.get(edge.source).x < nodes.get(edge.target).x);
  }
});
test('future papers and unknown dates do not need hardcoded month changes', () => {
  const base = methods.find(method => method.id !== 'dflash');
  const expanded = buildTimeline([...methods, { ...base, id: 'future', date: '2027-01-01' }, { ...base, id: 'unknown', date: null }], categories);
  assert.deepEqual(expanded.months.slice(-2).map(month => month.id), ['2027-01', 'undated']);
  assert.equal(expanded.methods.length, methods.length + 1);
});

test('month headings omit days and years while preserving calendar keys', () => {
  for (const month of timeline.months) {
    assert.match(month.label, /^(?:\d{1,2}月|待定)$/);
    assert.match(month.id, /^(?:\d{4}-\d{2}|undated)$/);
  }
});
