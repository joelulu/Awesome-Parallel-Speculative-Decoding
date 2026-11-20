// 重算方法的重要性层级。
//
// 背景：原数据里 83 个方法有 52 个 importance=5，「按研究重要性排序」等于没排序。
// 根因不是标错，而是没有口径——每个方法都由不同时间、不同人凭印象打的分。
//
// 这里改用可复核的结构信号：一个工作有多重要，看它被后续工作继承了几次、
// 被多少篇论文当作基线、自己做了几组可核验实验。这些都是库里已有的数据，
// 不引入外部主观判断，因此结果可复跑、可解释、可争论。
//
// 用法：
//   node scripts/rescore-importance.mjs                            # 重算主库并写入 methods.json
//   node scripts/rescore-importance.mjs --dry                      # 只打印，不改文件
//   node scripts/rescore-importance.mjs --dir src/topics/x --report docs/x-report.md
//
// 专题也走同一套口径：没有单独的一套「拍脑袋打分」，否则两个站点的星级无法互相看。
//
// 调整口径只改下面的 WEIGHTS 与 TIER_SHARE，不允许手改 JSON：手改会让下一个
// 人无法判断某个分数是算出来的还是拍出来的。
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { repoRoot, readJson } from './build-atlas.mjs';

const DATA = path.join(repoRoot, 'src/data');

/**
 * 权重口径：基线 > 继承 > 技术沿革 > 引用 > 实验量。
 * 「被当作基线」权重最高，因为它是同行用实验投的票，比我们读摘要的判断更硬。
 */
export const WEIGHTS = {
  baseline: 2.0,      // 被其他论文用作对比基线的次数
  inherit: 3.0,       // 被后续方法继承/组合的次数（relation source 指向它）
  cited: 1.0,         // 被库内论文引用的次数
  benchmark: 0.8,     // 自己有多少组可核验实验对照
  ancestor: 0.5,      // 它继承了多少前序工作（越会站在别人肩上越靠后）
  categoryFirst: 1.5, // 是否开创了所在研究方向
  code: 1.5,          // 是否有可用代码
  verified: 0.8,      // 条目本身是否已核验
  confirmed: 0.6,     // 论文身份是否已确认
  pinned: 2.0,        // 编辑置顶（人工信号，权重刻意低于结构信号）
};

/** 目标分布：8% / 23% / 38%，剩下归入 2 分。任何一层都不允许再次通胀。 */
export const TIER_SHARE = { 5: 0.10, 4: 0.23, 3: 0.38 };

/** 计算每个方法的结构分与信号明细。纯函数，测试与 CI 都复用它。 */
export function scoreMethods({ methods, relations, benchmarks, citations = [], categories = [] }) {
  const inherit = new Map();
  const ancestor = new Map();
  for (const relation of relations) {
    if (relation.status !== 'verified') continue;
    inherit.set(relation.source, (inherit.get(relation.source) ?? 0) + 1);
    ancestor.set(relation.target, (ancestor.get(relation.target) ?? 0) + 1);
  }

  const baselineIn = new Map();
  const benchmarkCount = new Map();
  for (const item of benchmarks) {
    benchmarkCount.set(item.methodId, (benchmarkCount.get(item.methodId) ?? 0) + 1);
    for (const baseline of [item.primary, ...(item.others ?? [])]) {
      if (baseline?.methodId) baselineIn.set(baseline.methodId, (baselineIn.get(baseline.methodId) ?? 0) + 1);
    }
  }

  const citedIn = new Map();
  for (const edge of citations) citedIn.set(edge.target, (citedIn.get(edge.target) ?? 0) + 1);

  // 每个研究方向最早的一篇，视为该方向的开创工作。
  const firstInCategory = new Map();
  for (const method of methods) {
    if (!method.date) continue;
    const current = firstInCategory.get(method.category);
    if (!current || method.date < current.date) firstInCategory.set(method.category, method);
  }
  const firstIds = new Set([...firstInCategory.values()].map(method => method.id));

  return methods.map(method => {
    const signals = {
      baseline: baselineIn.get(method.id) ?? 0,
      inherit: inherit.get(method.id) ?? 0,
      cited: citedIn.get(method.id) ?? 0,
      benchmark: benchmarkCount.get(method.id) ?? 0,
      ancestor: ancestor.get(method.id) ?? 0,
      categoryFirst: firstIds.has(method.id),
      code: method.code.some(link => !['unavailable', 'placeholder'].includes(link.availability ?? 'available')),
      verified: method.status === 'verified',
      confirmed: method.citationStatus === 'confirmed',
      pinned: Boolean(method.pinned),
    };
    let score = 0;
    for (const [key, weight] of Object.entries(WEIGHTS)) {
      const value = signals[key];
      score += (typeof value === 'boolean' ? Number(value) : value) * weight;
    }
    return { method, signals, score: Math.round(score * 100) / 100 };
  });
}

/** 按目标分布分层，并保证每个研究方向至少有 1 个 4 分以上代表，避免重点阅读只堆在一条线上。 */
export function assignTiers(rows, categories) {
  const n = rows.length;
  const ranked = [...rows].sort((a, b) =>
    b.score - a.score || (a.method.date ?? '9999').localeCompare(b.method.date ?? '9999') || a.method.id.localeCompare(b.method.id));

  const targets = {
    5: Math.max(1, Math.round(n * TIER_SHARE[5])),
    4: Math.round(n * TIER_SHARE[4]),
    3: Math.round(n * TIER_SHARE[3]),
  };

  let cursor = 0;
  const assign = (count, tier) => {
    for (let i = 0; i < count && cursor < ranked.length; i += 1, cursor += 1) ranked[cursor].tier = tier;
  };
  assign(targets[5], 5);
  assign(targets[4], 4);
  assign(targets[3], 3);
  assign(ranked.length - cursor, 2);

  // 覆盖度兜底：某个方向最高的也只有 3 分时，把它提到 4 分。
  // 目录的「重点阅读」是按方向铺开的，一个方向没有代表作比多一个 4 分更糟。
  const promoted = [];
  for (const category of categories) {
    const inCategory = ranked.filter(row => row.method.category === category.id);
    if (!inCategory.length) continue;
    const best = inCategory.reduce((a, b) => (b.score > a.score ? b : a));
    if (best.tier < 4) { best.tier = 4; promoted.push(best.method.id); }
  }

  return { ranked, targets, promoted };
}

/** 把分数翻译成一句人话，存进 importanceBasis，卡片上可直接显示。 */
export function describeBasis(signals) {
  const parts = [];
  if (signals.baseline) parts.push(`被 ${signals.baseline} 篇用作基线`);
  if (signals.inherit) parts.push(`被 ${signals.inherit} 篇后续工作继承`);
  if (signals.cited) parts.push(`被库内 ${signals.cited} 篇引用`);
  if (signals.benchmark) parts.push(`${signals.benchmark} 组可核验实验`);
  if (signals.categoryFirst) parts.push('方向首篇');
  if (!parts.length) parts.push('暂无结构与实验证据，层级由时间与来源定位');
  return parts.join(' · ');
}

function withBasis(method, basis) {
  const next = {};
  for (const [key, value] of Object.entries(method)) {
    next[key] = value;
    if (key === 'importance') next.importanceBasis = basis;
  }
  if (!('importanceBasis' in next)) next.importanceBasis = basis;
  return next;
}

/**
 * 审计而非重算：检查现有 importance 是否守住了分布上限，以及每条是否写明了依据。
 *
 * 为什么需要它：结构分在节点数少（经验阈值 ~30 以下）时噪声极大——「被继承次数」
 * 在几十条手写关系里几乎随机，会把明显重要的工作算到 3 分。所以小专题用编辑分层，
 * 但编辑分层必须可审计：分布不许通胀，每条必须给出依据。
 */
export function auditImportance(methods) {
  const n = methods.length;
  const counts = {};
  for (const method of methods) counts[method.importance] = (counts[method.importance] ?? 0) + 1;

  const problems = [];
  for (const tier of [5, 4, 3]) {
    const allowed = Math.ceil(n * TIER_SHARE[tier]) + 1;
    if ((counts[tier] ?? 0) > allowed) problems.push(`${tier} 分有 ${counts[tier]} 个，超出上限 ${allowed}`);
  }
  const missing = methods.filter(method => !method.importanceBasis?.trim()).map(method => method.id);
  if (missing.length) problems.push(`缺少 importanceBasis：${missing.join('、')}`);
  return { counts, problems };
}

async function audit(dataDir) {
  const methods = await readJson(path.join(dataDir, 'methods.json'));
  const { counts, problems } = auditImportance(methods);
  const n = methods.length;
  console.log(`审计 ${path.relative(repoRoot, dataDir) || '主库'} · ${n} 个方法`);
  for (const tier of [5, 4, 3, 2, 1]) {
    const count = counts[tier] ?? 0;
    if (!count) continue;
    console.log(`  ${tier} 分 ${String(count).padStart(3)} 个  占 ${(count / n * 100).toFixed(0)}%`);
  }
  if (problems.length) {
    console.error(`\n✖ ${problems.join('\n✖ ')}`);
    process.exit(1);
  }
  console.log('\n✔ 分布未通胀，每条都有依据');
}

async function main() {
  const args = process.argv.slice(2);
  const dry = args.includes('--dry');
  const dataDir = args.includes('--dir') ? path.resolve(repoRoot, args[args.indexOf('--dir') + 1]) : DATA;
  if (args.includes('--audit')) {
    await audit(dataDir);
    return;
  }
  const reportPath = args.includes('--report')
    ? path.resolve(repoRoot, args[args.indexOf('--report') + 1])
    : path.join(repoRoot, 'docs/importance-report.md');
  const [methods, categories, relations, benchmarks, citations] = await Promise.all([
    readJson(path.join(dataDir, 'methods.json')),
    readJson(path.join(dataDir, 'categories.json')),
    readJson(path.join(dataDir, 'relations.json')),
    readJson(path.join(dataDir, 'benchmarks.json')),
    readJson(path.join(dataDir, 'citations.json')).catch(() => []),
  ]);

  const rows = scoreMethods({ methods, relations, benchmarks, citations, categories });
  const { ranked, targets, promoted } = assignTiers(rows, categories);

  const before = new Map(methods.map(method => [method.id, method.importance]));
  const after = new Map(ranked.map(row => [row.method.id, row.tier]));
  const distribution = counter => {
    const bag = {};
    for (const value of counter.values()) bag[value] = (bag[value] ?? 0) + 1;
    return Object.fromEntries(Object.entries(bag).sort((a, b) => Number(b[0]) - Number(a[0])));
  };

  const updated = methods.map(method => {
    const row = ranked.find(item => item.method.id === method.id);
    return withBasis({ ...method, importance: row.tier }, describeBasis(row.signals));
  });

  console.log(`目标层级配额：5 分 ${targets[5]} 个 / 4 分 ${targets[4]} 个 / 3 分 ${targets[3]} 个`);
  console.log(`改前分布 ${JSON.stringify(distribution(before))} → 改后分布 ${JSON.stringify(distribution(after))}`);
  if (promoted.length) console.log(`方向覆盖兜底提升：${promoted.join('、')}`);
  console.log('\n5 分层：');
  for (const row of ranked.filter(item => item.tier === 5)) {
    console.log(`  ${row.method.id.padEnd(22)} ${String(row.score).padStart(6)}  ${describeBasis(row.signals)}`);
  }

  if (dry) {
    console.log('\n--dry：未写入文件');
    return;
  }

  await writeFile(path.join(dataDir, 'methods.json'), `${JSON.stringify(updated, null, 2)}\n`);
  const rowsMd = ranked.map((row, index) =>
    `| ${index + 1} | ${row.method.name} | ${row.method.category} | ${row.score} | ${before.get(row.method.id)} → **${row.tier}** | ${describeBasis(row.signals)} |`);
  const report = [
    `# importance 重算报告 · ${path.relative(repoRoot, dataDir) || '主库'}`,
    '',
    '> 本文件由 `npm run rescore` 生成，请勿手改。口径见脚本里的 `WEIGHTS` 与 `TIER_SHARE`。',
    '',
    `改前分布：${JSON.stringify(distribution(before))}`,
    `改后分布：${JSON.stringify(distribution(after))}`,
    '',
    '重要性的唯一来源是结构信号，不接受手改 JSON。要调整，改权重后重跑，让所有人都能复核结论。',
    '',
    '| # | 方法 | 方向 | 结构分 | 变化 | 依据 |',
    '|---|---|---|---|---|---|',
    ...rowsMd,
    '',
  ].join('\n');
  await writeFile(reportPath, `${report}\n`);
  console.log(`\n✔ 已写入 ${path.relative(repoRoot, path.join(dataDir, 'methods.json'))} 与 ${path.relative(repoRoot, reportPath)}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    console.error(`✖ ${error.message}`);
    process.exit(1);
  });
}
