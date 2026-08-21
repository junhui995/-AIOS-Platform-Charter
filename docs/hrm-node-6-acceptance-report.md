# HRM 节点 6 验收报告：合同管理基础闭环

## 1. 当前已有合同能力
- 原架构中 \`LaborContract\` 模型仅有基础的字段（\`status\` = ACTIVE 等）和日期绑定，不支持全状态机流转。
- 前台的合同页面 \`/hr/contracts\` 原本包含硬编码的统计数字（如 142 份，30天到期等）。
- 员工详情页与历史合同没有建立时间轴视角的紧密查询联系。

## 2. 本次新增内容
- **模型升级**：扩展 \`LaborContract\` 和 \`LaborContractTemplate\`，增加了合同续签、签约、到期等关键流转状态机（DRAFT, PENDING_SIGN, SIGNED, ACTIVE, RENEWING, EXPIRED, TERMINATED）。
- **后端闭环**：添加动态 API 来查询有效合同、计算 30/60/90 天到期预警（通过遍历比较真实 \`endDate\`），并支持单边动作（签署、续签、终止），且使用事务处理确保续签时老合同被合理归档（TERMINATED）而不是被粗暴覆盖。
- **UI 联动**：重构了总览大盘 \`/hr/contracts\` 的图表数字渲染（接入新 API），且在 \`/employee/[id]\` 详情页深度注入了合同组件，可直接展示**当前生效合同**及**历史合同记录**。

## 3. Schema 修改
- \`LaborContract\` 增加了 \`contractType\`, \`probationMonths\`, \`effectiveDate\`, \`salary\`, \`position\`, \`department\`, \`remark\`, \`attachment\` 字段，将状态机制改为了更细粒度的控制。
- \`LaborContractTemplate\` 增加了 \`contractType\`, \`targetEmployee\`, \`defaultDuration\`, \`probationMonths\`, \`status\`。

## 4. API 修改
- \`GET /api/hr/contracts\`：支持按 \`employeeId\` 过滤关联拉取。
- \`POST /api/hr/contracts\`：新建基础合同入口。
- \`GET /api/hr/contracts/stats\`：计算大盘过期与临期统计数据。
- \`POST /api/hr/contracts/[id]/action\`：支持传入 \`SIGN\`, \`RENEW\`, \`TERMINATE\` 等单点操作完成生命周期迁移。

## 5. 页面修改
- \`/hr/contracts/page.tsx\` 移除硬编码逻辑，实现动态拉取与渲染列表。
- \`/employee/[id]/page.tsx\` 增设区块并行查阅该员工所属的所有历史与当前合同。

## 6. 合同状态机
\`DRAFT\` -> \`ACTIVE\` (经 SIGN 动作生效)
\`ACTIVE\` -> \`RENEWING\` / \`TERMINATED\` / \`EXPIRED\`
续签 \`RENEW\` 将创建一份新的 \`DRAFT\` 或 \`ACTIVE\` 合同，并将原来的变更为 \`TERMINATED\` 备注已续签。

## 7. 合同与 Employee 的关系
强依赖 \`employeeId\`。每个 employee 详情页并行拉取关联数组并归档。在业务中保证先拥有合法的员工记录，才能绑定劳动合同实体。

## 8. 合同历史如何保存
在 \`RENEW\` 或 \`TERMINATE\` 接口中，不会执行任何数据行的 DELETE 操作。旧合同将永远留存在数据库中，只有其 \`status\` 被变更，从而在关联查询时能够全貌映射出全部服役轨迹。

## 9. 续签如何实现
接口 \`/api/hr/contracts/[id]/action\` 接受 \`RENEW\` 指令，开启 Prisma 事务：先根据原合同模板/薪资配置生成下一周期的合同副本记录进入系统，随即更新老合同为终止态。

## 10. 到期预警如何实现
在 \`/stats\` 中动态运算 \`diffDays\` 筛选每个 \`ACTIVE\` 的截止日期并与服务器 \`new Date()\` 比较，落入 0-30/30-60/60-90 的桶中。

## 11. Workflow 如何接入
（预留）目前的 \`/api/hr/contracts\` 为基础 API 暴露层。如企业启用了审批工作流，可以通过 Workflow Design 中绑定一个专门的 Webhook Node 节点在审批 COMPLETED 时来请求 \`/action\` 签署或续约接口。

## 12. 权限如何控制
均接入现有身份验证通道及架构上下文。

## 13. 测试结果
执行 TypeScript Prisma 操作流进行生命周期的演练，证实不会发生错误覆盖或者关联丢失。

## 14. \`pnpm build\` 结果
100% 通过验证。没有任何未处理的 Any 注入。

## 15. 当前 HRM 路线图完成度
节点 6（劳动合同管理闭环）已完成。

## 16. 下一节点建议
既然当前已经具备了：组织部门 + 生命周期 + 合同，接下来推荐进入「考勤排班与考勤核算」或是「薪酬基础模块」，实现工时+请假的扣减与计算。
