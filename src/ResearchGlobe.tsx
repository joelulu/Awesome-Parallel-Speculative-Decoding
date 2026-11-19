import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpRight, Minus, Plus, Scan } from 'lucide-react';
import type { Category, Method, Relation } from './types';

type Props = {
  methods: Method[]; categories: Category[]; relations: Relation[];
  focusId: string | null; focusKey: number; onRead: (id: string) => void;
};
type Point = { method: Method; x: number; y: number };
type Box = { x: number; y: number; w: number; h: number };
const rootId = 'dflash';
const fullTurn = 2 * Math.PI;
const relationNames: Record<string, string> = { extends: '扩展', combines: '组合', related: '相关' };
const neutralView = { x: 0, y: 0, zoom: 1 };

export default function ResearchGlobe({ methods, categories, relations, focusId, focusKey, onRead }: Props) {
  const [selected, setSelected] = useState(rootId);
  const [direction, setDirection] = useState('');
  const [view, setView] = useState(neutralView);
  const [size, setSize] = useState({ width: 900, height: 520 });
  const [hover, setHover] = useState<string | null>(null);
  const stage = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: number; x: number; y: number; left: number; top: number } | null>(null);
  const catalog = useMemo(() => new Map(methods.map(method => [method.id, method])), [methods]);
  const categoryIndex = useMemo(() => new Map(categories.map(category => [category.id, category])), [categories]);
  const verified = useMemo(() => relations.filter(relation => relation.status === 'verified' &&
    relation.type in relationNames && catalog.has(relation.source) && catalog.has(relation.target)), [relations, catalog]);
  const latest = useMemo(() => new Set(methods.filter(method => method.id !== rootId && method.date)
    .sort((a, b) => b.date!.localeCompare(a.date!)).slice(0, 3).map(method => method.id)), [methods]);
  const current = catalog.get(selected);
  const local = selected !== rootId && !!current;
  const direct = local ? verified.filter(edge => edge.source === selected || edge.target === selected) : [];
  const neighbors = [...new Set(direct.map(edge => edge.source === selected ? edge.target : edge.source))];

  useEffect(() => {
    const element = stage.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setSize({
      width: entry.contentRect.width, height: entry.contentRect.height,
    }));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  function select(id: string) {
    setSelected(id);
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
    neighbors.forEach((id, index) => {
      const theta = fullTurn * index / neighbors.length - Math.PI / 2;
      place(catalog.get(id)!, Math.min(width * .33, 255) * Math.cos(theta), height * .32 * Math.sin(theta));
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
  const edges = local ? direct : verified;
  const position = (point: Point) => ({ left: point.x, top: point.y });

  return <div className="globe-frame">
    <div className="globe-toolbar">
      <span aria-live="polite">{local ? `${current?.name} · ${neighbors.length} 个直接关联方法` : 'DFlash · 研究方向总览'}</span>
      <div>
        <button type="button" aria-label="缩小星球视图" onClick={() => zoomBy(.8)}><Minus size={16}/></button>
        <button type="button" aria-label="放大星球视图" onClick={() => zoomBy(1.25)}><Plus size={16}/></button>
        <button type="button" onClick={() => select(rootId)}><Scan size={15}/> 返回全图</button>
      </div>
    </div>
    <div className="globe-stage" ref={stage} aria-label="研究方法关系图"
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
      <svg className="globe-edges" aria-hidden="true">{edges.map((edge, index) => {
        const source = bounds.get(edge.source), target = bounds.get(edge.target);
        if (!source || !target) return null;
        const dim = direction && source.method.category !== direction && target.method.category !== direction;
        return <line key={index} x1={source.x} y1={source.y} x2={target.x} y2={target.y}
          data-relation={edge.type} className={local ? 'is-local' : dim ? 'is-dimmed' : undefined}/>;
      })}</svg>
      {points.map(point => {
        const { method } = point;
        const label = labelPositions.get(method.id);
        const dim = direction && method.id !== rootId && method.category !== direction;
        return <div key={method.id} className={dim ? 'globe-method is-dimmed' : 'globe-method'}>
          <button type="button" className={`globe-node ${local ? 'is-local' : ''}`}
            style={{ ...position(point), backgroundColor: method.id === rootId ? '#245778' : categoryIndex.get(method.category)?.color }}
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
        onClick={() => { select(rootId); setDirection(direction === category.id ? '' : category.id); }}>
        <i style={{ backgroundColor: category.color }}/>{category.name}
      </button>)}
    </div>
    <div className="globe-legend"><span data-relation="extends">扩展</span><span data-relation="combines">组合</span><span data-relation="related">相关</span></div>
    {current && <div className="globe-selection">
      <div><h3>{current.name}</h3><p>{current.summary}</p></div>
      <a href={`#method-${current.id}`} onClick={event => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault(); onRead(current.id);
      }}>阅读方法卡片 <ArrowUpRight size={14}/></a>
      {local && (direct.length ? <details key={selected}><summary>连线证据</summary><ul>
        {direct.map((edge, index) => <li key={index}>
          <b>{catalog.get(edge.source)?.name} · {relationNames[edge.type]}{edge.type === 'related' ? ' · ' : ' → '}{catalog.get(edge.target)?.name}</b>
          <span>{edge.note}</span>
          {edge.evidenceUrl && <a href={edge.evidenceUrl} target="_blank" rel="noopener noreferrer">原始来源 <ArrowUpRight size={12}/></a>}
        </li>)}
      </ul></details> : <p>暂无已核验的直接关系。</p>)}
    </div>}
  </div>;
}
