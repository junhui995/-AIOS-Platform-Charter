/* eslint-disable */
import { NextResponse } from 'next/server';
import { prisma } from '@aios/data-service';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const { comment } = await req.json();

    const task = await prisma.processTask.update({
       where: { id: params.id },
       data: {
          status: 'APPROVED',
          action: 'APPROVED',
          comment,
          completedAt: new Date()
       },
       include: { instance: true }
    });

    await prisma.processLog.create({
       data: {
          instanceId: task.instanceId,
          actionType: 'APPROVE',
          operatorId: task.assigneeId || 'system',
          details: { message: `Task approved: ${comment || ''}` }
       }
    });

    // In a real implementation we would now evaluate the Next Node and create a new ProcessTask

    return NextResponse.json({ success: true, task });
  } catch (error) {
    return NextResponse.json({ error: "Failed to approve task" }, { status: 500 });
  }
}
