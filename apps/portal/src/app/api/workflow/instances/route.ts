/* eslint-disable */
import { NextResponse } from 'next/server';
import { prisma } from '@aios/data-service';

export async function POST(req: Request) {
  try {
    const { versionId, businessType, businessId, title, initiatorId, formData } = await req.json();

    const version = await prisma.workflowVersion.findUnique({
      where: { id: versionId }
    });

    if (!version) return NextResponse.json({ error: "Version not found" }, { status: 404 });

    const nodes = version.nodes as Record<string, unknown>[];
    const edges = version.edges as Record<string, unknown>[];

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
        versionId: version.id,
        businessType: businessType || 'GENERIC',
        businessId: businessId || 'N/A',
        title: title || 'New Process',
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
         await prisma.processTask.create({
            data: {
              instanceId: instance.id,
              nodeId: String(nextNode.id),
              nodeName: String(nextNode.data?.label || 'Approval Task'),
              taskType: 'APPROVAL',
              status: 'WAITING'
            }
         });
      }
    }

    return NextResponse.json(instance);

  } catch {
    return NextResponse.json({ error: "Failed to create instance" }, { status: 500 });
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
   } catch {
     return NextResponse.json({ error: "Failed to fetch instances" }, { status: 500 });
   }
}
