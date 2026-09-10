"""One-time, explicit migration of the original README. Never run during builds."""
import json, re, sys
from pathlib import Path

root = Path(__file__).resolve().parents[1]
out = root / 'src/data'
out.mkdir(parents=True, exist_ok=True)
if (out / 'methods.json').exists() and '--force' not in sys.argv:
    raise SystemExit('Migration already exists. Use --force only to intentionally replace curated data.')
def save(name, value):
    (out / name).write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
def clean(s):
    return re.sub(r'\s+', ' ', re.sub(r'\[([^\]]+)\]\([^)]*\)', r'\1', s).replace('**', '').replace('`', '').replace('⭐', '')).strip()
categories = [
 ('architecture','能力与架构','更强的并行 drafter','#2563ad','Architecture'),
 ('training','训练目标对齐','让训练关注连续接受','#a6650a','Training'),
 ('causality','因果与相关性','找回块内 token 依赖','#168071','Causality'),
 ('tree','树与路径选择','从单一路径到候选树','#b44864','Draft trees'),
 ('systems','验证与动态预算','让接受收益覆盖验证成本','#7359a5','Verification'),
 ('extensions','多模态与扩展','走向更广的模型与场景','#168296','Beyond text')]
save('categories.json',[dict(id=i,name=n,description=d,color=c,english=e) for i,n,d,c,e in categories])
ids = ['ddtree','d-pace','test-time-speculation','draft-opd','domino','caddtree','dflare','d2sd','treeflash','whiflash','teaching-l2r','jetspec','hyperdflash','spec-auf','dspark','dels-spec','dominotree','d-cut','adaflash','speculative-correction','xpress','dblast','dartree','dflash-2','lilicorr','vat','dbloom','glance']
groups = ['tree','training','systems','training','causality','systems','architecture','tree','causality','systems','training','tree','architecture','training','causality','causality','tree','systems','systems','extensions','causality','causality','tree','causality','causality','training','architecture','extensions']
verified = {'ddtree','d-pace','domino','dartree','dspark','d-cut'}
methods = [dict(id='dflash',name='DFlash',title='Block Diffusion for Flash Speculative Decoding',date='2026-02-05',dateLabel='2026-02-05',category='architecture',tags=['并行草稿','基础方法'],summary='以轻量块扩散模型，一次前向并行生成整块草稿。',problem='自回归草稿模型仍需逐 token 生成，串行开销限制加速收益。',solution='使用 target model 的上下文特征作为条件，由 block diffusion drafter 并行预测未来 token，再交给 target 验证。',paperUrl='https://arxiv.org/abs/2602.06036',sourceUrl='https://arxiv.org/abs/2602.06036',code=[dict(url='https://github.com/z-lab/dflash',repo='z-lab/dflash',kind='official')],status='verified',citationStatus='root',importance=5,pinned=True,reason='基础方法 · 阅读起点',updatedAt='2026-09-09')]
rows = [l for l in (root/'README.md').read_text(encoding='utf-8').splitlines() if l.startswith('| **2026')]
for i,row in enumerate(rows):
    cells = [c.strip() for c in row.strip('|').split('|')]
    date,title,summary,problem,solution = cells
    links = re.findall(r'\[([^\]]+)\]\((https?://[^)]+)\)',solution)
    source = links[-1][1] if links else ''
    paper = source if ('arxiv.org/abs/' in source or 'alphaxiv.org/abs/' in source) else None
    if paper: paper = paper.replace('www.alphaxiv.org','arxiv.org').replace('alphaxiv.org','arxiv.org')
    label = clean(date)
    exact = re.fullmatch(r'\d{4}-\d{2}-\d{2}', label)
    month = re.match(r'\d{4}-\d{2}', label)
    name = clean(title).split(' — ')[0]
    name = {'teaching-l2r':'Teaching L2R','vat':'VAT','dbloom':'DBloom'}.get(ids[i],name)
    methods.append(dict(id=ids[i],name=name,title=clean(title),date=label if exact else (month[0] if month else None),dateLabel=label,category=groups[i],tags=[],summary=clean(summary),problem=clean(problem),solution=clean(re.sub(r'\(\[[^]]+\]\([^)]+\)\)', '',solution)),paperUrl=paper,sourceUrl=source,code=[],status='verified' if ids[i] in verified else 'imported',citationStatus='confirmed' if ids[i]=='ddtree' else 'unconfirmed',importance=min(5,2+summary.count('⭐')),pinned=False,reason='编辑关注 · '+dict((c[0],c[1]) for c in categories)[groups[i]],updatedAt='2026-09-09'))
ds = next(m for m in methods if m['id']=='dspark')
ds['paperUrl']='https://arxiv.org/abs/2607.05147'
ds['code']=[dict(url='https://github.com/vllm-project/speculators/blob/main/docs/user_guide/algorithms/dspark.md',repo='vllm-project/speculators',kind='integration')]
ds['tags']=['动态验证']
next(m for m in methods if m['id']=='dartree')['tags']=['因果补偿','无需额外训练']
next(m for m in methods if m['id']=='ddtree')['reason']='关键分支 · 从单路径到树'
next(m for m in methods if m['id']=='ddtree')['importance']=5
save('methods.json',methods)
save('relations.json',[
 dict(source='dflash',target='ddtree',type='extends',status='verified',evidenceUrl='https://arxiv.org/abs/2604.12989',note='DDTree 摘要明确说明在 DFlash 的逐位置分布上构建候选树。'),
 dict(source='dflash',target='dspark',type='extends',status='verified',evidenceUrl=ds['sourceUrl'],note='框架文档明确说明 DSpark 在 DFlash 上增加 Markov 与 confidence heads。'),
 dict(source='domino',target='dominotree',type='combines',status='proposed',evidenceUrl='https://arxiv.org/abs/2607.08642',note='原仓库归纳的组合关系，尚待核验原文。'),
 dict(source='ddtree',target='dominotree',type='combines',status='proposed',evidenceUrl='https://arxiv.org/abs/2607.08642',note='原仓库归纳的组合关系，尚待核验原文。')])
save('stars.json',{})
save('briefs.json',[])
print(f'Imported {len(methods)} methods.')
