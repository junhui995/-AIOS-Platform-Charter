import { NextResponse } from 'next/server';
import { prisma } from '@aios/data-service';

export async function GET() {
  try {
    const orgTree = await prisma.department.findMany({
      where: { parentId: null },
      include: {
        children: {
          include: { children: true }
        }
      }
    });
    return NextResponse.json(orgTree);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch organization tree' }, { status: 500 });
  }
}
