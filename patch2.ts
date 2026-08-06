import * as fs from 'fs';
const schemaPath = 'packages/data-service/prisma/schema.prisma';
let schema = fs.readFileSync(schemaPath, 'utf8');
if (!schema.includes('model WorkflowVersion')) {
    schema += `

// -----------------------------------------------------------------
// Workflow & BPM Domain (Enhanced)
// -----------------------------------------------------------------

model FormTemplate {
  id          String   @id @default(uuid())
  code        String   @unique
  name        String
  schema      Json
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
  nodes        Json
  edges        Json
  uiLayout     Json?
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
  initiatorId      String
  formTemplateId   String?
  formData         Json?
  status           String   @default("RUNNING")
  currentNodes     Json

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
  nodeId           String
  nodeName         String
  taskType         String
  assigneeId       String?
  candidateGroup   String?

  status           String   @default("PENDING")
  action           String?
  comment          String?

  createdAt        DateTime @default(now())
  completedAt      DateTime?
  dueDate          DateTime?

  instance ProcessInstance @relation(fields: [instanceId], references: [id], onDelete: Cascade)
}

model ProcessLog {
  id               String   @id @default(uuid())
  instanceId       String
  actionType       String
  operatorId       String?
  details          String?
  metadata         Json?

  createdAt        DateTime @default(now())

  instance ProcessInstance @relation(fields: [instanceId], references: [id], onDelete: Cascade)
}
`;
    // We also need to strip out the old incomplete WorkflowDefinition if it's there
    schema = schema.replace(/model WorkflowDefinition \{[\s\S]*?updatedAt DateTime @updatedAt\n\}/, '');
    fs.writeFileSync(schemaPath, schema);
}
