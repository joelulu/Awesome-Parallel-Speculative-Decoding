export type CodeLink = {url:string;repo:string;kind:string;label?:string;evidenceUrl?:string;checkedAt?:string;availability?:'available'|'unavailable'|'placeholder'|'pull-request'};
export type Method = {id:string;benchmarkReview:'verified'|'pending';name:string;title:string;date:string|null;dateLabel:string;category:string;tags:string[];summary:string;problem:string;solution:string;paperUrl:string|null;sourceUrl:string;code:CodeLink[];status:string;citationStatus:string;importance:number;/** 由 scripts/rescore-importance.mjs 生成：这个层级是怎么算出来的 */importanceBasis?:string;pinned:boolean;reason:string;updatedAt:string};
export type Category = {id:string;name:string;description:string;color:string;english:string};
export type Relation = {source:string;target:string;type:string;status:string;evidenceUrl:string;note:string};
export type Stars = Record<string,{count:number;updatedAt:string}>;
export type Brief = {date:string;title:string;archiveUrl:string;items:{title:string;summary:string;sourceUrl:string|null;methodIds:string[]}[]};
/** 已核验的引用边，与 Relation 分开存放，因为引用层和演进层的箭头方向相反。 */
export type CitationEdge = {source:string;target:string;role?:string;location?:string;evidenceUrl?:string;note?:string};
export type BenchmarkPeer = {methodId?:string;label:string;note:string};
/** 一组对照实验：谁和谁比、在什么设置下比、结论是什么。 */
export type Benchmark = {methodId:string;context:string;source:string;primary:BenchmarkPeer;others:BenchmarkPeer[];takeaway:string};
/** 由 scripts/build-atlas.mjs 从专题配置编译出的运行时配置。 */
export type AtlasRuntime = {
  slug:string;
  title:string;
  brand:{lead:string;tail:string};
  subtitle:string;
  headline:string;
  tagline:string;
  rootId:string;
  rootName:string;
  rootTitle:string;
  rootDate:string|null;
  repository:string;
  homepage:string;
  base:string;
  updatedAt:string|null;
  categoryIds:string[];
  scope:string;
  features:{briefs:boolean;engineering:boolean;stars:boolean;citations:boolean};
  copy:{dailyLabel:string;dailyNote:string;engineeringTitle:string};
  counts:{methods:number;relations:number;benchmarks:number;briefs:number};
};
/** 工程雷达：可选的第四块内容，只在有数据时渲染。 */
export type RadarProject = {id:string;name:string;url:string;focus:string};
export type RadarEvent = {id:string;repo:string;kind:string;status:string;topic:string;priority:string;date:string;title:string;summary:string;caveat:string;url:string};
export type EngineeringRadar = {asOf:string;timezone:string;editorial:string;projects:RadarProject[];events:RadarEvent[]};
