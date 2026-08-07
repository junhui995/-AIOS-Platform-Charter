/* eslint-disable */
import { NextResponse } from 'next/server';
import { prisma } from '@aios/data-service';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const { comment } = await req.json();

    const task = await prisma.processTask.update({
       where: { id: params.id },
       data: {
          status: 'REJECTED',
          action: 'REJECTED',
          comment,
          completedAt: new Date()
       }
    });

    await prisma.processLog.create({
       data: {
          instanceId: task.instanceId,
          actionType: 'REJECT',
          operatorId: task.assigneeId || 'system',
          details: { message: `Task rejected: ${comment || ''}` }
       }
    });

    // Also fail the instance
    await prisma.processInstance.update({
        where: { id: task.instanceId },
        data: { status: 'REJECTED', finishedAt: new Date() }
    });

    return NextResponse.json({ success: true, task });
  } catch (error) {
    return NextResponse.json({ error: "Failed to reject task" }, { status: 500 });
  }
}
