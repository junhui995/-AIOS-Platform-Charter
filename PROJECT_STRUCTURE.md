# AIOS 工程结构与模块说明 (Project Structure)

Version: 1.0
Status: Draft

为了支撑 AIOS 的“基于 DNA 的自演化闭环”设计，我们采用了 **TypeScript + pnpm Workspace** 的 Monorepo 架构。
当前代码库包含了一个完整的 MVP（最小可行性产品）执行链路。

## 一、 整体目录树 (Monorepo Tree)

```text
aios-monorepo/
├── docs/                        # 核心规范与宪章文档库
│   ├── 001-AIOS运行原理.md
│   ├── ...
│   └── 012-Workflow-Specification.md
│
├── examples/                    # 示例与测试数据
│   └── enterprise-dna-demo/
│       └── expense-dna.yaml     # 【MVP核心】模拟的企业 DNA (描述报销策略与流转规则)
│
├── packages/                    # 核心底层引擎与中间件
│   ├── compiler/                # 【DNA 编译器】解析 YAML DNA，生成 Runtime 需要的 AST
│   ├── data-service/            # 【数据抽象层】所有业务数据库读写的唯一入口 (目前为 Mock)
│   ├── tools/                   # 【能力集】注册给 AI 的所有标准化工具 Schema 和执行逻辑
│   └── runtime/                 # 【调度大脑】包含 AI Planner，管理大模型交互、上下文与工具分发
│
├── apps/                        # 上层应用入口 (后续建设)
│   ├── portal/                  # (Placeholder) 给最终用户使用的前端 UI (Next.js/Vue)
│   └── server/                  # (Placeholder) 生产环境的 API 服务主入口
│
├── package.json                 # 根级依赖配置
├── pnpm-workspace.yaml          # Monorepo 子包划分配置
├── tsconfig.json                # 根级 TypeScript 基础编译配置
├── PROJECT_STRUCTURE.md         # 📍 当前工程结构文档
└── DEPLOYMENT.md                # 📍 部署与运行手册
```

## 二、 MVP 闭环链路说明

目前，我们的代码已经支撑起了一条完整的平台运转闭环（Phase 1 MVP）：

1. **规则定义**: 在 `examples/enterprise-dna-demo/expense-dna.yaml` 中，我们以机器和人都能阅读的方式，定义了什么是“报销实体”，以及“报销金额 > 500 需要财务审批”的静态规则。
2. **规则编译**: 当运行时启动，`@aios/compiler` 首先加载这套 YAML，将其转换为一套结构化的 JSON (Business Semantic AST)。
3. **运行时组装**: `@aios/runtime` 拿到 AST 后，将规则提取为 System Prompt（系统提示词），同时向外部注入来自 `@aios/tools` 定义的所有能力接口（如 `getEmployeeIdByName`, `createExpenseOrder`）。
4. **AI 推理决策**: 当用户输入指令（如“帮 Alice 报销 600 元”）时，Runtime 通过 **OpenAI SDK** 或 **Mock Mode** 开始思考：
   - AI 先调用 `getEmployeeIdByName` 找到 Alice 的系统 ID。
   - 接着 AI 调用 `createExpenseOrder` 记录 600 元的花费。
   - 最终，AI 判断 600 元命中了 AST 注入的“>500需人工审批”红线规则，因此主动选择调用 `requestFinanceApproval` 而不是自动通过。
5. **数据落地**: 所有工具被触发时，底层都受 `@aios/data-service` 管控修改，真正实现了“数据不可见，逻辑由规则驱动”。

---

到目前为止，我们证明了：**让系统去学习业务（解析 DNA），而不是让工程师去手写满天飞的 IF/ELSE 业务代码，是完全可行的！**