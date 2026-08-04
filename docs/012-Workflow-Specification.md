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


## 7. 高级功能配置 (Advanced Capabilities)

### 7.1 处理人策略 (Assignee Strategies)
节点支持多种复杂的处理人寻址策略，以适应动态的企业组织架构：
- **DIRECT_MANAGER**: 相对策略，寻找发起人的直接主管。
- **DEPT_HEAD**: 相对策略，寻找发起人所在部门的负责人。
- **SPECIFIC_ROLE**: 指定策略，分配给具有特定系统角色（如 HRBP、法务专员）的所有人或空闲人员。
- **SPECIFIC_USER**: 指定策略，直接绑定到特定的员工 ID。
- **FORM_VARIABLE**: 动态策略，在运行时读取表单内的字段数据（例如 `approverId`）来决定处理人。

### 7.2 会签与或签 (Multi-Sign Types)
- **OR_SIGN (或签)**: 候选组中只需一名处理人同意，节点即通过。
- **AND_SIGN (会签)**: 候选组中必须所有处理人同意，节点才可通过。

### 7.3 网关与流转条件 (Gateways & Routing)
- **排他网关 (EXCLUSIVE)**: 类似于 XOR，引擎会计算流出连线上的条件表达式（如表单中的 `amount > 5000`），并且只走第一条满足条件的分支。
- **并行网关 (PARALLEL)**: 类似于 AND，无视条件，流程同时沿着所有流出分支推进，从而生成多个并发的审批任务。

### 7.4 流程完成后动作 (Webhooks & Actions)
支持在节点或流程结束时绑定自动化动作（Webhooks）。例如，在“入职审批”结束节点，可以自动调用接口为新员工分配系统账号。

### 7.5 流程预测与模拟 (Simulation)
提供前置预测 API (`/api/workflow/simulate`)。用户在填写表单但未提交发起之前，系统可以通过预演传入的数据及条件网关，动态渲染出即将会经过的审批路径与节点。

### 7.6 流程版本控制 (Version Control)
分离 `WorkflowDefinition` (定义) 和 `WorkflowVersion` (具体版本)。修改流程连线、增删节点或者绑定新表单后，系统会保存为新版本。已经在运行的历史流程实例不受新版本影响，继续按照其发起时的版本流转。

### 7.7 补运行与后台干预 (Admin Retro-Execution)
提供后台干预 API (`/api/workflow/retro`)。当流程因为不可抗力卡死（例如人员离职导致找不到上级，或者外部系统回调失败），管理员可以直接强制取消当前停滞的任务，并将流程实例的状态跳转至任意指定节点重新开始计算。
