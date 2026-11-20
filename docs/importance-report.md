# importance 重算报告

> 本文件由 `npm run rescore` 生成，请勿手改。口径见脚本里的 `WEIGHTS` 与 `TIER_SHARE`。

改前分布：{"2":13,"3":6,"4":12,"5":52}
改后分布：{"2":24,"3":32,"4":19,"5":8}

重要性的唯一来源是结构信号，不接受手改 JSON。要调整，改权重后重跑，让所有人都能复核结论。

| # | 方法 | 方向 | 结构分 | 变化 | 依据 |
|---|---|---|---|---|---|
| 1 | DFlash | architecture | 262.6 | 5 → **5** | 被 56 篇用作基线 · 被 47 篇后续工作继承 · 被库内 3 篇引用 · 1 组可核验实验 · 方向首篇 |
| 2 | DSpark | causality | 79.4 | 5 → **5** | 被 22 篇用作基线 · 被 10 篇后续工作继承 · 被库内 1 篇引用 · 2 组可核验实验 |
| 3 | DDTree | tree | 37.7 | 5 → **5** | 被 10 篇用作基线 · 被 4 篇后续工作继承 · 1 组可核验实验 · 方向首篇 |
| 4 | Domino | causality | 22.6 | 3 → **5** | 被 7 篇用作基线 · 被 1 篇后续工作继承 · 被库内 1 篇引用 · 1 组可核验实验 · 方向首篇 |
| 5 | DFlash 2 | causality | 13.1 | 5 → **5** | 被 2 篇用作基线 · 被 2 篇后续工作继承 · 2 组可核验实验 |
| 6 | DARTree | tree | 10.6 | 5 → **5** | 被 2 篇用作基线 · 被 1 篇后续工作继承 · 1 组可核验实验 |
| 7 | DFlare | architecture | 10.3 | 3 → **5** | 被 1 篇用作基线 · 被 2 篇后续工作继承 · 1 组可核验实验 |
| 8 | D-PACE | training | 9.6 | 2 → **5** | 被 1 篇用作基线 · 被 1 篇后续工作继承 · 1 组可核验实验 · 方向首篇 |
| 9 | CaDDTree | systems | 9.3 | 2 → **4** | 被 2 篇用作基线 · 被 1 篇后续工作继承 · 1 组可核验实验 |
| 10 | Fast-dVLM | extensions | 8.7 | 5 → **4** | 被 1 篇后续工作继承 · 1 组可核验实验 · 方向首篇 |
| 11 | JetSpec | tree | 8.7 | 5 → **4** | 被 1 篇用作基线 · 被 1 篇后续工作继承 · 1 组可核验实验 |
| 12 | LoopSpec | systems | 8.1 | 4 → **4** | 被 1 篇用作基线 · 被 1 篇后续工作继承 · 1 组可核验实验 |
| 13 | Draft-OPD | training | 7.3 | 3 → **4** | 被 1 篇用作基线 · 被 1 篇后续工作继承 · 1 组可核验实验 |
| 14 | D-CUT | systems | 6.1 | 5 → **4** | 被 1 篇后续工作继承 · 1 组可核验实验 |
| 15 | DLite | architecture | 5.5 | 5 → **4** | 2 组可核验实验 |
| 16 | AngelSpec / DFly | systems | 4.7 | 5 → **4** | 1 组可核验实验 |
| 17 | DFlow | reuse | 4.7 | 5 → **4** | 被 1 篇用作基线 · 1 组可核验实验 |
| 18 | NCP-ArchPreview | architecture | 4.7 | 4 → **4** | 1 组可核验实验 |
| 19 | LongSpark | architecture | 4.7 | 5 → **4** | 1 组可核验实验 |
| 20 | D-PAL | training | 4.7 | 4 → **4** | 1 组可核验实验 |
| 21 | DynaDFlash | architecture | 4.7 | 4 → **4** | 1 组可核验实验 |
| 22 | AdaFlash | systems | 4.3 | 5 → **4** | 被 1 篇用作基线 · 1 组可核验实验 |
| 23 | BASTION | tree | 4.2 | 5 → **4** | 1 组可核验实验 |
| 24 | ReTrace | reuse | 4.2 | 5 → **4** | 1 组可核验实验 · 方向首篇 |
| 25 | GLANCE | extensions | 4.2 | 5 → **4** | 1 组可核验实验 |
| 26 | GravityOCR | extensions | 4.2 | 4 → **4** | 1 组可核验实验 |
| 27 | CAST | tree | 4.2 | 5 → **4** | 1 组可核验实验 |
| 28 | ALR + IRA | training | 4.2 | 5 → **3** | 1 组可核验实验 |
| 29 | AdaSpark | systems | 4.2 | 5 → **3** | 1 组可核验实验 |
| 30 | FOLD | architecture | 4.2 | 5 → **3** | 1 组可核验实验 |
| 31 | ReaDy | architecture | 4.2 | 5 → **3** | 1 组可核验实验 |
| 32 | FlashMap | causality | 4.2 | 5 → **3** | 1 组可核验实验 |
| 33 | Target Regeneration | training | 4.2 | 3 → **3** | 1 组可核验实验 |
| 34 | TableTune | systems | 4.2 | 4 → **3** | 1 组可核验实验 |
| 35 | D3D | architecture | 4.2 | 5 → **3** | 1 组可核验实验 |
| 36 | ChainFlow | architecture | 4.2 | 5 → **3** | 1 组可核验实验 |
| 37 | MMFlash | extensions | 4.2 | 4 → **3** | 1 组可核验实验 |
| 38 | SpecOPD | training | 4 | 5 → **3** | 2 组可核验实验 |
| 39 | UBTree | tree | 3.7 | 5 → **3** | 1 组可核验实验 |
| 40 | D3Tree | tree | 3.7 | 5 → **3** | 1 组可核验实验 |
| 41 | Fast-dDrive | extensions | 3.6 | 4 → **3** | 1 组可核验实验 |
| 42 | DLoop | systems | 3.5 | 5 → **3** | 2 组可核验实验 |
| 43 | TAPS | tree | 3.2 | 5 → **3** | 1 组可核验实验 |
| 44 | Online Draft Co-Training | training | 3.2 | 5 → **3** | 1 组可核验实验 |
| 45 | Carryover Drafting | reuse | 3.2 | 5 → **3** | 1 组可核验实验 |
| 46 | H-Spec | architecture | 3.2 | 5 → **3** | 1 组可核验实验 |
| 47 | DPara | systems | 3.2 | 5 → **3** | 1 组可核验实验 |
| 48 | RecGuide | systems | 3.2 | 4 → **3** | 1 组可核验实验 |
| 49 | DForkTree | tree | 3.2 | 5 → **3** | 1 组可核验实验 |
| 50 | Multi-Future Drafting | tree | 3.2 | 5 → **3** | 1 组可核验实验 |
| 51 | ASD | systems | 3.1 | 4 → **3** | 1 组可核验实验 |
| 52 | PRESTO | tree | 2.7 | 5 → **3** | 1 组可核验实验 |
| 53 | DSpine | causality | 2.7 | 5 → **3** | 1 组可核验实验 |
| 54 | DScale | systems | 2.7 | 5 → **3** | 1 组可核验实验 |
| 55 | DRelay | causality | 2.7 | 5 → **3** | 1 组可核验实验 |
| 56 | SharpDraft | architecture | 2.7 | 5 → **3** | 1 组可核验实验 |
| 57 | D-Loop | causality | 2.7 | 5 → **3** | 1 组可核验实验 |
| 58 | DScout | training | 2.7 | 5 → **3** | 1 组可核验实验 |
| 59 | EDR | training | 2.7 | 5 → **3** | 1 组可核验实验 |
| 60 | DCOCO | causality | 2.7 | 5 → **2** | 1 组可核验实验 |
| 61 | JetSpec++ | systems | 2.7 | 5 → **2** | 1 组可核验实验 |
| 62 | TreeSpark | tree | 2.7 | 5 → **2** | 1 组可核验实验 |
| 63 | DStill | training | 2.7 | 5 → **2** | 1 组可核验实验 |
| 64 | MDraft | training | 2.7 | 5 → **2** | 1 组可核验实验 |
| 65 | Only Accepted Tokens Count | systems | 2.7 | 4 → **2** | 1 组可核验实验 |
| 66 | HybridSpec | systems | 2.7 | 5 → **2** | 1 组可核验实验 |
| 67 | Test-Time Speculation | systems | 2.3 | 2 → **2** | 1 组可核验实验 · 方向首篇 |
| 68 | TreeFlash | causality | 2.3 | 2 → **2** | 1 组可核验实验 |
| 69 | D²SD | tree | 2.3 | 2 → **2** | 1 组可核验实验 |
| 70 | DeLS-Spec | causality | 2.3 | 2 → **2** | 1 组可核验实验 |
| 71 | DominoTree | tree | 2.3 | 2 → **2** | 1 组可核验实验 |
| 72 | xPress | causality | 2.3 | 5 → **2** | 1 组可核验实验 |
| 73 | LoopAhead | systems | 2.1 | 5 → **2** | 1 组可核验实验 |
| 74 | Spec-AUF | training | 1.6 | 3 → **2** | 2 组可核验实验 |
| 75 | VAT | training | 1.6 | 3 → **2** | 2 组可核验实验 |
| 76 | Frozen Short Drafter | architecture | 1.6 | 4 → **2** | 1 组可核验实验 |
| 77 | Teaching L2R | training | 0.8 | 2 → **2** | 1 组可核验实验 |
| 78 | WhiFlash | systems | 0.8 | 2 → **2** | 1 组可核验实验 |
| 79 | HyperDFlash | architecture | 0.8 | 2 → **2** | 1 组可核验实验 |
| 80 | Speculative Correction | extensions | 0.8 | 2 → **2** | 1 组可核验实验 |
| 81 | DBLAST | causality | 0.8 | 2 → **2** | 1 组可核验实验 |
| 82 | LiLiCorr | causality | 0.8 | 5 → **2** | 1 组可核验实验 |
| 83 | DBloom | architecture | 0.8 | 2 → **2** | 1 组可核验实验 |

