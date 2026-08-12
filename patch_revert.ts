import * as fs from 'fs';

const schemaPath = 'packages/data-service/prisma/schema.prisma';
let schema = fs.readFileSync(schemaPath, 'utf8');

const targetModel = `model WorkflowDefinition {
  id          String  @id @default(uuid())
  code        String  @unique
  name        String
  description String?
  nodes       Json
  edges       Json
  isActive    Boolean @default(true)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}`;

// Since the user is overriding the previous models, they might be wanting to clear the other workflow tables.
// "把schema.prisma 里 Workflow & BPM Domain 的完整替换下面这段"
// That means EVERYTHING after the Workflow & BPM Domain header gets replaced.

const matchHeader = /\/\/ -+\s*\n\/\/ Workflow & BPM Domain.*?\n\/\/ -+\s*\n[\s\S]*$/;
if (matchHeader.test(schema)) {
   schema = schema.replace(matchHeader, `// -----------------------------------------------------------------
// Workflow & BPM Domain
// -----------------------------------------------------------------

${targetModel}
`);
} else {
   // Just in case the header is different or missing, replace everything from the first Workflow block.
   // Or just append if it's completely gone.
   // Let's do a reliable regex that removes the FormTemplate and WorkflowDefinition, etc.
   schema = schema.replace(/model FormTemplate \{[\s\S]*\}\n?/g, '');
   schema = schema.replace(/model WorkflowDefinition \{[\s\S]*\}\n?/g, '');
   schema = schema.replace(/model WorkflowVersion \{[\s\S]*\}\n?/g, '');
   schema = schema.replace(/model ProcessInstance \{[\s\S]*\}\n?/g, '');
   schema = schema.replace(/model ProcessTask \{[\s\S]*\}\n?/g, '');
   schema = schema.replace(/model ProcessLog \{[\s\S]*\}\n?/g, '');
   schema = schema.replace(/model ProcessEvent \{[\s\S]*\}\n?/g, '');
   schema = schema.replace(/model ProcessAction \{[\s\S]*\}\n?/g, '');
   schema = schema.replace(/model WorkflowFormTemplate \{[\s\S]*\}\n?/g, '');

   schema += `\n// -----------------------------------------------------------------\n// Workflow & BPM Domain\n// -----------------------------------------------------------------\n\n${targetModel}\n`;
}

fs.writeFileSync(schemaPath, schema);
