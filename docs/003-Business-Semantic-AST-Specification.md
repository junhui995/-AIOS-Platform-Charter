# Business Semantic AST Specification

Version: 1.0

Status: Draft

Depends:

000 Platform Charter

001 Runtime

002 Enterprise DNA

---

# 第一章

什么是 Business Semantic AST

Business Semantic AST（简称 BSAST）

是 Enterprise DNA 编译后的统一业务中间表示（Intermediate Representation）。

BSAST 不属于任何编程语言。

BSAST 不属于任何数据库。

BSAST 不属于任何 AI 模型。

它描述：

企业真正要做什么。

而不是：

如何实现。

BSAST 是 Runtime 唯一允许读取的数据结构。

DNA 永远不会直接进入 Runtime。

---

# 第二章

为什么需要 BSAST

Enterprise DNA：

适合企业理解。

代码：

适合计算机执行。

Runtime：

两者都不适合。

因此：

需要一个统一语义层。

BSAST 即 Runtime 的母语。

---

# 第三章

设计目标

任何 Enterprise DNA

均可转换为：

唯一 BSAST。

任何 Generator

均从：

BSAST

生成目标代码。

因此：

DNA 不依赖 Generator。

Generator 不依赖 DNA。

两者只依赖 BSAST。

---

# 第四章

BSAST 六大核心对象

BusinessEntity

BusinessAction

BusinessPolicy

BusinessResource

BusinessConstraint

BusinessOutcome

任何业务均可表示为：

Action

读取：

Entity

遵循：

Policy

消耗：

Resource

满足：

Constraint

得到：

Outcome

---

# 第五章

Business Entity

Entity 表示企业中的对象。

例如：

Employee

Expense

Invoice

Supplier

Project

Budget

Workflow

Contract

Meeting

Customer

Entity 不包含行为。

只包含：

Identity

Attribute

Relation

---

# 第六章

Business Action

Action 是企业行为。

例如：

Create Expense

Approve

Freeze Budget

Generate Voucher

Send Notification

Action 必须：

幂等。

可审计。

可追踪。

---

# 第七章

Policy

Policy 描述制度。

例如：

住宿500元。

三级审批。

预算不足禁止采购。

Policy 不属于 Workflow。

Policy 可独立替换。

---

# 第八章

Constraint

Constraint 描述限制。

例如：

Budget > Expense

Department == Finance

Date <= Today

Attachment Exists

Constraint 永远独立。

---

# 第九章

Resource

业务消耗资源。

例如：

Budget

Inventory

Money

Time

Employee

License

GPU

Resource 可共享。

可锁定。

可释放。

---

# 第十章

Outcome

Outcome 描述目标。

例如：

Expense Approved

Workflow Finished

Budget Frozen

Notification Sent

Outcome 必须：

可验证。

---

# 第十一章

Relationship

对象之间全部通过：

Graph。

例如：

Employee

↓

Create

↓

Expense

↓

Reference

↓

Project

↓

Consume

↓

Budget

↓

Trigger

↓

Workflow

↓

Produce

↓

Voucher

整个企业都是 Graph。

不是树。

---

# 第十二章

Business Graph

BSAST 本质：

Graph。

节点：

Entity

Action

Policy

Constraint

Resource

Outcome

边：

Reference

Depend

Consume

Produce

Require

Trigger

Authorize

所有 Runtime

均运行 Graph。

---

# 第十三章

Execution Graph

Planner

读取：

Business Graph。

生成：

Execution Graph。

Execution Graph

已经包含：

并行。

顺序。

等待。

重试。

超时。

Execution Graph

才进入 Scheduler。

---

# 第十四章

Generator

Generator

读取：

BSAST。

生成：

Workflow

API

Database Migration

Agent

Vue

OpenAPI

任何 Generator

均不得修改 BSAST。

---

# 第十五章

BSAST 不包含

SQL

Redis

RabbitMQ

HTTP

Vue

Python

Java

Docker

Kubernetes

这些属于：

Implementation Layer。

---

# 第十六章

BSAST 生命周期

DNA

↓

Compiler

↓

BSAST

↓

Planner

↓

Execution Graph

↓

Generator

↓

Runtime

↓

Event

↓

Evolution

↓

DNA

形成闭环。

---

# 第十七章

版本

BSAST

必须支持：

Version。

任何 Evolution

均生成：

新 BSAST。

旧版本：

永远保留。

---

# 第十八章

最终原则

Business Semantic AST

是企业唯一业务语义。

任何 Runtime

必须理解：

BSAST。

任何 Generator

必须生成：

BSAST。

任何 AI

必须推理：

BSAST。

BSAST

是企业软件真正的中间语言。

未来：

企业软件不再围绕代码。

企业软件围绕：

Business Semantic。
