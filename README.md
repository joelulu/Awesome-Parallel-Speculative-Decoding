# Awesome Parallel Speculative Decoding

持续跟踪 **Parallel Speculative Decoding / DFlash / Block Diffusion Drafting**，并补充 **Diffusion Model Cache / Training-Free Acceleration** 方向。

核心参考：

> **DFlash: Block Diffusion for Flash Speculative Decoding** — arXiv:2602.06036

首页固定按以下顺序维护：

1. **DFlash 后续论文时间线**：持续补充引用或直接延伸 DFlash 的工作。
2. **Daily Briefs**：每天筛选 5 条最值得关注的新论文 / GitHub / 框架 / 技术动态，最新日期在最前。

---

# DFlash 后续论文时间线

| 时间 | Paper | 简单摘要 | 核心动机 | 怎么解决 |
|---|---|---|---|---|
| **2026-04-14** | **DDTree — Accelerating Speculative Decoding with Block Diffusion Draft Trees** | ⭐ 把 DFlash 从“一条路径”变成“候选树” | DFlash 每个位置其实有完整概率分布，但最终只选一条序列，大量候选概率被浪费 | 从 DFlash 各位置 top-k 分布构建 **draft tree**，best-first 搜索，在固定 node budget 下选择高概率路径，再一次性验证整棵树。可以理解成 **DFlash + EAGLE式 tree verification**。([arXiv](https://arxiv.org/abs/2604.12989)) |
| **2026-05-12** | **D-PACE — Dynamic Position-Aware Cross-Entropy for Parallel Speculative Drafting** | 改 DFlash 的训练 loss | DFlash 固定地认为越靠后的 token 越不重要，但真正导致首次拒绝的位置在训练过程中会变化 | 根据 expected accepted length 的可微 surrogate，动态调整各位置 loss 权重。**完全不改推理结构**。([arXiv](https://arxiv.org/abs/2605.18810)) |
| **2026-05** | **Test-Time Speculation** | 解决长回答下 acceptance 衰减 | DFlash 等 drafter 离线训练的数据长度有限，生成越来越长后出现 distribution shift | 推理过程中继续做 **test-time / online distillation**，让 drafter 跟随当前目标模型生成分布适配。([alphaXiv](https://www.alphaxiv.org/abs/2605.09329)) |
| **2026-05-28** | **Draft-OPD — On-Policy Distillation for Speculative Draft Models** | ⭐ 用 on-policy 数据训练 drafter | 固定 teacher trajectory 的 SFT 与实际 speculative decoding 时 drafter 遇到的状态不一致 | 让 drafter 在真实 rollout 中暴露错误，从 verifier 的 accepted/rejected token 构造训练信号，进行 **on-policy distillation**。这是 OPD+DFlash 路线。([arXiv](https://arxiv.org/abs/2605.29343)) |
| **2026-05-28** | **Domino — Decoupling Causal Modeling from Autoregressive Drafting** | ⭐ 给并行 DFlash 补回因果依赖 | DFlash 一次预测所有位置虽然快，但 block 内 token 基本独立；后面的 token 不知道前面的预测结果 | 保留 parallel drafter，再增加轻量 **causal / prefix-dependent head**，不用完整 AR drafting，也能捕获 token 间依赖。([arXiv](https://arxiv.org/abs/2605.29707)) |
| **2026-06-01** | **CaDDTree — Cost-Aware Diffusion Draft Trees** | DDTree 的系统版升级 | DDTree 只考虑接受率：tree 越大越容易命中，但 verifier 的计算也越来越贵 | 把 **接受收益 + verification latency** 联合优化，动态选择 tree size，而不是固定 node budget。([arXiv](https://arxiv.org/abs/2606.01813)) |
| **2026-06-01** | **DFlare — Scaling Up Draft Capacity for Block Diffusion Speculative Decoding** | ⭐ 直接增强 DFlash drafter 能力 | DFlash 多层 drafter 共用少量 target hidden features，继续加深 draft model 收益有限 | 每层 drafter 使用自己学习的 **layer-wise target feature fusion**，并扩大训练数据。直接解决 DFlash 的 scaling ceiling。([arXiv](https://arxiv.org/abs/2606.02091)) |
| **2026-06-03** | **D²SD — Dual Diffusion Draft Models** | 两级 diffusion drafter | 一条 DFlash trajectory 一旦早期错了，后面的预测基本白算 | 第一 drafter 产生主路径并预测潜在失败位置，第二个 diffusion drafter 针对该位置生成 alternative continuation，再组成共享前缀树验证。([alphaXiv](https://www.alphaxiv.org/abs/2606.04446)) |
| **2026-06** | **TreeFlash — Parallel AR-Approximation for Faster Speculative Decoding** | 用并行结构逼近 AR dependency | DFlash 的核心弱点仍然是独立位置预测 | 在不重新引入 token-by-token AR decoding 的前提下，用轻量结构近似 autoregressive conditioning。([alphaXiv](https://www.alphaxiv.org/abs/2606.03819v1)) |
| **2026-06-05** | **WhiFlash — Token-Level Cross-Paradigm Routing** | AR drafter 与 diffusion drafter 动态切换 | 某些 token AR drafter 更准，另一些位置 diffusion block 更划算，固定用一种方法不是最优 | 加 controller，按 token/状态动态选择 **AR drafting 或 diffusion drafting**，同时降低两种模式切换的 KV 开销。([arXiv](https://arxiv.org/abs/2606.07710)) |
| **2026-06-11 左右** | **Teaching Diffusion to Speculate Left-to-Right** | 让训练目标和 verifier 行为一致 | diffusion 训练关注整个 block，但 speculative verifier 实际只关心“从左到右、第一次错之前”的 prefix | 对前部 token、first-error 附近 token 和连续正确链进行特殊 weighting/reward。属于 **acceptance-aware training**。([alphaXiv](https://www.alphaxiv.org/abs/2606.11552)) |
| **2026-06-25** | **JetSpec — Breaking the Scaling Ceiling of Speculative Decoding with Parallel Tree Drafting** | ⭐⭐⭐ 很重要：并行地产生“有因果关系的树” | DFlash 快但缺 causality；传统 tree 方法有 causality 但生成路径开销高 | 用 target hidden state + **causal parallel draft head** 一次性为大量 tree branches 打分，让 tree drafting 同时具备并行性和 AR-like factorization。报告的数学任务加速最高接近 9.6×。([JetSpec Project](https://jetspec-project.github.io/jetspec-web/)) |
| **2026-06-29** | **HyperDFlash** | DFlash 适配 Hyper-Connection 模型 | DeepSeek-V4 等模型内部 residual/hidden representation 和普通 Transformer 不同，直接抽 hidden feature 不理想 | 提出 HC-aware gated residual reduction，将多路 target hidden state 转成适合 DFlash drafter 的条件特征。([alphaXiv](https://www.alphaxiv.org/abs/2606.26744)) |
| **2026-07-02** | **Spec-AUF — Accept-Until-Fail Training** | ⭐ 极简单但很合理的 loss 修改 | verifier 第一次错误以后，后面的 draft token 全部丢掉；但 DFlash CE 仍然给这些 token 同等监督 | 找到 drafter 第一次预测错误位置，**loss 只计算到 first fail**。几乎不改变模型和推理流程。([arXiv](https://arxiv.org/abs/2607.01893)) |
| **2026-07-06** | **DSpark — Confidence-Scheduled Speculative Decoding with Semi-Autoregressive Generation** | ⭐⭐⭐ DFlash 最重要的直接改进之一 | 两个问题：①block 内没有依赖；②越往后的 token acceptance 越差，但仍固定验证整个 block | 增加 **low-rank Markov Head** 给当前位置引入前一个 token 信息；再加 **confidence head** 决定实际验证多长。即“DFlash + Markov correction + adaptive verification”。([GitHub](https://github.com/vllm-project/speculators/blob/main/docs/user_guide/algorithms/dspark.md)) |
| **2026-07-08** | **DeLS-Spec — Decoupled Long-Short Contexts** | 不重训 DFlash 的因果增强方案 | Domino/DSpark 等通常需要整体重新训练，成本高 | 冻结原始 DFlash 作为 long-context expert，只额外训练一个轻量 local short-context head，然后在 logits 层融合。([arXiv](https://arxiv.org/abs/2607.07409)) |
| **2026-07-09** | **DominoTree** | Domino + DDTree | DDTree 建树时仍近似认为位置独立，而 Domino 已经可以提供 conditional probability | 用 Domino 的 path-conditioned score 来做 best-first tree construction，实现真正 conditional 的 diffusion draft tree。([arXiv](https://arxiv.org/abs/2607.08642)) |
| **2026-07-16** | **D-CUT — Adaptive Verification Depth Pruning for Batched Speculative Decoding** | ⭐⭐⭐ 非常值得重点看 | **高并发时 verifier 从 memory-bound 逐渐变成 compute-bound**，DFlash 固定验证长 block 的代价急剧增加，大量 rejected suffix 形成浪费 | 给整个 batch 一个 **global verification budget**，结合 confidence 与 runtime cost model，对不同请求动态裁剪 verification depth。直接解决“DFlash 高并发失效”。([arXiv](https://arxiv.org/abs/2607.14647)) |
| **2026-07-21** | **AdaFlash — Adaptive Speculative Decoding via On-Policy Distilled Diffusion Drafters** | ⭐⭐⭐ OPD + adaptive DFlash | DFlash 的最佳 draft length 会随 domain、请求和 token 状态变化；固定 block length 造成大量多余验证 | 一方面用 **reverse-KL on-policy distillation** 提升 drafter；另一方面训练 **adaptive length head** 预测每轮应该 draft/verify 多长。高并发下尤其有效。([arXiv](https://arxiv.org/abs/2607.19223)) |
| **2026-07/08** | **Speculative Correction — Draft-then-Refine Decoding for Diffusion LMs** | 相邻路线，不是纯 DFlash 改造 | diffusion LM 本身可以看到左右两侧上下文，却常被当成 block decoder 使用 | 先产生整段 response draft，再通过 bidirectional diffusion refinement 修正。更偏 **DLM inference**，与 DFlash 主线相关度中等。([arXiv](https://arxiv.org/abs/2608.02625)) |
| **2026-08-03** | **xPress — Parallel Refinement for Diffusion Drafters** | ⭐⭐⭐ 直接打 DFlash 的“独立预测”问题 | DFlash 每个位置的 top-1 单独看都合理，但组合起来不一定是一条 coherent sequence，导致前部 rejection | DFlash 先产生整块候选，再用一个非常轻量的 **parallel causal refiner** 一次性修正整个 block，而不是重新逐 token AR decoding。([alphaXiv](https://www.alphaxiv.org/abs/2608.02438)) |
| **2026-08-05** | **DBLAST — Dependent Block Drafting for Stochastic Speculative Decoding** | 让 block token 显式相关 | temperature sampling 下 DFlash 独立 marginals 尤其容易组合出低联合概率序列 | 引入 block-level **categorical latent variable**，通过共享 latent 让不同位置的候选产生相关性。可以直接从 DFlash checkpoint 初始化。([ResearchGate](https://www.researchgate.net/publication/411824644_DBLAST_Dependent_Block_Drafting_for_Stochastic_Speculative_Decoding)) |
| **2026-08-13** | **DARTree — Speculative Diffusion Decoding with Autoregressive Draft Trees** | ⭐⭐⭐ 当前非常重要 | DFlash/普通 diffusion tree 缺乏路径条件；单链 Markov correction 又只能增强一条 path | 把 pretrained AR correction head 从 chain 推广到 **整个 candidate tree**，批量扩展多个 path，再 best-first pruning。报告 accepted length 最高 12.97、加速最高 9.73×。([arXiv](https://arxiv.org/abs/2608.13524)) |
| **2026-08-18** | **DFlash 2 — Keep Drafting Parallel** | ⭐⭐⭐ 工程上很值得跟 | DFlash 常见的问题不是“正确 token 不在 top-k”，而是**从 top-k 里选错了组合路径** | 保持完全 parallel drafting，增加 **candidate/path selection + lightweight local convolution** 来建模邻近 token 关系。目前属于技术发布/工程路线，不应和正式论文完全等同。([Hugging Face](https://huggingface.co/wyattearp/Qwen3.8-27B-DFlash2)) |
| **2026-08-20** | **LiLiCorr — Lightweight Likelihood Correlation of Parallel Drafts** | ⭐⭐⭐ 和 DFlash2/xPress 是同一核心问题的另一种解法 | DFlash 的 marginal logits 没有显式表达“token A 后面接 token B 是否合理” | 每个位置保留 top-k，用很轻量的 **candidate embedding + adjacent compatibility/cosine score** 计算候选之间的相关性，再选 joint path。([arXiv](https://arxiv.org/abs/2608.20530)) |
| **2026-08-31** | **Verification-Aware Training (VAT)** | ⭐ 从 verifier 反过来训练 drafter | CE accuracy 并不等于 speculative acceptance；尤其第一次 rejection 对最终长度影响远高于后面的错误 | 加 verification head 学习 survive/reject pattern，并对 first-rejection 周围动态重新加权 loss。可直接作用于 DFlash 和 EAGLE-3。([arXiv](https://arxiv.org/abs/2608.30135)) |
| **2026-08-31** | **Ceiling-Clipped Acceptance Histograms / DBloom** | 研究“block size 是否已经太短” | 当 DFlash 已经频繁把整个 block 全接受时，固定 block=16 本身变成新的 ceiling；只看平均 acceptance 看不出来 | 看 full-acceptance histogram 判断 ceiling，再通过 curriculum 将 block horizon 从 16 扩到更长，如 24。([arXiv](https://arxiv.org/abs/2608.30427)) |
| **2026-09-01 左右** | **GLANCE — Vision Is Not Overhead** | ⭐⭐⭐ DFlash 思想开始进入 VLM | 传统多模态 speculative drafter 往往不看图或压缩视觉信息，导致视觉密集任务 acceptance 低 | 直接读取 target 已经算好的 **fused vision-language hidden states**，使用 block-diffusion head 一次性 draft，再构造 wide candidate tree 验证；不额外重复跑 vision encoder。([arXiv](https://arxiv.org/abs/2609.00355)) |

---

# Daily Briefs

## 2026-09-09

> 今日重点：DFlash / DFlash2 工程与系统侧的实际瓶颈。若当天没有足够可信的新论文，不为了凑数重复旧论文。

| 时间 | 动态 | 1句摘要 | 核心动机 | 怎么解决 / 启示 | 与 DFlash 关系 |
|---|---|---|---|---|---|
| 2026-09-04 | **SGLang：DFlash2 thinking 模式 lossless 一致性问题** | Qwen3.8-27B 开启 thinking 后，DFlash2 greedy 输出可能与 target-only 在固定位置分叉。 | 投机解码必须保持 lossless；greedy 路径变化比接受长度下降更严重。 | 重点检查 candidate selector、verification mask 与 thinking 特殊 token 路径。 | ⭐⭐⭐ 直接关系 DFlash2 correctness |
| 2026-09-02 | **SGLang：DFlash verification mask 显存增长问题** | verification `custom_mask` 在 batch size 增长过程中可能持续扩容并长期保留。 | 高并发 speculative decoding 不仅受 verifier FLOPs 影响，verification-side memory management 也会成为瓶颈。 | 避免持久累积 mask；按实际 batch shape 重建/裁剪 buffer，或设计 capacity-based reusable workspace。 | ⭐⭐⭐ 与高并发 DFlash 高度相关 |
| 2026-09-01 | **vLLM：DFlash2 在超长上下文下可能从加速变成减速** | 在超长 context 下，drafter 的额外历史状态处理可能吞掉 speculative decoding 收益。 | 最优 speculative budget 不只依赖 batch / acceptance，也依赖 context length。 | 做 **sequence-length-aware speculation controller**：根据 context length、batch 和 verifier cost 动态缩短 draft，必要时关闭 speculation。 | ⭐⭐⭐ 很值得继续研究 |
| 2026-09-02 | **llama.cpp：特定编译/调度路径导致 speculative decoding 异常变慢** | 某些 runtime / compiler 路径可能让 MTP/DFlash 出现固定同步开销。 | 真实加速比越来越依赖 runtime synchronization / scheduler，而不仅是算法接受率。 | benchmark 时应把 backend、compiler、同步路径纳入变量，避免把系统开销误判成算法问题。 | ⭐⭐ 偏系统实现 |
| 近期 | **DFlash 生态继续扩大后端与模型覆盖** | DFlash / DFlash2 正从单篇论文逐步走向通用 speculative decoding 基础设施。 | 单模型、单并发的 acceptance length 已不足以描述真实价值。 | 后续实验建议至少覆盖 **backend × batch × context length × model architecture**。 | ⭐⭐ 工程生态值得持续跟踪 |

### 今日研究提示

1. **Context-aware DFlash**：把 D-CUT / AdaFlash 的 batch-aware、verification-aware 控制进一步扩展为  
   `batch size + context length + confidence -> dynamic draft / verify length`。

2. **DFlash2 correctness**：如果 thinking greedy 场景确实改变 target-only token 序列，需要优先排查 lossless guarantee，而不是只看 accepted length / speedup。

---

## Daily archive

后续每天的简报会继续追加在这里，并同步单独归档到 `daily/YYYY-MM-DD.md`。
