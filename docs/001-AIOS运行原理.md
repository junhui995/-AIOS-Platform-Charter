# AIOS Runtime Specification
# AIOS 运行原理规范

Version: 1.0

Status: Draft

Depends:

000-平台宪章

---

# 第一章

什么是AIOS

AIOS（AI Operating System for Enterprise）

不是办公软件。

不是OA。

不是ERP。

不是CRM。

AIOS 是企业数字操作系统。

AIOS 负责理解企业。

理解员工。

理解业务。

理解数据。

协调所有资源完成业务目标。

AIOS 永远站在企业视角。

而不是站在某一个用户视角。

---

# 第二章

AIOS 的本质

AIOS 是一个持续运行的 Enterprise Agent。

它始终运行。

始终观察企业。

始终等待事件。

始终分析企业状态。

它不是：

Request → Response

而是：

Observe

Think

Plan

Execute

Learn

Observe

……

不断循环。

---

# 第三章

AIOS Runtime Loop

AIOS 永远运行以下循环。

Observe

↓

Understand

↓

Planning

↓

Scheduling

↓

Execution

↓

Verification

↓

Memory

↓

Observe

整个企业永远运行于 Runtime Loop。

---

# 第四章

Observe

Observe 是 AIOS 的输入层。

Observe 接收：

用户输入

系统事件

Workflow事件

数据库变化

消息

邮件

文件

图片

PDF

Word

Excel

合同

发票

IoT设备

API

所有企业信息最终都会进入 Observe。

Observe 永远不产生业务。

它只负责采集事实。

---

# 第五章

Understand

Understand 是 Runtime 第一层智能。

任务：

理解 Observe 中发生了什么。

例如：

员工：

"我要报销。"

AI：

识别：

Intent

Entity

Constraint

Workflow

Business Domain

Risk

Confidence

Understand 不执行任务。

只产生：

Business Context。

---

# 第六章

Planning

Planner 是 AIOS CPU。

Planner 输入：

Business Context。

Planner 输出：

Task Graph。

例如：

报销。

Planner 会拆分：

识别发票。

查询出差。

检查预算。

生成报销。

发起审批。

通知申请人。

Planner 永远不直接调用数据库。

Planner 永远只规划。

---

# 第七章

Scheduling

Scheduler 接收 Task Graph。

Scheduler 决定：

哪个 Agent。

什么时候执行。

是否并行。

是否等待。

是否重试。

是否回滚。

Scheduler 是 Runtime 调度中心。

---

# 第八章

Execution

Execution 是真正执行业务。

Execution 调用：

Expense Agent

Invoice Agent

Finance Agent

Contract Agent

Knowledge Agent

Workflow Agent

Project Agent

……

Agent 再调用：

Tool。

Tool 再调用：

Data Service。

Data Service 再访问数据库。

Runtime 永远不会跨层调用。

---

# 第九章

Verification

所有 Agent 返回以后。

Verifier 检查：

是否完成。

是否失败。

是否违反制度。

是否违反权限。

是否违反预算。

是否违反安全。

Verifier 可以重新进入：

Planning。

Runtime 永远允许修正。

---

# 第十章

Memory

Memory 保存：

用户偏好。

企业知识。

业务经验。

执行历史。

Prompt。

Agent 推理。

Workflow。

Memory 永远不是数据库。

Memory 是 AI 的长期经验。

---

# 第十一章

Business Context

Business Context 是 Runtime 最重要对象。

任何任务必须先转换成：

Business Context。

例如：

{
    Intent

    Actor

    Department

    Organization

    Workflow

    Domain

    Resource

    Constraint

    Policy

    Time

    Risk

    Confidence
}

所有 Agent 都读取同一个 Context。

---

# 第十二章

Task Graph

Planner 不输出代码。

Planner 输出：

Task Graph。

例如：

Task

↓

Task

↓

Parallel

↓

Task

↓

Workflow

↓

Finish

Task Graph 是 Runtime 唯一执行计划。

---

# 第十三章

Agent

Agent 是能力。

Agent 永远不知道：

数据库。

页面。

Workflow。

Agent 只完成：

一种业务能力。

例如：

Expense Agent。

只懂：

Expense。

---

# 第十四章

Tool

Tool 是 Runtime 唯一执行能力。

Agent 不允许：

SQL。

HTTP。

Redis。

RabbitMQ。

全部通过：

Tool。

例如：

QueryEmployee()

CreateExpense()

FreezeBudget()

PushMessage()

StartWorkflow()

---

# 第十五章

Workflow

Workflow 是 Runtime 一部分。

不是 Runtime 中心。

Workflow 负责：

审批。

状态。

权限。

超时。

流转。

Workflow 永远不负责：

业务。

AI。

SQL。

---

# 第十六章

Data Service

Data Service 是 Runtime 数据层。

负责：

事务。

Repository。

缓存。

数据库。

所有数据库操作必须经过：

Data Service。

---

# 第十七章

Knowledge

Knowledge 提供：

制度。

合同。

标准。

流程。

法律。

企业经验。

Knowledge 永远通过：

RAG。

禁止 Prompt 内置制度。

---

# 第十八章

Event

AIOS 一切都是 Event。

例如：

ExpenseCreated。

WorkflowApproved。

ContractSigned。

InvoiceUploaded。

MeetingFinished。

任何状态变化。

必须产生 Event。

---

# 第十九章

Learning

Learning 不属于 Runtime。

Learning 是离线过程。

Learning：

分析日志。

分析成功率。

分析错误。

更新知识。

优化 Prompt。

优化 Planner。

优化 Agent。

Learning 永远不会直接影响线上 Runtime。

必须经过审核。

---

# 第二十章

Runtime Guarantees

AIOS Runtime 保证：

所有任务可追踪。

所有任务可恢复。

所有任务可回滚。

所有任务可解释。

所有 Agent 可替换。

所有 Tool 可替换。

所有模型可替换。

所有数据库可替换。

所有 Workflow 可替换。

企业数据永远属于企业。

AI 永远只是 Runtime。
