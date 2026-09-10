# DFlash Atlas 网站维护

首页固定为：交互脉络图 → 重点方法卡片 → 今日简报。

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
