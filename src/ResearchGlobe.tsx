import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ArrowUpRight, Minus, Plus, Scan } from 'lucide-react';
import type { Category, Method, Relation } from './types';
import citations from './data/citations.json';
import MethodResearchDetails, { publicationMonth } from './MethodResearchDetails';

type Props = {
  methods: Method[]; categories: Category[]; relations: Relation[];
  focusId: string | null; focusKey: number; onRead: (id: string) => void;
};
type Point = { method: Method; x: number; y: number };
type Box = { x: number; y: number; w: number; h: number };
const rootId = 'dflash';
const fullTurn = 2 * Math.PI;
const relationNames: Record<string, string> = { extends: '扩展', combines: '组合', related: '相关', cites: '引用' };
type GraphEdge = Pick<Relation, 'source' | 'target' | 'type' | 'note' | 'evidenceUrl'> & { role?: string; location?: string };
const citationEdges: GraphEdge[] = citations.map(edge => ({ ...edge, type: 'cites' }));
const neutralView = { x: 0, y: 0, zoom: 1 };
const globeColors: Record<string, string> = {
  architecture: '#77b8ff', training: '#ffcb79', causality: '#6ce0ba', tree: '#ff8ea9',
  systems: '#b6a0ff', reuse: '#f28de5', extensions: '#69dce9',
};

export default function ResearchGlobe({ methods, categories, relations, focusId, focusKey, onRead }: Props) {
  const [selected, setSelected] = useState(rootId);
  const [focused, setFocused] = useState(false);
  const [layer, setLayer] = useState<'lineage' | 'citations'>('lineage');
  const arrow = useId();
  const [direction, setDirection] = useState('');
  const [view, setView] = useState(neutralView);
  const [size, setSize] = useState({ width: 900, height: 520 });
  const [hover, setHover] = useState<string | null>(null);
  const stage = useRef<HTMLDivElement>(null);
  const research = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: number; x: number; y: number; left: number; top: number } | null>(null);
  const catalog = useMemo(() => new Map(methods.map(method => [method.id, method])), [methods]);
  const categoryIndex = useMemo(() => new Map(categories.map(category => [category.id, category])), [categories]);
  const verified = useMemo(() => relations.filter(relation => relation.status === 'verified' &&
    ['extends', 'combines', 'related'].includes(relation.type) && catalog.has(relation.source) && catalog.has(relation.target)), [relations, catalog]);
  const latest = useMemo(() => new Set(methods.filter(method => method.id !== rootId && method.date)
    .sort((a, b) => b.date!.localeCompare(a.date!)).slice(0, 3).map(method => method.id)), [methods]);
  const current = catalog.get(selected);
  const local = focused && !!current;
  const layerEdges: GraphEdge[] = layer === 'citations' ? citationEdges : verified;
  const direct = local ? layerEdges.filter(edge => edge.source === selected || edge.target === selected) : [];
  const upstream = direct.filter(edge => edge.type !== 'related' && (layer === 'lineage' ? edge.target : edge.source) === selected);
  const downstream = direct.filter(edge => edge.type !== 'related' && (layer === 'lineage' ? edge.source : edge.target) === selected);
  const related = direct.filter(edge => edge.type === 'related');
  const otherId = (edge: GraphEdge) => edge.source === selected ? edge.target : edge.source;
  const neighbors = new Set(direct.map(otherId));
  const leftTitle = layer === 'lineage' ? '上游方法' : '引用了';
  const rightTitle = layer === 'lineage' ? '下游方法' : '被哪些论文引用';

  useEffect(() => {
    const element = stage.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setSize({
      width: entry.contentRect.width, height: entry.contentRect.height,
    }));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  function select(id: string, focus = true) {
    setSelected(id);
    setFocused(focus);
    setDirection('');
    setView(neutralView);
    setHover(null);
  }

  useEffect(() => {
    if (focusId && catalog.has(focusId)) select(focusId);
  }, [focusId, focusKey, catalog]);

  function zoomBy(factor: number) {
    setView(previous => ({ ...previous, zoom: Math.max(.65, Math.min(3, previous.zoom * factor)) }));
    setHover(null);
  }

  useEffect(() => {
    const element = stage.current;
    if (!element) return;
    const wheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey) return;
      event.preventDefault();
      zoomBy(Math.exp(-event.deltaY * .001));
    };
    element.addEventListener('wheel', wheel, { passive: false });
    return () => element.removeEventListener('wheel', wheel);
  }, []);

  const { width, height } = size;
  const cx = width / 2, cy = height / 2;
  const scale = Math.min(width / 550, height / 510);
  const bounds = new Map<string, Point>();
  function place(method: Method, x: number, y: number) {
    bounds.set(method.id, { method, x: cx + view.x + x * view.zoom, y: cy + view.y + y * view.zoom });
  }
  if (current) place(current, 0, 0);
  if (local) {
    const placeColumn = (group: GraphEdge[], side: number) => {
      const ids = [...new Set(group.map(otherId))];
      ids.forEach((id, index) => {
        const method = catalog.get(id);
        if (method && !bounds.has(id)) place(method, side * Math.min(width * .29, 300), (index - (ids.length - 1) / 2) * 25);
      });
    };
    placeColumn(upstream, -1);
    placeColumn(downstream, 1);
    const relatedIds = [...new Set(related.map(otherId))].filter(id => !bounds.has(id));
    const rowSize = width < 580 ? 2 : 4;
    relatedIds.forEach((id, index) => {
      const method = catalog.get(id);
      const row = Math.floor(index / rowSize), column = index % rowSize;
      const count = Math.min(rowSize, relatedIds.length - row * rowSize);
      const fraction = (column - (count - 1) / 2) / Math.max(1, count - 1);
      if (method) place(method, fraction * Math.min(width * .56, 590) + (row % 2 ? 12 : 0), 100 + row * 49);
    });
  } else {
    categories.forEach((category, index) => {
      const members = methods.filter(method => method.category === category.id && method.id !== rootId);
      const theta = fullTurn * index / categories.length - Math.PI / 2;
      members.forEach((method, rank) => {
        const radius = scale * (direction === category.id ? 19 : 15) * Math.sqrt(rank);
        const phase = rank * 2.399963 + theta;
        place(method,
          scale * 164 * Math.cos(theta) + radius * Math.cos(phase),
          scale * 159 * Math.sin(theta) + radius * Math.sin(phase));
      });
    });
  }

  const points = [...bounds.values()];
  const labelPositions = new Map<string, Box>();
  const dotBoxes = points.map(({ x, y }) => ({ x: x - 5, y: y - 5, w: 10, h: 10 }));
  const prioritized = [...points].sort((a, b) => {
    const rank = (point: Point) => point.method.id === selected ? 0 : latest.has(point.method.id) ? 1 : 2;
    return rank(a) - rank(b);
  });
  for (const { method, x, y } of prioritized) {
    if (direction && method.id !== rootId && method.category !== direction) continue;
    const w = method.name.length * (local ? 8 : 7) + (latest.has(method.id) ? 29 : 6);
    const h = local ? 21 : 18;
    const right = x + 13, left = x - w - 13;
    const primary = method.id === selected
      ? [[x - w / 2, y + 14], [right, y - h / 2], [left, y - h / 2]]
      : [[x < cx ? left : right, y - h / 2], [x < cx ? right : left, y - h / 2], [x - w / 2, y + 8], [x - w / 2, y - h - 8]];
    const obstacles = [...dotBoxes, ...labelPositions.values()];
    for (const [left, top] of primary) {
      if (left < 4 || left + w > width - 4 || top < 4 || top + h > height - 4) continue;
      if (obstacles.some(box => left < box.x + box.w + 2 && left + w + 2 > box.x &&
        top < box.y + box.h + 2 && top + h + 2 > box.y)) continue;
      labelPositions.set(method.id, { x: left, y: top, w, h });
      break;
    }
  }
  const hoverPoint = hover ? bounds.get(hover) : undefined;
  const edges = local ? direct : layerEdges;
  const position = (point: Point) => ({ left: point.x, top: point.y });

  return <div className="globe-frame" data-method-links>
    <div className="globe-toolbar">
      <span aria-live="polite">{local && current ? `${current.name} · ${publicationMonth(current)} · ${neighbors.size} 个直接关联方法` : 'DFlash · 研究方向总览'}</span>
      <div>
        {local && <button type="button" onClick={() => research.current?.scrollIntoView({ block: 'start' })}>查看研究详情</button>}
        <button type="button" aria-label="缩小星球视图" onClick={() => zoomBy(.8)}><Minus size={16}/></button>
        <button type="button" aria-label="放大星球视图" onClick={() => zoomBy(1.25)}><Plus size={16}/></button>
        <button type="button" onClick={() => select(rootId, false)}><Scan size={15}/> 返回全图</button>
      </div>
    </div>
    <div className="globe-controls globe-layers" role="group" aria-label="关系层">
      <button type="button" aria-pressed={layer === 'lineage'} onClick={() => { setLayer('lineage'); setView(neutralView); setHover(null); }}>技术演进</button>
      <button type="button" aria-pressed={layer === 'citations'} onClick={() => { setLayer('citations'); setView(neutralView); setHover(null); }}>论文引用</button>
      {layer === 'citations' && <span>已核验 {citationEdges.length} 条 · 引用者 → 被引用者</span>}
    </div>
    <div className="globe-stage" ref={stage} aria-label="研究方法关系图"
      style={local ? { minHeight: Math.max(upstream.length * 25 + 65, downstream.length * 25 + 65, 270 + Math.max(0, Math.ceil(related.length / (width < 580 ? 2 : 4)) - 1) * 98) } : undefined}
      onPointerDown={event => {
        if (event.button !== 0 || (event.target as Element).closest('button')) return;
        drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, left: view.x, top: view.y };
        event.currentTarget.setPointerCapture(event.pointerId);
        setHover(null);
      }}
      onPointerMove={event => {
        const state = drag.current;
        if (state?.id !== event.pointerId) return;
        setView(previous => ({ ...previous, x: state.left + event.clientX - state.x, y: state.top + event.clientY - state.y }));
      }}
      onLostPointerCapture={() => { drag.current = null; }}>
      {local && <div className="globe-column-labels" aria-hidden="true"><span>{leftTitle}</span><span>当前方法</span><span>{rightTitle}</span></div>}
      {local && related.length > 0 && <span className="globe-related-label">下方点线 · 相关工作</span>}
      <svg className="globe-edges" aria-hidden="true">
      <defs><marker id={arrow} viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto">
        <path d="M0 0 L8 4 L0 8 Z" fill="#a9c0e4"/>
      </marker></defs>
      {edges.map((edge, index) => {
        const source = bounds.get(edge.source), target = bounds.get(edge.target);
        if (!source || !target) return null;
        const dim = direction && source.method.category !== direction && target.method.category !== direction;
        const directed = edge.type === 'cites' || (local && edge.type !== 'related');
        const distance = Math.hypot(target.x - source.x, target.y - source.y) || 1;
        const inset = directed ? (target.method.id === selected ? 14 : local ? 9 : 6) / distance : 0;
        return <line key={index} x1={source.x} y1={source.y}
          x2={target.x - (target.x - source.x) * inset} y2={target.y - (target.y - source.y) * inset}
          markerEnd={directed ? `url(#${arrow})` : undefined} data-source={edge.source} data-target={edge.target}
          data-relation={edge.type} className={local ? 'is-local' : dim ? 'is-dimmed' : undefined}/>;
      })}</svg>
      {points.map(point => {
        const { method } = point;
        const label = labelPositions.get(method.id);
        const dim = direction && method.id !== rootId && method.category !== direction;
        return <div key={method.id} className={dim ? 'globe-method is-dimmed' : 'globe-method'}>
          <button type="button" className={`globe-node ${local ? 'is-local' : ''}`}
            style={{ ...position(point), color: method.id === rootId ? 'var(--globe-core)' : globeColors[method.category] ?? categoryIndex.get(method.category)?.color }}
            aria-label={`聚焦 ${method.name}`} aria-pressed={method.id === selected}
            onMouseEnter={() => setHover(method.id)} onMouseLeave={() => setHover(null)}
            onFocus={() => setHover(method.id)} onBlur={() => setHover(null)}
            onClick={() => select(method.id)}/>
          {label && <span className="globe-label" aria-hidden="true" style={{ left: label.x, top: label.y }}>
            {method.name}{latest.has(method.id) && <small>NEW</small>}
          </span>}
        </div>;
      })}
      {hoverPoint && <div className="globe-tooltip" role="tooltip" style={{
        left: Math.max(8, Math.min(hoverPoint.x + 14, width - Math.min(width - 16, 250) - 8)),
        top: Math.max(8, Math.min(hoverPoint.y + 17, height - 108)),
      }}><b>{hoverPoint.method.name}</b><span>{hoverPoint.method.summary}</span></div>}
    </div>
    <div className="globe-controls">
      {categories.map(category => <button key={category.id} type="button" aria-pressed={direction === category.id}
        onClick={() => { select(rootId, false); setDirection(direction === category.id ? '' : category.id); }}>
        <i style={{ backgroundColor: globeColors[category.id] ?? category.color }}/>{category.name}
      </button>)}
    </div>
    <div className="globe-legend">{layer === 'lineage' ? <><span data-relation="extends">扩展</span><span data-relation="combines">组合</span><span data-relation="related">相关</span></> : <span>箭头指向被引用的论文</span>}</div>
    {current && <div className="globe-selection" key={current.id} ref={research}>
      <div><h3>{current.name}</h3><p>{current.summary}</p></div>
      <a href={`#method-${current.id}`} onClick={event => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault(); onRead(current.id);
      }}>阅读方法卡片 <ArrowUpRight size={14}/></a>
      {local && <MethodResearchDetails method={current} category={categoryIndex.get(current.category)}
        catalog={catalog} relations={verified} onSelect={id => {
          select(id);
          stage.current?.scrollIntoView({ block: 'nearest' });
        }}/>}
      {local && (direct.length ? <details key={layer}><summary>连线证据（{direct.length}）</summary>
        {([{ title: leftTitle, group: upstream }, { title: rightTitle, group: downstream }, { title: '相关方法', group: related }]).map(({ title, group }) =>
          group.length > 0 && <section key={title}><h4>{title}</h4><ul>
            {group.map((edge, index) => <li key={index}>
              <button type="button" onClick={() => select(otherId(edge))}>{catalog.get(otherId(edge))?.name}</button>
              <b> · {edge.role ?? relationNames[edge.type]}</b>
              <span>{edge.note}</span>
              <a href={edge.evidenceUrl} target="_blank" rel="noopener noreferrer">{edge.location ?? '原始来源'} <ArrowUpRight size={12}/></a>
            </li>)}
          </ul></section>)}
      </details> : <p>{layer === 'citations' ? '当前资料库尚未收录该方法的已核验引用。' : '暂无已核验的直接关系。'}</p>)}
      {local && <details><summary>同方向方法</summary>
        <div className="globe-peers">{methods.filter(method => method.category === current.category && method.id !== selected)
          .map(method => <button key={method.id} type="button" onClick={() => select(method.id)}>{method.name}</button>)}</div>
      </details>}
    </div>}
  </div>;
}
