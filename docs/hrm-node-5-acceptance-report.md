# HRM 节点 5 验收报告：员工全生命周期基础流程

## 1. 当前项目原有能力
- 已存在 \`Employee\`（员工基本档案）、\`EmployeePosition\`（唯一当前岗位绑定）、\`Department\`（组织部门）、\`Position\`（标准职位）、\`LaborContract\` 等静态人事信息数据模型。
- 提供了 \`/employee/list\` 以及部分信息查看，但是对于动态转换的过程（入职 -> 转正 -> 调岗 -> 离职）仅局限于简单的单次状态（status）变更，丢失了变更追踪轨迹及历史部门变动历史。

## 2. 本次新增内容
- 增加了 **生命周期流水记录** (\`EmployeeLifecycleEvent\`)，所有的业务转换过程全部上链留存。
- 允许一个人先后在企业不同岗位任职。保留 \`EmployeePosition\` 的历史轨迹，当员工调岗或者离职时，老岗位的 \`status\` 变更为 \`HISTORICAL\` 并打上截止日期 (\`endDate\`)，新岗位记录自动创建。
- 提供后台业务处理 API，包含状态机校验及数据库全事务（Transaction）操作。
- 在员工页面前端实现了全时间轴 Timeline 展示，支持根据当前状态动态分配按钮权限控制操作（例如：离职人不能办理入职等）。

## 3. 修改了哪些 Schema
- 移除 \`EmployeePosition\` 中过分严格的 \`@@unique([employeeId, positionId])\`，以允许员工反复进出同一岗位，并增加了 \`endDate\` 与 \`status\` (ACTIVE / HISTORICAL) 的历史控制。
- 新增 \`EmployeeLifecycleEvent\` 数据表，其包含了：\`eventType\`，\`eventDate\`，操作前/后的 Json 级 \`Data\` 留档，以及经手人记录 \`operatorId\` 等。
- 往 \`Employee\` 中关联加入 \`lifecycleEvents EmployeeLifecycleEvent[]\`。

## 4. 新增/修改了哪些 API
- 新增 \`GET /api/employee/[id]/lifecycle\`：提取指定员工时间轴数据。
- 新增 \`POST /api/employee/[id]/lifecycle\`：用于统一处理所有的 \`ONBOARD\`, \`PROBATION\`, \`TRANSFER\`, \`OFFBOARD\` 事件，其内涵盖完备的状态机合法性检查，并自动流转相关的事务更新。

## 5. 修改了哪些页面
- 修改了 \`/employee/list\` 路由代码，添加直达个人周期的跳转链接。
- 新增了 \`/employee/[id]/page.tsx\` 动态交互式 UI，整合了“状态操作面板”（操作对应业务动作）与右侧的“全生命周期轨迹Timeline”组件。

## 6. Workflow 如何接入
- Lifecycle 事件创建接口中预留并支持保存 \`workflowInstanceId\`，如果某个调岗事件是直接由 Workflow Tasks 的 webhook 回调所发出的，将自然携带此流程信息将 HR 操作归档到流程体系下。

## 7. 权限如何控制
- API 检查了非法状态变换边界。UI 端通过状态机渲染按钮（未入职展示入职按钮，试用员工展示转正按钮，活跃人员展示调岗/离职按钮，离职人员操作按钮隐去等）。所有后台接口复用了现有架构验证体系。

## 8. 生命周期如何记录
- 所有动作（状态变换，岗位撤出挂载等）都在一条完整的 Prisma \`$transaction\` 事务中一并生成 \`EmployeeLifecycleEvent\` 实体。

## 9. 如何保证历史任职不丢失
- 不去调用 \`delete\` 修改 \`EmployeePosition\` 表。改用 \`updateMany({ status: 'HISTORICAL', endDate: new Date() })\` 让它平稳退役，从而让以后进行人事档案调阅时可以永久查到员工每个阶段服役的确切时间和部门。

## 10. 测试结果
- 提供 \`test_lifecycle.ts\` 内部联调脚本并验证，模拟建立用户并在一次 \`ONBOARD\` 事务中正常绑定部门并且生成 \`PROBATION\` 状态后，所有数据库级验证全绿，并能产生规范的时间轴回退信息。

## 11. TypeScript / Build 结果
- \`pnpm run build\` 完全通过，没有因为 Any、泛型丢失或者过时的 Prisma Type 而产生构建失败。

## 12. 当前 HRM 路线图完成度
- `[Node 5]` 完成闭环！把 Employee 升级为了真正的动态周期对象。

## 13. 下一步最应该开发什么
- 薪酬福利或绩效数据的周期整合。既然 Lifecycle 和 Workflow 已经有了，那么在做年度调薪（Node 6）或者发送绩效奖金（Node 7）时，可以通过调用最新的 Lifecycle 数据来决定人员当前的真实挂载部门（而不是拿几个月前的旧部门）直接分发核算账单。
