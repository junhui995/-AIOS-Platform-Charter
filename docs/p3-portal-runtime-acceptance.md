# P3 验收报告：Portal AI 聊天接入真实 AIOS Runtime

## 1. 目标
把 Portal 的 AI 助手（`/api/chat`）从硬编码业务演示升级为驱动**真实 AIOS Runtime** 的端到端闭环：Web 侧发送自然语言 → 编译 Enterprise DNA → PlanningAgent 规划 → PolicyGuard 裁决 → ToolRegistry 执行 → 事件进入 Outbox → 断点续跑，与 P2 CLI 演示同一条链路。

## 2. 本次改动
- `apps/portal/src/app/api/chat/route.ts`：重写为 SSE 接口。每次请求构造 `RuntimeEngine`（默认共享 `toolRegistry` + 从 DNA `expense-dna.yaml` 编译的 AST），执行引擎后逐步骤流式回传：
  - 步骤号 / 工具名 / 意图理由
  - Guard 裁决（ALLOW / DENY / REDIRECT 含 policyId、理由、redirect 目标）
  - Tool Result 原始 JSON
  - 最终 [Agent Response] 摘要
  并返回 `sessionId`。输入 `继续`（带 `resumeSessionId`）走 `continueSession` 断点续跑。
- `apps/portal/src/components/ai/AISidebar.tsx`：捕获流中的 `sessionId`，后续消息自动附上 `resumeSessionId`，实现 Web 端断点续跑；更新欢迎语提示可演示的诉求。
- `apps/portal/package.json`：新增 `@aios/events` 依赖（`workspace:*`），与 lockfile 一并更新。

## 3. 已验证的端到端路径（真实 Postgres，via 本地隧道）
1. **报销超限（REDIRECT 闭环）**：`帮 Alice 报销 600 块的打车费`
   - `getEmployeeIdByName`(Alice EMP-002) → ALLOW
   - `createExpense`(600, SUBMITTED) → ALLOW
   - `autoApproveExpense` → REDIRECT `policy_expense_limit` → `requestFinanceApproval` → `PENDING_FINANCE_APPROVAL`
   - 输出：`routed to a Finance Manager for human approval`
2. **请假（ALLOW 闭环）**：`帮张三请假`
   - `getEmployeeIdByName`(张三 EMP-001) → `submitLeaveRequest`(ANNUAL) → PENDING
   - 输出：`Leave request submitted successfully`
3. **断点续跑**：`继续` + `resumeSessionId`
   - 3 步全重放、工具零重跑（复用原 expenseId，未新建），结果与首次一致
4. 未知诉求友好提示（`无法识别的业务请求…`）

## 4. Gate
- `pnpm --filter @aios/portal run typecheck`：通过（0 error）
- `pnpm --filter @aios/portal run lint`（next lint）：No ESLint warnings or errors
- 运行时：引擎逻辑与 P2 CLI 完全一致（共享 `packages/runtime`、`packages/tools`、`packages/events` 产物）

## 5. 限制与后续
- 会话检查点默认存于 `os.tmpdir()/aios-portal-sessions`（可用 `AIOS_SESSION_DIR` 覆盖）；重启后历史 sessionId 可能失效。
- 本阶段未开启 `OPENAI_API_KEY`，走确定性 Plan+Guard 模式；模型驱动循环（agentLoop）已由引擎预留，同一 Guard 管线包裹执行。
- 建议后续：AI 工作台页面展示 Plan/Guard/Checkpoint/Outbox 证据面板、检查点会话管理 UI。