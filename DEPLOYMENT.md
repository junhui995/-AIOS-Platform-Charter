# AIOS MVP 部署与运行手册 (Deployment Manual)

Version: 0.1
Status: Draft

此文档介绍了如何从零初始化、编译并运行 AIOS 的核心 MVP 原型——**DNA Compiler (DNA 编译器)**。

## 1. 环境准备

AIOS 的基础工具链使用 Node.js 体系，强依赖 TypeScript。
请确保本地已安装以下环境：
- [Node.js](https://nodejs.org/) (推荐 v18 或以上)
- [pnpm](https://pnpm.io/) (用来管理 Monorepo，安装：`npm install -g pnpm`)

## 2. 安装依赖

在项目根目录（即 `package.json` 所在目录）下执行：

```bash
pnpm install
```

这将会自动解析 `pnpm-workspace.yaml`，并将所有子包（例如 `@aios/compiler`）需要的依赖下载完毕。

## 3. 编译与运行 DNA Compiler 原型

目前我们在 `examples/enterprise-dna-demo/` 下提供了一份极简的示例业务 YAML 描述文件（即 `expense-dna.yaml`）。

`@aios/compiler` 会读取这份“纯业务语义”的描述文件，将其转换成 AIOS 运行时可以理解的 **Business Semantic AST (JSON 格式)**。

请在项目根目录执行以下命令启动 Compiler：

```bash
cd packages/compiler
npx tsc
node dist/index.js
```

**预期输出**：
你将在控制台中看到由 YAML 成功转化为标准的 `Business Semantic AST` JSON 对象，证明系统从静态 DNA 向运行时引擎演进的第一步已跑通。

## 后续计划 (Next Steps)
- **Runtime 调度引擎**：利用 Planner Agent 解析这颗 AST 树，调用大语言模型决定执行步骤。
- **Tool 绑定**：注册真实的 `ApproveExpense` 等工具给 Agent 实际调用。
