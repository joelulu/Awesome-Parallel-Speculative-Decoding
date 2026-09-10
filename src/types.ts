export type CodeLink = {url:string;repo:string;kind:string;label?:string;evidenceUrl?:string;checkedAt?:string;availability?:'available'|'unavailable'|'placeholder'|'pull-request'};
export type Method = {id:string;name:string;title:string;date:string|null;dateLabel:string;category:string;tags:string[];summary:string;problem:string;solution:string;paperUrl:string|null;sourceUrl:string;code:CodeLink[];status:string;citationStatus:string;importance:number;pinned:boolean;reason:string;updatedAt:string};
export type Category = {id:string;name:string;description:string;color:string;english:string};
export type Relation = {source:string;target:string;type:string;status:string;evidenceUrl:string;note:string};
export type Stars = Record<string,{count:number;updatedAt:string}>;
export type Brief = {date:string;title:string;archiveUrl:string;items:{title:string;summary:string;sourceUrl:string|null;methodIds:string[]}[]};
