import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
export async function updateStars(methods,previous,request=fetch,token=process.env.GITHUB_TOKEN){
  const output={...previous};const failures=[];
  const repos=[...new Set(methods.flatMap(m=>m.code.map(c=>c.repo)))];
  for(const repo of repos){
    try{
      const response=await request(`https://api.github.com/repos/${repo}`,{headers:{Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28',...(token?{Authorization:`Bearer ${token}`}:{})},signal:AbortSignal.timeout(15000)});
      if(!response.ok)throw new Error(`HTTP ${response.status}`);
      const json=await response.json();if(!Number.isInteger(json.stargazers_count)||json.stargazers_count<0)throw new Error('Invalid star count');
      output[repo]={count:json.stargazers_count,updatedAt:new Date().toISOString()};
    }catch(error){failures.push(`${repo}: ${error.message}`);}
  }
  return {output,failures};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const base=new URL('../src/data/',import.meta.url);const methods=JSON.parse(await readFile(new URL('methods.json',base),'utf8'));const previous=JSON.parse(await readFile(new URL('stars.json',base),'utf8'));
  const {output,failures}=await updateStars(methods,previous);
  await writeFile(new URL('stars.json',base),JSON.stringify(output,null,2)+'\n');
  for(const failure of failures)console.warn(`Star refresh failed; keeping last snapshot: ${failure}`);
  console.log(`Star snapshots: ${Object.keys(output).length}; failed requests: ${failures.length}`);
}
