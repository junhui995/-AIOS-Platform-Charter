# Generator Specification

Generator 是 Semantic AST 的消费者。

Generator 不理解 DNA。

Generator 只理解 AST。

Generator 可以生成：

Workflow

REST API

GraphQL

Vue 页面

数据库迁移

Agent 配置

MCP Tool

OpenAPI

测试代码

Generator 相互独立。

任何 Generator 都可以单独升级。

Generator 不允许：

修改 AST。

Generator 只能：

读取 AST。

输出 Artifact。

Artifact 永远可删除。

AST 永远保留。

Generator 必须保证：

相同 AST

生成相同 Artifact。
