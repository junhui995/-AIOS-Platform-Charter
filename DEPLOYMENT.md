# AIOS MVP 部署与运行手册 (Deployment Manual)

Version: 1.0
Status: Final MVP

此文档介绍了如何初始化并运行整个 AIOS MVP。
（有关代码架构和模块划分，请参阅 [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md)）

## 1. 环境准备

- [Node.js](https://nodejs.org/) (推荐 v18 或以上)
- [pnpm](https://pnpm.io/) (用来管理 Monorepo，如果未安装请执行：`npm install -g pnpm`)

## 2. 安装依赖

在项目根目录下执行：

```bash
pnpm install
```
*这将会自动解析 `pnpm-workspace.yaml`，下载根目录和所有子包需要的相关依赖。*

## 3. 运行 AIOS 完整闭环测试

AIOS 运行时将经历以下自动流转流程：
1. **DNA Compiler** 读取 `examples/enterprise-dna-demo/expense-dna.yaml` 并转换为 AST（注入企业 Policy）。
2. **Runtime Engine** 启动 Planner Agent，向 LLM 注入 AST Context 和所有标准的 Tool Schema。
3. **Agent Loop** 思考如何满足用户需求，并自主在后台分步调用 `Tools` 及其背后的 `DataService`。

你可以通过传入指令来运行 Runtime CLI。为了方便测试，我们使用 `tsx` 库实时执行 TypeScript。

### 模式 A：Mock 模式（无需 API Key，自动模拟全链路调用）
如果在没有配置环境变量 `OPENAI_API_KEY` 的情况下运行，系统将执行硬编码的 Mock 演示脚本，以展示控制流。

```bash
npx tsx packages/runtime/src/cli.ts "帮 Alice 报销 600 块打车费"
```

### 模式 B：大语言模型真实调度模式（推荐体验 AI 魔法）
如果你有 OpenAI API Key，可以真实体验 AI 代理动态提取参数、做决策并串联工具的全部过程：

```bash
export OPENAI_API_KEY="sk-xxxxxx"
npx tsx packages/runtime/src/cli.ts "帮 Alice 报销 600 块打车费"
```

*预期观察点：在这个用例中，AI 将动态识别出：Alice 的 ID 是什么 -> 创建报销单号 -> 判断 600 元超过了 YAML 中定义的 500 元限额 -> 所以它会机智地决定调用 `requestFinanceApproval` 工具，而不是去调用 `autoApproveExpense`。*

## 常见问题
- **如果遇到 TypeScript 路径解析错误**：确保使用 `npx tsx` 而不是 `npx ts-node` 执行，因为本项目在 Monorepo 层面依赖了复杂的 `paths` 别名解析。