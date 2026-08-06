import * as fs from 'fs';

const schemaPath = 'packages/data-service/prisma/schema.prisma';
let schema = fs.readFileSync(schemaPath, 'utf8');

const workflowRepl = `// -----------------------------------------------------------------
// Workflow & BPM Domain (Enhanced)
// -----------------------------------------------------------------

model FormTemplate {
  id          String   @id @default(uuid())
  code        String   @unique
  name        String
  schema      Json     // JSON Schema defining the form fields and layout
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  workflowDefinitions WorkflowDefinition[]
  processInstances    ProcessInstance[]
}

model WorkflowDefinition {
  id             String   @id @default(uuid())
  code           String   @unique
  name           String
  description    String?
  formTemplateId String?
  isActive       Boolean  @default(true)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  formTemplate FormTemplate?     @relation(fields: [formTemplateId], references: [id])
  versions     WorkflowVersion[]
}

model WorkflowVersion {
  id           String   @id @default(uuid())
  definitionId String
  version      Int
  nodes        Json     // Standardized BPMN-like node definitions (Assignee strategies, Gateways, Actions)
  edges        Json     // Standardized sequence flows with routing conditions
  uiLayout     Json?    // Stores the React Flow UI specific layout (x,y coords)
  isPublished  Boolean  @default(false)
  publishedAt  DateTime?
  createdAt    DateTime @default(now())

  definition WorkflowDefinition @relation(fields: [definitionId], references: [id])
  instances  ProcessInstance[]

  @@unique([definitionId, version])
}

model ProcessInstance {
  id               String   @id @default(uuid())
  versionId        String
  initiatorId      String   // Employee ID who started the process
  formTemplateId   String?
  formData         Json?    // The actual data filled by initiator
  status           String   @default("RUNNING") // RUNNING, COMPLETED, CANCELLED, REJECTED, PREDICTION
  currentNodes     Json     // Array of node IDs currently active (for parallel gateways)

  startedAt        DateTime @default(now())
  completedAt      DateTime?

  version      WorkflowVersion @relation(fields: [versionId], references: [id])
  formTemplate FormTemplate?   @relation(fields: [formTemplateId], references: [id])
  tasks        ProcessTask[]
  logs         ProcessLog[]
}

model ProcessTask {
  id               String   @id @default(uuid())
  instanceId       String
  nodeId           String   // Reference to the node in WorkflowVersion
  nodeName         String
  taskType         String   // APPROVAL, FILL, SYSTEM_ACTION
  assigneeId       String?  // The specific employee ID assigned to
  candidateGroup   String?  // Role/Dept group if not assigned to specific user yet

  status           String   @default("PENDING") // PENDING, COMPLETED, REJECTED, CANCELLED
  action           String?  // APPROVED, REJECTED, DELEGATED
  comment          String?

  createdAt        DateTime @default(now())
  completedAt      DateTime?
  dueDate          DateTime? // For SLA monitoring

  instance ProcessInstance @relation(fields: [instanceId], references: [id], onDelete: Cascade)
}

model ProcessLog {
  id               String   @id @default(uuid())
  instanceId       String
  actionType       String   // START, APPROVE, REJECT, ROUTE, WEBHOOK, SIMULATE, RETRO_EXECUTE
  operatorId       String?  // Employee ID or SYSTEM
  details          String?  // Human readable description
  metadata         Json?    // Any extra contextual data

  createdAt        DateTime @default(now())

  instance ProcessInstance @relation(fields: [instanceId], references: [id], onDelete: Cascade)
}
`;

// It might have failed string replace earlier because of Windows line endings or spacing differences
schema = schema.replace(/\/\/ -----------------------------------------------------------------\r?\n\/\/ Workflow & BPM Domain\r?\n\/\/ -----------------------------------------------------------------[\s\S]*/, workflowRepl);

fs.writeFileSync(schemaPath, schema);
