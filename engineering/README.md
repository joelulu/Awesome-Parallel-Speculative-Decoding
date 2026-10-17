# 投机解码工程雷达 · 维护规范

本仓库维护两条不同但互补的主线：

- **论文方法（Research Methods）**：新的 DFlash/DSpark/并行草稿方法、问题、技术机制与验证效果，统一维护 `src/data/methods.json`、`relations.json`、论文摘要和 `daily/`。此前收录的 60 个方法（2026-10-17 快照）保留，不在工程动态中伪造“新方法”。
- **开源工程（Engineering Radar）**：vLLM、vLLM Speculators、SGLang、SpecForge、TensorRT-LLM 的 PR、Issue、Roadmap、性能回归、模型 Day-0 适配、训练/推理对齐，维护 `src/data/engineering.json` 和 `engineering/YYYY-MM-DD.md`。

## 追踪入口

| 项目 | 链接 | 重点 |
|---|---|---|
| vLLM | https://github.com/vllm-project/vllm | Serving、scheduler、CUDA Graph、KV manager、adaptive verification、DP/TP/CP、高并发 |
| vLLM Speculators | https://github.com/vllm-project/speculators | EAGLE、DFlash、DSpark 的训练、checkpoint conversion、loss 与 target/draft 配置一致性 |
| SGLang | https://github.com/sgl-project/sglang | speculative verify、DFLASH/DSpark Serving、GQA/MLA、DCP/HiCache、CUDA kernel |
| SGLang SpecForge | https://github.com/sgl-project/SpecForge | 训练、Target hidden/KV capture、分布式训练、export、SpecBundle |
| NVIDIA TensorRT-LLM | https://github.com/NVIDIA/TensorRT-LLM | One-model Spec Decode、ragged graph、KV-cache、Blackwell/Rubin kernels |

提示：口语里提到的 “vLLM SpecTerm” 按官方仓库核对为 **vLLM Speculators**；如需要另一个项目，可再补充入口。不要把 Speculators 与 SpecForge 视为同一仓库。

## 主题标签与追踪顺序

优先级分为 P0（与你当前实验直接相关，应精读）、P1（重要工程变化，可复现）、P2（背景观察）。建议扫描以下方向：

1. **新算法落地**：DFlash/DFlash2/DSpark/Domino/EAGLE/新型树草拟，训练与 Serving 是否双端支持；
2. **Target 信息使用**：hidden vs KV、recurrent state、MLA、hybrid attention、Target/Draft cache ownership；
3. **真实性能**：C1/C8/C32/C64 的 throughput / ITL / TTFT、draft/verify 各自 GPU ms、padding、kernel launch、CUDA Graph；
4. **长上下文**：KV budget、窗口、CP/DCP、预处理和解码精度、prefix cache、HiCache/offload；
5. **多模态**：VLM Target 的视觉 hidden/capture、visual KV 与多模态 Draft 的推理和训练；
6. **模型/硬件适配**：DeepSeek V4 / V4.1、Kimi、Qwen、GB300/H100/MI355X/Ascend 上的专用 Kernel 与通信；
7. **质量与正确性**：采样/回退路径、停止条件、checkpoint conversion、mask/causality、loss、accepted length 的一致性。

## 每次更新固定流程

1. **先检索论文**：arXiv/官方 PDF/官方仓库，去重；只把确实提出方法的论文加入方法库。
2. **再看工程 PR/Issue**：分别检索 `is:pr`、`is:issue`、`sort:updated-desc`，对高价值条目阅读描述、代码 diff、关联 Issue、基准设置和合并状态；不得只凭标题写结论。
3. **冻结核验日期**：保存创建日期、检查日期、真实 URL、状态（open/draft/merged/closed-unmerged/issue）。关闭未合并不等于实现已可用。
4. **对模型标识严格**：不把 DeepSeek-V4、DeepSeek-V4.1、Kimi-K3、Qwen3.8 的指标混用；TP、CP、DCP、GPU 和并发、上下文必须明示。
5. **写明证据等级**：merged / PR-claim / issue-RFC / paper-only。PR 中的性能指标必须保留环境和相对基线；kernel microbenchmark 不视为 E2E 性能。
6. **人工判断科研价值**：用“解决的瓶颈 → 可迁移到 DFlash 的组件 → 代价/风险 → 最小实测”进行标注，避免只按 stars 或热度排序。
7. **更新网站与归档**：编辑 `src/data/engineering.json`，同步 `engineering/YYYY-MM-DD.md`，保留旧快照，不覆盖论文 `daily/`；测试 `npm test`、`npm run build`，合并后确认 Pages 部署。

推荐持续使用两条更新频率：论文新增按有价值工作随时更新；工程动态每周整理一次、重大 PR/回归单独记录。上述为维护建议，**并未创建自动定时任务或自动抓取程序**。

## 关键比较口径

端到端解码效率应该至少记录：target-only throughput、speculative throughput、accepted tokens/step、draft GPU ms、verify GPU ms、sampling/selection ms、ITL/TPOT、TTFT、输入/输出长度、batch/concurrency、精度、GPU/TP/CP/DP、commit SHA。若只报 acceptance 或 kernel time，标注“暂无 E2E 证据”。

## 最新快照

- [2026-10-17：工程 PR/Issue 调查](2026-10-17.md)
- [结构化工程数据](../src/data/engineering.json)
- [2026-10-17：论文日报（10 篇新收/补收）](../daily/2026-10-17.md)

所有更新仅代表对应日期的公开状态，后续 PR 可能合并、变基或关闭。
