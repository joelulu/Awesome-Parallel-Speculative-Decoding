// 从主数据派生一个专题视图，或装配一个自带数据的新领域专题。
//
// 两种模式：
//   derive（默认）  从 src/data 取子集。约束：不新增任何方法、不编造任何关系，
//                  专题里每条数据都能回溯主库。适合「同一个领域切一个侧面」。
//   standalone      数据自带，放在 topics/<slug>/data/。适合换领域：新领域的方法
//                  根本不在主库里，取子集无从谈起，此时生成器只负责校验与装配，
//                  不负责取舍——取舍由人（和 SKILL 流程）完成。
//
// 用法：
//   node scripts/derive-topic.mjs --config topics/draft-tree.json
//   node scripts/derive-topic.mjs --config topics/video-cache.json
//   → src/topics/<slug>/{methods,categories,relations,benchmarks,citations,briefs,stars,atlas}.json
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileAtlas, readJson, repoRoot } from './build-atlas.mjs';
import { validateData } from './validate-data.mjs';

const DATA_DIR = path.join(repoRoot, 'src/data');

async function loadSource() {
  const names = ['methods', 'categories', 'relations', 'benchmarks', 'citations', 'briefs', 'stars'];
  const entries = await Promise.all(names.map(async name => [name, await readJson(path.join(DATA_DIR, `${name}.json`))]));
  return Object.fromEntries(entries);
}

/** 读一份自带数据的专题。缺 citations / briefs / stars 时按空处理，专题可以只有地图。 */
async function loadStandalone(config) {
  if (!config.sourceDir) throw new Error('standalone 模式需要 sourceDir，指向 topics/<slug>/data');
  const dir = path.resolve(repoRoot, config.sourceDir);
  const read = async (name, fallback) => readJson(path.join(dir, `${name}.json`)).catch(() => {
    if (fallback === undefined) throw new Error(`缺少 ${path.relative(repoRoot, path.join(dir, `${name}.json`))}`);
    return fallback;
  });
  return {
    methods: await read('methods'),
    categories: await read('categories'),
    relations: await read('relations'),
    benchmarks: await read('benchmarks'),
    citations: await read('citations', []),
    briefs: await read('briefs', []),
    stars: await read('stars', {}),
  };
}

/**
 * 派生专题子集。
 * @param {object} config 专题配置
 * @param {object} source 主库数据
 */
export function deriveTopic(config, source) {
  const { methods, categories, relations, benchmarks, citations = [], briefs = [], stars = {} } = source;
  const methodIndex = new Map(methods.map(method => [method.id, method]));

  const seeds = (config.seeds ?? []).length ? config.seeds : [config.root?.id].filter(Boolean);
  if (!seeds.length) throw new Error('专题配置需要 seeds 或 root.id');

  const picked = new Set();
  for (const id of seeds) {
    if (!methodIndex.has(id)) throw new Error(`种子「${id}」不在主库方法表中`);
    picked.add(id);
  }

  // 沿已核验的技术关系做闭包扩展。引用边不参与：它只说明「提到过」，不代表同一问题域。
  const hops = config.expand?.hops ?? 1;
  const types = new Set(config.expand?.relationTypes ?? ['extends', 'combines', 'related']);
  const walkable = relations.filter(relation => relation.status === 'verified' && types.has(relation.type));
  for (let hop = 0; hop < hops; hop += 1) {
    let grew = false;
    for (const relation of walkable) {
      const hasSource = picked.has(relation.source);
      const hasTarget = picked.has(relation.target);
      if (hasSource && !hasTarget) { picked.add(relation.target); grew = true; }
      else if (hasTarget && !hasSource) { picked.add(relation.source); grew = true; }
    }
    if (!grew) break;
  }

  // 范围收窄。种子永远保留，否则专题会失去起点。
  const include = config.categories?.include ?? [];
  const exclude = new Set(config.categories?.exclude ?? []);
  const minImportance = config.expand?.minImportance;
  const seedSet = new Set(seeds);
  const kept = [...picked].filter(id => {
    if (seedSet.has(id)) return true;
    const method = methodIndex.get(id);
    if (!method) return false;
    if (exclude.has(method.category)) return false;
    if (include.length && !include.includes(method.category)) return false;
    if (typeof minImportance === 'number' && method.importance < minImportance) return false;
    return true;
  });
  const ids = new Set(kept);

  if (!ids.has(config.root?.id) && !methods.find(m => ids.has(m.id) && m.name === config.root?.name)) {
    throw new Error(`根节点「${config.root?.name ?? config.root?.id}」被范围规则排除了`);
  }

  const subsetMethods = methods.filter(method => ids.has(method.id));
  const usedCategories = new Set(subsetMethods.map(method => method.category));
  const subsetCategories = categories.filter(category => usedCategories.has(category.id));
  const subsetRelations = relations.filter(relation => relation.status === 'verified' && ids.has(relation.source) && ids.has(relation.target));
  const subsetBenchmarks = benchmarks.filter(item => ids.has(item.methodId));
  const subsetCitations = citations.filter(edge => ids.has(edge.source) && ids.has(edge.target));
  const subsetBriefs = briefs.filter(brief => (brief.items ?? []).some(item => (item.methodIds ?? []).some(id => ids.has(id))));
  const repos = new Set(subsetMethods.flatMap(method => method.code.map(link => link.repo)));
  const subsetStars = Object.fromEntries(Object.entries(stars).filter(([repo]) => repos.has(repo)));

  assertConsistent({ methods: subsetMethods, categories: subsetCategories, relations: subsetRelations, benchmarks: subsetBenchmarks });

  return {
    methods: subsetMethods,
    categories: subsetCategories,
    relations: subsetRelations,
    benchmarks: subsetBenchmarks,
    citations: subsetCitations,
    briefs: subsetBriefs,
    stars: subsetStars,
    stats: { seeds, hops, droppedByRange: picked.size - ids.size },
  };
}

/** 自带数据的专题：只校验、不改写。任何一条不合规都直接中止，不允许「先出图再修数据」。 */
function assembleStandalone(config, source) {
  const { methods, categories, relations, benchmarks, citations, briefs, stars } = source;
  assertConsistent({ methods, categories, relations, benchmarks });

  // 复用主库那套校验：id 规则、HTTPS、日期、分类白名单、论文 URL 去重、基准基线合法性。
  const errors = validateData({ methods, categories, relations, benchmarks, citations, briefs, stars, abstracts: {}, metadata: {} });
  if (errors.length) throw new Error(`专题数据未通过校验：\n  ${errors.join('\n  ')}`);

  return {
    methods,
    categories,
    relations,
    benchmarks,
    citations,
    briefs,
    stars,
    stats: { seeds: config.seeds ?? [config.root?.id].filter(Boolean), hops: 0, droppedByRange: 0 },
  };
}

/** 子集必须自洽，否则站点会在运行时才炸。 */
function assertConsistent({ methods, categories, relations, benchmarks }) {
  const ids = new Set(methods.map(method => method.id));
  const categoryIds = new Set(categories.map(category => category.id));
  for (const method of methods) {
    if (!categoryIds.has(method.category)) throw new Error(`${method.id} 的分类 ${method.category} 不在分类表中`);
  }
  for (const relation of relations) {
    if (!ids.has(relation.source) || !ids.has(relation.target)) {
      throw new Error(`关系 ${relation.source} → ${relation.target} 的端点不在子集内`);
    }
  }
  for (const item of benchmarks) {
    if (!ids.has(item.methodId)) throw new Error(`基准 ${item.methodId} 不在子集内`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const configArg = args.includes('--config')
    ? path.resolve(repoRoot, args[args.indexOf('--config') + 1])
    : null;
  if (!configArg) {
    console.error('用法：node scripts/derive-topic.mjs --config topics/<slug>.json');
    process.exit(1);
  }

  const config = await readJson(configArg);
  if (!config.slug) throw new Error('专题配置缺少 slug');
  const standalone = config.mode === 'standalone';
  const source = standalone ? await loadStandalone(config) : await loadSource();
  const topic = standalone ? assembleStandalone(config, source) : deriveTopic(config, source);

  const outDir = path.join(repoRoot, 'src/topics', config.slug);
  await mkdir(outDir, { recursive: true });

  // 专题不继承工程雷达与每日简报，除非它自己生成了数据。
  const site = {
    ...(config.site ?? {}),
    features: {
      briefs: topic.briefs.length > 0,
      engineering: false,
      stars: Object.keys(topic.stars).length > 0,
      citations: topic.citations.length > 0,
      ...(config.site?.features ?? {}),
    },
  };
  const atlas = compileAtlas({ ...config, site, updatedAt: config.updatedAt ?? null }, topic.methods, topic.categories);
  atlas.counts = {
    methods: topic.methods.length,
    relations: topic.relations.length,
    benchmarks: topic.benchmarks.length,
    briefs: topic.briefs.length,
  };

  const write = (name, value) => writeFile(path.join(outDir, `${name}.json`), `${JSON.stringify(value, null, 2)}\n`);
  await Promise.all([
    write('methods', topic.methods),
    write('categories', topic.categories),
    write('relations', topic.relations),
    write('benchmarks', topic.benchmarks),
    write('citations', topic.citations),
    write('briefs', topic.briefs),
    write('stars', topic.stars),
    write('atlas', atlas),
  ]);

  console.log(
    `✔ src/topics/${config.slug} · 根节点 ${atlas.rootName} · ` +
    `${topic.methods.length} 方法 / ${topic.relations.length} 关系 / ${topic.benchmarks.length} 基准 / ` +
    `${topic.categories.length} 分类`,
  );
  if (standalone) {
    console.log(`  模式 standalone · 数据源 ${config.sourceDir} · 已通过 validate-data 全部规则`);
  } else {
    console.log(
      `  种子 ${topic.stats.seeds.join(' + ')} · 闭包 ${topic.stats.hops} 跳 · 范围规则过滤掉 ${topic.stats.droppedByRange} 个`,
    );
  }
  if (!atlas.repository) console.log('  提示：未配置 site.repo，站点会隐藏 GitHub 入口。');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error(`✖ ${error.message}`);
    process.exit(1);
  });
}
