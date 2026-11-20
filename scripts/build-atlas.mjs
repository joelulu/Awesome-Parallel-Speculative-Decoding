// 把一份专题配置编译成站点运行时可读的 atlas.json。
// 站点不再硬编码根节点、标题与仓库地址，全部来自这里。
//
// 用法：
//   node scripts/build-atlas.mjs                    编译 atlas.config.json → src/data/atlas.json
//   node scripts/build-atlas.mjs --config topics/x.json --out src/topics/x
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** 读取并解析 JSON，错误带上文件路径，避免多人协作时只看到 SyntaxError。 */
export async function readJson(file) {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch (error) {
    throw new Error(`无法读取 ${path.relative(repoRoot, file)}：${error.message}`);
  }
}

/**
 * 在方法表里定位专题的起始节点。
 * 优先用配置里显式的 id；没有 id 时按名称精确匹配，再退化到标题前缀。
 */
export function findRoot(methods, root) {
  if (!root) throw new Error('专题配置缺少 root 字段');
  if (root.id) {
    const hit = methods.find(method => method.id === root.id);
    if (!hit) throw new Error(`root.id="${root.id}" 不在方法表中`);
    return hit;
  }
  const exact = methods.find(method => method.name === root.name);
  if (exact) return exact;
  const prefixed = methods.find(method => method.name.startsWith(`${root.name} `) || method.title?.startsWith(root.name));
  if (prefixed) return prefixed;
  throw new Error(`找不到起始方法「${root.name}」，请在配置里给出 root.id`);
}

/**
 * 编译专题配置。纯函数，方便测试与在生成器里复用。
 * @param {object} config  atlas.config.json 或 topics/<slug>.json
 * @param {object[]} methods 方法表，用于解析根节点与统计
 * @param {object[]} categories 分类表
 */
export function compileAtlas(config, methods, categories) {
  const root = findRoot(methods, config.root);
  const site = config.site ?? {};
  const brand = site.brand ?? {};

  // 根节点自己的分类不进入图例：星图中心不参与按方向环绕。
  const usedCategories = new Set(methods.filter(m => m.id !== root.id).map(m => m.category));
  const activeCategories = categories.filter(category => usedCategories.has(category.id));
  if (!activeCategories.length) throw new Error('除起始方法外没有任何分类，专题为空');

  return {
    slug: config.slug,
    title: config.title ?? `${root.name} Atlas`,
    brand: {
      lead: brand.lead ?? root.name,
      tail: brand.tail ?? 'Atlas',
    },
    subtitle: config.subtitle ?? '',
    headline: site.headline ?? config.subtitle ?? config.title ?? root.name,
    tagline: site.tagline ?? `从 ${root.name} 出发，沿着时间阅读相关工作。`,
    rootId: root.id,
    rootName: root.name,
    rootTitle: root.title,
    rootDate: root.date,
    repository: site.repo ?? '',
    homepage: site.homepage ?? '',
    base: site.base ?? '/',
    updatedAt: config.updatedAt ?? [...methods].map(m => m.updatedAt).sort().at(-1) ?? null,
    categoryIds: activeCategories.map(category => category.id),
    features: {
      briefs: false,
      engineering: false,
      stars: false,
      citations: false,
      ...(site.features ?? {}),
    },
    copy: {
      dailyLabel: site.dailyLabel ?? '',
      dailyNote: '',
      engineeringTitle: '工程动态',
      ...(site.copy ?? {}),
    },
    scope: config.scope ?? '',
    counts: {
      methods: methods.length,
      relations: 0,
      benchmarks: 0,
      briefs: 0,
    },
  };
}

async function main() {
  const args = process.argv.slice(2);
  const configPath = args.includes('--config')
    ? path.resolve(repoRoot, args[args.indexOf('--config') + 1])
    : path.join(repoRoot, 'atlas.config.json');
  const outDir = args.includes('--out')
    ? path.resolve(repoRoot, args[args.indexOf('--out') + 1])
    : path.join(repoRoot, 'src/data');

  const config = await readJson(configPath);
  const methods = await readJson(path.join(repoRoot, 'src/data/methods.json'));
  const categories = await readJson(path.join(repoRoot, 'src/data/categories.json'));

  const atlas = compileAtlas(config, methods, categories);

  // 统计进 atlas.json，首页那行数字就不用组件自己算。
  const relations = args.includes('--skip-counts') ? [] : await readJson(path.join(repoRoot, 'src/data/relations.json')).catch(() => []);
  const benchmarks = args.includes('--skip-counts') ? [] : await readJson(path.join(repoRoot, 'src/data/benchmarks.json')).catch(() => []);
  const briefs = args.includes('--skip-counts') ? [] : await readJson(path.join(repoRoot, 'src/data/briefs.json')).catch(() => []);
  const ids = new Set(methods.map(m => m.id));
  atlas.counts.relations = relations.filter(r => ids.has(r.source) && ids.has(r.target)).length;
  atlas.counts.benchmarks = benchmarks.filter(b => ids.has(b.methodId)).length;
  atlas.counts.briefs = briefs.filter(b => (b.items ?? []).some(item => (item.methodIds ?? []).some(id => ids.has(id)))).length;

  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, 'atlas.json'), `${JSON.stringify(atlas, null, 2)}\n`);
  console.log(`✔ ${path.relative(repoRoot, path.join(outDir, 'atlas.json'))} · 根节点 ${atlas.rootName}(${atlas.rootId}) · ${atlas.counts.methods} 方法 / ${atlas.counts.relations} 关系 / ${atlas.counts.benchmarks} 基准`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error(`✖ ${error.message}`);
    process.exit(1);
  });
}
