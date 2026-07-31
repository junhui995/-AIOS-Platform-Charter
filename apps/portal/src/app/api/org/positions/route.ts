import { NextResponse } from 'next/server';
import { prisma } from '@aios/data-service';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const departmentId = searchParams.get('departmentId');

    const whereClause = departmentId ? { departmentId } : {};

    const positions = await prisma.position.findMany({
      where: whereClause,
      include: {
        employees: {
          include: {
            employee: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    return NextResponse.json(positions);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch positions' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const position = await prisma.position.create({
      data: {
        departmentId: body.departmentId,
        code: body.code,
        name: body.name,
        level: body.level,
        baseSalaryRef: body.baseSalaryRef ? Number(body.baseSalaryRef) : null
      }
    });
    return NextResponse.json(position);
  } catch {
    return NextResponse.json({ error: 'Failed to create position' }, { status: 500 });
  }
}
