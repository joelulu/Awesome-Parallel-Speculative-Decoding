# Awesome Parallel Speculative Decoding

<p align="center">
  <img src="assets/dflash-method-roadmap.svg" alt="DFlash 后续方法脉络树" width="100%" />
</p>

持续跟踪 **Parallel Speculative Decoding / DFlash / Block Diffusion Drafting**，并补充 **Diffusion Model Cache / Training-Free Acceleration** 方向。

核心参考：

> **DFlash: Block Diffusion for Flash Speculative Decoding** — arXiv:2602.06036

首页固定按以下顺序维护：

1. **DFlash 后续方法脉络树**：放在最开头，持续按研究主线更新。
2. **DFlash 后续论文时间线**：持续补充引用或直接延伸 DFlash 的工作。
3. **Daily Briefs**：每天筛选 5 条最值得关注的新论文 / GitHub / 框架 / 技术动态，最新日期在最前。

---

# DFlash 后续论文时间线

| 时间 | Paper | 简单摘要 | 核心动机 | 怎么解决 |
|---|---|---|---|---|
| **2026-04-14** | **DDTree — Accelerating Speculative Decoding with Block Diffusion Draft Trees** | ⭐ 把 DFlash 从“一条路径”变成“候选树” | DFlash 每个位置都有完整概率分布，但最终只选一条序列，大量候选概率被浪费 | 从各位置 top-k 分布构建 **draft tree**，best-first 搜索，在固定 node budget 下选择高概率路径，再一次性验证整棵树。([arXiv](https://arxiv.org/abs/2604.12989)) |
| **2026-05-12** | **D-PACE — Dynamic Position-Aware Cross-Entropy for Parallel Speculative Drafting** | 改 DFlash 的训练 loss | 固定位置权重与真实 first-rejection 位置不一致 | 用 expected accepted length 的可微 surrogate 动态调整各位置 loss 权重，不改推理结构。([arXiv](https://arxiv.org/abs/2605.18810)) |
| **2026-05** | **Test-Time Speculation** | 解决长回答下 acceptance 衰减 | 离线训练长度有限，生成变长后出现 distribution shift | 推理过程中做 **test-time / online distillation**，持续适配当前 target 分布。([alphaXiv](https://www.alphaxiv.org/abs/2605.09329)) |
| **2026-05-28** | **Draft-OPD — On-Policy Distillation for Speculative Draft Models** | ⭐ 用 on-policy 数据训练 drafter | 固定 teacher trajectory 的 SFT 与真实 speculative rollout 状态不一致 | 从真实 rollout 的 accepted/rejected token 构造训练信号，进行 **on-policy distillation**。([arXiv](https://arxiv.org/abs/2605.29343)) |
| **2026-05-28** | **Domino — Decoupling Causal Modeling from Autoregressive Drafting** | ⭐ 给并行 DFlash 补回因果依赖 | block 内 token 基本独立，后面的 token 不知道前面的预测结果 | 在 parallel drafter 上增加轻量 **causal / prefix-dependent head**。([arXiv](https://arxiv.org/abs/2605.29707)) |
| **2026-06-01** | **CaDDTree — Cost-Aware Diffusion Draft Trees** | DDTree 的系统版升级 | tree 越大越容易命中，但 verifier 成本也越高 | 联合优化 **接受收益 + verification latency**，动态选择 tree size。([arXiv](https://arxiv.org/abs/2606.01813)) |
| **2026-06-01** | **DFlare — Scaling Up Draft Capacity for Block Diffusion Speculative Decoding** | ⭐ 直接增强 DFlash drafter 能力 | 多层 drafter 共用少量 target hidden features，继续加深收益有限 | 使用 **layer-wise target feature fusion** 并扩大训练数据，突破 scaling ceiling。([arXiv](https://arxiv.org/abs/2606.02091)) |
| **2026-06-03** | **D²SD — Dual Diffusion Draft Models** | 两级 diffusion drafter | 单条 trajectory 早期出错后，后面的预测大多白算 | 第一 drafter 产主路径，第二 drafter 针对潜在失败位置生成 alternative continuation，再组成共享前缀树验证。([alphaXiv](https://www.alphaxiv.org/abs/2606.04446)) |
| **2026-06** | **TreeFlash — Parallel AR-Approximation for Faster Speculative Decoding** | 用并行结构逼近 AR dependency | DFlash 的核心弱点仍是独立位置预测 | 不重新引入 token-by-token AR decoding，用轻量结构近似 autoregressive conditioning。([alphaXiv](https://www.alphaxiv.org/abs/2606.03819v1)) |
| **2026-06-05** | **WhiFlash — Token-Level Cross-Paradigm Routing** | AR drafter 与 diffusion drafter 动态切换 | 不同 token 更适合不同 drafting 范式 | controller 按状态动态选择 AR 或 diffusion drafting，并降低模式切换 KV 开销。([arXiv](https://arxiv.org/abs/2606.07710)) |
| **2026-06-11 左右** | **Teaching Diffusion to Speculate Left-to-Right** | 让训练目标和 verifier 行为一致 | diffusion 训练关注整个 block，但 verifier 只关心 first-error 前的 prefix | 对前部 token、first-error 附近和连续正确链做特殊 weighting/reward。([alphaXiv](https://www.alphaxiv.org/abs/2606.11552)) |
| **2026-06-25** | **JetSpec — Breaking the Scaling Ceiling of Speculative Decoding with Parallel Tree Drafting** | ⭐⭐⭐ 并行地产生“有因果关系的树” | DFlash 快但缺 causality；传统 tree 有 causality 但路径生成开销高 | 用 target hidden state + **causal parallel draft head** 一次性给大量 tree branches 打分。([Project](https://jetspec-project.github.io/jetspec-web/)) |
| **2026-06-29** | **HyperDFlash** | DFlash 适配 Hyper-Connection 模型 | Hyper-Connection 模型的 hidden representation 与普通 Transformer 不同 | 用 HC-aware gated residual reduction 转换多路 target hidden state。([alphaXiv](https://www.alphaxiv.org/abs/2606.26744)) |
| **2026-07-02** | **Spec-AUF — Accept-Until-Fail Training** | ⭐ 极简单但合理的 loss 修改 | first fail 后的 token 实际不会被接受，但 CE 仍给予同等监督 | **loss 只计算到 first fail**。([arXiv](https://arxiv.org/abs/2607.01893)) |
| **2026-07-06** | **DSpark — Confidence-Scheduled Speculative Decoding with Semi-Autoregressive Generation** | ⭐⭐⭐ DFlash 重要直接改进 | ① block 内缺依赖；②后部 acceptance 差却固定验证整块 | 增加 **low-rank Markov Head + confidence head**，同时做因果补偿和 adaptive verification。([GitHub](https://github.com/vllm-project/speculators/blob/main/docs/user_guide/algorithms/dspark.md)) |
| **2026-07-08** | **DeLS-Spec — Decoupled Long-Short Contexts** | 不重训 DFlash 的因果增强方案 | Domino/DSpark 等通常需要整体重训 | 冻结 DFlash 作为 long-context expert，只训练轻量 local short-context head 并做 logits 融合。([arXiv](https://arxiv.org/abs/2607.07409)) |
| **2026-07-09** | **DominoTree** | Domino + DDTree | DDTree 建树时仍近似位置独立 | 用 Domino 的 path-conditioned score 做 best-first tree construction。([arXiv](https://arxiv.org/abs/2607.08642)) |
| **2026-07-16** | **D-CUT — Adaptive Verification Depth Pruning for Batched Speculative Decoding** | ⭐⭐⭐ 高并发重点工作 | 高并发时 verifier 从 memory-bound 走向 compute-bound，固定长 block 产生大量验证浪费 | 给 batch 一个 **global verification budget**，结合 confidence 与 runtime cost model 动态裁剪 verification depth。([arXiv](https://arxiv.org/abs/2607.14647)) |
| **2026-07-21** | **AdaFlash — Adaptive Speculative Decoding via On-Policy Distilled Diffusion Drafters** | ⭐⭐⭐ OPD + adaptive DFlash | 最佳 draft length 会随 domain、请求和 token 状态变化 | 用 **reverse-KL on-policy distillation** 提升 drafter，并训练 **adaptive length head**。([arXiv](https://arxiv.org/abs/2607.19223)) |
| **2026-07/08** | **Speculative Correction — Draft-then-Refine Decoding for Diffusion LMs** | 相邻路线，不是纯 DFlash 改造 | diffusion LM 有双向上下文能力，却常被当普通 block decoder 使用 | 先生成整段 draft，再通过 bidirectional diffusion refinement 修正。([arXiv](https://arxiv.org/abs/2608.02625)) |
| **2026-08-03** | **xPress — Parallel Refinement for Diffusion Drafters** | ⭐⭐⭐ 直接解决独立预测问题 | 各位置 top-1 单独合理，但组合起来不一定 coherent | DFlash 先出整块候选，再用轻量 **parallel causal refiner** 一次性修正整个 block。([alphaXiv](https://www.alphaxiv.org/abs/2608.02438)) |
| **2026-08-05** | **DBLAST — Dependent Block Drafting for Stochastic Speculative Decoding** | 让 block token 显式相关 | stochastic sampling 下独立 marginals 容易组合出低联合概率序列 | 引入 block-level **categorical latent variable** 共享依赖。([ResearchGate](https://www.researchgate.net/publication/411824644_DBLAST_Dependent_Block_Drafting_for_Stochastic_Speculative_Decoding)) |
| **2026-08-13** | **DARTree — Speculative Diffusion Decoding with Autoregressive Draft Trees** | ⭐⭐⭐ 当前非常重要 | diffusion tree 缺路径条件，单链 Markov correction 又只能增强一条 path | 把 AR correction head 从 chain 推广到整个 **candidate tree**，批量扩展 path 后 best-first pruning。([arXiv](https://arxiv.org/abs/2608.13524)) |
| **2026-08-18** | **DFlash 2 — Keep Drafting Parallel** | ⭐⭐⭐ 工程上很值得跟 | 关键问题往往不是正确 token 不在 top-k，而是选错了组合路径 | 保持完全 parallel drafting，增加 **candidate/path selection + lightweight local convolution**。([Hugging Face](https://huggingface.co/wyattearp/Qwen3.8-27B-DFlash2)) |
| **2026-08-20** | **LiLiCorr — Lightweight Likelihood Correlation of Parallel Drafts** | ⭐⭐⭐ 与 DFlash2/xPress 同一核心问题 | marginal logits 没有显式表达相邻候选组合是否合理 | 对每个位置 top-k 候选计算轻量 **adjacent compatibility / cosine score**，再选 joint path。([arXiv](https://arxiv.org/abs/2608.20530)) |
| **2026-08-31** | **Verification-Aware Training (VAT)** | ⭐ 从 verifier 反过来训练 drafter | CE accuracy 不等于 speculative acceptance，first rejection 尤其关键 | 加 verification head 学习 survive/reject pattern，并对 first-rejection 周围动态重加权 loss。([arXiv](https://arxiv.org/abs/2608.30135)) |
| **2026-08-31** | **Ceiling-Clipped Acceptance Histograms / DBloom** | 研究 block size ceiling | 当频繁 full-accept 时，固定 block=16 本身成为新 ceiling | 用 full-acceptance histogram 判断 ceiling，并通过 curriculum 扩展 block horizon。([arXiv](https://arxiv.org/abs/2608.30427)) |
| **2026-09-01 左右** | **GLANCE — Vision Is Not Overhead** | ⭐⭐⭐ DFlash 思想进入 VLM | 多模态 drafter 若忽略/压缩视觉信息，会导致视觉密集任务 acceptance 低 | 读取 target 已算好的 **fused vision-language hidden states** 做 one-pass block drafting，再构造 wide candidate tree 验证。([arXiv](https://arxiv.org/abs/2609.00355)) |

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