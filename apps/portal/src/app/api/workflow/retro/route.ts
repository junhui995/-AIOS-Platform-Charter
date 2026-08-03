import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Retro-Execution Endpoint (补运行)
// Used when an old workflow instance stalled due to an error, or a node needs to be re-run manually by an admin.
export async function POST(req: Request) {
  try {
    const { instanceId, targetNodeId, adminOperatorId, reason } = await req.json();

    const instance = await prisma.processInstance.findUnique({
      where: { id: instanceId },
      include: { version: true }
    });

    if (!instance) return NextResponse.json({ error: "Instance not found" }, { status: 404 });

    const nodes = instance.version.nodes as any[];
    const targetNode = nodes.find(n => n.id === targetNodeId);

    if (!targetNode) return NextResponse.json({ error: "Target node not found in version" }, { status: 400 });

    // Cancel all currently pending tasks
    await prisma.processTask.updateMany({
        where: { instanceId: instanceId, status: 'PENDING' },
        data: { status: 'CANCELLED', comment: `Cancelled due to manual retro-execution to node ${targetNode.data?.label}` }
    });

    // Create new task at the target node
    await prisma.processTask.create({
        data: {
          instanceId: instance.id,
          nodeId: targetNode.id,
          nodeName: targetNode.data.label || 'Recovered Task',
          taskType: 'APPROVAL',
          status: 'PENDING'
        }
    });

    // Update instance current nodes
    await prisma.processInstance.update({
        where: { id: instanceId },
        data: { currentNodes: [targetNode.id], status: 'RUNNING' }
    });

    // Log the manual intervention
    await prisma.processLog.create({
        data: {
          instanceId: instanceId,
          actionType: 'RETRO_EXECUTE',
          operatorId: adminOperatorId,
          details: `Admin retro-executed process to node ${targetNode.data?.label}. Reason: ${reason}`,
        }
    });

    return NextResponse.json({ success: true, message: "Retro-execution triggered successfully." });

  } catch (error) {
    console.error("Retro-execution failed:", error);
    return NextResponse.json({ error: "Failed to perform retro-execution" }, { status: 500 });
  }
}
