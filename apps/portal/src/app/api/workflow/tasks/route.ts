import { NextResponse } from 'next/server';
import { prisma } from '@aios/data-service';

// Advance a task
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { taskId, action, operatorId, comment } = body;

    const task = await prisma.processTask.findUnique({
      where: { id: taskId },
      include: { instance: true }
    });

    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });
    if (task.status !== 'PENDING') return NextResponse.json({ error: "Task is not pending" }, { status: 400 });

    const newStatus = action === 'APPROVE' ? 'COMPLETED' : 'REJECTED';

    await prisma.$transaction(async (tx) => {
      // 1. Complete the task
      await tx.processTask.update({
        where: { id: taskId },
        data: {
          status: newStatus,
          completedAt: new Date(),
          assigneeId: operatorId // record who actually did it
        }
      });

      // 2. Write Log
      await tx.processLog.create({
        data: {
          instanceId: task.instanceId,
          taskId: task.id,
          actionType: action,
          operatorId: operatorId,
          details: comment || `Task ${action}`,
        }
      });

      // 3. Very naive next-step progression / instance completion for Vertical Slice
      // If approved, complete the instance and update contract status
      if (action === 'APPROVE') {
          await tx.processInstance.update({
             where: { id: task.instanceId },
             data: { status: 'COMPLETED', endedAt: new Date() }
          });

          // Domain side effect: update contract status to PENDING_SIGN or ACTIVE
          // (assuming instance formData has contractId)
          const formData = task.instance.formData as Record<string, unknown>;
          if (formData?.contractId && typeof formData.contractId === 'string') {
             await tx.laborContract.update({
                where: { id: formData.contractId },
                data: { status: 'ACTIVE', signDate: new Date() } // or ACTIVE depending on rules
             });
          }
      } else {
          // If rejected, terminate the instance and set contract back to DRAFT
          await tx.processInstance.update({
             where: { id: task.instanceId },
             data: { status: 'TERMINATED', endedAt: new Date() }
          });

          const formData = task.instance.formData as Record<string, unknown>;
          if (formData?.contractId && typeof formData.contractId === 'string') {
             await tx.laborContract.update({
                where: { id: formData.contractId },
                data: { status: 'DRAFT' }
             });
          }
      }
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to process task" }, { status: 500 });
  }
}

// Get Tasks
export async function GET(req: Request) {
   const { searchParams } = new URL(req.url);
   const assigneeId = searchParams.get('assigneeId');

   try {
     const tasks = await prisma.processTask.findMany({
       where: assigneeId ? { assigneeId, status: 'PENDING' } : { status: 'PENDING' },
       include: {
         instance: { select: { formData: true, initiatorId: true, version: { select: { definition: { select: { name: true } } } } } }
       },
       orderBy: { createdAt: 'desc' }
     });
     return NextResponse.json(tasks);
   } catch {
     return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 });
   }
}
