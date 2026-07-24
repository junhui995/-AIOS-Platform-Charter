# Workflow Specification
# 工作流规范

Version: 1.0

Status: Draft

Depends:
000 Platform Charter
001 Runtime

---

# 第一章

Workflow 的核心职责

在 AIOS 中，Workflow 是 Runtime 的一部分，但**不是**计算业务或处理数据的中心。

Workflow 仅负责以下编排和状态流转：
审批节点流转。
任务状态机（Pending, InProgress, Approved, Rejected 等）。
节点超时与催办通知。
权限检查（谁有资格进行此步审批）。

Workflow 绝不允许：
执行 SQL 查询。
编写复杂的业务计算脚本。
代替 Agent 进行基于自然语言理解的推理。

---

# 第二章

Human-in-the-Loop (人在回路)

尽管理想目标是“AI 自动完成业务”，但在高风险、涉及大额资金或人事变动的场景中，必然需要人类介入决策。
这是 Workflow 的主要舞台。

当 Planner 规划出一条包含人工确认的 Task Graph 时：
1. Agent 准备好所有材料、总结和建议。
2. 调度器将任务移交给 Workflow 引擎挂起等待。
3. Workflow 通知人类用户审批。
4. 人类用户决策产生 Event（如 WorkflowApproved）。
5. 监听此 Event 的 Runtime 继续后续的 Agent 任务。

---

# 第三章

Workflow 与 Event 驱动

AIOS 中一切皆事件（Everything is Event）。
Workflow 的流转是通过事件驱动的，而不是强同步调用。

这意味着：
当一个节点完成时，抛出一个领域事件（如 `PurchaseOrderReviewed`）。
下一个监听此事件的 Workflow 节点或 Agent 被唤醒。

这种松耦合设计使得我们可以随时替换某个环节的处理方式（从人工审批改为 AI 自动审批），而不需要重写整个流程代码。

---

# 第四章

Workflow 的可追溯性

企业的 Workflow 执行过程可能长达数周（如招聘流程、复杂合同签署）。

Workflow 的每一个状态跃迁必须被永久记录。
记录必须包含：
- 节点触发时间。
- 参与的 Actor（无论是人类还是 Agent）。
- 提交的 Context。
- 最终的结论（如同意、驳回原因）。

这些日志将被输入到 AIOS 的 Learning 模块中，帮助优化未来的流程耗时并识别流程瓶颈。
