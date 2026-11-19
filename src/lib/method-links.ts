import benchmarkData from '../data/benchmarks.json';
import citations from '../data/citations.json';
import type { Relation } from '../types';

type Baseline = { methodId?: string; label: string; note: string };
type Benchmark = {
  methodId: string; context: string; source: string;
  primary: Baseline; others: Baseline[]; takeaway: string;
};
const benchmarks: Benchmark[] = benchmarkData;
const byMethod = new Map<string, Benchmark[]>();
const baselineFor = new Map<string, Map<string, Benchmark[]>>();

for (const experiment of benchmarks) {
  const own = byMethod.get(experiment.methodId) ?? [];
  own.push(experiment);
  byMethod.set(experiment.methodId, own);
  for (const comparison of [experiment.primary, ...experiment.others]) {
    if (!comparison.methodId) continue;
    const byPaper = baselineFor.get(comparison.methodId) ?? new Map<string, Benchmark[]>();
    const contexts = byPaper.get(experiment.methodId) ?? [];
    contexts.push(experiment);
    byPaper.set(experiment.methodId, contexts);
    baselineFor.set(comparison.methodId, byPaper);
  }
}

export function methodLinks(id: string, relations: Relation[]) {
  const incident = relations.filter(relation => relation.status === 'verified' &&
    (relation.source === id || relation.target === id));
  const directed = incident.filter(edge => edge.type === 'extends' || edge.type === 'combines');
  return {
    benchmarks: byMethod.get(id) ?? [],
    baselineFor: baselineFor.get(id) ?? new Map<string, Benchmark[]>(),
    ancestors: directed.filter(edge => edge.target === id),
    descendants: directed.filter(edge => edge.source === id),
    related: incident.filter(edge => edge.type === 'related'),
    cites: citations.filter(edge => edge.source === id),
    citedBy: citations.filter(edge => edge.target === id),
  };
}
