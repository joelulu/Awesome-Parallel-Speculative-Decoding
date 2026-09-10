import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import {
  ReactFlow, ReactFlowProvider, Handle, Position, MarkerType,
  useReactFlow, useNodesInitialized, type Node, type Edge, type NodeProps,
} from '@xyflow/react';
import { ArrowUpRight, ArrowLeft, ArrowRight, Plus, Minus, Scan, Maximize2, Minimize2, LocateFixed } from 'lucide-react';
import '@xyflow/react/dist/style.css';
import './ResearchMap.css';
import { buildTimeline } from './lib/timeline.mjs';
import type { Method, Category, Relation } from './types';
type AtlasData = {
  kind: string; label: string; subtitle: string; color: string;
  methodId?: string; count?: number; selected?: boolean; onRead?: () => void; onFocus?: () => void;
};
type AtlasNode = Node<AtlasData>;
function AtlasNodeView({ data }: NodeProps<AtlasNode>) {
  const style = { '--branch': data.color } as CSSProperties;
  if (data.kind === 'month') return <div className="timeline-month-label">{data.label}</div>;
  if (data.kind === 'band') return <div className="timeline-lane-band" style={style}/>;
  if (data.kind === 'category') return <div className="timeline-category" style={style}>
    <Handle type="target" position={Position.Left}/><Handle type="source" position={Position.Right}/>
    <button className="nodrag" onClick={data.onFocus} title={`聚焦${data.label}`}>
      <i/><span>{data.label}</span>
    </button>
  </div>;
  return <div className={`timeline-method ${data.kind === 'root' ? 'timeline-root' : ''} ${data.selected ? 'is-selected' : ''}`} style={style}>
    {data.kind !== 'root' && <Handle type="target" position={Position.Left}/>}
    <Handle type="source" position={Position.Right}/>
    <a className="nodrag nopan timeline-read" href={`#method-${data.methodId}`} onClick={event => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault(); event.stopPropagation(); data.onRead?.();
    }} title={`${data.subtitle} · 点击阅读方法卡片`} aria-label={`阅读 ${data.label} 方法卡片`} aria-current={data.selected ? 'true' : undefined}>
      <strong>{data.label}</strong><i className="method-point"/><span className="timeline-read-hint">阅读卡片 <ArrowUpRight size={11}/></span>
    </a>
  </div>;
}
const nodeTypes = { atlas: AtlasNodeView };
type Props = { methods: Method[]; categories: Category[]; relations: Relation[]; focusId: string | null; focusKey: number; onRead: (id: string) => void };
function MapCanvas({ methods, categories, relations, focusId, focusKey, onRead }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [showRelations, setShowRelations] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [notice, setNotice] = useState('');
  const [panPosition, setPanPosition] = useState(0);
  const [zoom, setZoom] = useState(1);
  const container = useRef<HTMLDivElement>(null);
  const surface = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);
  const pendingFocus = useRef<string | null>(null);
  const flow = useReactFlow<AtlasNode>();
  const nodesReady = useNodesInitialized();
  const timeline = useMemo(() => buildTimeline(methods, categories), [methods, categories]);
  const methodIndex = useMemo(() => new Map([timeline.root, ...timeline.methods].map(node => [node.id, node])), [timeline]);
  const duration = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 400;

  const focusMethod = useCallback((id: string) => {
    const node = methodIndex.get(id);
    if (!node) return;
    setSelected(id);
    flow.setCenter(node.x + node.width / 2, node.y + node.height / 2, { zoom: 1.05, duration: duration() });
  }, [methodIndex, flow]);
  const focusLane = useCallback((id: string) => {
    const lane = timeline.lanes.find(item => item.id === id);
    if (!lane) return;
    setSelected(null);
    const viewport = flow.getViewport();
    const scale = Math.max(1, viewport.zoom);
    flow.setViewport({ x: 25 - 124 * scale, y: (surface.current?.clientHeight ?? 620) / 2 - (lane.y + 44) * scale, zoom: scale }, { duration: duration() });
  }, [timeline, flow]);
  const readMethod = useCallback(async (id: string) => {
    setSelected(id);
    if (document.fullscreenElement === container.current) {
      try { await document.exitFullscreen(); } catch { setNotice('请退出全屏后阅读下方卡片。'); return; }
    }
    onRead(id);
  }, [onRead]);
  const startView = useCallback(() => {
    const height = surface.current?.clientHeight ?? 650;
    const scale = Math.max(.95, Math.min(1.1, (height - 20) / timeline.height));
    setSelected(null);
    flow.setViewport({ x: 22, y: Math.max(12, (height - timeline.height * scale) / 2), zoom: scale }, { duration: duration() });
  }, [flow, timeline.height]);
  useEffect(() => {
    if (!nodesReady || initialized.current) return;
    initialized.current = true;
    if (pendingFocus.current) focusMethod(pendingFocus.current); else startView();
  }, [nodesReady, startView, focusMethod]);
  useEffect(() => {
    if (!focusId) return;
    pendingFocus.current = focusId;
    if (nodesReady) focusMethod(focusId);
  }, [focusId, focusKey, nodesReady, focusMethod]);
  useEffect(() => {
    const change = () => setFullscreen(document.fullscreenElement === container.current);
    document.addEventListener('fullscreenchange', change);
    return () => document.removeEventListener('fullscreenchange', change);
  }, []);

  const nodes = useMemo<AtlasNode[]>(() => {
    const make = (id: string, x: number, y: number, width: number, height: number, data: AtlasData, background = false): AtlasNode => ({
      id, type: 'atlas', position: { x, y }, width, height,
      // Non-draggable, non-selectable React Flow nodes otherwise disable pointer events.
      style: { width, height, pointerEvents: background ? 'none' : 'all' },
      data, draggable: false, selectable: false, zIndex: background ? -1 : 1,
    });
    const laneBands = timeline.lanes.map(lane => make(`band-${lane.id}`, 124, lane.y, timeline.width - 140, 76,
      { kind: 'band', label: '', subtitle: '', color: lane.color }, true));
    const monthNodes = timeline.months.map(month => make(`month-${month.id}`, month.x + 12, 20, month.width - 24, 34,
      { kind: 'month', label: month.label, subtitle: '', color: '#59706e' }, true));
    const categoryNodes = timeline.categories.map(node => make(node.id, node.x, node.y, node.width, node.height, {
      kind: 'category', label: node.category.name, subtitle: node.category.english, color: node.category.color,
      count: node.count, onFocus: () => focusLane(node.category.id),
    }));
    const methodNodes = [timeline.root, ...timeline.methods].map(node => make(node.id, node.x, node.y, node.width, node.height, {
      kind: node.kind, label: node.method.name, subtitle: node.method.summary, methodId: node.id,
      color: node.kind === 'root' ? '#153c39' : categories.find(category => category.id === node.method.category)!.color,
      selected: selected === node.id, onRead: () => { void readMethod(node.id); }, onFocus: () => focusMethod(node.id),
    }));
    return [...laneBands, ...monthNodes, ...categoryNodes, ...methodNodes];
  }, [timeline, categories, selected, focusLane, readMethod, focusMethod]);
  const edges = useMemo<Edge[]>(() => {
    const ordered: Edge[] = timeline.edges.map(edge => ({
      ...edge, type: 'default', zIndex: 0,
      style: { stroke: edge.color, strokeWidth: selected && (edge.source === selected || edge.target === selected) ? 2.8 : 1.7, opacity: selected ? (edge.source === selected || edge.target === selected ? 1 : .28) : .65 },
      
    }));
    if (showRelations) for (const relation of relations.filter(item => item.status === 'verified')) {
      if (!methodIndex.has(relation.source) || !methodIndex.has(relation.target)) continue;
      ordered.push({
        id: `evidence-${relation.source}-${relation.target}`, source: relation.source, target: relation.target,
        type: 'smoothstep', zIndex: 0, label: relation.type === 'combines' ? '组合关系' : '直接改进',
        labelStyle: { fontSize: 12, fill: '#153c39' }, labelBgStyle: { fill: '#fff' },
        style: { stroke: '#153c39', strokeWidth: 2, strokeDasharray: '6 5' },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#153c39' },
      });
    }
    return ordered;
  }, [timeline, relations, methodIndex, showRelations, selected]);
  function moveAlong(value: number) {
    const viewport = flow.getViewport();
    const distance = Math.max(0, timeline.width * viewport.zoom - (surface.current?.clientWidth ?? 1000) + 50);
    flow.setViewport({ ...viewport, x: 22 - distance * value / 100 });
  }
  function jumpMonth(x: number) {
    const viewport = flow.getViewport();
    const scale = Math.max(.95, viewport.zoom);
    flow.setViewport({ ...viewport, x: 30 - x * scale, zoom: scale }, { duration: duration() });
  }
  return <div className="map-frame chronology-map" ref={container}>
    <div className="map-topbar">
      <div className="map-breadcrumb"><button onClick={startView}>DFlash</button><ArrowRight size={14}/><span>沿着问题，向右探索</span></div>
      <label className="relation-toggle"><input type="checkbox" checked={showRelations} onChange={event => setShowRelations(event.target.checked)}/>叠加已核验改进关系</label>
    </div>
    <div className="timeline-month-nav" aria-label="按月份定位研究脉络">
      <button onClick={startView}><ArrowLeft size={13}/>研究起点</button>
      {timeline.months.map(month => <button key={month.id} title={month.id} onClick={() => jumpMonth(month.x)}>{month.label}</button>)}
      <button onClick={() => flow.fitView({ padding: .04, duration: duration() })}><Scan size={13}/>全部脉络</button>
    </div>
    <div className="flow-surface" ref={surface}>
      <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} minZoom={.15} maxZoom={2} nodesConnectable={false}
        nodesFocusable={false} edgesFocusable={false} elementsSelectable={false} zoomOnDoubleClick={false}
        onNodeClick={(event, node) => {
          if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
          if (node.data.methodId) void readMethod(node.data.methodId);
        }}
        defaultViewport={{ x: 22, y: 12, zoom: .7 }} attributionPosition="bottom-right"
        onMove={(_, viewport) => {
          setZoom(viewport.zoom);
          const distance = Math.max(0, timeline.width * viewport.zoom - (surface.current?.clientWidth ?? 1000) + 50);
          setPanPosition(distance ? Math.max(0, Math.min(100, (22 - viewport.x) / distance * 100)) : 0);
        }}>
        
      </ReactFlow>
    </div>
    <div className="map-tools">
      <button aria-label="放大脉络图" title="放大" onClick={() => flow.zoomIn({ duration: 200 })}><Plus size={18}/></button>
      <span className="timeline-zoom-value">{Math.round(zoom * 100)}%</span>
      <button aria-label="缩小脉络图" title="缩小" onClick={() => flow.zoomOut({ duration: 200 })}><Minus size={18}/></button>
      <button aria-label="查看全部脉络" title="查看全部脉络" onClick={() => flow.fitView({ padding: .04, duration: duration() })}><Scan size={18}/></button>
      <button aria-label={fullscreen ? '退出全屏' : '全屏脉络图'} title="全屏" onClick={async () => {
        try { if (fullscreen) await document.exitFullscreen(); else await container.current?.requestFullscreen(); }
        catch { setNotice('当前浏览器未能进入全屏，可使用缩放和时间导航。'); }
      }}>{fullscreen ? <Minimize2 size={18}/> : <Maximize2 size={18}/>}</button>
    </div>
    <div className="timeline-navigation"><span>较早</span><input type="range" min="0" max="100" step=".1" value={panPosition} aria-label="横向浏览方法时间线" onChange={event => moveAlong(Number(event.target.value))}/><span>较新 <ArrowRight size={13}/></span></div>
    <div className="map-caption">{notice || '点击方法，跳转阅读卡片 · 拖动画布探索，滚轮缩放 · 实线表示同类工作的时间顺序'}</div>
  </div>;
}
export default function ResearchMap(props: Props) {
  return <ReactFlowProvider><MapCanvas {...props}/></ReactFlowProvider>;
}
