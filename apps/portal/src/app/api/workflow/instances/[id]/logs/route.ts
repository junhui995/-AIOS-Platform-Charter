/* eslint-disable */
import { NextResponse } from 'next/server';
import { prisma } from '@aios/data-service';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const logs = await prisma.processLog.findMany({
       where: { instanceId: params.id },
       orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(logs);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch logs" }, { status: 500 });
  }
}
