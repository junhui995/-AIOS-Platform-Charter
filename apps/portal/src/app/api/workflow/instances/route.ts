import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Start a new process instance
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { definitionId, initiatorId, formData } = body;

    // Find the latest published version of the definition
    const definition = await prisma.workflowDefinition.findUnique({
      where: { id: definitionId },
      include: { versions: { orderBy: { version: 'desc' }, take: 1, where: { isPublished: true } } }
    });

    if (!definition || definition.versions.length === 0) {
      return NextResponse.json({ error: "No published version found for this workflow definition" }, { status: 400 });
    }

    const latestVersion = definition.versions[0];
    const nodes = latestVersion.nodes as unknown[];
    const edges = latestVersion.edges as unknown[];

    // Find start node
    const startNode = nodes.find(n => n.type === 'input');
    if (!startNode) return NextResponse.json({ error: "No start node defined" }, { status: 400 });

    // Find the first task node (assuming simple linear for initial creation)
    const firstEdge = edges.find(e => e.source === startNode.id);
    const initialCurrentNodes: string[] = [];
    if (firstEdge) {
      initialCurrentNodes.push(firstEdge.target);
    }

    // Create the process instance
    const instance = await prisma.processInstance.create({
      data: {
        versionId: latestVersion.id,
        initiatorId: initiatorId,
        formData: formData || {},
        currentNodes: initialCurrentNodes,
        status: "RUNNING",
      }
    });

    // Log the start event
    await prisma.processLog.create({
      data: {
        instanceId: instance.id,
        actionType: 'START',
        operatorId: initiatorId,
        details: 'Process started',
      }
    });

    // If there is a next node, create a task for it
    if (firstEdge) {
      const nextNode = nodes.find(n => n.id === firstEdge.target);
      if (nextNode && nextNode.type !== 'output' && !nextNode.id.startsWith('gateway')) {

         let assigneeId = null;
         let candidateGroup = null;

         // Extremely simplified Assignee Resolution Strategy
         // In reality, this would query org structure (Direct Manager, Role, etc)
         if (nextNode.data.assigneeStrategy === 'DIRECT_MANAGER') {
            candidateGroup = "MANAGER_ROLE"; // Placeholder
         } else if (nextNode.data.assigneeStrategy === 'SPECIFIC_ROLE') {
            candidateGroup = "HRBP";
         } else if (nextNode.data.assigneeStrategy === 'SPECIFIC_USER') {
            assigneeId = "EMP-SPECIFIC-ID";
         } else if (nextNode.data.assigneeStrategy === 'FORM_VARIABLE') {
            // E.g., read formData['projectManagerId']
            assigneeId = formData['approverId'] || null;
         }

         await prisma.processTask.create({
            data: {
              instanceId: instance.id,
              nodeId: nextNode.id,
              nodeName: nextNode.data.label || 'Approval Task',
              taskType: 'APPROVAL',
              assigneeId: assigneeId,
              candidateGroup: candidateGroup,
              status: 'PENDING'
            }
         });
      }
    }

    return NextResponse.json(instance);

  } catch (_error) {
    console.error("Failed to start process instance:", error);
    return NextResponse.json({ error: "Failed to start process instance" }, { status: 500 });
  }
}

// Get instances (e.g. for my tasks, or my initiated processes)
export async function GET(req: Request) {
   const { searchParams } = new URL(req.url);
   const initiatorId = searchParams.get('initiatorId');

   try {
     const instances = await prisma.processInstance.findMany({
       where: initiatorId ? { initiatorId } : {},
       include: {
         tasks: true,
         version: { select: { version: true, definition: { select: { name: true } } } }
       },
       orderBy: { startedAt: 'desc' }
     });
     return NextResponse.json(instances);
   } catch (_error) {
     return NextResponse.json({ error: "Failed to fetch instances" }, { status: 500 });
   }
}
