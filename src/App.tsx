import { Component, lazy, Suspense, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { ArrowDown, ArrowRight, ArrowUpRight, BookOpen, Check, ChevronDown, ChevronUp, Code2, GitBranch, Github, LocateFixed, Search, Sparkles, Star, X } from 'lucide-react';
import PaperCard from './PaperCard';
import methodsJson from './data/methods.json';
import categories from './data/categories.json';
import relations from './data/relations.json';
import starsJson from './data/stars.json';
import briefsJson from './data/briefs.json';
import { recommend, filterMethods, scoreMethod, dateValue, todayInShanghai, chooseBrief } from './lib/catalog.mjs';
import type { Method, Stars, Brief } from './types';
const ResearchMap=lazy(()=>import('./ResearchMap'));
class MapBoundary extends Component<{children:React.ReactNode},{failed:boolean}> {
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  render(){return this.state.failed?<div className="map-loading">地图暂时无法载入，可以使用下方大纲和方法卡片继续阅读。</div>:this.props.children;}
}
const methods=methodsJson as Method[];
const stars=starsJson as Stars;
const briefs=briefsJson as Brief[];
const repository='https://github.com/joelulu/Awesome-Parallel-Speculative-Decoding';
const categoryMap=Object.fromEntries(categories.map(c=>[c.id,c]));
const lastUpdated=methods.map(m=>m.updatedAt).sort().at(-1);
const motion=()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant' as const:'smooth' as const;
function scrollToId(id:string){requestAnimationFrame(()=>requestAnimationFrame(()=>{const el=document.getElementById(id);el?.scrollIntoView({behavior:motion(),block:'start'});el?.focus({preventScroll:true});}));}
function External({href,children,...rest}:{href:string;children:React.ReactNode;className?:string;title?:string}){return <a href={href} target="_blank" rel="noopener noreferrer" {...rest}>{children}</a>;}

export default function App(){
  const [query,setQuery]=useState('');
  const [category,setCategory]=useState('all');
  const [all,setAll]=useState(false);
  const [codeOnly,setCodeOnly]=useState(false);
  const [sort,setSort]=useState('importance');
  const [active,setActive]=useState<string|null>(null);
  const [readKey,setReadKey]=useState(0);
  const [focusId,setFocusId]=useState<string|null>(null);
  const [focusKey,setFocusKey]=useState(0);
  const [unknown,setUnknown]=useState(false);
  const [searchOpen,setSearchOpen]=useState(false);
  const [today,setToday]=useState(todayInShanghai());
  useEffect(()=>{const timer=setInterval(()=>setToday(todayInShanghai()),60000);return()=>clearInterval(timer);},[]);
  const brief=chooseBrief(briefs,today) as Brief|null;
  const isToday=brief?.date===today;
  const searching=Boolean(query.trim()||category!=='all'||codeOnly);
  const recommended=useMemo(()=>recommend(methods,stars,6),[]);
  const visible=useMemo(()=>{
    if(!all&&!searching&&sort==='importance')return recommended;
    const filtered=filterMethods(methods,query,category,codeOnly) as Method[];
    return filtered.sort((a,b)=>sort==='newest'?dateValue(b.date)-dateValue(a.date):sort==='stars'?Math.max(-1,...b.code.map(c=>stars[c.repo]?.count??-1))-Math.max(-1,...a.code.map(c=>stars[c.repo]?.count??-1)):Number(b.pinned)-Number(a.pinned)||scoreMethod(b,stars)-scoreMethod(a,stars));
  },[all,query,category,codeOnly,sort,searching,recommended]);
  function readMethod(id:string,hash=true){
    if(!methods.some(m=>m.id===id)){setUnknown(true);return;}
    setUnknown(false);setActive(id);
    setAll(true);setQuery('');setCategory('all');setCodeOnly(false);
    if(hash&&window.location.hash!==`#method-${id}`)window.history.pushState(null,'',`#method-${id}`);
    setReadKey(key=>key+1);
  }
  // Scroll after React commits the expanded, unfiltered card list, including repeated clicks.
  useEffect(()=>{if(active)scrollToId(`method-${active}`);},[active,readKey]);
  useEffect(()=>{
    const onHash=()=>{const hash=window.location.hash;if(hash.startsWith('#method-')){try{readMethod(decodeURIComponent(hash.slice(8)),false);}catch{setUnknown(true);}}else if(hash)scrollToId(hash.slice(1));};
    onHash();window.addEventListener('hashchange',onHash);window.addEventListener('popstate',onHash);
    return()=>{window.removeEventListener('hashchange',onHash);window.removeEventListener('popstate',onHash);};
  },[]);
  function locate(id:string){setSearchOpen(false);setFocusId(id);setFocusKey(n=>n+1);scrollToId('research-map');}
  function resetFilters(){setQuery('');setCategory('all');setCodeOnly(false);setSort('importance');setAll(false);setActive(null);}
  const searchMatches=query.trim()?filterMethods(methods,query).slice(0,5) as Method[]:[];
  return <>
    <a className="skip-link" href="#featured">跳至方法卡片</a>
    <header className="site-header"><a className="brand" href="#"><span className="brand-mark"><GitBranch size={23}/></span><span>DFlash <b>Atlas</b><small>PARALLEL SPECULATIVE DECODING</small></span></a><nav aria-label="主导航"><a className="nav-active" href="#research-map">研究地图</a><a href="#featured">方法卡片</a><a href="#daily">每日简报</a></nav><External href={repository} className="repo-link"><Github size={18}/><span>GitHub</span><ArrowUpRight size={14}/></External></header>
    <main>
      <section className="intro"><div><div className="eyebrow"><span className="live-dot"/> PAPERS · METHODS · OPEN SOURCE</div><h1>Parallel Speculative Decoding</h1><p>从 DFlash 出发，沿着时间阅读并行投机解码的新方法。</p></div><div className="intro-meta"><span><b>{methods.length.toString().padStart(2,'0')}</b> 方法记录</span><span><b>06</b> 研究方向</span><small>资料更新于 {lastUpdated}</small></div></section>
      <section id="research-map" className="map-section" tabIndex={-1} aria-labelledby="map-title"><div className="section-heading"><div className="section-title"><span className="section-number">01</span><h2 id="map-title">探索研究脉络</h2><span className="quiet-label">交互地图</span></div><div className="search-wrap"><Search size={17}/><input aria-label="搜索方法、问题或关键词" placeholder="搜索方法、问题或关键词…" value={query} onFocus={()=>setSearchOpen(true)} onChange={e=>{setQuery(e.target.value);setAll(true);setSearchOpen(true);}} onKeyDown={e=>{if(e.key==='Escape')setSearchOpen(false);if(e.key==='Enter'&&searchMatches[0]){locate(searchMatches[0].id);}}}/>{query&&<button className="icon-button" aria-label="清空搜索" onClick={()=>setQuery('')}><X size={15}/></button>}{query&&searchOpen&&<div className="search-results">{searchMatches.length?searchMatches.map(m=><button key={m.id} onClick={()=>locate(m.id)}><span>{m.name}<small>{categoryMap[m.category].name}</small></span><LocateFixed size={15}/></button>):<p>未找到匹配方法</p>}</div>}</div></div>
      <MapBoundary><Suspense fallback={<div className="map-loading">正在载入研究地图…</div>}><ResearchMap methods={methods} categories={categories} relations={relations} focusId={focusId} focusKey={focusKey} onRead={readMethod}/></Suspense></MapBoundary>
      <div className="map-legend"><span>按问题分支 · 按时间演进</span>{categories.map(c=><button key={c.id} onClick={()=>{setCategory(c.id);setAll(true);scrollToId('featured');}}><i style={{background:c.color}}/>{c.name}</button>)}<span className="legend-note">实线表示时间顺序，非继承关系</span></div>
      <details className="map-outline"><summary>以大纲浏览全部方法 <ChevronDown size={16}/></summary><div>{categories.map(c=><details key={c.id}><summary><i style={{background:c.color}}/>{c.name}</summary>{methods.filter(m=>m.category===c.id).map(m=><button key={m.id} onClick={()=>readMethod(m.id)}>{m.name}<ArrowUpRight size={14}/></button>)}</details>)}</div></details></section>
      <section id="featured" className="featured-section" tabIndex={-1} aria-labelledby="featured-title"><div className="section-heading"><div className="section-title"><span className="section-number">02</span><h2 id="featured-title">{all||searching?'方法库':'重点阅读'}</h2><span className="quiet-label">{visible.length} 个方法</span></div><button className="text-button" onClick={()=>{if(all||searching)resetFilters();else setAll(true);}}>{all||searching?'返回重点阅读':'查看全部方法'}<ArrowRight size={16}/></button></div>
      <div className="catalog-toolbar"><p>{all||searching?'沿着问题寻找方法，也可以回到地图中定位。':'从基础方法出发，优先阅读各条主线的关键工作。'}</p><label className="sort-select">排序<select aria-label="方法排序" value={sort} onChange={e=>{setSort(e.target.value);if(e.target.value!=='importance')setAll(true);}}><option value="importance">研究重要性</option><option value="newest">最新发布</option><option value="stars">GitHub Star</option></select></label></div>
      {(all||searching)&&<div className="filter-row"><button className={category==='all'?'selected':''} onClick={()=>setCategory('all')}>全部方向</button>{categories.map(c=><button key={c.id} className={category===c.id?'selected':''} onClick={()=>setCategory(c.id)}>{c.name}</button>)}<label><input type="checkbox" checked={codeOnly} onChange={e=>setCodeOnly(e.target.checked)}/> 有代码链接</label></div>}
      {unknown&&<div role="status" className="empty-state">没有找到链接中的方法，请搜索名称或浏览方法库。<button onClick={()=>setUnknown(false)}>关闭</button></div>}
      <div className="cards-grid">{visible.map(m=><PaperCard key={m.id} method={m} category={categoryMap[m.category]} highlight={active===m.id} onLocate={locate} stars={stars} relations={relations} methods={methods}/>)}</div>
      {!visible.length&&<div className="empty-state"><Search size={25}/><h3>暂时没有匹配的方法</h3><p>试试更短的关键词，或清除筛选条件。</p><button className="primary-button" onClick={resetFilters}>清除筛选</button></div>}
      {!all&&!searching&&<div className="recommendation-note"><Sparkles size={14}/> 综合编辑关注、来源核验、发布时间与方向覆盖推荐；Star 仅作辅助信号。</div>}
      </section>
      <section id="daily" className="daily-section" tabIndex={-1} aria-labelledby="daily-title"><div className="section-heading"><div className="section-title"><span className="section-number">03</span><h2 id="daily-title">今日简报</h2><span className="quiet-label">{today}</span></div><External className="text-button" href={`${repository}/tree/main/daily`}>查看往期 <ArrowUpRight size={16}/></External></div>
      {!isToday&&<p className="brief-empty">今日暂无新增。{brief?`以下为最近一期：${brief.date}。`:'新的研究动态会出现在这里。'}</p>}
      {brief&&<div className="brief-layout"><div className="brief-intro"><span className="eyebrow">{isToday?'TODAY’S BRIEF':'LATEST BRIEF'}</span><h3>{brief.title}</h3><p>值得留意的变化，简短读完。</p><External href={brief.archiveUrl}>阅读完整简报 <ArrowUpRight size={15}/></External></div><ol className="brief-list">{brief.items.slice(0,5).map((item,i)=><li key={`${brief.date}-${i}`}><span className="brief-number">{String(i+1).padStart(2,'0')}</span><div><h4>{item.title}</h4><p>{item.summary}</p><div className="brief-links">{item.sourceUrl?<External href={item.sourceUrl}>来源 <ArrowUpRight size={12}/></External>:<span>来源链接待补充</span>}{item.methodIds.map(id=><button key={id} onClick={()=>readMethod(id)}>{methods.find(m=>m.id===id)?.name} <ArrowRight size={12}/></button>)}</div></div></li>)}</ol></div>}
      </section>
    </main><footer><a className="footer-brand" href="#">DFlash Atlas</a><span>沿着问题，持续阅读。<span className="footer-divider"> / </span>由开放研究连接起来。</span><External href={repository}>在 GitHub 上参与整理 <ArrowUpRight size={14}/></External></footer>
  </>;
}
