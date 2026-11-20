// 站点唯一的数据入口。
//
// src/active/ 由 scripts/select-topic.mjs 装配，一次只放当前专题的一份数据：
//   默认专题 → 从 src/data/ 复制（主库，脚本与测试依赖该路径）
//   派生专题 → 从 src/topics/<slug>/ 复制（由 scripts/derive-topic.mjs 生成）
//
// 切换专题：
//   VITE_ATLAS_TOPIC=draft-tree npm run dev
//
// 组件不直接引用 src/data/*.json，也不写死根节点名称，这样同一套地图、卡片
// 与发布流程可以服务任意专题。
import type { AtlasRuntime, Benchmark, Brief, Category, CitationEdge, EngineeringRadar, Method, Relation, Stars } from '../types';

const files = import.meta.glob<Record<string, unknown>>('../active/*.json', {
  eager: true,
  import: 'default',
});

function required<T>(name: string): T {
  const value = files[`../active/${name}.json`];
  if (value === undefined) {
    throw new Error(
      `数据集缺少 ${name}.json。先运行 npm run data（或 npm run data -- --topic <slug>）装配 src/active/。`,
    );
  }
  return value as T;
}

function optional<T>(name: string, fallback: T): T {
  const value = files[`../active/${name}.json`];
  return value === undefined ? fallback : (value as T);
}

export const atlas = required<AtlasRuntime>('atlas');
export const methods = required<Method[]>('methods');
export const categories = required<Category[]>('categories');
export const relations = required<Relation[]>('relations');
export const citations = optional<CitationEdge[]>('citations', []);
export const benchmarks = optional<Benchmark[]>('benchmarks', []);
export const briefs = optional<Brief[]>('briefs', []);
export const stars = optional<Stars>('stars', {});
/** 中文摘要与论文元数据只服务卡片展示，专题没有就为空，不做必填。 */
export const abstracts = optional<Record<string, { text: string; sourceUrl: string; translatedAt: string; kind?: string }>>('abstracts', {});
export const paperMetadata = optional<Record<string, { title?: string; authors?: string[]; thumbnail?: string; sourceUrl: string; status: string; kind?: string }>>('paper-metadata', {});
export const engineering = optional<EngineeringRadar>('engineering', {
  asOf: '', timezone: '', editorial: '', projects: [], events: [],
});

/** 当前专题标识，空字符串代表默认专题。用于调试与截图脚本。 */
export const activeTopic = ((import.meta.env.VITE_ATLAS_TOPIC as string | undefined) ?? '').trim();
