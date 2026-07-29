# Tool Specification
# 工具规范

Version: 1.0

Status: Draft

Depends:
000 Platform Charter
001 Runtime

---

# 第一章

什么是 Tool

Tool 是 AIOS 平台中，AI 与外界（系统、数据、外部API）互动的**唯一**合法桥梁。

“Everything is Tool.”

在 AIOS 中，AI 不能自己“做”任何实际的事情（比如修改数据库、发邮件），它只能“决定”使用哪个 Tool。

例如：
`QueryBudget(department_id: string)`
`CreateExpense(amount: number, reason: string)`
`SendEmail(to: string, subject: string, body: string)`

---

# 第二章

Tool 的特性

所有 Tool 必须具备以下四大特性：

1. **无状态 (Stateless)**
   Tool 本身不保存业务状态，状态由 Data Service 或 Workflow 管理。

2. **可审计 (Auditable)**
   谁（哪个 Agent/用户）、什么时候、用什么参数调用了 Tool，返回了什么结果，必须全部记录在案。

3. **强类型 (Strongly Typed)**
   Tool 的输入参数和输出结果必须有严格的 Schema 定义（如 JSON Schema，OpenAPI 规范）。
   AI 必须根据 Schema 构造参数。

4. **幂等性保障 (Idempotency)**
   修改类 Tool（如 `CreateVoucher`）应尽可能设计为幂等，防止 Agent 重试导致重复扣款或生成重复单据。

---

# 第三章

Tool 的零信任鉴权

Agent 本身没有权限。
权限附加在 Business Context 或触发任务的用户身份（Identity）上。

当 Agent 调用 Tool 时，必须经过 Permission Center 校验：
“当前请求上下文中的用户/角色，是否有权限执行此 Tool？”

如果校验失败，Tool 拒绝执行，并返回鉴权失败信息给 Agent，Agent 需根据情况结束任务或通知用户。

---

# 第四章

Tool 的边界

Tool **不包含**复杂的业务规则判断。
例如：
错误的设计：`ApproveExpenseIfUnderBudget(expense_id)`（包含了如果预算充足才审批的逻辑）。
正确的设计：
1. `GetBudget(department_id)`
2. Agent 或 Verifier 根据 Policy 判断是否超标。
3. 如果合规，调用 `ApproveExpense(expense_id)`。

业务判断属于 Semantic AST 和 Agent 的范畴，Tool 仅提供执行“原语”。

---

# 第五章

Tool 的发现机制

Agent 如何知道有哪些 Tool 可用？

Tool 注册在 Enterprise DNA 中。
Compiler 在编译 AST 时，会将相关的 Tool Graph 关联到特定的 Domain。
当 Planner 拆分任务并分配给 Domain Agent 时，只将该 Domain 下合法的 Tool Schema 注入到 Agent 的 Context 中。

禁止 Agent 遍历全局所有 Tool，以减少幻觉风险。

---

# 第六章

MCP (Model Context Protocol) 兼容

AIOS 的 Tool 体系应全面兼容或等效于标准化协议（如 MCP, Model Context Protocol）。
这保证了平台不仅能调用内部微服务（API），还能无缝接入支持 MCP 的第三方企业软件（如 JIRA, GitHub, Salesforce）。

这也意味着，企业的遗留系统无需重写业务，只需封装为标准的 Tool（MCP Server），即可被 AIOS 的 Agent 调度。
