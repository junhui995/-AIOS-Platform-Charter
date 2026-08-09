import { NextResponse } from 'next/server';
import { prisma } from '@aios/data-service';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get('employeeId');

  try {
    let requests;
    if (employeeId) {
      requests = await prisma.leaveRequest.findMany({
        where: { employeeId },
        include: { employee: true },
        orderBy: { createdAt: 'desc' }
      });
    } else {
      requests = await prisma.leaveRequest.findMany({
        include: { employee: true },
        orderBy: { createdAt: 'desc' }
      });
    }
    return NextResponse.json(requests);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch leave requests' }, { status: 500 });
  }
}
