import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
export function validateData({methods,categories,relations,briefs,stars,abstracts={},metadata={}}) {
  const errors=[];const ids=new Set();const cats=new Set(categories.map(c=>c.id));const papers=new Set();
  const url=(value,label)=>{try{if(new URL(value).protocol!=='https:')errors.push(`${label}: HTTPS required`);}catch{errors.push(`${label}: invalid URL`);}};
  for(const m of methods){
    if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(m.id)||ids.has(m.id))errors.push(`Invalid or duplicate method id: ${m.id}`);ids.add(m.id);
    for(const field of ['name','title','summary','problem','solution','dateLabel','sourceUrl','reason','updatedAt'])if(typeof m[field]!=='string'||!m[field].trim())errors.push(`${m.id}: missing ${field}`);
    if(!cats.has(m.category))errors.push(`${m.id}: unknown category`);
    if(!['verified','imported'].includes(m.status))errors.push(`${m.id}: unknown review status`);
    if(!['root','confirmed','unconfirmed'].includes(m.citationStatus))errors.push(`${m.id}: unknown citation status`);
    if(!Number.isInteger(m.importance)||m.importance<1||m.importance>5)errors.push(`${m.id}: importance must be 1–5`);
    if(m.date&&!/^\d{4}-\d{2}(-\d{2})?$/.test(m.date))errors.push(`${m.id}: invalid date`);
    url(m.sourceUrl,`${m.id} source`);
    if(m.paperUrl){url(m.paperUrl,`${m.id} paper`);const key=m.paperUrl.replace(/v\d+$/,'');if(papers.has(key))errors.push(`${m.id}: duplicate paper URL`);papers.add(key);}
    for(const c of m.code){url(c.url,`${m.id} code`);if(!/^[\w.-]+\/[\w.-]+$/.test(c.repo)||!c.url.startsWith(`https://github.com/${c.repo}`))errors.push(`${m.id}: invalid repo`);if(!['official','third-party','integration'].includes(c.kind))errors.push(`${m.id}: invalid code kind`);}
  }
  const edgeIds=new Set();
  for(const method of methods) for(const code of method.code){
    if(code.availability){
      if(!['available','unavailable','placeholder','pull-request'].includes(code.availability))errors.push(`${method.id}: invalid code availability`);
      url(code.evidenceUrl,`${method.id} code evidence`);
      if(!/^\d{4}-\d{2}-\d{2}$/.test(code.checkedAt??''))errors.push(`${method.id}: code check date required`);
    }
  }
  for(const r of relations){if(!ids.has(r.source)||!ids.has(r.target)||r.source===r.target)errors.push(`Invalid relation ${r.source} → ${r.target}`);const k=`${r.source}:${r.target}:${r.type}`;if(edgeIds.has(k))errors.push(`Duplicate relation ${k}`);edgeIds.add(k);url(r.evidenceUrl,'Relation evidence');if(!r.note)errors.push('Relation explanation required');if(!['verified','proposed'].includes(r.status))errors.push('Invalid relation status');}
  const dates=new Set();
  for(const b of briefs){if(!/^\d{4}-\d{2}-\d{2}$/.test(b.date)||dates.has(b.date))errors.push(`Invalid or duplicate brief date ${b.date}`);dates.add(b.date);url(b.archiveUrl,'Brief archive');for(const item of b.items){if(!item.title||!item.summary)errors.push('Empty brief item');if(item.sourceUrl)url(item.sourceUrl,'Brief source');for(const id of item.methodIds)if(!ids.has(id))errors.push(`Brief references unknown method ${id}`);}}
  for(const [repo,snapshot] of Object.entries(stars))if(!Number.isInteger(snapshot.count)||snapshot.count<0||!Number.isFinite(Date.parse(snapshot.updatedAt)))errors.push(`Invalid star snapshot: ${repo}`);
  for(const [id,abstract] of Object.entries(abstracts)) {
    if(!ids.has(id)||!abstract.text?.trim())errors.push(`Invalid translated abstract: ${id}`);
    url(abstract.sourceUrl,`${id} abstract source`);
    if(!['translated-summary','source-summary'].includes(abstract.kind))errors.push(`Invalid abstract kind: ${id}`);
    if(metadata[id]?.sourceUrl!==abstract.sourceUrl)errors.push(`Abstract provenance mismatch: ${id}`);
  }
  for(const [id,paper] of Object.entries(metadata)) {
    if(!ids.has(id))errors.push(`Unknown paper metadata: ${id}`);
    if(paper.thumbnail&&!/^papers\/[a-z0-9-]+\.jpg$/.test(paper.thumbnail))errors.push(`Invalid thumbnail path: ${id}`);
  }
  return errors;
}
export async function loadData(){const names=['methods','categories','relations','briefs','stars','abstracts','paper-metadata'];return Object.fromEntries(await Promise.all(names.map(async n=>[n==='paper-metadata'?'metadata':n,JSON.parse(await readFile(new URL(`../src/data/${n}.json`,import.meta.url),'utf8'))])));}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const data=await loadData();const errors=validateData(data);if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}else console.log(`Validated ${data.methods.length} methods, ${data.relations.length} relations, ${data.briefs.length} briefs.`);}
