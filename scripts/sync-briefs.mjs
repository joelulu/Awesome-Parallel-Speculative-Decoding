import { readdir, readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
const repository='https://github.com/joelulu/Awesome-Parallel-Speculative-Decoding';
const clean=s=>s.replace(/\[([^\]]+)\]\([^)]+\)/g,'$1').replace(/\*\*|`|⭐/g,'').trim();
export function parseBrief(markdown,date,methods){
  const titleLine=markdown.split('\n').find(l=>l.startsWith('>'));
  const title=clean(titleLine?.replace(/^>\s*(今日重点：)?/,'')??'研究动态').split('。')[0];
  const rows=markdown.split('\n').filter(l=>/^\|\s*(2026|近期|\*\*\d{4}|\d{4}-)/.test(l));
  const items=rows.map(row=>{const cells=row.split('|').slice(1,-1).map(s=>s.trim());const title=clean(cells[1]??'');const summary=clean(cells[2]??'');const urls=[...row.matchAll(/\[[^\]]+\]\((https:\/\/[^)]+)\)/g)];const text=`${title} ${summary}`.toLowerCase();return {title,summary,sourceUrl:urls[0]?.[1]??null,methodIds:methods.filter(m=>text.includes(m.name.toLowerCase())||(m.id==='dflash-2'&&text.includes('dflash2'))).map(m=>m.id).slice(0,2)};}).filter(i=>i.title&&i.summary);
  return {date,title,archiveUrl:`${repository}/blob/main/daily/${date}.md`,items};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const base=new URL('../',import.meta.url);const methods=JSON.parse(await readFile(new URL('src/data/methods.json',base),'utf8'));const current=JSON.parse(await readFile(new URL('src/data/briefs.json',base),'utf8'));const files=(await readdir(new URL('daily/',base))).filter(f=>/^\d{4}-\d{2}-\d{2}\.md$/.test(f));
  for(const file of files){const brief=parseBrief(await readFile(new URL(`daily/${file}`,base),'utf8'),file.slice(0,10),methods);if(!brief.items.length){console.warn(`${file}: no table rows found; keeping existing brief`);continue;}const index=current.findIndex(b=>b.date===brief.date);if(index<0)current.push(brief);else current[index]=brief;}
  current.sort((a,b)=>b.date.localeCompare(a.date));await writeFile(new URL('src/data/briefs.json',base),JSON.stringify(current,null,2)+'\n');console.log(`Synced ${current.length} daily briefs.`);
}
