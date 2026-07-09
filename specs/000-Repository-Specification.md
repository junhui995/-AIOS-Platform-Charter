# Repository Specification
# AIOS 仓库规范

Version: 1.0

Status: Stable

---

# 1. Purpose

本规范定义 AIOS 项目的目录结构、职责划分、命名规范和开发约定。

所有开发者（包括 AI Agent）进入仓库后，应首先阅读本规范。

Repository 是项目唯一入口。

---

# 2. Design Philosophy

AIOS 遵循以下原则：

- Documentation First
- Specification First
- Enterprise DNA First
- Code Last

任何功能必须先修改 Specification。

禁止先修改代码再补文档。

---

# 3. Repository Layout

AIOS/

docs/

specs/

dna/

compiler/

generator/

runtime/

backend/

frontend/

tests/

scripts/

examples/

---

# 4. Responsibility

docs/

负责设计思想。

specs/

负责工程规范。

dna/

保存 Enterprise DNA。

compiler/

DNA → Semantic AST。

generator/

Semantic AST → Runtime Artifact。

runtime/

系统运行时。

backend/

HTTP 服务。

frontend/

UI。

tests/

自动测试。

scripts/

开发工具。

examples/

示例 DNA。

---

# 5. Dependency Rule

允许：

DNA

↓

Compiler

↓

Generator

↓

Runtime

↓

Backend

↓

Frontend

禁止反向引用。

例如：

Runtime

不得依赖：

Generator。

---

# 6. Source Of Truth

Enterprise DNA

是唯一业务来源。

Semantic AST

是唯一运行来源。

Generated Artifact

不是来源。

可以删除。

---

# 7. Coding Principle

任何模块：

只能拥有一个职责。

任何模块：

不得直接访问其它模块内部实现。

统一通过公开接口通信。

---

# 8. Review

任何 Pull Request：

必须：

Specification 更新。

单元测试通过。

Verification 通过。

否则：

禁止 Merge。

---

# 9. Future

Repository 必须能够：

支持 AI 开发。

支持人工开发。

支持自动生成代码。

支持长期维护。
