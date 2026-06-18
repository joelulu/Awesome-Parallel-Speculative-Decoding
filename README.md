# Awesome Parallel Decoding

[![Awesome](https://awesome.re/badge.svg)](https://awesome.re)
[![Topic](https://img.shields.io/badge/topic-parallel%20decoding-blue)](#)
[![Speculative Decoding](https://img.shields.io/badge/speculative-decoding-red)](#)
[![Diffusion Drafting](https://img.shields.io/badge/diffusion-drafting-purple)](#)
[![PRs Welcome](https://img.shields.io/badge/PRs-Welcome-brightgreen)](#)

📒 一个面向 **并行解码**、**扩散式草稿模型**、**树状投机验证** 与 **LLM 推理加速** 的论文与代码仓库。

本仓库重点关注 DFlash / DDTree 技术线：block-parallel diffusion drafting、prefix-tree verification、target-aware path selection、adaptive budget control，以及 hardware-aware throughput optimization。

---

## 📖 最新动态

- [2026-06-18] 初始化 Awesome 风格主页，用于整理并行解码与扩散式投机解码方向。
- [2026-06-16] 合并 DFlash 系列深度调研报告，覆盖 DFlash、DDTree、TAPS、CaDDTree、Bastion、D-PACE、Domino、PARD-2、TreeFlash、WhiFlash、FlexDraft、Test-Time Speculation、SMART、Future Validity 等方法。
- [2026-06-02] 加入本地 DDTree 实验分支，包括 score search、learned tree policy 与 matrix calibration。

---

## 🤖 目录

- [整体概览](#整体概览)
- [技术谱系](#技术谱系)
- [仓库结构](#仓库结构)
- [论文列表](#论文列表)
  - [并行 drafter 底座](#并行-drafter-底座)
  - [训练目标对齐](#训练目标对齐)
  - [因果补偿](#因果补偿)
  - [树状验证与预算](#树状验证与预算)
  - [动态路由与在线适配](#动态路由与在线适配)
  - [分布保真与系统部署](#分布保真与系统部署)

---

## 整体概览

Speculative decoding 通过廉价 drafter 预生成候选 token，再由 target model 进行验证，从而加速大语言模型推理。传统投机解码中的 drafter 通常仍然是自回归生成，候选长度越长，草稿生成开销越大。

**DFlash** 的核心变化是引入 block diffusion drafter：它不再逐 token 串行生成草稿，而是一次并行预测未来一整块 token，并把 target model 的 hidden features 注入 drafter，使草稿生成从主要瓶颈变成较低成本的并行前向。

**DDTree** 进一步发现，DFlash 一次 forward 给出的不是一条路径，而是多个未来位置的候选分布。与其只取 greedy 单路径，不如把这些候选组织成 prefix-closed tree，再通过 tree attention 一次性验证多个分支。


---
DFlash 后续工作已经分成六条主线：

| 主线 | 代表方法 | 核心问题 | 最大变化 |
|---|---|---|---|
| 并行 drafter 底座 | DFlash、DFlare | 如何让 block diffusion drafter 足够强 | 从单一融合表征到 layer-wise fusion 与容量扩展 |
| 训练目标对齐 | D-PACE、Teaching L2R、PARD-2 | token CE 不等于 acceptance length | 从 token accuracy 转向 prefix acceptance objective |
| 因果补偿 | Domino、TreeFlash | 并行预测缺少 block 内因果依赖 | 用轻量 head/MLP 近似 AR 条件分布 |
| 树状验证与预算 | DDTree、TAPS、CaDDTree、Bastion、SMART、D-Cut | 树怎么构、怎么剪、何时停 | 从固定预算树转向 path/hardware/throughput-aware tree |
| 动态路由与在线适配 | WhiFlash、FlexDraft、Test-Time Speculation、D²SD | 单一 drafter 或固定策略不适合所有阶段 | token-level、batch-level、test-time 动态调整 |
| 分布保真与系统部署 | Future Validity、Trainium/TPU | 约束生成与硬件栈中的真实收益 | 从算法指标转向约束分布与服务吞吐 |

---

## 仓库结构

| 路径 | 说明 |
|---|---|
| [`DFlash_deep_research_report_merged_20260616.md`](DFlash_deep_research_report_merged_20260616.md) | 主调研报告，系统分析 DFlash / DDTree 及后续方法。 |
| [`PROJECT_BACKGROUND.md`](PROJECT_BACKGROUND.md) | 项目背景、研究判断、工作区说明与推荐开发顺序。 |
| [`ddtree-master/`](ddtree-master/) | 干净的 DDTree baseline，包括 DFlash draft model、tree construction、verification 与 benchmark 脚本。 |
| [`ddtree_0602_修改/`](ddtree_0602_%E4%BF%AE%E6%94%B9/) | 本地实验分支，包含 scorer hooks、learned tree policy、score search 与 matrix calibration。 |
| [`code/dflash-main/`](code/dflash-main/) | DFlash 参考实现。 |
| [`code/CaDDTree-main/`](code/CaDDTree-main/) | Cost-aware adaptive tree budget 参考实现。 |
| [`code/TAPS-EMNLP2026-53DD/`](code/TAPS-EMNLP2026-53DD/) | Target-aware prefix tree selection 参考实现。 |
| [`code/BASTION-main/`](code/BASTION-main/) | 结合硬件校准 latency model 的 budget-aware tree drafting 参考实现。 |
| [`code/D-PACE-main/`](code/D-PACE-main/) | Position-aware training objective 参考实现。 |
| [`code/D2-SD-main/`](code/D2-SD-main/) | 二阶段恢复 / 边界补偿方向参考实现。 |
| [`code/Domino-main/`](code/Domino-main/) | 并行草稿中的 causal correction 参考实现。 |
| [`code/PARD-master/`](code/PARD-master/) | Acceptance-aligned parallel drafter training 参考实现。 |

---

## 论文列表

### 并行 drafter 底座

| 时间 | 类别 | 标题 | 论文 | 代码 | Venue |
|:---:|:---|:---|:---:|:---:|:---:|
| 2026.02 | Block diffusion drafter | [**DFlash**] Block Diffusion for Flash Speculative Decoding | [[abs]](https://arxiv.org/abs/2602.06036) | [[local]](code/dflash-main/) | arXiv |
| 2026.06 | Draft capacity scaling | [**DFlare**] Scaling Up Draft Capacity for Block Diffusion Speculative Decoding | [[abs]](https://arxiv.org/abs/2606.02091) | TBA | arXiv |

### 训练目标对齐

| 时间 | 类别 | 标题 | 论文 | 代码 | Venue |
|:---:|:---|:---|:---:|:---:|:---:|
| 2026.05 | Position-aware loss | [**D-PACE**] Dynamic Position-Aware Cross-Entropy for Parallel Speculative Drafting | [[abs]](https://arxiv.org/abs/2605.18810) | [[local]](code/D-PACE-main/) | arXiv |
| 2026.06 | Left-to-right objective | [**Teaching Diffusion to Speculate Left-to-Right**] | [[abs]](https://arxiv.org/abs/2606.11552) | TBA | arXiv |
| 2026.05 | Acceptance-aligned training | [**PARD-2**] Target-Aligned Parallel Draft Model for Dual-Mode Speculative Decoding | [[abs]](https://arxiv.org/abs/2605.08632) | [[local]](code/PARD-master/) | arXiv |

### 因果补偿

| 时间 | 类别 | 标题 | 论文 | 代码 | Venue |
|:---:|:---|:---|:---:|:---:|:---:|
| 2026.05 | Causal correction | [**Domino**] Decoupling Causal Modeling from Autoregressive Drafting in Speculative Decoding | [[abs]](https://arxiv.org/abs/2605.29707) | [[local]](code/Domino-main/) | arXiv |
| 2026.06 | Parallel AR approximation | [**TreeFlash**] Parallel AR-Approximation for Faster Speculative Decoding | [[abs]](https://arxiv.org/abs/2606.03819) | TBA | arXiv |

### 树状验证与预算

| 时间 | 类别 | 标题 | 论文 | 代码 | Venue |
|:---:|:---|:---|:---:|:---:|:---:|
| 2026.04 | Diffusion draft tree | [**DDTree**] Accelerating Speculative Decoding with Block Diffusion Draft Trees | [[abs]](https://arxiv.org/abs/2604.12989) | [[local]](ddtree-master/) | arXiv |
| 2026 | Target-aware selection | [**TAPS**] Target-Aware Prefix Tree Selection for Speculative Decoding | TBA | [[local]](code/TAPS-EMNLP2026-53DD/) | EMNLP 2026 |
| 2026.06 | Cost-aware budget | [**CaDDTree**] Cost-Aware Diffusion Draft Trees for Speculative Decoding | [[abs]](https://arxiv.org/abs/2606.01813) | [[local]](code/CaDDTree-main/) | arXiv |
| 2026.05 | Budget-aware tree drafting | [**Bastion**] Budget-Aware Speculative Decoding with Tree-structured Block Diffusion Drafting | [[abs]](https://arxiv.org/abs/2605.29727) | [[local]](code/BASTION-main/) | arXiv |
| 2026.04 | Marginal utility | [**SMART**] When is it Actually Worth Expanding a Speculative Tree? | [[abs]](https://arxiv.org/abs/2604.09731) | TBA | arXiv |
| 2026 | Verification pruning | [**D-Cut**] Batch-level verification pruning for speculative trees | TBA | TBA | TBA |

### 动态路由与在线适配

| 时间 | 类别 | 标题 | 论文 | 代码 | Venue |
|:---:|:---|:---|:---:|:---:|:---:|
| 2026.06 | Token-level routing | [**WhiFlash**] Accelerating Speculative Decoding with Token-Level Cross-Paradigm Routing | [[abs]](https://arxiv.org/abs/2606.07710) | TBA | arXiv |
| 2026.05 | Batch-adaptive switching | [**FlexDraft**] Flexible Speculative Decoding via Attention Tuning and Bonus-Guided Calibration | [[abs]](https://arxiv.org/abs/2605.20022) | TBA | arXiv |
| 2026.05 | Test-time adaptation | [**Test-Time Speculation**] | [[abs]](https://arxiv.org/abs/2605.09329) | TBA | arXiv |
| 2026 | Boundary recovery | [**D²SD**] Boundary-focused second drafter / second-stage speculative recovery | TBA | [[local]](code/D2-SD-main/) | TBA |

### 分布保真与系统部署

| 时间 | 类别 | 标题 | 论文 | 代码 | Venue |
|:---:|:---|:---|:---:|:---:|:---:|
| 2026.05 | Grammar-faithful speculation | [**Future Validity**] Future Validity is the Missing Statistic: From Impossibility to Phi-Estimation for Grammar-Faithful Speculative Decoding | [[abs]](https://arxiv.org/abs/2605.07698) | TBA | arXiv |
| 2026 | Hardware deployment | Trainium / TPU / GPU system optimization for speculative decoding | TBA | TBA | TBA |
