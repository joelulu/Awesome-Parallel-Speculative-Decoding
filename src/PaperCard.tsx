import { useState, type CSSProperties } from 'react';
import { ArrowUpRight, BookOpen, ChevronDown, ChevronUp, Github, LocateFixed, Star } from 'lucide-react';
import abstractsJson from './data/abstracts.json';
import metadataJson from './data/paper-metadata.json';
import type { Method, Category, Relation, Stars } from './types';

type Abstract = { text: string; sourceUrl: string; translatedAt: string; kind?: string };
type Metadata = { title?: string; authors?: string[]; thumbnail?: string; sourceUrl: string; status: string; kind?: string };
const abstracts = abstractsJson as Record<string, Abstract>;
const metadata = metadataJson as Record<string, Metadata>;
const External = ({ href, children, ...props }: {href: string; children: React.ReactNode; className?: string; title?: string}) =>
  <a href={href} target="_blank" rel="noopener noreferrer" {...props}>{children}</a>;

export default function PaperCard({ method, category, highlight, onLocate, stars, relations, methods }: {
  method: Method; category: Category; highlight: boolean; onLocate: (id: string) => void;
  stars: Stars; relations: Relation[]; methods: Method[];
}) {
  const [expanded, setExpanded] = useState(false);
  const [details, setDetails] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const source = metadata[method.id];
  const abstract = abstracts[method.id];
  const paperUrl = method.paperUrl || source?.sourceUrl || method.sourceUrl;
  const authors = source?.authors ?? [];
  const isArticle = abstract?.kind === 'source-summary';
  const related = relations.filter(relation => relation.source === method.id || relation.target === method.id);
  return <article id={`method-${method.id}`} tabIndex={-1} className={`method-card paper-row ${highlight ? 'highlighted' : ''}`} style={{'--branch': category.color} as CSSProperties}>
    <External href={paperUrl} className="paper-preview" title={`打开 ${method.name} 论文`}>
      {source?.thumbnail && !imageFailed
        ? <img src={`${import.meta.env.BASE_URL}${source.thumbnail}`} alt={`${method.name} 论文首页`} loading="lazy" width="144" height="194" onError={() => setImageFailed(true)}/>
        : <span className="paper-preview-empty"><BookOpen size={30}/><span>{method.name}</span><small>{isArticle ? '官方技术文章' : '论文预览待补充'}</small></span>}
    </External>
    <div className="paper-content">
      <h3><External href={paperUrl}>{source?.title || method.title}</External></h3>
      <div className="paper-byline">{authors.length > 0 && <><span>{authors.slice(0, 3).join(', ')}{authors.length > 3 ? ` 等 ${authors.length} 位作者` : ''}</span><span className="byline-dot">·</span></>}<time>{method.dateLabel}</time></div>
      {abstract
        ? <><p className={`paper-abstract ${expanded ? 'expanded' : ''}`}>{abstract.text}</p><button className="abstract-toggle" aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>{expanded ? '收起' : isArticle ? '展开中文概要' : '展开中文摘要'}{expanded ? <ChevronUp size={13}/> : <ChevronDown size={13}/>}</button></>
        : <p className="paper-abstract abstract-unavailable">暂未取得可核验的论文原始摘要。可通过论文或资料链接阅读；已有研究笔记保留在下方。</p>}
      <div className="paper-tags"><span className="paper-primary-tag">{category.name}</span>{method.tags.map(tag => <span key={tag}>{tag}</span>)}<span>Parallel Speculative Decoding</span></div>
      <div className="paper-actions">
        <External href={paperUrl}><BookOpen size={14}/>{isArticle ? '技术文章' : '论文'}<ArrowUpRight size={12}/></External>
        <button onClick={() => onLocate(method.id)}><LocateFixed size={14}/>在脉络图中定位</button>
        <button onClick={() => setDetails(value => !value)} aria-expanded={details}>研究笔记与来源{details ? <ChevronUp size={13}/> : <ChevronDown size={13}/>}</button>
        {abstract && <External href={abstract.sourceUrl} className="translation-source">{isArticle ? '官方文章中文概要' : '摘要中文译述'} · 原文<ArrowUpRight size={12}/></External>}
      </div>
      {details && <div className="paper-notes"><p><b>核心问题：</b>{method.problem}</p><p><b>解决方式：</b>{method.solution}</p><p>{method.reason}。{method.citationStatus === 'root' ? 'DFlash 原始工作。' : method.citationStatus === 'confirmed' ? '原文明确提及并基于 DFlash。' : '引用关系待逐篇核验。'}</p>{related.map(relation => <p key={`${relation.source}-${relation.target}`}><External href={relation.evidenceUrl}>{methods.find(m => m.id === relation.source)?.name} → {methods.find(m => m.id === relation.target)?.name}</External>：{relation.note}</p>)}</div>}
    </div>
    <aside className="paper-metrics" aria-label={`${method.name} 代码仓库`}>
      {method.code.length ? method.code.map(code => <External key={code.url} href={code.url} className="paper-repository" title={`${code.repo}${stars[code.repo] ? ` · Star 更新于 ${stars[code.repo].updatedAt}` : ''}`}>
        <Github size={19}/><b className="paper-repo-name">{code.label || code.repo.split('/').at(-1)}</b><strong><Star size={13}/>{stars[code.repo] ? new Intl.NumberFormat('en', {notation:'compact',maximumFractionDigits:1}).format(stars[code.repo].count) : '—'}</strong>
        <span>{code.kind === 'integration' ? '框架总 STAR' : 'GITHUB STARS'}</span><small>{code.availability === 'unavailable' ? '论文链接 · 暂不可访问' : code.availability === 'placeholder' ? '官方仓库 · 仅 README' : code.availability === 'pull-request' ? '实现 PR · 未合并' : code.kind === 'integration' ? '框架实现' : code.kind === 'third-party' ? '第三方实现' : '官方代码'}<ArrowUpRight size={12}/></small>
      </External>) : <div className="paper-no-code"><Github size={19}/><span>代码待补充</span></div>}
    </aside>
  </article>;
}
