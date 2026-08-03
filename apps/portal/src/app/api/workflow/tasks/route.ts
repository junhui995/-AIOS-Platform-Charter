import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Handle task actions (Approve, Reject, etc)
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { taskId, action, operatorId, comment } = body;
    // action e.g., 'APPROVE', 'REJECT', 'DELEGATE'

    const task = await prisma.processTask.findUnique({
      where: { id: taskId },
      include: { instance: { include: { version: true } } }
    });

    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });
    if (task.status !== 'PENDING') return NextResponse.json({ error: "Task already processed" }, { status: 400 });

    // 1. Update Task Status
    await prisma.processTask.update({
      where: { id: taskId },
      data: {
        status: action === 'REJECT' ? 'REJECTED' : 'COMPLETED',
        action: action,
        comment: comment,
        completedAt: new Date()
      }
    });

    // 2. Log Action
    await prisma.processLog.create({
      data: {
        instanceId: task.instanceId,
        actionType: action,
        operatorId: operatorId,
        details: `Task ${task.nodeName} ${action} with comment: ${comment || 'none'}`,
      }
    });

    // 3. Engine Routing Logic (Simplified Engine)
    const instance = task.instance;
    const version = instance.version;
    const nodes = version.nodes as unknown[];
    const edges = version.edges as unknown[];

    if (action === 'REJECT') {
       // Terminate or route back to start (Simplified: Terminate)
       await prisma.processInstance.update({
          where: { id: instance.id },
          data: { status: 'REJECTED', completedAt: new Date() }
       });
       return NextResponse.json({ message: "Process rejected" });
    }

    if (action === 'APPROVE') {
       // Find outgoing edges from current node
       const outgoingEdges = edges.filter(e => e.source === task.nodeId);

       const nextNodesIds: string[] = [];

       if (outgoingEdges.length > 0) {
           // Basic Gateway / Routing Logic
           // We'll evaluate expressions here in a full engine. For now, simple routing.
           // If it's going to an Exclusive Gateway:
           const nextTargetId = outgoingEdges[0].target;
           const targetNode = nodes.find(n => n.id === nextTargetId);

           if (targetNode?.id.startsWith('gateway')) {
                // Find outgoing edges from gateway
                const gatewayOutEdges = edges.filter(e => e.source === targetNode.id);
                // In real implementation: evaluate conditions on gatewayOutEdges against instance.formData
                if (gatewayOutEdges.length > 0) {
                    nextNodesIds.push(gatewayOutEdges[0].target); // Default to first path
                }
           } else {
               nextNodesIds.push(nextTargetId);
           }
       }

       if (nextNodesIds.length > 0) {
           // Move to next node
           const nextNode = nodes.find(n => n.id === nextNodesIds[0]);

           if (nextNode?.type === 'output') {
               // Process Completed
               await prisma.processInstance.update({
                  where: { id: instance.id },
                  data: { status: 'COMPLETED', completedAt: new Date(), currentNodes: [] }
               });

               // Webhook Trigger (Post-completion action simulation)
               await prisma.processLog.create({
                  data: {
                    instanceId: instance.id,
                    actionType: 'WEBHOOK',
                    details: 'Triggered post-completion webhook actions.',
                  }
               });
           } else {
               // Create next task
               await prisma.processTask.create({
                  data: {
                    instanceId: instance.id,
                    nodeId: nextNode!.id,
                    nodeName: nextNode!.data.label || 'Next Task',
                    taskType: 'APPROVAL',
                    status: 'PENDING'
                  }
               });

               await prisma.processInstance.update({
                  where: { id: instance.id },
                  data: { currentNodes: nextNodesIds }
               });
           }
       }
    }

    return NextResponse.json({ success: true, message: `Task ${action} successfully` });

  } catch (error) {
    console.error("Task processing failed:", error);
    return NextResponse.json({ error: "Failed to process task" }, { status: 500 });
  }
}
