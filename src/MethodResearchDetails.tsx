import { ArrowUpRight } from 'lucide-react';
import type { Category, Method, Relation } from './types';
import { methodLinks } from './lib/method-links';

export function publicationMonth(method: Method) {
  const match = method.date?.match(/^(\d{4})-(\d{2})/);
  return match ? `${match[1]} 年 ${Number(match[2])} 月` : method.dateLabel;
}

export default function MethodResearchDetails({ method, category, catalog, relations, onSelect, compact = false }: {
  method: Method; category?: Category; catalog: Map<string, Method>;
  relations: Relation[]; onSelect: (id: string) => void; compact?: boolean;
}) {
  const { benchmarks: experiments, baselineFor, ancestors, descendants, related, cites, citedBy } = methodLinks(method.id, relations);
  const usedBy = [...baselineFor].sort(([a], [b]) => (catalog.get(b)?.date ?? '').localeCompare(catalog.get(a)?.date ?? ''));
  const source = (url: string, label: string) => <a href={url} target="_blank" rel="noopener noreferrer">{label} <ArrowUpRight size={12}/></a>;
  const name = (label: string, id?: string) => id && catalog.has(id)
    ? <button type="button" className="globe-method-link" onClick={() => onSelect(id)}>{label}</button>
    : <b>{label}</b>;
  return <article className="globe-research-card" aria-label={`${method.name} 研究详情`}>
    <div className="globe-research-meta">
      {method.date ? <time dateTime={method.date}>{publicationMonth(method)}</time> : <span>{publicationMonth(method)}</span>}
      {category && <span>{category.name}</span>}
      {source(method.paperUrl ?? method.sourceUrl, method.paperUrl ? '阅读原文' : '原始来源')}
      <span>{method.benchmarkReview === 'verified' ? '已收录经核验的对照' : '实验对照待核验'}</span>
    </div>
    {!compact && <dl className="globe-research-digest">
      <div><dt>解决什么问题</dt><dd>{method.problem}</dd></div>
      <div><dt>方法怎么做</dt><dd>{method.solution}</dd></div>
    </dl>}
    <div className="globe-research-block">
      <h4>主要基线与其他对比方法</h4>
      {experiments.length ? experiments.map(item => <div className="globe-benchmark" key={item.context}>
        <div className="globe-benchmark-context">{source(item.source, item.context)}</div>
        <dl>
          <div><dt>主要基线</dt><dd>{name(item.primary.label, item.primary.methodId)}<span> · {item.primary.note}</span></dd></div>
          {!!item.others.length && <div><dt>其他对比</dt><dd>{item.others.map(other =>
            <span className="globe-benchmark-other" key={other.label}>{name(other.label, other.methodId)} · {other.note}</span>)}</dd></div>}
        </dl>
        <p>{item.takeaway}</p>
      </div>) : <p>尚未确认可收录的实验基线，可通过原文查看评测设置。</p>}
    </div>
    <div className="globe-research-related">
      <div className="globe-research-block">
        <h4>后续被用作基线 <small>{usedBy.length}</small></h4>
        {usedBy.length ? <ul>{usedBy.map(([id, contexts]) => <li key={id}>
          {name(catalog.get(id)?.name ?? id, id)}
          <ul className="globe-baseline-contexts">{contexts.map(item => <li key={item.context}>
            <span>{item.primary.methodId === method.id ? '主要基线' : '其他对比'} · </span>
            {source(item.source, item.context)}
          </li>)}</ul>
        </li>)}</ul> : <p>尚未收录经核验的后续对比。</p>}
      </div>
      <div className="globe-research-block">
        <h4>技术后续 <small>{descendants.length}</small></h4>
        {descendants.length ? <details open={descendants.length <= 8}><summary>查看扩展与模块复用</summary><ul>{descendants.map(edge =>
          <li key={edge.target + edge.type}>{name(catalog.get(edge.target)?.name ?? edge.target, edge.target)}
            <span> · {edge.type === 'extends' ? '扩展' : '模块复用'} · {edge.note}</span> {source(edge.evidenceUrl, '依据')}</li>)}</ul></details>
          : <p>尚未收录已核验的技术后续。</p>}
      </div>
    </div>
    <details className="globe-research-block">
      <summary>上游方法、论文引用与相关工作</summary>
      {[{ title: '技术上游', edges: ancestors }, { title: '相关工作', edges: related }].map(({title, edges}) =>
        <div key={title} className="globe-relationship-group"><h4>{title}</h4>
          {edges.length ? <ul>{edges.map(edge => {
            const id = edge.source === method.id ? edge.target : edge.source;
            return <li key={edge.source + ':' + edge.target + ':' + edge.type}>{name(catalog.get(id)?.name ?? id, id)}
              <span> · {edge.note} </span>{source(edge.evidenceUrl, '依据')}</li>;
          })}</ul> : <p>尚无已核验记录。</p>}
        </div>)}
      {[{ title: '此论文引用了', edges: cites, peer: 'target' as const }, { title: '此论文被引用', edges: citedBy, peer: 'source' as const }].map(({title, edges, peer}) =>
        <div key={title} className="globe-relationship-group"><h4>{title}</h4>
          {edges.length ? <ul>{edges.map(edge => <li key={edge[peer]}>{name(catalog.get(edge[peer])?.name ?? edge[peer], edge[peer])}
            <span> · {edge.role} </span>{source(edge.evidenceUrl, edge.location)}</li>)}</ul> : <p>尚无已核验记录。</p>}
        </div>)}
    </details>
  </article>;
}
