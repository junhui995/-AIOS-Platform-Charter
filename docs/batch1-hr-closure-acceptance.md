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

---

# Batch 1.1 — 用户反馈收敛（请假拆双端 / 预警引擎可见 / 报销本期不做）

日期：2026-09-22
说明：响应产品诉求调整交付口径并补充闭环能力。**报销不在本期范围内**

## 6. 本期变更（按最新反馈收敛）

### 6.1 请假拆分为「用户端」+「管理端」
- 数据层 `leave.ts` 新增：
  - `updateRequest()` —— 仅 PENDING 可改（假别/日期/事由），改完发 `LeaveRequestStatusChanged(UPDATED)`。
  - `returnFromLeave(id, usedDays)` —— 仅 APPROVED 可销假，事务内退还未休天数（按 ANNUAL/SICK 回退对应额度），状态置 `RETURNED`。
  - `updateBalance()` —— 管理端设置年假/病假总额（upsert）。
  - `deletePending()` —— 仅 PENDING 可撤销（删除）。
- 流程层 `workflow.ts` 新增 `cancelInstance()`（实例置 CANCELLED）+ `cancelPendingTasks()`（清掉 PENDING 任务）；
  撤销请假时同步取消运行中的审批实例，不留僵尸任务。
  - 顺带修复 pnpm+Prisma 声明导出问题：`instanceInclude` 推断载荷不可移植导致
    `TS2742 workflowRepository`，改为显式 `import type { Prisma } from '@prisma/client'`
    + 对 `listInstances` 注解 `Prisma.ProcessInstanceGetPayload<{ include: InstanceInclude }>`（build 才真正跑通）。
- API：
  - `PATCH /api/leave/[id]` 增加 `UPDATE`（改待审单）与 `RETURN`（销假，必填 `usedDays`）。
  - 新增 `DELETE /api/leave/[id]`（仅 PENDING；顺带取消审批实例）。
  - `PATCH /api/leave/balances`（`{ employeeId, annualTotal?, sickTotal? }` 设限额）。
- 页面：
  - 用户端（新）`apps/portal/src/app/my/leave/page.tsx`：身份选择器（demo 无登录）/
    我的额度卡 / 发起申请（自动起流程）/ 记录表内联「修改」「撤销」「销假（填实际休假天数）」。
  - 管理端（重构）`apps/portal/src/app/hr/leave/page.tsx`：移除自助提交表单，改为
    全部记录 + 状态筛选 + 通过/驳回 + 额度卡与「设限额」编辑（保存走 PATCH /api/leave/balances）。
  - Sidebar 新增「员工自助 (Self-Service)」分组，入口「我的假期」；原「请假与假期」更名「假期审批与管理」。

### 6.2 预警中心「运行规则引擎」可见化
- `alert.ts` 的 `runRules()` 内部重构为按规则汇总：返回
  `{ raised, skipped, ranAt, rules: [{ rule, scanned, hit, raised, skipped }] }`（幂等跳过照旧）。
- `/api/alerts` POST 直接回传该 run 结果；页面右上角按钮点击后渲染「最近一次运行」结果面板：
  本次新增/幂等跳过/扫描·命中/覆盖规则数 + 每条规则的扫描·命中·新增·跳过明细与失败提示（红色）。

### 6.3 报销：本期不做
- 页面与审批功能保持 Batch 1 交付现状（`/hr/expenses`、`WF-EXPENSE-APPROVAL`、Expense* 事件均保留）。
- 本期无任何报销扩展；后续如需增强（如用户端报销自助/明细联动）另立任务。

## 7. 实测记录（本机 → 远程 DB）

- 创建→修改→撤销：Alice SICK 1 天（`f02262b8…`）→ UPDATE 改至 09-26 → DELETE：
  返回 `deleted:true` 且实例 `566132a1…` 状态变为 `CANCELLED`、PENDING 任务置空。
- 审批→销假退款：张三 ANNUAL 1 天（`68d32c9a…`）→ APPROVE（管理员，`taskCompleted:true`）→
  RETURN `usedDays:0` → 返回 `{approvedDays:1, used:0, refund:1}`，张三 `annualUsed` 回到 0。
- 限额设置：Alice `annualTotal 12→10` 两次 PATCH 均生效（`updatedAt` 更新）。
- 预警运行明细：POST /api/alerts 返回
  `raised:1, skipped:1`；`contractExpiry scanned=2,hit=1,raised=1`、
  `probationExpiry scanned=1,hit=0,raised=0`、`attendanceAnomaly scanned=1,hit=1,raised=0`（已存在幂等跳过）。
- 页面：`/my/leave`、`/hr/leave`、`/hr/alerts` 全部 200 且内嵌关键文案（我的假期/提交并启动审批流/设限额/运行规则引擎等）。

## 8. 门禁
- typecheck：`pnpm -r run typecheck` 6/6 通过（含 data-service、portal）。
- test：`pnpm test` 7 文件 / **40 用例全过**。
- lint：`pnpm lint`（packages）0 问题；`next lint`（portal）0 问题。

## 9. 本次涉及文件
```
packages/data-service/src/repositories/leave.ts        (updateRequest/returnFromLeave/updateBalance/deletePending)
packages/data-service/src/repositories/workflow.ts     (cancelInstance/cancelPendingTasks + TS2742 修复)
packages/data-service/src/repositories/alert.ts        (runRules 按规则明细)
apps/portal/src/app/api/leave/[id]/route.ts            (UPDATE/RETURN + DELETE)
apps/portal/src/app/api/leave/balances/route.ts        (+PATCH 限额)
apps/portal/src/app/api/alerts/route.ts                (POST 回传 run 明细)
apps/portal/src/app/my/leave/page.tsx                  (新：用户端自助)
apps/portal/src/app/hr/leave/page.tsx                  (重构：管理端)
apps/portal/src/app/hr/alerts/page.tsx                 (运行结果面板)
apps/portal/src/components/layout/Sidebar.tsx          (员工自助分组)
docs/batch1-hr-closure-acceptance.md                   (本文件)
```
提交：本地提交（未 push，遵守用户指示）。
