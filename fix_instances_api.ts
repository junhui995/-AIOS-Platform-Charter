import * as fs from 'fs';

const filePath = 'apps/portal/src/app/api/workflow/instances/route.ts';
let code = fs.readFileSync(filePath, 'utf8');

// The new correct version of instances/route.ts strictly adhering to user instructions:
const newContent = `import { NextResponse } from 'next/server';
import { prisma } from '@aios/data-service';

export async function POST(req: Request) {
  try {
    const { definitionId, initiatorId, formData } = await req.json();

    const definition = await prisma.workflowDefinition.findUnique({
      where: { id: definitionId },
      include: {
        versions: {
          orderBy: { version: 'desc' },
          take: 1,
          where: { isPublished: true }
        }
      }
    });

    if (!definition || definition.versions.length === 0) {
      return NextResponse.json({ error: "No published version found for this workflow definition" }, { status: 400 });
    }

    const latestVersion = definition.versions[0];
    const nodes = latestVersion.nodes as Record<string, unknown>[];
    const edges = latestVersion.edges as Record<string, unknown>[];

    const startNode = nodes.find(n => n.type === 'start' || n.type === 'input');
    if (!startNode) return NextResponse.json({ error: "Start node missing" }, { status: 400 });

    const firstEdge = edges.find(e => e.source === startNode.id);
    let initialCurrentNodeId = null;
    let initialCurrentNodes: string[] = [];

    if (firstEdge) {
      initialCurrentNodeId = String(firstEdge.target);
      initialCurrentNodes.push(initialCurrentNodeId);
    }

    const instance = await prisma.processInstance.create({
      data: {
        instanceNo: 'FLOW_' + Date.now(),
        versionId: latestVersion.id,
        businessType: 'GENERIC',
        businessId: 'N/A',
        title: definition.name + ' - Process',
        initiatorId: initiatorId || 'system',
        formData: formData || {},
        currentNodeId: initialCurrentNodeId,
        currentNodes: initialCurrentNodes,
        status: "RUNNING",
      }
    });

    await prisma.processLog.create({
      data: {
        instanceId: instance.id,
        actionType: 'START',
        operatorId: initiatorId || 'system',
        details: { message: 'Started process instance' },
      }
    });

    if (initialCurrentNodeId) {
      const nextNode = nodes.find(n => n.id === initialCurrentNodeId);
      if (nextNode && nextNode.type !== 'end' && nextNode.type !== 'output' && !String(nextNode.id).startsWith('gateway')) {

         // Minimal Assignee Parsing V1.0
         let parsedAssigneeId: string | null = null;
         let parsedGroup: string | null = null;
         const nodeData = nextNode.data as Record<string, unknown> || {};

         if (nodeData.assigneeStrategy === 'FORM_VARIABLE') {
             const approverId = (formData as Record<string, unknown>)?.approverId;
             if (approverId && typeof approverId === 'string') {
                 parsedAssigneeId = approverId;
             }
         } else if (nodeData.assigneeStrategy === 'SPECIFIC_USER') {
             parsedAssigneeId = typeof nodeData.specificUser === 'string' ? nodeData.specificUser : null;
         } else if (nodeData.assigneeStrategy === 'DIRECT_MANAGER') {
             // V1 fallback
             parsedGroup = 'DIRECT_MANAGER_REQUIRED';
         }

         if (!parsedAssigneeId && !parsedGroup) {
             console.warn("Could not parse assignee for task, leaving null.");
         }

         await prisma.processTask.create({
            data: {
              instanceId: instance.id,
              nodeId: String(nextNode.id),
              nodeName: String(nodeData.label || 'Approval Task'),
              taskType: 'APPROVAL',
              assigneeId: parsedAssigneeId,
              candidateGroup: parsedGroup,
              status: 'PENDING'
            }
         });
      } else if (nextNode && (nextNode.type === 'end' || nextNode.type === 'output')) {
          // If it immediately ends
          await prisma.processInstance.update({
             where: { id: instance.id },
             data: { status: 'COMPLETED', finishedAt: new Date() }
          });
      }
    }

    return NextResponse.json(instance);

  } catch (error: unknown) {
    console.error("Failed to start process instance:", error);
    return NextResponse.json({ error: "Failed to start process instance" }, { status: 500 });
  }
}

export async function GET() {
   try {
     const instances = await prisma.processInstance.findMany({
       include: {
         tasks: true,
         version: { include: { definition: true } }
       },
       orderBy: { startedAt: 'desc' }
     });
     return NextResponse.json(instances);
   } catch (error: unknown) {
     console.error("Failed to fetch instances:", error);
     return NextResponse.json({ error: "Failed to fetch instances" }, { status: 500 });
   }
}
`;

fs.writeFileSync(filePath, newContent);
