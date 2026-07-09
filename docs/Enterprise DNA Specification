# Enterprise DNA Specification
# 企业DNA规范

Version: 1.0

Status: Draft

Depends:

000-平台宪章

001-AIOS运行原理

---

# 第一章

什么是 Enterprise DNA

Enterprise DNA 是企业唯一可信的数字描述（Single Source of Truth）。

Enterprise DNA 不描述程序。

Enterprise DNA 描述企业。

它描述：

企业是谁。

企业如何组织。

企业如何工作。

企业遵循哪些制度。

企业具备哪些能力。

企业希望实现哪些目标。

任何软件均由 Enterprise DNA 派生。

因此：

代码不是企业资产。

数据库不是企业资产。

页面不是企业资产。

真正属于企业的是：

Enterprise DNA。

---

# 第二章

Enterprise DNA 的组成

Enterprise DNA 由以下对象组成。

Organization

Identity

Role

Capability

Policy

Workflow

Knowledge

Domain

Resource

Goal

Constraint

Event

这些对象共同描述企业。

---

# 第三章

DNA 必须满足

唯一性

任何事实只能存在一个来源。

例如：

住宿标准。

只能存在：

Policy。

不得存在：

Workflow。

页面。

Prompt。

代码。

---

一致性

任何系统均引用 DNA。

不得复制。

---

可演化

DNA 必须支持版本。

任何变化均产生：

Evolution。

---

可解释

任何字段均必须说明：

来源。

用途。

负责人。

更新时间。

---

# 第四章

DNA 不保存什么

DNA 不保存：

Python

Java

Vue

SQL

Redis

Docker

Prompt

这些属于：

Implementation。

而不是：

Business。

---

# 第五章

DNA 的层级

Layer 1

Identity

企业身份。

例如：

组织。

员工。

部门。

岗位。

权限。

---

Layer 2

Business

业务能力。

例如：

采购。

合同。

报销。

项目。

客户。

供应商。

---

Layer 3

Policy

制度。

预算。

审批规则。

财务规则。

法律要求。

---

Layer 4

Knowledge

企业知识。

FAQ。

制度解释。

经验。

案例。

培训资料。

---

Layer 5

Goal

企业目标。

例如：

降低成本。

提高效率。

缩短审批。

减少库存。

---

# 第六章

DNA Evolution

DNA 永远允许变化。

变化来源：

人工修改。

AI建议。

数据分析。

制度更新。

法律变化。

组织调整。

任何变化均生成：

Evolution Record。

---

# 第七章

Evolution Record

每次 DNA 修改。

必须保存：

Before

After

Reason

Evidence

Approver

Generator

Reviewer

Time

Version

任何版本均可恢复。

---

# 第八章

DNA 与 Runtime

DNA 永远静态。

Runtime 永远动态。

Runtime 读取：

DNA。

生成：

Semantic Model。

Runtime 永远不修改 DNA。

DNA 只能通过：

Evolution。

发生变化。

---

# 第九章

Semantic Model

Semantic Model 是 Runtime 使用的数据结构。

它由 DNA 编译生成。

不是人工维护。

Semantic Model 包括：

Business Context

Entity Graph

Policy Graph

Workflow Graph

Tool Graph

Agent Graph

Semantic Model 可以重新生成。

DNA 不变。

Semantic Model 必须一致。

---

# 第十章

DNA Compiler

DNA 不直接生成代码。

DNA 首先编译。

Compiler 输出：

Semantic AST。

Semantic AST 是整个系统唯一中间表示（IR）。

任何 Generator 必须读取：

Semantic AST。

禁止直接读取：

DNA。

---

# 第十一章

Generator

Generator 可以生成：

API

Workflow

Database Migration

Vue

Agent

Test

OpenAPI

Deployment

Generator 可替换。

Semantic AST 不可替换。

---

# 第十二章

Verification

任何生成结果。

必须验证。

验证包括：

Business Verification

Security Verification

Architecture Verification

Performance Verification

Compatibility Verification

Test Verification

通过以后。

才能发布。

---

# 第十三章

DNA Repository

Enterprise DNA 保存在：

Git Repository。

Git 保存：

不是代码。

而是：

企业演化历史。

每一个 Commit。

对应：

一次企业变化。

而不是：

一次代码修改。

---

# 第十四章

Runtime Cache

Runtime 不保存 DNA。

Runtime 保存：

Compiled Result。

Runtime Cache 可以删除。

DNA 不可删除。

任何 Runtime。

均可重新构建。

---

# 第十五章

最终原则

Enterprise DNA 是企业唯一数字资产。

Semantic AST 是唯一系统描述。

Generated Code 是一次实现。

Runtime 是一次执行。

企业变化。

DNA 更新。

Semantic AST 重建。

Generator 重新生成。

Runtime 热更新。

整个企业持续演化。

而不是持续开发。
