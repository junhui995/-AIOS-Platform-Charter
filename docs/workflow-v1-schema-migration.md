# AIOS Workflow BPM V1.0 Schema Migration

## 1. 修改内容
本次迁移将早期 Workflow 的“纯流程定义存储阶段”，严格升级至满足企业级运行、记录、追踪需求的“BPM 可执行引擎标准架构”。
核心重构内容如下：
- **`WorkflowDefinition`** 卸载了运行时不应该包含的 `nodes` 和 `edges`，还原其仅仅作为流程身份注册模板与类别控制的功能，新增一对多的 `versions`。
- **`WorkflowVersion`**（新增）负责承载流程流转的具体逻辑执行快照。任何运行中的业务节点、分支或条件配置全部挂载在其上，不可在发布后变动，从而确保历史已运行任务不出错。
- **`ProcessInstance`**（新增）对应每次业务行为真正的单次“跑路”，其只绑定确切的 `versionId`，抛弃对基础 Definition 的直接引用。
- **`ProcessTask`** 和 **`ProcessLog`** （新增）处理具体人员动作、自动派发，保证了对每次审核（PENDING/COMPLETED/REJECTED/CANCELLED）行为具备永久强审核记录约束，并强制实施结构化 `details: Json` 日志数据。

## 2. 数据模型关系图
\`\`\`text
 WorkflowDefinition (1)
        |
        |
 WorkflowVersion (N)
        |
        |
 ProcessInstance (N)
        |
    +---+---+
    |       |
 Process  Process
  Task      Log
   (N)      (N)
\`\`\`

## 3. API 调整说明
1. **/api/workflow/definitions** 系列: 创建一个流即等同于创建一次 `Definition` 与 首个 `WorkflowVersion (DRAFT)` 的打包。
2. **/api/workflow/instances**: 创建实例时仅接受 `versionId`（如未提供则在后端提取最新的 Publish 版本 id），随后从该 `WorkflowVersion` 解析首节点，并且不再出现 `catch { console.error(error) }` 等类型丢失问题。所有的解析与错误抓取均经过 Strict Type 修订（`error: unknown`）。
3. **分配策略简化 (V1.0)**: 当前版本实现了对 `FORM_VARIABLE` (从 `formData` 抽取 `approverId`) 和 `SPECIFIC_USER` 的有效识别提取。针对空分配与占位符进行容错排查，避免直接写死虚假员工 ID。

## 4. 后续 HRM 使用方式
将来所有的业务（请假申请 LeaveRequest、薪资调整、绩效考核等）：
1. 其表单操作结束阶段，不直接去修改 HR 相关的最终审核数据。
2. 转而使用 `POST /api/workflow/instances`，绑定其 `businessType` (`LeaveRequest`) 及主键。
3. 待流程 `ProcessInstance` 流转终点（触发 webhook 或异步校验为 `status === 'COMPLETED'`）后，才能最终正式改写人事报表状态。
