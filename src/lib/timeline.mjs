// Month bands preserve calendar order; each lane sorts by known publication
// date, retaining the original date label for imprecise dates.
/** @param {import('../types').Method} a @param {import('../types').Method} b */
export function comparePublication(a, b) {
  const key = value => value ? (value.length === 7 ? `${value}-00` : value) : '9999-99-99';
  return key(a.date).localeCompare(key(b.date)) || a.id.localeCompare(b.id);
}

/**
 * @param {import('../types').Method[]} methods
 * @param {import('../types').Category[]} categories
 * @param {string} rootId 起始节点。专题不同则根不同，所以不能写死。
 * @param {Set<string>} latestIds 带 NEW 标记的方法，节点宽度要留出徽标位置。
 */
export function buildTimeline(methods, categories, rootId = 'dflash', latestIds = new Set()) {
  const root = methods.find(method => method.id === rootId);
  if (!root) throw new Error(`The timeline requires the starting point "${rootId}".`);
  const nodeHeight = 72, laneHeight = 80, firstLaneY = 58;
  const methodGap = 14, monthPadding = 18;

  // Keep every method title on one line. Width follows the complete display name
  // instead of the longest word, which previously forced long titles to wrap.
  const widthOf = method => {
    const name = method.name.replace(/\s+/g, ' ').trim();
    const ascii = [...name].reduce((total, char) => total + (/^[\x00-\x7F]$/.test(char) ? 7.45 : 13), 0);
    return Math.max(82, Math.ceil(ascii) + 22) + (latestIds.has(method.id) ? 26 : 0);
  };
  const laneTop = index => firstLaneY + index * laneHeight;
  const monthOf = method => method.date?.slice(0, 7) ?? 'undated';
  const successors = methods.filter(method => method.id !== root.id);
  const monthKeys = [...new Set(successors.map(monthOf))].sort((a, b) =>
    a === 'undated' ? 1 : b === 'undated' ? -1 : a.localeCompare(b));
  const lanes = categories.map((category, index) => ({
    id: category.id, y: laneTop(index), color: category.color,
    methods: successors.filter(method => method.category === category.id).sort(comparePublication),
  }));
  let cursor = 304;
  let previousYear = '';
  const months = monthKeys.map(key => {
    const width = Math.max(112, ...lanes.map(lane => {
      const group = lane.methods.filter(method => monthOf(method) === key);
      return group.reduce((total, method) => total + widthOf(method), 0) + Math.max(0, group.length - 1) * methodGap;
    })) + monthPadding * 2;
    // 跨年的专题里只写「7月」会让人分不清是哪一年，所以在年份切换的那个月补上年份。
    const year = key.slice(0, 4);
    const shifted = year !== previousYear;
    previousYear = year;
    const label = key === 'undated' ? '待定'
      : shifted ? `${key.slice(2, 4)}年${Number(key.slice(5))}月` : `${Number(key.slice(5))}月`;
    const month = { id: key, x: cursor, width, label };
    cursor += width;
    return month;
  });
  const rootNode = {
    id: root.id, kind: 'root', x: 18, y: firstLaneY + Math.max(0, lanes.length - 1) * laneHeight / 2,
    width: 104, height: nodeHeight, method: root,
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
    id: `cat-${category.id}`, kind: 'category', x: 136, y: laneTop(index),
    width: 148, height: nodeHeight, category, count: lanes[index].methods.length,
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
    width: cursor + 42, height: firstLaneY + Math.max(1, lanes.length) * laneHeight,
  };
}
