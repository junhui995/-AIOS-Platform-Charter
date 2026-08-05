# Agent Specification
# 智能体规范

Version: 1.0

Status: Draft

Depends:
000 Platform Charter
001 Runtime
003 Semantic AST

---

# 第一章

什么是 Agent

在 AIOS 中，Agent 不是通用的对话机器人。
Agent 是具备**单一职责**的业务处理单元。
Agent 代表了企业的某一类“数字员工”。

例如：
Expense Agent（报销专家）
Contract Agent（合同专家）
HR Agent（人事专家）

Agent 没有全局视角，只关注其分配的业务域（Domain）。
全局视角由 Planner Agent 负责。

---

# 第二章

Agent 的边界

Agent **绝对不允许**：
直接连接数据库（禁止 SQL）。
直接操作 HTML/DOM/页面。
直接发送 HTTP 请求到外部未知服务。
在 Prompt 中硬编码企业制度或数据。

Agent **只能**：
读取 Business Context。
调用分配给它的 Tool。
查询 Knowledge Center。
向 Workflow Center 发起流转请求。
返回执行结果给 Scheduler。

---

# 第三章

Agent 的分类

在 Runtime 中，Agent 分为三类：

1. **System Agent**
   - 维持系统运转。
   - 包括：Planner Agent (任务规划), Scheduler Agent (调度), Verifier Agent (结果校验)。

2. **Domain Agent**
   - 处理具体业务。
   - 包括：Finance Agent, HR Agent, Sales Agent 等。

3. **Utility Agent**
   - 提供通用能力。
   - 包括：Knowledge Agent (RAG检索), Document Agent (文档解析, OCR 等)。

---

# 第四章

Agent 的通信协议

Agent 之间**不直接对话**。
Agent 不通过自然语言传递复杂指令。

Agent 之间的通信必须通过：
**Business Semantic AST (BSAST)** 衍生的 Context 或 Event。

Planner -> Agent：传递 Task Graph 的 Node（包含 Entity, Constraint, Tool 列表）。
Agent -> Verifier：传递 Execution Outcome。

自然语言仅存在于：
用户与 Observe 层的交互。

---

# 第五章

Agent 的上下文 (Context Window)

Agent 的上下文是宝贵的资源。
禁止将整个数据库或全量制度塞入 Prompt。

Agent Context 只包含：
1. Agent Persona (由 DNA 定义的能力和角色)。
2. 当前 Task 的核心 Entity 数据。
3. 通过 Knowledge Agent 实时检索到的**相关** Policy。
4. 当前可用的 Tool Schema。

---

# 第六章

Agent 可替换原则

没有任何一个 Agent 绑定于特定的底层大语言模型 (LLM)。

Expense Agent 可以运行在 OpenAI 上。
HR Agent 可以运行在 Claude 上。
Security Agent 可以运行在本地部署的 Qwen/Llama 上。

Agent 定义在 DNA 中。
底层 LLM 只是执行 Agent 推理的“算力”。
企业可随时切换算力。

---

# 第七章

Agent 审计与追踪

Agent 的每一次思考（Thought）、规划（Plan）和工具调用（Action），
都必须产生结构化日志（Trace）。

如果 Agent 做出错误决策（如违反制度报销），
必须可以通过 Trace 查明：
是 Knowledge 没有提供正确的 Policy？
是 Prompt 导致了幻觉？
还是 Tool 返回了错误数据？

无法解释的 AI 决策在企业级系统中是不可接受的。
