// 把当前专题的数据装配到 src/active/，站点只从这里取数。
//
// 为什么不直接在组件里 glob 所有目录：Vite 的 glob 会把匹配到的文件全部打进
// bundle，专题一多，首页体积就跟着涨。装配到固定目录后，一次只有一份数据在场。
//
//   npm run dev                              → 默认专题（src/data 主库）
//   VITE_ATLAS_TOPIC=draft-tree npm run dev  → src/topics/draft-tree
import { cp, mkdir, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { repoRoot } from './build-atlas.mjs';

// 站点实际消费的文件。src/data 下还有 citations 之外的仅脚本数据，不搬。
const WANTED = ['atlas', 'methods', 'categories', 'relations', 'citations', 'benchmarks', 'briefs', 'stars', 'engineering', 'abstracts', 'paper-metadata'];

const topic = (process.env.VITE_ATLAS_TOPIC ?? '').trim();
const sourceDir = topic ? path.join(repoRoot, 'src/topics', topic) : path.join(repoRoot, 'src/data');
const targetDir = path.join(repoRoot, 'src/active');

await rm(targetDir, { recursive: true, force: true });
await mkdir(targetDir, { recursive: true });

let copied = 0;
const missing = [];
for (const name of WANTED) {
  const from = path.join(sourceDir, `${name}.json`);
  try {
    await readFile(from);
  } catch {
    missing.push(name);
    continue;
  }
  await cp(from, path.join(targetDir, `${name}.json`));
  copied += 1;
}

// atlas.json 是必需的：标题、根节点、功能开关都在里面。
if (missing.includes('atlas')) {
  console.error(`✖ ${path.relative(repoRoot, sourceDir)} 缺少 atlas.json`);
  console.error(topic
    ? `  先运行 npm run topic -- --config topics/${topic}.json`
    : '  先运行 npm run atlas');
  process.exit(1);
}

const optionalMissing = missing.filter(name => name !== 'atlas');
console.log(`✔ 数据集：${topic || '默认'} · ${copied} 个文件${optionalMissing.length ? `（缺 ${optionalMissing.join('、')}，按空处理）` : ''}`);
