# AIOS MVP 部署与运行手册 (Deployment Manual)

Version: 0.2
Status: Draft

此文档介绍了如何编译并运行整个 AIOS MVP（包含 Compiler、Tools、DataService 以及基于 OpenAI/Mock 的 Runtime 引擎）。

## 1. 环境准备

- [Node.js](https://nodejs.org/) (推荐 v18 或以上)
- [pnpm](https://pnpm.io/) (用来管理 Monorepo，安装：`npm install -g pnpm`)

## 2. 安装依赖

在项目根目录下执行：

```bash
pnpm install
```

## 3. 运行 AIOS 完整闭环测试

AIOS 运行时将经历以下流程：
1. `Compiler` 读取 `expense-dna.yaml` 并转换为 AST（注入 Policy 规则）。
2. `Runtime` 启动 Planner Agent，注入 AST Context 和所有标准的 Tool Schema。
3. `Agent` 思考如何满足用户需求，并自主按顺序调用 `Tools` 及其背后的 `DataService`。

你可以通过传入指令来运行 Runtime CLI。为了方便测试，我们使用 `tsx` 实时执行 TypeScript：

### 模式 A：Mock 模式（无需 API Key，自动模拟调用）
如果在没有 `OPENAI_API_KEY` 的情况下运行，系统将执行内部写好的 Mock 脚本，展示流程流转。

```bash
npx tsx packages/runtime/src/cli.ts "帮 Alice 报销 600 块打车费"
```

### 模式 B：大语言模型真实调度模式（推荐）
如果你有 OpenAI API Key，可以真实体验 AI 代理自己做决策并执行动作的魅力：

```bash
export OPENAI_API_KEY="sk-xxxxxx"
npx tsx packages/runtime/src/cli.ts "帮 Alice 报销 600 块打车费"
```
*提示：在这个例子中，因为超过了 YAML 中定义的 500 元限额，真实的 AI 也会决定调用 `requestFinanceApproval` 工具，而不是 `autoApproveExpense`。*

## 模块说明
- `@aios/compiler`: 负责把 YAML 转为 AST JSON。
- `@aios/data-service`: 隔离数据库读写的中间层（内置 Mock 内存数据）。
- `@aios/tools`: AI 可见的所有标准能力。
- `@aios/runtime`: 大脑，包含与 OpenAI 打通的 Agent 调度引擎。
