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

---

# Batch 2 阶段 A — 监控规则引擎（后端先行）

日期：2026-09-22
决策：用户确认「后端先行」推进规则引擎大改造；本文档记阶段 A（数据模型 + DSL + registry + 调度 + API），
弹窗 UI（字段树/公式编辑器/渠道配置）为阶段 B，钉钉/企业微信适配器为阶段 C，均留待后续。

## 10. 需求收敛（用户定义 ≈80%，缺口已补）
- 用户原始：多行规则列表；每行=调度/时间 + 监控事项（任意表单任意字段，图形化字段选择）+
  公式触发条件 + 报警内容（带日志）+ 渠道（站内 / 钉钉 / 企业微信）。
- 补齐的设计缺口：行级 vs 聚合触发语义、时间窗口（now / daysUntil / daysSince）、
  Delta 游标（RuleRunLog.cursor 预留）、AND/OR + 类型校验、幂等与 10s 防重跑、
  渠道模板 + 重试/合并/升级（MonitorRuleAction 预留）、DSL 白名单函数沙箱（禁 eval）、
  RuleRunLog / NotificationLog 双日志与恢复通知、表单字段 registry。

## 11. 数据模型（schema.prisma 追加，`prisma db push` 已应用）
- `MonitorRule`：code(unique)/name/module/level/enabled/target/scopeFilter(Json?)/
  conditionExpr/schedule(Json {kind, minutes?, at?})/version/lastRunAt/createdBy/updatedBy。
- `MonitorRuleAction`：ruleId(级联)/channel(inapp|email|dingtalk|wecom|webhook)/template/throttleSec/enabled。
- `RuleRunLog`：ruleId(级联)/ranAt/scanned/hit/raised/skipped/durationMs/status/cursor(Json?)/error。
- `NotificationLog`：ruleId?/channel/alertId?/target/ok/error/sentAt。
- 无 migrations 目录，沿用 `prisma db push`；改 schema 后需先停 dev 再 build（DLL EPERM）。

## 12. DSL 与字段 registry
- `repositories/ruleEngine.ts`（新）：词法 + Pratt 解析 + 沙箱求值。
  字段 `@path`（hasOwnProperty 逐段取值，阻止 `__proto__`/`constructor` 原型探测）；
  运算符 `== != > >= < <= && || ! + - * / %`；`null` 字面量（`== null` 判缺失）；
  函数 now/daysUntil/daysSince/date/int/string/len/upper/lower/contains/startsWith/
  endsWith/abs/round；短路求值；非法表达式 `parseCondition` 返回 `{ok:false,error}`。
  导出 `parseCondition/compileCondition/evaluateCondition/renderTemplate({{field}})`。
- `repositories/registry.ts`（新）：`entityRegistry` 五实体（laborContract/employee/
  leaveRequest/expense/dailyAttendance），字段名/中文标签/类型/derived，供 UI 字段树与校验用。
- 注意：registry 与实际表字段已对齐（Employee 无 department 关系 → 无 departmentName；
  Expense 无 category/date → 用 amount(Number)/reason/createdAt）。

## 13. Repository 与调度
- `repositories/monitor.ts`（新）：`monitorRepository`：
  listRules/getRule/createRule/updateRule/deleteRule/listRunLogs/runRule/runDueRules/seedDefaultRules；
  派生字段（daysRemaining/daysToProbationEnd/days）由 fetchTargetRows 计算后求值；
  命中按 `(type=rule.code, relatedObjectId, status pending|processing)` 对 Alert 去重（幂等）；
  NotificationLog：inapp 直落 ok=true，外部渠道 ok=false 标注「外部渠道适配器待接入（Phase C）」；
  同一规则 10s 内重复 run 返回 `status:'cancelled'` 防双触发。
- 播种：`seedDefaultRules()` 幂等（code 判存在）内置 RULE-CONTRACT-EXPIRY /
  RULE-PROBATION-EXPIRY / RULE-ATTENDANCE-ANOMALY（与原 alert.ts 三规则镜像）。
- 调度：`apps/portal/src/instrumentation.ts`（新，nodejs 运行时启动时注册）+ `next.config.mjs`
  开 `instrumentationHook`：启动播种 + 每 60s `runDueRules()`（schedule = interval|dailyAt|manual，isDue 判定）。
- 注：schema 已含 MonitorRule/… 四表，**无数据迁移文件**，符合仓库 db push 惯例。

## 14. Portal API
```
GET  /api/monitor/rules                    -> { rules, summary:{total,enabled,lastRunAt,openAlerts} }
POST /api/monitor/rules                    -> 建规则（body 含 code/name/module/level/target/
                                             scopeFilter/conditionExpr/schedule/actions，校验 DSL）
PATCH /api/monitor/rules/[id]              -> 更新（scopeFilter:null 置 Prisma.JsonNull 清空）
DELETE /api/monitor/rules/[id]             -> 删除（级联清 actions/runLogs）
POST /api/monitor/rules/[id]/run           -> 立即运行，返回 RuleRunSummary
GET  /api/monitor/rules/[id]/logs?take=N   -> 运行日志（RuleRunLog 倒序）
GET  /api/monitor/registry                 -> entityRegistry（字段树/公式编辑器数据源）
```

## 15. 实测记录（本机 → 远程 DB / dev:3000）
- seed：`SEED ["RULE-CONTRACT-EXPIRY:created","RULE-PROBATION-EXPIRY:created","RULE-ATTENDANCE-ANOMALY:created"]`；dev 重启 seed 幂等 `:exists`。
- node 直调：RULE-PROBATION-EXPIRY run → `scanned:1,hit:0`（张三试用期 >90 天，正常不触发）；
  10s 内重跑 → `status:'cancelled'`。
- 命中路径（临时规则 `@code == "EMP-002"`）：`scanned:3,hit:1,raised:1`；Alert(relatedObjectId=EMP-002, pending)
  + NotificationLog(inapp ok:true, 绑定 alertId)；重跑 cancelled；删除规则后级联清理。
- HTTP 全链路：POST /rules(201) → run(`scanned:3,hit:0`) → logs(200) → PATCH(200) → DELETE(200)。
  测试遗留 Alert(RULE-TEST-TMP) 与无主 NotificationLog 已清理，库中现有 3 条内置规则。
- 调度：dev 日志 `[monitor] scheduler registered (tick every 60s)`。

## 16. 门禁
- `pnpm -r run typecheck` 6/6 通过；`pnpm test` 8 文件 / **49 用例全过**（新增 ruleEngine.test.ts 9 项）；
  `next lint`（portal）0 问题。
- 提交：本地提交（未 push，遵守用户指示）。

## 17. 阶段 B / C 待办
- C：dingtalk / wecom 渠道适配器（MonitorRuleAction.template + webhook / robot HTTP），替换 ok=false 标注。
- 其余：聚合/Delta 游标后续规则可能用到；RunLog 保留 cursor 字段暂未写入。

---

# Batch 2 阶段 B — 规则引擎 UI（独立页 /hr/rules + 抽屉二级面板）

日期：2026-09-22
决策：用户确认采用「独立页面 /hr/rules」+「抽屉内二级面板」（点行滑出配置面板，列表常显）。

## 19. 交付内容
- 页面 `apps/portal/src/app/hr/rules/page.tsx`（新，client）：规则多行列表（名称/code / 级别 / 监控事项 /
  调度 / 最近运行 / 待处理预警数 / 启停开关 / 编辑），头部汇总卡（总数 / 启用中 / 最近运行 / 待处理预警）、
  「新建规则」「刷新」；数据来自 `GET /api/monitor/rules`（含 summary.openAlerts 按 code 汇总）。
- 二级配置面板 `apps/portal/src/components/rules/RuleDrawer.tsx`（新，宽 720px 右滑抽屉）：
  - 配置 Tab：基本信息（code/name/module/级别/启停）、监控事项（registry 实体下拉）、
    公式触发条件（字段树 chips 点击注入 `@field` + textarea + 「检查语法」）、
    调度（每日定时 / 每隔多久 / 仅手动）、高级数据范围（scopeFilter JSON，编辑留空=清空）、
    报警渠道与内容（inapp/钉钉/企微多选 + `{{field}}` chips 注入模板）。
  - 运行日志 Tab：「立即运行」按钮 + 最近一次结果卡（扫描/命中/新增/跳过）+ 日志表（RuleRunLog 倒序 20 条）。
  - 新建 = POST /api/monitor/rules；编辑 = PATCH；删除（二次确认）；`scopeFilter:null` 清空过滤。
- 语法检查端点 `apps/portal/src/app/api/monitor/validate/route.ts`（新）：POST `{conditionExpr}`
  → `{ok}` 或 `{ok:false,error}`（复用后端 DSL parseCondition，客户端不引 data-service 避免打包 Prisma）。
- Sidebar「预警与洞察」新增「规则引擎」（/hr/rules，Gauge 图标）。

## 20. 实测记录（dev:3000）
- `GET /aios/hr/rules` → 200，SSR 含标题与侧边栏入口。
- `POST /api/monitor/validate`：合法 `@daysRemaining <= 60 && @daysRemaining > 0` → `{ok:true}`；
  非法 `@amount ++ 5` → `{ok:false,error:"Unexpected token\"+\" at 9"}`。
- CRUD/run/logs 链路沿用阶段 A 已验证的 API；抽屉生成 payload 结构一致（actions 按所选渠道映射）。

## 21. 门禁
- `pnpm --filter @aios/portal typecheck` 0 问题；`next lint`（portal）0 问题。

## 22. 本次涉及文件
```
apps/portal/src/app/hr/rules/page.tsx                 (新：规则列表页)
apps/portal/src/components/rules/RuleDrawer.tsx      (新：二级配置/日志抽屉)
apps/portal/src/app/api/monitor/validate/route.ts    (新：语法检查)
apps/portal/src/components/layout/Sidebar.tsx        (预警与洞察 + 规则引擎)
docs/batch1-hr-closure-acceptance.md                 (本文件)
```
提交：本地提交（未 push，遵守用户指示）。

## 18. 本次涉及文件
```
packages/data-service/prisma/schema.prisma              (4 新模型；db push 已应用)
packages/data-service/src/repositories/ruleEngine.ts    (新：DSL 沙箱 + 模板插值)
packages/data-service/src/repositories/ruleEngine.test.ts(新：9 用例)
packages/data-service/src/repositories/registry.ts      (新：字段目录)
packages/data-service/src/repositories/monitor.ts       (新：monitorRepository + 播种 + fetchTargetRows)
packages/data-service/src/index.ts                      (导出 ruleEngine/registry/monitor)
apps/portal/src/app/api/monitor/rules/route.ts          (新)
apps/portal/src/app/api/monitor/rules/[id]/route.ts     (新)
apps/portal/src/app/api/monitor/rules/[id]/run/route.ts (新)
apps/portal/src/app/api/monitor/rules/[id]/logs/route.ts(新)
apps/portal/src/app/api/monitor/registry/route.ts       (新)
apps/portal/src/instrumentation.ts                      (新：调度器 + 播种)
apps/portal/next.config.mjs                             (instrumentationHook)
docs/batch1-hr-closure-acceptance.md                    (本文件)
```

---

# Batch 2（主流程）— 报销自助闭环

日期：2026-09-22
决策：回到主开发流程，用户选择「报销自助闭环」为下一阶段（1.1 延后项的补全）。

## 23. 交付内容
- Schema：`Expense` 增加 `category String?`（TRAVEL/TAXI/MEAL/OFFICE/OTHER）与 `occurredOn DateTime?`
  （票据日期）；`db push` 已应用（无数据丢失）。
- 数据层 `packages/data-service/src/repositories/expense.ts`：
  - `createPending()`（直接以 PENDING_APPROVAL 落单，进入审批态，含 category/occurredOn）。
  - `deletePending()`（事务内仅允许撤销 SUBMITTED/PENDING_APPROVAL）。
  - `registry.ts` 报销实体补 `category`、`occurredOn` 字段（规则引擎可用）。
- 事件 `@aios/events`：新增 `EXPENSE_CANCELLED`。
- API：
  - `POST /api/hr/expenses`（新）：员工端提交 —— 校验金额>0/事由必填/类别白名单 → `createPending`
    → 立即 `startApprovalProcess(EXPENSE)` 启动 BPM → 发布 `ExpenseCreated`；返回
    `{expense, instanceId, state}`(201)。
  - `DELETE /api/hr/expenses/[id]`（新）：员工自助撤销 —— 取消 BPM 实例与待办 → `deletePending`
    → 发布 `ExpenseCancelled`。
  - 审批沿用 `PATCH /api/hr/expenses/[id]`（APPROVE=已入账 / REJECT=已驳回）；`GET` 读时对账保留为兜底。
- 页面 `apps/portal/src/app/my/expenses/page.tsx`（新，client）：
  - 提交表单：报销类别 / 票据日期 / 金额 / 事由，「提交并启动审批流」。
  - 汇总卡：审批中 / 已入账 / 已驳回 / 累计到账金额。
  - 记录表：单号 / 类别 / 金额 / 票据日期 / 事由 / 状态徽章（审批中·已入账·已驳回）/ 未决单可「撤销」。
- Sidebar「员工自助」新增「我的报销」（/my/expenses，Receipt 图标）。

## 24. 实测记录（dev:3000）
- `POST /api/hr/expenses`（EMP-002，TRAVEL，232.50，票据2026-09-18）→ 201
  `{expense{category:TRAVEL, occurredOn:2026-09-18, status:PENDING_APPROVAL}, instanceId:c75decc0…, state:create+workflow}`。
- `GET /api/hr/expenses?employeeId=EMP-002` → 新单带 `processInstanceId`（对账命中已开实例，不重复开）。
- `PATCH [id] {action:APPROVE}` → `status:APPROVED, taskCompleted:true`（BPM 任务完成 + 事件发布）。
- 撤销链路：新建一条 MEAL 15 元 → `DELETE` → `{deleted:true, instanceId:…}`，后 GET 已无该单。
- `GET /aios/my/expenses` → 200，SSR 命中「我的报销 (Self-Service) / 发起报销申请 / 暂无报销记录」，
  侧边栏含 /my/expenses。

## 25. 门禁
- pnpm test 49/49；pnpm -r typecheck 6/6；next lint（portal）0；data-service tsc 构建通过。

## 26. 本次涉及文件
```
packages/data-service/prisma/schema.prisma (Expense +category/+occurredOn)
packages/data-service/src/repositories/expense.ts  (createPending / deletePending)
packages/data-service/src/repositories/registry.ts (报销实体新字段)
packages/events/src/index.ts                        (EXPENSE_CANCELLED)
apps/portal/src/app/api/hr/expenses/route.ts        (POST 提交即进 BPM)
apps/portal/src/app/api/hr/expenses/[id]/route.ts   (DELETE 撤销)
apps/portal/src/app/my/expenses/page.tsx            (新：我的报销)
apps/portal/src/components/layout/Sidebar.tsx       (员工自助 + 我的报销)
docs/batch1-hr-closure-acceptance.md                (本文件)
```
提交：本地提交（未 push，遵守用户指示）。

---

# Batch 2（主流程·续）— 流程任务中心（工作流阶段 1）

日期：2026-09-22
决策：继续主流程下一站 —— 按 012-Workflow-Specification 阶段 1「用户个人工作台 (User Task Center)」落地。

## 27. 交付内容
- 数据层 `packages/data-service/src/repositories/workflow.ts`：新增 `listDoneTasks(assigneeId)`
  （COMPLETED/REJECTED 且 assigneeId=我，用于"我已处理"视图；completeTaskAndLog 将处理人回写进 assigneeId）。
- API：
  - `GET /api/workflow/tasks/user?employeeId=<id>&view=pending|initiated|done`（新，3 视图）：
    pending=我（审批人）的待办（含表单域摘要）、initiated=我发起的实例、done=我处理的已办任务。
  - `POST /api/workflow/tasks`（增强）：完成 BPM 任务后按 formData 同步域单据 ——
    `leaveRequestId` → `leaveRepository.applyApproval` + `LeaveRequestStatusChanged`；
    `expenseId` → `expenseRepository.approve/reject` + `ExpenseApproved/Rejected`，
    使任务中心成为一等审批入口（不再只动 BPM、单据状态脱节）。
- 页面 `apps/portal/src/app/workflow/tasks/page.tsx`（原 mock 重写为真实数据）：
  - 三 Tab：我的待办（红点计数，同意/驳回二次确认+可填意见）/ 我发起的（进度节点+状态徽章）/ 我已处理（动作+流程终态）。
  - 摘要渲染：请假→假别+天数+事由；报销→金额+类别+事由；发起人取自 /api/employee。
- Sidebar「业务管理 (BPM)」新增「任务中心」（/workflow/tasks，ListTodo 图标）。

## 28. 实测记录（dev:3000）
- `GET /api/workflow/tasks/user?employeeId=EMP-000&view=pending` → 命中 2 条遗留报销审批待办（审批人=管理员）。
- 通过任务中心同意其中一条 → `POST` 返回
  `{success:true, domain:{kind:EXPENSE, recordId:f301a853…}, processInstanceId}`；
  随后 `GET /api/hr/expenses` 该单 `status=APPROVED`（域回写生效），done 视图含该任务且实例 COMPLETED。
- `GET /aios/workflow/tasks` → 200，SSR 命中「流程任务中心 / 我的待办」及侧边栏新入口。

## 29. 门禁
- pnpm test 49/49；pnpm -r typecheck 6/6；next lint（portal）0；data-service tsc 构建通过。

## 30. 本次涉及文件
```
packages/data-service/src/repositories/workflow.ts          (listDoneTasks)
apps/portal/src/app/api/workflow/tasks/route.ts            (POST 域回写同步)
apps/portal/src/app/api/workflow/tasks/user/route.ts       (新：三视图)
apps/portal/src/app/workflow/tasks/page.tsx                (mock → 真实任务中心)
apps/portal/src/components/layout/Sidebar.tsx              (业务管理 + 任务中心)
docs/batch1-hr-closure-acceptance.md                       (本文件)
```
提交：本地提交（未 push，遵守用户指示）。
### 31. 消息中心（Message Center，Phase 1）：预警→站内通知→收件箱闭环

**目标**：把规则引擎已产出的站内通知（NotificationLog channel=inapp）升级为可操作收件箱，闭环"规则预警 → 消息 → 用户处理/已读"。

**Schema 变更（db push 已应用，新增列均可空，无数据丢失）**
- NotificationLog +employeeId String?（收件人，NULL=全体广播）/ +title String? / +body String? / +readAt DateTime?，新增 @@index([employeeId])、@@index([channel])。

**规则引擎侧（packages/data-service/src/repositories/monitor.ts）**
- fetchTargetRows 全部 5 类 target（laborContract/employee/leaveRequest/expense/dailyAttendance）行对象增加 employeeId，用于定向投递。
- 通知写入补齐 employeeId（=hit row.employeeId ?? null）、title（=Alert.title）、body（=Alert.description）；外部渠道仍 ok:false 标注"外部渠道适配器待接入（Phase C）"。

**收件箱仓库（packages/data-service/src/repositories/messages.ts，新增，index.ts 导出）**
- listMessages(employeeId, view)：channel=inapp，employeeId===本人 OR employeeId IS NULL（广播）可见；view=unread 过滤 readAt IS NULL；按 sentAt 倒序。
- unreadCount / markRead(id, employeeId)（updateMany，非本人不可改）/ markAllRead(employeeId)。

**API（apps/portal/src/app/api/messages/**）
- GET /api/messages?employeeId=X&view=all|unread → { items, unread, total }（并发取未读数与总数）。
- PATCH /api/messages/[id]：{employeeId} 单条已读（非本人 404）。
- POST /api/messages：{employeeId} 全部已读 → { marked }。

**页面（apps/portal/src/app/my/messages/，Sidebar"员工自助"新增「消息中心」入口）**
- "以员工身份查看"切换；未读/全部汇总卡；全部/未读 Tab；消息行：未读红点+标题（缺省"规则通知"）+正文+关联预警徽标+时间；点击单条标记已读；顶部"全部已读"按钮。

**验证实录（dev 3000 + 隧道 DB）**
- 造临时规则 RULE-MSG-TEST（target=employee，条件 @code == 'EMP-002'，inapp 模板）→ run 返回 summary { scanned:3, hit:1, raised:1 }。
- Alice(EMP-002) 收件箱：total=3（1 条定向新消息含 title/body/employeeId + 2 条历史广播行 employeeId=NULL），unread=3。
- PATCH 单条 → {read:true}；POST read-all → marked=2；再次 unread=0。
- Admin(EMP-000) 可见广播（total=2）；临时规则已 DELETE（200），演示消息/Alert 保留。
- SSR /aios/my/messages=200、GET /api/messages=200。
- 门禁：pnpm test 49/49、typecheck 6/6、next lint 0（全量绿，工作区该次提交后干净）。

**已读语义说明**：广播行（employeeId=NULL）的 readAt 写在行上，任一员工标记已读即全局已读；定向消息按收件人隔离。如需每人独立广播已读需引入收件-状态关联表，留待后续迭代。

```
提交文件清单（本地提交，未 push，等待用户指示）：
packages/data-service/prisma/schema.prisma        (NotificationLog inbox 字段 + 索引)
packages/data-service/src/repositories/monitor.ts  (fetchTargetRows +employeeId；通知写 title/body/收件人)
packages/data-service/src/repositories/messages.ts (新增：收件箱仓库)
packages/data-service/src/index.ts                 (导出 messages)
apps/portal/src/app/api/messages/route.ts          (GET 列表+未读数；POST 全部已读)
apps/portal/src/app/api/messages/[id]/route.ts     (PATCH 单条已读)
apps/portal/src/app/my/messages/page.tsx           (收件箱页)
apps/portal/src/components/layout/Sidebar.tsx      (员工自助 + 消息中心)
docs/batch1-hr-closure-acceptance.md               (本文档)
```
### 32. 通用能力边界收敛（逼问一）：最小围栏实施 + 职责定案

本轮不新增业务功能，只对已实现通用能力做"万能化边界"逼问与收敛。结论已在本节固化，3 处执行级围栏已落码并验证。

#### 32.1 事实修正（相对之前文档/汇报）
- 不存在 `MONITOR_RUN` 事件：`monitor.ts` 不依赖 `@aios/events`，只写 `ruleRunLog`。
- `monitor.ts` 无 `listAlerts/resolveAlert/openAlerts`；那是遗留 `alert.ts` 的职责。当前存在**两套预警引擎并存写同一 Alert 表**：遗留 `alert.ts`（LEGACY，手动 `/api/alerts` POST 触发，instrumentation 不调用）与新版 `monitor.ts`（RULE-*，scheduler 驱动）。`alert.ts` 保留可运行但标注 legacy，默认待退役。
- `businessType` 全库 0 处；其"胎儿形态"是 `POST /api/workflow/tasks` 按 `formData.leaveRequestId/expenseId` 键存在性 if/else 分发。

#### 32.2 职责定案（语义边界，本轮不改代码的部分）
```
Rule Engine   = 纯条件布尔 DSL（Pratt 解析，无 IO/副作用）。query/计算/修改/告警/通知/编排 均不进入。
scopeFilter   = 数据库端行预筛（Prisma where 直通）。只允许注册标量字段 + 受限操作符。
conditionExpr = 应用端行内布尔判定（沙箱 DSL）。只能读窗口内字段（含派生）。
Registry      = 规则字段白名单（文档级→本轮升为执行级）。不得携带表/repo/连接信息。
Derived Field = Monitor 临时计算（选项 B），但计算逻辑归属领域（days 已走 leaveDays 先例）；出现第二消费者即升领域方法。
Alert         = 系统发现的问题记录（幂等）。不得驱动业务审批/修改业务记录。availableActions 引擎侧恒为 []。
NotificationLog= 消息视图：inapp 行即收件箱，非 inapp 行仅审计。独立 Message/MessageRead 留待真实需求。
formData      = 表单数据 + WF 上下文（引用键 expenseId|leaveRequestId 恰一 + approverId）。不得承载审批指令/未知 key。
businessType  = 不存在，且禁止引入字符串 businessType 做 switch；类型标识由 definition.code 枚举承担。
Workflow Task API = 完成 Task + 触发领域动作；领域动作收敛为按业务类型一个 handler（红线：第 3 业务类型必须转 handler）。
Repository    = 事务/守卫/状态转换原语；禁止 import 事件总线（现状已满足，保持）。
Event         = 已发生事实（past tense）；唯一 producer；payload 契约冻结；无消费者的常量禁止新增。
```

#### 32.3 已实施的最小围栏（3 处，均已在 create/update/validate 入口生效）
1. **scopeFilter 结构/白名单校验**（`monitor.ts`：新增 `validateScopeFilter`/`validateScopeFilterValue`，wire 入 `validateRule` 与 `updateRule`）——只允许目标实体 registry 字段名的标量值或限定操作符包 `equals/not/in/notIn/gt/gte/lt/lte/contains/notContains/startsWith/endsWith`；拒绝嵌套 key、关系过滤、任意 JSON。
2. **conditionExpr 字段白名单执行级校验**（`ruleEngine.ts`：新增 `collectConditionFields` 扫描 AST `@path`；`monitor.ts` 新增 `assertRuleConditionFields`）——`@字段` 顶层名必须 ∈ 目标实体 registry 字段；多段路径（`@a.b`）一律拒绝（fetcher 只产出扁平行）。同时接入 `POST /api/monitor/validate`（可选 `target` 参数做字段级预检）。
3. **事件收敛**（`packages/events`：删除 3 个死常量 `ProcessInstance*`，全库无引用；`expense.ts` 新增纯函数 `toExpenseDecisionEvent` 冻结 `ExpenseApproved/Rejected` payload 契约，三处 producer（expense PATCH / workflow tasks POST / tools autoApproveExpense）统一调用）。

#### 32.4 围栏表（终稿）
| 能力/字段 | 当前用途 | 容易演变成 | 明确允许 | 明确禁止 | 是否需要修改 |
| --- | --- | --- | --- | --- | --- |
| Rule Engine | 纯条件求值（Pratt，无副作用） | 万能业务引擎 | 解析/校验/求值布尔 DSL，纯函数 | 查询、业务计算、修改、告警、通知、流程编排进入求值器 | 否（保持） |
| conditionExpr | 行内布尔条件 | 万能脚本 | `@`字段+14 固定函数白名单；新函数须纯函数+测试 | 语句/赋值/任意 JS 函数/IO | **本轮已改**：registry 执行级白名单 |
| scopeFilter | Prisma where 直通（未沙箱） | 第二查询语言 | 注册标量字段+限定操作符的窗口裁剪 | 关系过滤、任意 JSON、未注册字段、嵌套 key | **本轮已改**：结构校验 |
| Registry | 规则字段白名单 | 万能数据入口/字典 | 声明字段+派生标记、驱动 UI 与 objectId | 携带表/repo/连接信息 | 本轮已改为执行级 |
| Derived Field | monitor 内联（days 走领域） | 业务计算中心 | 实体/跨字段/日期纯计算；1 级扁平关联 | 副作用、外部服务、深层链、scopeFilter 自造派生 | 否（第二消费者即升领域） |
| monitor.ts | 规则系统总管（7~8 类职责） | 上帝模块 | 规则 CRUD、runRule 编排、幂等、日志 | 新规则硬编码、非规则域通知、告警处理动作 | 拆出项已登记（fetch/seed，本轮不动） |
| Alert | 只读问题记录（幂等） | 第二 Workflow | pending→resolved、关联对象、统计 | 驱动业务审批/修改业务记录 | 否（保持） |
| availableActions | 字符串数组，零消费者 | 万能动作系统 | monitor 恒写 `[]`；未来=已注册 Tool 名 | 自定义字符串动作、if(action===...) | 否（冻结语义） |
| NotificationLog | 发送日志+收件箱混用 | 万能消息表 | inapp 行=inbox、非 inapp 仅审计 | 非 inapp 进 inbox、塞无关提醒 | 否（文档定案） |
| Message | = NotificationLog 的 inapp 行 | — | 收件箱读/已读 | 与发送日志身份合并污染生命周期 | 否 |
| formData | 表单数据+WF 上下文+任意 JSON | 万能 JSON | 引用键恰一 + approverId + 业务 blob | 承载审批指令、依赖未知 key | 否（语义定案） |
| businessType | 不存在（0 处） | 万能分发器 | 保持不存在；definition.code 枚举承担 | 新增字符串 businessType 做 switch | 否；红线：第 3 业务类型转 handler |
| Workflow Task API | 完成 Task+审批副作用同 POST | 万能审批 API | 完成 Task+触发领域 handler | 三处重复实现扩散（已登记收敛） | 否（行为不变） |
| Repository | 数据访问+部分守卫 | 第二 Service | 事务/守卫/状态转换原语 | import 事件总线、跨实体编排、结算逻辑流入 | 否（保持不 import events） |
| Event | 只写不读；多 producer+payload 漂移 | 万能事件总线 | 已发生事实；唯一 producer；冻结 payload | 命令语义、无消费者新事件、死常量 | **本轮已改**：删死常量+payload 契约冻结 |

#### 32.5 验证实录
- 门禁：pnpm test **50/50**（新增 collectConditionFields 单测）、typecheck 6/6、lint 0、data-service tsc 0。
- curl E2E（POST /api/monitor/validate）：合法表达式 OK；`@bogus` REJ、`@name.size`（多段）REJ；跨实体字段（laborContract 规则用 `@applicantName`）REJ。
- create-rule 冒烟：合法规则 201（RULE-FENCE-GOOD，已清理删除）；`scopeFilter:{nopeField:1}` 400、`scopeFilter:{status:{weirdOp:"x"}}` 400、`conditionExpr:"@doesNotExist==1"` 400；删除后规则库恢复 3 条种子规则。
- 事件收敛为编译+单测层面确认（三处 producer 统一 builder，死常量删除且无引用）。

```
提交文件清单（本地提交，未 push）：
packages/data-service/src/repositories/ruleEngine.ts         (collectConditionFields + 导出)
packages/data-service/src/repositories/monitor.ts            (validateScopeFilter + assertRuleConditionFields，wire 入 create/update)
packages/data-service/src/repositories/expense.ts            (toExpenseDecisionEvent payload 契约)
packages/data-service/src/repositories/ruleEngine.test.ts    (collectConditionFields 单测)
packages/events/src/index.ts                                 (删除 3 个死常量)
packages/tools/src/index.ts                                  (autoApproveExpense 用统一 payload)
apps/portal/src/app/api/workflow/tasks/route.ts              (approve/reject 用统一 payload)
apps/portal/src/app/api/hr/expenses/[id]/route.ts            (approve/reject 用统一 payload)
apps/portal/src/app/api/monitor/validate/route.ts            (可选 target 字段级预检)
docs/batch1-hr-closure-acceptance.md                         (本节)
```

#### 32.6 遗留红线（下一轮候选，本轮不动）
- 派生计算归属领域（daysRemaining/probationEnd 出现页面消费者时）。
- `fetchTargetRows` 拆出于 monitor；`seedDefaultRules` 移出引擎。
- `alert.ts` legacy 双引擎退役判定。
- Workflow Task API 第 3 业务类型必须转 DomainHandler；三处审批重复实现收敛。
### 33. 知识库（Knowledge Base）—— Phase 1 最后一块版图

#### 33.1 定位与边界
知识库是 Phase 1 工作台版图收尾版块：制度、流程、操作指南的统一沉淀入口。按围栏定案（§32）刻意收敛边界——**零事件、零规则、零工作流、零权限**：
- 不发布任何事件（§32.2：事件必须唯一 producer + 明确消费者；暂无消费者故不多造）。
- 不进规则引擎 Registry（不产生派生字段，无跨实体预警诉求）。
- 无审批流（文档生命周期仅 DRAFT/PUBLISHED 二态，由作者直接维护）。
- 权限随 Identity/Permission 支柱后置（当前全量可见，与规则/任务页一致）。

#### 33.2 数据模型
`KnowledgeArticle`（packages/data-service/prisma）：
```
id / title / category(枚举) / summary? / content / tags[] /
status(DRAFT|PUBLISHED) / authorId? / authorName? /
viewCount / publishedAt? / createdAt / updatedAt；@@index([category],[status])
```
分类枚举 `KNOWLEDGE_CATEGORIES = POLICY | HR | FINANCE | PROCESS | HOWTO`；
状态 `DRAFT | PUBLISHED`。authorId 暂为普通字段（不建 FK，避免 Employee 模型反向耦合）。

#### 33.3 仓库与 API
- `knowledgeRepository`：`list(q|category|status)`（标题/正文/标签模糊搜索 + 分类/状态过滤）、`get`、`create`（分类白名单 + 状态校验）、`update`（状态转换守卫：DRAFT↔PUBLISHED 不允许再写同态；首次发布写 publishedAt）、`delete`、`bumpView`（阅读计数）、`seedDemoArticles`（幂等：仅空表时灌 3 篇演示文章）。
- API：
  - `GET/POST /api/knowledge`：搜索列表 `{items,total}`；创建校验（标题必填、正文≥20 字、分类/状态白名单）。
  - `GET /api/knowledge/[id]`：单篇读取 + 阅读计数；`PATCH` 更新（含状态转换）；`DELETE` 删除。
- 页面：`/knowledge`（搜索框、分类 chips、状态下拉、卡片列表、新建/编辑弹层、发布/下架、删除）；`/knowledge/[id]`（详情渲染，纯文本 pre-wrap）。Sidebar「工作台」组新增「知识库」。

#### 33.4 验证实录
- 门禁：pnpm test 50/50、typecheck 0、lint 0、data-service tsc 0。
- db push 应用成功（DATABASE_URL 注入自 apps/portal/.env.local）。
- 种子幂等：首启灌入 3 篇 PUBLISHED 演示文章（考勤办法/报销流程/请假指南）。
- curl E2E：
  - LIST total=3；搜索 `q=报销+status=PUBLISHED`→1、`q=审批+category=FINANCE`→1。
  - CREATE 201 → GET 阅读计数 1→2（逐次 +1）→ PATCH 发布（publishedAt 落库）→ DELETE 200。
  - 校验：非法分类/空标题/正文过短/非法状态 → 全部 400 且错误信息明确；不存在的 id → 404。
- SSR：`/knowledge` 200、`/knowledge/[id]` 200、`/aios` 壳 200。

#### 33.5 提交文件清单
```
packages/data-service/prisma/schema.prisma            (KnowledgeArticle + 索引)
packages/data-service/src/repositories/knowledge.ts   (仓库 + 种子)
packages/data-service/src/index.ts                    (导出)
apps/portal/src/app/api/knowledge/route.ts            (列表/创建)
apps/portal/src/app/api/knowledge/[id]/route.ts       (详情/更新/删除)
apps/portal/src/app/knowledge/page.tsx                (知识库列表)
apps/portal/src/app/knowledge/[id]/page.tsx           (详情)
apps/portal/src/components/layout/Sidebar.tsx         (导航入口)
apps/portal/src/instrumentation.ts                    (幂等种子挂载)
docs/batch1-hr-closure-acceptance.md                  (本节)
```

#### 33.6 遗留候选（不阻塞交付）
- Markdown 渲染（当前纯文本 pre-wrap，按需换 `react-markdown`）。
- 文档版本历史 / 审批发布流（当前直接二态）。
- 权限化（跟随 Identity/Permission 支柱）。
