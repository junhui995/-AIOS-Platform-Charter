# Knowledge and Memory Specification
# 知识与记忆规范

Version: 1.0

Status: Draft

Depends:
000 Platform Charter
001 Runtime

---

# 第一章

知识与记忆的区别

在 AIOS 中，**知识 (Knowledge)** 和 **记忆 (Memory)** 是两个截然不同的概念：

1. **Knowledge (企业知识)**
   是企业客观的、静态的规章制度和经验资产。
   例如：员工手册、报销制度、安全合规法案、过往项目文档等。
   Knowledge 属于全体企业，是不可变事实（除非通过 Evolution 更新）。

2. **Memory (动态记忆)**
   是系统在运行过程中积累的经验、用户偏好和上下文。
   例如：某员工偏好周五下午出差，某部门经理倾向于严格审批预算等。
   Memory 是属于系统/用户的经验积累。

---

# 第二章

Knowledge 原则：禁止 Prompt 硬编码

AIOS 严禁将企业的制度规则（Policy）直接写死在系统代码或 Agent 的 System Prompt 中。

硬编码的恶果：
1. 制度更新时必须修改代码或重启 Agent。
2. 浪费宝贵的 Context Window。
3. 难以追溯是哪条具体规则导致了当前的 AI 决策。

所有制度必须作为 Knowledge 存储。

---

# 第三章

Knowledge 的 RAG 机制

当 Agent 需要做业务决策时，它必须通过内部的 Knowledge Agent (或组件) 检索（RAG, Retrieval-Augmented Generation）相关的知识片段。

流程：
1. Agent 识别出当前任务为“报销审批”。
2. Agent 提取实体（员工级别、金额、城市）。
3. 检索中心基于语义匹配出对应的《出差住宿标准V2.pdf》中对应的段落。
4. 将该段落作为 Policy Context 注入给 Agent。

---

# 第四章

Memory 的分类

Memory 机制让 AIOS 表现得“懂你”，它是 AI 区别于传统软件的关键。

1. **Short-term Memory (短期记忆/会话级)**
   维护当前 Task 或 Workflow 尚未完成时的中间状态。一旦执行完毕或回滚，短期记忆失效或归档。

2. **Long-term Memory (长期记忆/业务偏好)**
   系统跨会话学习的结果。
   例如发现用户重复在修正某个特定表单错误，系统会记住并在下次主动提示或修复。

---

# 第五章

Memory 的隐私与安全

Memory 不是不受控制的黑盒。
与 Data Service 一样，Memory 数据必须具备租户隔离和权限控制。

个人偏好 Memory 仅对该用户和授权 Agent 可见。
团队级 Memory（如某团队常见项目风险点）对团队内可见。

用户和管理员拥有随时查看、清除特定 Memory 节点的权利，以消除不恰当的偏见。
