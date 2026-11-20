---
name: research-atlas
description: 给定一个研究方向、一个方法名，或一到数篇种子论文，检索并核验相关文献，产出一个可发布的「科研星际图」专题站（关系图谱 + 方法卡片 + 每日简报 + 证据链）。适用于把 DFlash Atlas 的建站方法复用到新方向；也可用于给已有图谱做增量更新与证据补齐。
---

# 科研星际图 · 建站 Skill

把"一个方向 + 一批论文"变成"一张有证据的地图"。

## 什么时候用

- 用户给出研究方向（"高并发下的草稿树"）、方法名（"DDTree"）或几篇种子论文，想要整体脉络
- 需要把已有 awesome 列表 / 综述 / 散落笔记升级成可交互、可追溯的站点
- 需要给已有图谱补新论文、补实验关系、清理未核验条目

不适用于：单篇论文速读、纯文献检索问答、没有后续工作的新方向。

## 输入

最少需要其一：论文标题或 arXiv ID、方法名、或一句研究方向描述。
若用户给出多篇种子，先判定它们是"同一条主线上的先后关系"还是"互为竞争方案"——这决定图的中心是一个主题还是多个簇。

## 工作流

### 阶段 0 · 定配置

先写 `atlas.config.json`，明确 `root`（种子）、`scope`（收什么）、`outOfScope`（不收什么）、`categories`（研究问题分类）。
`categories` 必须在读论文之前定，且互斥、可判定——分类含糊会导致后期返工。

如果主库已经覆盖了要做的方向（比如在 DFlash 主库里做「高并发草稿树」），不要在 `src/data/` 里再写一遍，直接写一份专题配置 `topics/<slug>.json` 派生即可，见 `docs/TOPICS.md`。
只有当方向完全超出主库范围时，才需要自带数据：`mode: "standalone"` + `sourceDir: topics/<slug>/data/`，生成器只校验与装配，不替你取舍。

新领域的每条数据都要有可核对的出处。`topics/video-cache/` 是个完整例子：13 篇论文的 arXiv 编号、日期、作者、摘要结论逐条核过，代码仓库用 HTTP 200 验过存在性，验不到的（`facebookresearch/AdaCache`、PAB 旧路径都 404）宁可不给链接。只读摘要的条目一律标 `status: imported`，界面显示「导入未核验」——**不要用一次检索冒充一次核验**。

### 阶段 1 · 铺候选（自动，成本低）

```bash
# 后续候选：一次拿全
curl "https://api.openalex.org/works?filter=cites:<openalex_id>&per-page=200&select=id,doi,display_name,publication_date,cited_by_count"
# 上游来源
curl "https://api.openalex.org/works/<openalex_id>?select=referenced_works"
# 最新补充（OpenAlex 索引有延迟，用 arXiv 补最近两周）
curl "https://export.arxiv.org/api/query?search_query=all:%22<关键词>%22&sortBy=submittedDate&sortOrder=descending&max_results=50"
```

要点：
- OpenAlex 按次计费（约 `$0.001/次`），**响应必须本地缓存**，同一 work 不重复请求；批量操作前先申请免费 key
- 论文唯一键用 DOI，缺失时退到 arXiv ID，不要用标题
- 语义相近但编号不同的版本（v1/v5、预印本/正式版）合并为一条
- 候选池只决定"要不要读"，不要在这一步写任何结论

### 阶段 2 · 逐篇判断（人工 + 取证，最贵）

每篇候选必须回答，且每条答案附证据位置（表号 / 章节 / URL）：

1. `problem` — 当时卡在哪（不是"性能不好"，要具体到机制）
2. `solution` — 一句话机制
3. `benchmarks` — 主要基线是哪个、在哪个表、什么模型与并发、结论数字
4. `relations` — 与种子/其他方法属于 `extends` / `combines` / `reuses` / `related` 哪一类

判定：
- 提出新方法且与种子有技术或实验关系 → 入图
- 复现、综述、移植到无关任务 → 只记候选，不入图
- 拿不到正文 → `citationStatus: unconfirmed`，图上标注但不作为论据

**红线：没有正文证据的关系，不得写成确定结论。** 宁可标 `proposed`。

### 阶段 3 · 入数据 + 校验

写入 `src/data/`（methods / relations / benchmarks / briefs），字段口径与现有站点一致。
然后：

```bash
npm run validate   # 拦截重复论文、断链、非法关系、自环、悬空基线
npm test           # 关系对称性、日报引用、页面链接
npm run build
```

校验不过不许提交——这是唯一能防住"图越漂亮错越多"的闸门。

要做成独立专题时，再跑派生与预览：

```bash
npm run atlas                                    # 编译 atlas.config.json
npm run topic -- --config topics/<slug>.json     # 派生子集并自校验
VITE_ATLAS_TOPIC=<slug> npm run dev              # 预览
VITE_ATLAS_TOPIC=<slug> npm run smoke            # 连点节点复测
```

派生前先确认 `minImportance` 与 `hops`：跳数过多会把无关架构工作拉进来，跳数过少会让图断成几块。

### 阶段 4 · 出图与发布

节点位置按 `category` 聚类自动生成，连线按 `relations.type` 区分实线/虚线/箭头。
发布走 GitHub Pages，静态构建，不依赖运行时 API。

## 产出物

```
atlas.config.json          主库方向配置（换方向只改这个）
topics/<slug>.json         专题配置（种子 + 范围 + 文案）
src/topics/<slug>/         派生出的专题数据（生成物，可提交留档）
src/data/methods.json      方法节点
src/data/relations.json    语义边（含证据 URL）
src/data/benchmarks.json   实验对照（一条记录同时服务两端卡片）
src/data/briefs.json       每日简报
docs/METHOD.md             方法论与本方向的判定口径
docs/TOPICS.md             专题派生规则与命令
```

## 质检清单

- [ ] 随便点一个节点，四项信息齐全，至少一条证据链接可打开
- [ ] 一条基准记录能在"基线"和"后续"两张卡片上同时正确显示
- [ ] 连续切换三个节点，图与卡片不串位
- [ ] 每条边都有证据 URL；无证据的标为 `proposed`
- [ ] 新增一个方法只需要改 JSON，不需要改代码
- [ ] 断网可浏览（纯静态）
- [ ] 换一个专题只改 `topics/<slug>.json`，组件零改动
- [ ] 专题生成器报出的「范围规则过滤掉 N 个」符合预期：N 太大说明范围写窄了，N 为 0 说明过滤没生效

## 常见错误

| 错误 | 后果 | 正确做法 |
|---|---|---|
| 把引用当技术关系 | 图上全是无关连线 | 引用只做候选，入图必须读方法章节 |
| 用引用数排序代替重要性 | 新工作被系统性低估 | importance 按"是否打开新问题"评，不按被引 |
| 分类边写边改 | 节点反复重排、返工 | 先定互斥分类再读论文 |
| 只追新不回溯 | 上游关系缺失，图无根 | 每轮同步核对 `referenced_works` |
| 批量脚本直连 API 不缓存 | 触发计费上限，中途失败 | 落盘缓存 + 断点续跑 |
| 为了专题"看起来完整"手工补节点 | 专题数据与主库对不上，无法回溯 | 专题只取子集；缺就回主库补证据再派生 |
| 两个专题的 dev 同时跑 | `src/active/` 被覆盖，页面数据悄悄变成另一个专题 | 一次只跑一个；切换时先 `npm run data` 再启动 |
