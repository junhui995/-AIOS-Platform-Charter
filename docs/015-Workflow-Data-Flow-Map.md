# Workflow Engine: Data Processing Flow Map

## 1. Frontend & Backend Module Mapping

| Frontend Path | API Route | Prisma DB Models | Description |
| :--- | :--- | :--- | :--- |
| \`/workflow/designer\` | \`POST /api/workflow/definitions\` | \`WorkflowDefinition\`, \`WorkflowVersion\` | Visual BPMN designer. Saves nodes, edges, gateways to DB. Increments version on publish. |
| \`/workflow/forms\` | \`GET/POST /api/workflow/forms\` | \`FormTemplate\` | Form Template Builder. Saves dynamic JSON schema fields. |
| (Within Designer) | (Via Definition payload) | \`WorkflowDefinition.formTemplateId\` | Form Binding. Attaches a created Form Template to a specific Workflow. |
| \`/workflow/tasks\` | \`GET /api/workflow/tasks/user\` | \`ProcessTask\`, \`ProcessInstance\` | Task Center UI. Queries pending tasks assigned to the user or their candidate group. |
| (Task Action Modal) | \`POST /api/workflow/tasks\` | \`ProcessTask\`, \`ProcessLog\`, \`ProcessInstance\` | Approves/Rejects tasks. Executes node progression logic and logs the action. |
| (Before Submit) | \`POST /api/workflow/simulate\`| \`WorkflowVersion\` | Path Prediction. Simulates route evaluation based on temporary form data. |

## 2. Core Execution State Machine (Backend)

**Triggering a Process (\`/api/workflow/instances\`):**
1. Fetch latest published \`WorkflowVersion\` by \`definitionId\`.
2. Find the \`input\` type node (Start Node).
3. Create \`ProcessInstance\` with status \`RUNNING\`.
4. Traverse out-edges from Start Node to the first task/gateway node.
5. Create initial \`ProcessTask\` (Status: \`PENDING\`, Evaluates AssigneeStrategy: \`DIRECT_MANAGER\`, \`SPECIFIC_USER\`, etc.).

**Progressing a Task (\`/api/workflow/tasks\`):**
1. User clicks "Approve" -> \`status\` changed to \`COMPLETED\`.
2. Write to \`ProcessLog\`.
3. Read \`WorkflowVersion\` edges mapped from current \`nodeId\`.
4. If next node is a Gateway (\`EXCLUSIVE\`): Evaluate gateway conditions.
5. If next node is a standard task: Create new \`ProcessTask\`.
6. If next node is \`output\` (End Node): Update \`ProcessInstance\` status to \`COMPLETED\`. Trigger configured Webhooks.

## 3. Strict Type Rules
- Do not instantiate \`new PrismaClient()\` in individual API routes to prevent memory leaks and Next.js workspace build failures. Always use: \`import { prisma } from '@aios/data-service'\`.
- Do not use \`include: { relations }\` if the relation strictly fails cross-package type generation (e.g. \`never\` errors). Fetch them sequentially instead.
