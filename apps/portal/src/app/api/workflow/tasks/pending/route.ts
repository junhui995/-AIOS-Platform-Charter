/* eslint-disable */
import { NextResponse } from 'next/server';
import { prisma } from '@aios/data-service';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') || 'system';

    const tasks = await prisma.processTask.findMany({
       where: {
          status: 'WAITING',
          // Optionally filter by assigneeId = userId
       },
       include: {
          instance: { include: { version: { include: { definition: true } } } }
       },
       orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(tasks);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch pending tasks" }, { status: 500 });
  }
}
