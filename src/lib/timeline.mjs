// Month bands preserve calendar order; each lane sorts by known publication
// date, retaining the original date label for imprecise dates.
/** @param {import('../types').Method} a @param {import('../types').Method} b */
export function comparePublication(a, b) {
  const key = value => value ? (value.length === 7 ? `${value}-00` : value) : '9999-99-99';
  return key(a.date).localeCompare(key(b.date)) || a.id.localeCompare(b.id);
}

/** @param {import('../types').Method[]} methods @param {import('../types').Category[]} categories */
export function buildTimeline(methods, categories) {
  const root = methods.find(method => method.id === 'dflash');
  if (!root) throw new Error('The timeline requires the DFlash starting point.');
  const nodeHeight = 76, laneHeight = 82, firstLaneY = 56;
  const methodGap = 8, monthPadding = 10;
  // Size labels by their longest word; multiword names wrap instead of widening every month.
  const widthOf = method => Math.max(68, Math.ceil(Math.max(...method.name.split(/\s+/).map(word => word.length)) * 8.8) + 14);
  const laneTop = index => firstLaneY + index * laneHeight;
  const monthOf = method => method.date?.slice(0, 7) ?? 'undated';
  const successors = methods.filter(method => method.id !== root.id);
  const monthKeys = [...new Set(successors.map(monthOf))].sort((a, b) =>
    a === 'undated' ? 1 : b === 'undated' ? -1 : a.localeCompare(b));
  const lanes = categories.map((category, index) => ({
    id: category.id, y: laneTop(index), color: category.color,
    methods: successors.filter(method => method.category === category.id).sort(comparePublication),
  }));
  let cursor = 282;
  const months = monthKeys.map(key => {
    const width = Math.max(80, ...lanes.map(lane => {
      const group = lane.methods.filter(method => monthOf(method) === key);
      return group.reduce((total, method) => total + widthOf(method), 0) + Math.max(0, group.length - 1) * methodGap;
    })) + monthPadding * 2;
    const month = { id: key, x: cursor, width, label: key === 'undated' ? '待定' : `${Number(key.slice(5))}月` };
    cursor += width;
    return month;
  });
  const rootNode = {
    id: root.id, kind: 'root', x: 12, y: firstLaneY + Math.max(0, lanes.length - 1) * laneHeight / 2,
    width: 100, height: nodeHeight, method: root,
  };
  const methodNodes = lanes.flatMap(lane => months.flatMap(month => {
    let x = month.x + monthPadding;
    return lane.methods.filter(method => monthOf(method) === month.id).map(method => {
      const width = widthOf(method);
      const node = { id: method.id, kind: 'method', x, y: lane.y, width, height: nodeHeight, method };
      x += width + methodGap;
      return node;
    });
  }));
  const categoryNodes = categories.map((category, index) => ({
    id: `cat-${category.id}`, kind: 'category', x: 124, y: laneTop(index),
    width: 142, height: nodeHeight, category, count: lanes[index].methods.length,
  }));
  const timelineEdges = lanes.flatMap(lane => {
    const chain = [root.id, `cat-${lane.id}`, ...lane.methods.map(method => method.id)];
    return chain.slice(1).map((target, index) => ({
      id: `timeline-${chain[index]}-${target}`, source: chain[index], target,
      color: lane.color, category: lane.id,
    }));
  });
  return {
    root: rootNode, methods: methodNodes, categories: categoryNodes, months, lanes, edges: timelineEdges,
    width: cursor + 28, height: firstLaneY + Math.max(1, lanes.length) * laneHeight,
  };
}
