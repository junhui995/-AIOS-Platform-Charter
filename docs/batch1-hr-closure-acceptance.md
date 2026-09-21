# Batch 1 — 请假自助 / 报销进流程 / 预警中心 验收记录

日期：2026-09-21
范围：Portal 端第一批核心人事闭环（无需改动数据库 schema）
本地提交：本文件随同批次一起提交（未 push，遵守用户指示）

---

## 1. 交付内容

### 1.1 请假自助（提交即进 BPM，通过后自动扣额）
- 数据层 `packages/data-service/src/repositories/leave.ts`
  - 新增 `listWithDetails()`（带员工）、`ensureBalance()`（首次申请自动建默认额度 年假10/病假5）、
    `balanceWithEmployees()`、`applyApproval()`（事务内校验并扣减年假/病假，拒绝则只改状态）。
  - 导出 `leaveDays()` 计算含首尾的请假天数。
- 审批流：新流程定义 `WF-LEAVE-APPROVAL`（"请假审批流程"）由 `ensureApprovalDefinition` 幂等播种，
  提交申请时 `WorkflowEngine.start()` 生成 `ProcessInstance` + `ProcessTask`（审批人=管理员 EMP-000，
  通过 `formData.approverId` 的 FORM_VARIABLE 策略解析，不落库硬编码 id）。
- API：`GET/POST /api/leave`、`PATCH /api/leave/[id]`（完成 BPM 任务 + 回写状态 + 发事件）、
  `GET /api/leave/balances`。
- 页面：`apps/portal/src/app/hr/leave/page.tsx`（提交表单 / 额度卡片 / 记录表 / 通过·驳回）。

### 1.2 报销进入审批流程
- `packages/data-service/src/repositories/expense.ts` 新增 `listWithDetails()`（含申请人/部门/审批人）。
- 读时对账：`GET /api/hr/expenses` 串行检查每条 `PENDING_APPROVAL` 是否已有审批实例，
  没有则补开 `WF-EXPENSE-APPROVAL` 实例（保证 AIOS Runtime 产出的待审批单都会出现在 BPM 任务中心）。
- API：`PATCH /api/hr/expenses/[id]`（APPROVE→`ExpenseApproved`，REJECT→`ExpenseRejected`，
  并完成对应 BPM 任务；对非 SUBMITTED/PENDING_APPROVAL 返回 409）。
- 页面：`apps/portal/src/app/hr/expenses/page.tsx`（统计卡 / 列表 / 通过·驳回 / 流程号展示）。
- 事件：`EventTypes` 新增 `EXPENSE_REJECTED`。

### 1.3 预警中心
- `packages/data-service/src/repositories/alert.ts`（新）：`list / record / resolve / counts / runRules`。
  三条规则：`contractExpiry`（合同 ≤60 天到期，≤30 高）、`probationExpiry`（试用期 6 个月口径 ≤90 天）、
  `attendanceAnomaly`（近 7 天非 NORMAL 考勤）。`record` 按 (type, relatedObjectId) 对未关闭预警幂等。
- API：`GET/POST /api/alerts`（POST 运行规则引擎并返回 raised+counts）、`PATCH /api/alerts/[id]`（关闭）。
- 页面：`apps/portal/src/app/hr/alerts/page.tsx`（分级统计 / 类型·状态筛选 / 运行引擎 / 标记已处理）。

### 1.4 其它
- 侧边栏 `Sidebar.tsx` 新增入口：请假与假期、报销审批、预警中心（新分组"预警与洞察"）。
- 修复 `WorkflowEngine.completeTask`：原实现完成后重跑同一审批节点会**重复建任务**；
  改为 `advancePastCompletedNode()`，先按路由推进再执行下游节点（实例可正常归档 COMPLETED）。

---

## 2. 实测证据（本地 dev + SSH 隧道连服务器 Postgres）

### 请假（Alice 年假 2 天）
```
POST /aios/api/leave -> state=create+workflow, id=c7e0db4d…, status=PENDING, instanceId=05a35b1f…
GET  /aios/api/workflow/tasks -> 1 条：部门审批 | PENDING | assignee=c61ce026…(管理员) | def=请假审批流程
PATCH /aios/api/leave/c7e0db4d… {APPROVE} -> status=APPROVED, taskCompleted=true
GET  /aios/api/leave/balances -> Alice | 年假 2/10 | 病假 0/5
GET  /aios/api/workflow/instances -> 05a35b1f… COMPLETED（tasks: COMPLETED,COMPLETED）
```
第二条（张三病假 1 天）：提交→1 张任务→通过→实例 COMPLETED、pending 任务 0（无残留）。

### 报销
```
GET /aios/api/hr/expenses -> 3 张 PENDING_APPROVAL 全部补开流程实例
PATCH /aios/api/hr/expenses/24e8996c… {REJECT} -> status=REJECTED, taskCompleted=true
GET /aios/api/workflow/instances -> a063df20… REJECTED
outbox 最新：ExpenseRejected | PENDING | decision=REJECT
```

### 预警
```
（夹具：张三新增合同 HT-2026-S07-* 于 2026-10-06 到期；Alice 当日 ABSENT）
POST /aios/api/alerts -> raised=2, rules=[contractExpiry, probationExpiry, attendanceAnomaly]
GET  /aios/api/alerts -> open=2,total=2,byLevel={high:2}
   high | attendanceAnomaly | Alice 考勤异常: ABSENT
   high | contractExpiry    | 张三 合同 15 天内到期
再次 POST -> raised=0（幂等生效），open=2
PATCH /api/alerts/<contractExpiry id> -> status=resolved；再查 open=1
```

### Outbox 汇总
```
ExpenseCreated|PUBLISHED x4, ExpenseApprovalRequired|PUBLISHED x4, ToolCalled|PUBLISHED x11
LeaveRequestCreated|PENDING x2, LeaveRequestStatusChanged|PENDING x3, ExpenseRejected|PENDING x1
```
说明：Portal 进程未常驻 dispatcher，页面写入的事件停留在 PENDING（durable），
由 Runtime/CLI 侧的 dispatcher 消费（与 P2 的 outbox 机制一致）。

---

## 3. 门禁
```
pnpm typecheck            -> 6/6 包通过（含 apps/portal tsc --noEmit）
pnpm test                 -> 7 files / 40 tests passed
pnpm lint                 -> 0 error（packages）
pnpm --filter @aios/portal run lint -> No ESLint warnings or errors
```
（注：改 data-service/events 后需 `pnpm --filter @aios/data-service build` 与 `... @aios/events build`，
因为它们通过 `dist` 供 portal 消费；Windows 下需先停 dev，否则 Prisma 引擎 DLL 被占用报 EPERM。）

---

## 4. 已知限制 / 后续
- 预警 `probationExpiry` 采用"入职 +6 个月"口径（现 schema 无试用期字段）；如需精确应扩 schema。
- 报销的 BPM 实例在**读取列表时对账补开**（无后台 worker）；后续可改为消费
  `ExpenseApprovalRequired` 事件由 workflow 订阅器自动建单。
- 请假重复审批仍会发一次 `LeaveRequestStatusChanged`（页面仅对待审批显示按钮，正常 UI 不会触发）。
- 审批完成只支持单分支顺序推进（引擎 Phase 1 语义），并行会签留待后续。

---

## 5. 涉及文件
```
packages/data-service/src/repositories/leave.ts        (改)
packages/data-service/src/repositories/expense.ts      (改 listWithDetails)
packages/data-service/src/repositories/employee.ts     (改 findByCode)
packages/data-service/src/repositories/workflow.ts     (改 findByCode/findOrCreateDefinition/findInstanceByFormField/findPendingTaskByInstance)
packages/data-service/src/repositories/alert.ts        (新)
packages/data-service/src/index.ts                     (导出 alert)
packages/events/src/index.ts                           (增 EXPENSE_REJECTED)
apps/portal/src/lib/workflow/approval.ts               (新：播种+开单+完成任务)
apps/portal/src/lib/workflow/engine.ts                 (修 advancePastCompletedNode)
apps/portal/src/app/api/leave/route.ts                 (改)
apps/portal/src/app/api/leave/[id]/route.ts            (新)
apps/portal/src/app/api/leave/balances/route.ts        (新)
apps/portal/src/app/api/hr/expenses/route.ts           (新)
apps/portal/src/app/api/hr/expenses/[id]/route.ts      (新)
apps/portal/src/app/api/alerts/route.ts                (新)
apps/portal/src/app/api/alerts/[id]/route.ts           (新)
apps/portal/src/app/hr/leave/page.tsx                  (新)
apps/portal/src/app/hr/expenses/page.tsx               (新)
apps/portal/src/app/hr/alerts/page.tsx                 (新)
apps/portal/src/components/layout/Sidebar.tsx          (改)
```
