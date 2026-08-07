/* eslint-disable */
import { NextResponse } from 'next/server';
import { prisma } from '@aios/data-service';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') || 'system'; // Mock auth

    const instances = await prisma.processInstance.findMany({
       where: { initiatorId: userId },
       include: {
          version: { include: { definition: true } }
       },
       orderBy: { startedAt: 'desc' }
    });

    return NextResponse.json(instances);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch my instances" }, { status: 500 });
  }
}
