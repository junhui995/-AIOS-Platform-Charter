# Data Service Specification
# 数据服务规范

Version: 1.0

Status: Draft

Depends:
000 Platform Charter
001 Runtime
009 Tool Specification

---

# 第一章

Data Service 的定位

Data Service 是 AIOS 的持久化底座。
它是系统与物理数据库（关系型、非关系型等）之间的唯一隔离层。

在 AIOS 中：
AI/Agent 只能调用 Tool。
Tool 只能调用 Data Service。
只有 Data Service 可以执行真实的数据库读写（SQL/NoSQL）。

因此，Data Service 保证了核心原则：“数据永远属于企业，不被 AI 直接控制。”

---

# 第二章

抽象与隔离

Data Service 不暴露具体的数据库技术。
无论是 MySQL, PostgreSQL, MongoDB 还是 Redis，对 Tool 来说都是透明的。

Data Service 提供基于 Business Entity 的 CRUD 操作。
例如，Tool 想要获取员工信息，它调用 Data Service 的 `EmployeeRepository.GetById(id)`，而不是执行 `SELECT * FROM employees WHERE id=?`。

---

# 第三章

多租户与数据隔离

作为企业级底层平台，Data Service 必须原生支持多租户（Multi-tenancy）架构或严格的数据隔离机制。

每一次数据请求，Data Service 都会从 Runtime 传入的 Context 中解析出错的 Tenant ID 或 Organization ID，并在底层数据库查询中自动追加隔离条件，防止跨租户数据泄露。

这一层面的安全控制，绝不能依赖 Agent 的自觉性或 Prompt。

---

# 第四章

事务管理 (Transaction)

Agent 执行复杂的业务流程（如涉及库存扣减、余额更新、订单生成）时，可能需要调用多个 Tool。

Data Service 必须提供分布式事务或最终一致性（如 Saga 模式）的支持。
当 Verifier 判定业务执行失败或违反规则需要回滚时，调度系统将通知 Data Service 执行相应的回滚补偿机制。

---

# 第五章

数据版本与审计追踪

企业拥有全部数据，并且所有数据必须是可恢复、可审计的。

Data Service 默认启用数据变更捕获（CDC, Change Data Capture）。
任何实体的创建、修改、删除，Data Service 都必须记录完整的变更日志：
- 修改前状态 (Before)
- 修改后状态 (After)
- 触发人/Agent ID
- 关联的 Business Context ID

AI 不能直接或隐秘地修改任何一行原始数据，一切操作都在阳光下进行。
