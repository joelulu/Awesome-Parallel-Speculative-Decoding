# DFlash Atlas 网站维护

首页固定为：交互脉络图 → 重点方法卡片 → 今日简报 → 工程动态。

「研究地图」默认打开深色的「星球关系图」，以 DFlash 为中心，按研究方向聚类。默认的「技术演进」层把局部图分为左侧上游、中间当前方法、右侧下游，相关方法置于中下方。实线为扩展、虚线为组合、点线为相关。「论文引用」层的箭头从引用者指向被引用者，局部图左侧列被当前方法引用的论文，右侧列引用当前方法的论文。两层分别维护和核验，可在「连线证据」中查看原文位置与来源。局部图可拖动、缩放，也可通过「同方向方法」横向浏览。节点间距用于排版。可切换至「平行时间线」，按研究方向和发表时间浏览。两种视图共用搜索定位和方法卡片。

脉络图采用从左到右的月份分段时间布局：DFlash 位于最左侧，六条问题主线中所有方法默认展开；同月内按已知发布日期排序，月份宽度按该月最密集的主线自动扩展。不同月份按先后排列，同月节点并非精确按日等距。图中采用细线、圆点和较小的方法名称；点击方法名或圆点会高亮节点，并直接跳到对应卡片。月份导航、横向滑条、全景和全屏控制用于浏览长时间线。连线默认表示同方向的时间先后，不能视为继承证据；已核验改进关系可另外叠加。网站为静态 React 应用，部署到 GitHub Pages，不需要数据库或后端服务。

## 本地运行

需要 Node.js 22.12+（或 Node 24）和 npm。

```sh
npm ci
npm run dev
```

打开终端输出的完整地址，包含 `/Awesome-Parallel-Speculative-Decoding/` 子路径。

```sh
npm run sync:briefs
npm run update:stars
npm test
npm run build
```

`npm run dev` 与 `npm run build` 都会先装配数据集（`scripts/select-topic.mjs` → `src/active/`），所以改了 `atlas.config.json` 或主数据后不必手动跑额外命令。

### 换一个专题

```sh
npm run topic -- --config topics/draft-tree.json    # 派生子集
VITE_ATLAS_TOPIC=draft-tree npm run dev             # 预览
VITE_ATLAS_TOPIC=draft-tree npm run build           # 发布
```

`src/active/` 是单目录，**同一时间只跑一个专题**：两个不同专题的 dev/build 并行会互相覆盖。派生规则与配置字段见 [docs/TOPICS.md](docs/TOPICS.md)。

换领域时用 `mode: "standalone"`，数据放在 `topics/<slug>/data/`，命令不变：

```sh
npm run topic -- --config topics/video-cache.json
VITE_ATLAS_TOPIC=video-cache npm run dev
```

## 重要性与证据等级

站点上有两个不能混用的轴：**重要性**回答「值不值得读」，**证据等级**回答「我们有多确定」。

```sh
npm run rescore                                  # 按结构信号重算 importance，写回 methods.json
npm run rescore -- --dry                         # 只看结果不改文件
npm run rescore -- --dir topics/video-cache/data --audit   # 检查分布上限与依据是否齐全
```

`rescore` 的口径在 `scripts/rescore-importance.mjs` 的 `WEIGHTS` 与 `TIER_SHARE`：被用作基线的次数权重最高，其次是被后续继承、可核验实验数；配额锁死在 10% / 23% / 38%，每个分数都带一句 `importanceBasis`。**不要手改 importance**，否则下一个人无法判断某个分数是算出来的还是拍出来的。报告写在 `docs/importance-report.md`。

证据等级折叠成三档展示：`已核验`（verified + confirmed）、`待复核`（verified + unconfirmed）、`导入未核验`（imported）。星球图上待复核节点画成空心，方法卡片与研究详情卡显示角标，方法库提供「仅看已核验」筛选。判据只写在 `src/EvidenceBadge.tsx` 一处，避免各页面各说各话。

## 截图与界面冒烟

README 的门户图由脚本生成，改动界面后需要重跑，避免截图与站点不一致。两者都要求本机有 Chrome 或 Edge，并先在另一个终端跑 `npm run dev`。

```sh
npm run shots   # 生成 assets/atlas-globe.png 与 assets/atlas-node-relations.png
npm run smoke   # 连续切换节点、核对详情卡、验证基线双向跳转与双视图入口
```

`npm run smoke` 会按 JetSpec → JetSpec++ → DSpark → JetSpec 的顺序连点，逐次断言标题、卡片数量与选中态，最后验证卡片内的方法互跳。局部视图会隐藏非邻域节点，脚本会先点「返回全图」再定位，这条路径本身也在验收范围内。

浏览器路径可用 `CHROME_PATH` 覆盖，站点地址用 `ATLAS_URL`，输出目录用 `ATLAS_OUT`，截图聚焦的节点用 `ATLAS_FOCUS`，冒烟测试的节点链用 `ATLAS_CHAIN`。测专题时四个都要改：

```sh
ATLAS_URL=http://127.0.0.1:5174/Awesome-Parallel-Speculative-Decoding/ \
ATLAS_OUT=.tmp ATLAS_FOCUS=TAPS \
ATLAS_CHAIN=TreeSpark,D3Tree,DForkTree,TreeSpark \
npm run smoke
```


## 发布到 GitHub Pages

1. 将代码提交、推送到本仓库的 `main`。
2. 在 GitHub 仓库 Settings → Pages → Build and deployment，将 Source 设置为 **GitHub Actions**。
3. 等待 `Build and deploy research atlas` 工作流成功。可通过 Actions → Run workflow 手动触发。
4. 访问 https://joelulu.github.io/Awesome-Parallel-Speculative-Decoding/ 。

PR 只构建和测试，不部署。推送 main 后部署；每日 UTC 01:17（北京时间 09:17）刷新 Star、同步仓库已有简报并重新构建。GitHub 定时执行可能延迟，长期无活动的公共仓库可能停用定时任务；不把它作为准点保证。

该工作流**不检索新论文**。已有论文跟踪任务需要把新方法写入以下数据文件并提交，把每日简报写入 `daily/YYYY-MM-DD.md`。本次未改动仓库外的定时任务。

如果更换仓库名，请同时修改 `vite.config.ts` 的 `base`、`src/App.tsx` 和 `scripts/sync-briefs.mjs` 的仓库链接，以及数据中的归档来源链接。方法使用 `#method-ID` 锚点，无需 SPA 路由重写，直接刷新不会触发 Pages 404。

## 新增一个方法

统一数据源位于 `src/data/`；修改一次，图、卡片、搜索与推荐同步更新，无需手工修改 SVG。

- `methods.json`：方法记录。ID 不随标题更新而改变，保持旧链接有效。
- `categories.json`：六个问题方向的名称和颜色。
- `relations.json`：具体方法之间的直接改进或组合关系及证据。
- `citations.json`：已核验的站内论文引用。记录引用者 `source`、被引用者 `target`、引用用途 `role`、原文位置 `location`、证据链接 `evidenceUrl` 和说明 `note`。仅收录已从论文正文或参考文献核验的引用。
- `benchmarks.json`：按论文实验场景记录主要基线、其他对比、原文位置、结果口径和证据链接。同一论文可记录多个实验场景。站内基线填 `methodId`，研究详情会自动生成反向的「后续被用作基线」；技术后续仍由已核验的扩展和组合关系生成。

新增方法时必须填 `benchmarkReview`。没有原文评测证据时用 `pending`，录入至少一个可核验的评测场景时用 `verified`。每个场景须给原文表格或章节、主要基线、其他对比、方法/配置和评测口径。主要基线是本站选出的该场景最直接对照。同系列的 checkpoint 或配置应保留在备注。外部对照使用显示名称；站内对照使用稳定的方法 ID，反向关系自动生成并按论文去重。`relations.json` 负责技术上游、下游与相关工作，`citations.json` 负责论文引用。研究图和方法卡片共用这些关系字段。
- `briefs.json`：从每日 Markdown 同步出的简短条目。
- `stars.json`：真实 GitHub Star 数量与获取时间；不能手工填入估计数字。
- `paper-metadata.json`：已取得的一手资料标题、作者、来源与论文首页缩略图路径。
- `abstracts.json`：依据原始摘要整理的中文译述。每条保存来源、整理日期与类型；技术文章使用 `source-summary`，不能标作论文摘要。
- `public/papers/`：真实论文 PDF 第一页生成的 JPG 缩略图。

在 `methods.json` 增加对象，字段格式参照现有方法：

```json
{
  "id": "new-method",
  "name": "方法简称",
  "title": "论文完整标题",
  "date": "2026-09-10",
  "dateLabel": "2026-09-10",
  "category": "causality",
  "tags": ["辅助分类"],
  "summary": "一两句话解释方法。",
  "problem": "已有方法的具体不足。",
  "solution": "改变了什么，以及为什么有效。",
  "paperUrl": null,
  "sourceUrl": "https://example.org/replace-with-actual-source",
  "code": [],
  "status": "imported",
  "citationStatus": "unconfirmed",
  "importance": 3,
  "pinned": false,
  "reason": "编辑关注 · 因果补偿",
  "updatedAt": "2026-09-10"
}
```

请填入真实来源；示例不是实际论文。日期只知道月份时，`date` 使用 `YYYY-MM`，`dateLabel` 保留“左右”等不确定性，不编造具体日。

`category` 为 `architecture`、`training`、`causality`、`tree`、`systems`、`extensions` 之一。`status=verified` 仅表示简介已核对一手资料，不自动证明引用关系；`citationStatus` 独立记录 `root`、`confirmed` 或 `unconfirmed`。

代码记录为 `{"url":"https://github.com/owner/repo","repo":"owner/repo","kind":"official"}`。`kind` 支持 `official` / `third-party` / `integration`。框架 Star 明确标为整个仓库数量，并从热度评分中排除。

先用 arXiv ID/DOI 与标题去重，核验引用 DFlash 的证据后才标 `confirmed`。跨方法关系记录 `source`、`target`、`type`（`extends` / `combines`）、`status`（`verified` / `proposed`）、`evidenceUrl` 和 `note`。图中只有已核验关系可显示；待核验组合关系保留在卡片来源区。分类连线不代表引用或继承。

推荐算法在 `src/lib/catalog.mjs`：固定精选优先，其次考虑编辑重要性、来源核验、发布日期和较低权重的独立仓库 Star；优先覆盖不同方向。默认六张卡片，不以 Star 作为研究质量排名。

## 每日简报与已有定时任务对接

沿用 `daily/YYYY-MM-DD.md`：

```md
# Daily Brief — YYYY-MM-DD

> 今日重点：一句话主题。

| 时间 | 动态 | 1句摘要 | 来源 |
|---|---|---|---|
| YYYY-MM-DD | **方法名：重要变化** | 一句话说明变化及意义。 | [原始来源](https://真实来源) |
```

执行 `npm run sync:briefs`，首页最多显示 5 条。无今日简报时明确标记最近一期日期；时间按 Asia/Shanghai 判断。旧简报缺来源时保留“来源链接待补充”，不猜测 issue 地址。方法名称出现在标题或摘要时自动链接到方法卡片。

给已有定时任务增加以下输出约定即可对接：发现 → 去重 → 检查一手资料 → 更新 methods/relations → 写 daily → sync:briefs → validate/test/build → 提交。检索失败或未发现新工作时保留现有数据，不生成虚假的“今日新增”。未核验的新工作标 imported/unconfirmed。应另外记录检索源与成功检查时间，不能声称索引已覆盖全部引用。

`scripts/import-existing.py` 仅供复现本次原始 README 导入，**不要在日常更新时重新运行**，否则会覆盖后续数据修订。

## 验证范围

2026-09-09 已逐项核对 31 个方法的官方代码入口，详见 [代码链接核验记录](CODE_LINK_AUDIT.md)。卡片展示具体仓库名，区分可访问实现、未合并 PR、仅 README 的占位仓库和暂不可访问的论文链接；“仅有代码”筛选排除占位和不可访问入口。`code` 项中的 `evidenceUrl`、`checkedAt`、`availability` 保存核验依据和状态，状态在后续资料核验时更新；Star 刷新独立运行，不代表代码发布状态重新核验。

构建会验证必填字段、稳定 ID、重复论文、分类、来源 URL、关系与简报引用、Star 快照。测试覆盖推荐方向分散、筛选、深链接数据完整性、上海日期边界、过期简报、Star 获取失败保留缓存与简报来源迁移。

目前未逐篇完成原仓库所有论文、引用关系和代码地址的核验。数据中保存了核验状态，网页会显示相应说明。未运行浏览器交互自动化测试；发布前可以人工检查时间脉络、月份导航、分支聚焦、卡片跳转、返回定位、搜索、全屏、移动端大纲和锚点刷新。


## 论文列表样式与中文摘要

卡片采用横向论文列表：左侧为真实论文首页缩略图，中间为完整标题、作者、中文摘要和分类标签，右侧为代码仓库及实际 Star 总数。摘要默认收起为三行，可展开阅读全文；原有问题、解决方式和研究关系保留在“研究笔记与来源”中。

当前有 30 篇论文的中文摘要译述和首页缩略图，以及 DFlash 2 官方技术文章的中文概要。新增 ASD（验证与动态预算）和 ReTrace（能力与架构）；ReTrace 原文明确基于 DFlash，ASD 作为相关验证策略收录，未标记为已确认直接引用 DFlash。DFlash 2 不伪造论文首页；其卡片明确标记技术文章。所有译述保留原文链接，性能数字均来自相应原始摘要，不代表统一实验条件下的横向排名。

研究地图只显示月份，内部仍使用完整发布日期排序。方法名与圆点可点击并高亮对应卡片；图节点明确接收鼠标事件，卡片列表在展开并清除筛选后再滚动定位。鼠标悬停或键盘聚焦显示阅读提示，支持月份定位、拖动、缩放和全屏。

可选的资料刷新脚本（不随 CI 自动联网下载论文）使用 `requests`、`beautifulsoup4`、`pymupdf`：

```sh
python scripts/fetch-paper-assets.py dblast
# 不带方法 ID 时尝试刷新全部论文资料；只处理指定 ID 更适合日常更新。
```

脚本将英文原始摘要和下载的 PDF 放入被忽略的 `.cache/papers/`，将可发布的元数据和首页缩略图写入数据目录及 public。中文译述需要根据真实摘要单独整理；脚本不会把旧简介自动伪装成翻译。构建校验译述来源是否与资料来源一致，测试检查缩略图实际存在且为 JPEG。


## 工程动态与新论文双轨维护（2026-10-17 起）

工程 PR/Issue 不能当作新增论文方法放进脉络图；优先在 `engineering/YYYY-MM-DD.md` 记录带日期的核验报告，并同步 `src/data/engineering.json`。网页首页的“工程动态”区读取此 JSON，支持按 vLLM / vLLM Speculators / SGLang / SpecForge / TensorRT-LLM 筛选。条目必须提供真实 URL、创建日期、查询快照日、状态、瓶颈、明确的 PR 自报与未验证风险。更新规范见 [engineering/README.md](engineering/README.md)。

**目前网站不会自动读取 GitHub 最新 PR 或自动刷新工程动态**；需要维护者（或被明确授权的定时任务）核验后提交数据。不要将“仍为 open PR”展示成已在主分支可用。
