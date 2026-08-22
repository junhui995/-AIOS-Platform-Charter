/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { prisma } from '@aios/data-service';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { definitionId, initiatorId, formData } = body;

    const version = await prisma.workflowVersion.findFirst({
      where: { definitionId: definitionId, isPublished: true },
      orderBy: { version: 'desc' }
    });

    if (!version) {
      return NextResponse.json({ error: "No published version found for this workflow definition" }, { status: 400 });
    }

    const latestVersion = version;
    const nodes = latestVersion.nodes as unknown[];
    const edges = latestVersion.edges as unknown[];

    // Find start node
    const startNode = nodes.find((n: any) => n.type === 'input');
    if (!startNode) return NextResponse.json({ error: "No start node defined" }, { status: 400 });

    const firstEdge = edges.find((e: any) => e.source === (startNode as any).id);
    const initialCurrentNodes: string[] = [];
    if (firstEdge) {
      initialCurrentNodes.push((firstEdge as any).target);
    }

    const instance = await prisma.processInstance.create({
      data: {
        versionId: latestVersion.id,
        initiatorId: initiatorId,
        formData: formData || {},
        currentNodes: initialCurrentNodes,
        status: "RUNNING",
      }
    });

    await prisma.processLog.create({
      data: {
        instanceId: instance.id,
        actionType: 'START',
        operatorId: initiatorId,
        details: 'Process started',
      }
    });

    if (firstEdge) {
      const nextNode = nodes.find((n: any) => n.id === (firstEdge as any).target);
      if (nextNode && (nextNode as any).type !== 'output' && !(nextNode as any).id.startsWith('gateway')) {
         let assigneeId = null;
         let candidateGroup = null;

         if ((nextNode as any).data.assigneeStrategy === 'DIRECT_MANAGER') {
            candidateGroup = "MANAGER_ROLE";
         } else if ((nextNode as any).data.assigneeStrategy === 'SPECIFIC_ROLE') {
            candidateGroup = "HRBP";
         } else if ((nextNode as any).data.assigneeStrategy === 'SPECIFIC_USER') {
            assigneeId = "EMP-SPECIFIC-ID";
         } else if ((nextNode as any).data.assigneeStrategy === 'FORM_VARIABLE') {
            const typedFormData = formData as Record<string, unknown>;
            assigneeId = (typedFormData['approverId'] as string) || null;
         }

         await prisma.processTask.create({
            data: {
              instanceId: instance.id,
              nodeId: (nextNode as any).id,
              nodeName: (nextNode as any).data.label || 'Approval Task',
              taskType: 'APPROVAL',
              assigneeId: assigneeId,
              candidateGroup: candidateGroup,
              status: 'PENDING'
            }
         });
      }
    }

    return NextResponse.json(instance);
  } catch {
    return NextResponse.json({ error: "Failed to start process instance" }, { status: 500 });
  }
}

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
   } catch {
     return NextResponse.json({ error: "Failed to fetch instances" }, { status: 500 });
   }
}
