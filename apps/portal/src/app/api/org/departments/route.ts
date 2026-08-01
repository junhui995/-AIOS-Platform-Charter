import { NextResponse } from 'next/server';
import { prisma } from '@aios/data-service';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const dimensionId = searchParams.get('dimensionId');

    const whereClause = dimensionId ? { dimensionId } : {};

    const departments = await prisma.department.findMany({
      where: whereClause,
      include: {
        positions: true,
        children: {
          include: {
            positions: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    // To build a tree on the frontend, we return all departments for the dimension.
    // The frontend can assemble them using parentId, or we can just send the root ones.
    // Let's send all and assemble in frontend for flexibility.
    return NextResponse.json(departments);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch departments' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const department = await prisma.department.create({
      data: {
        dimensionId: body.dimensionId,
        code: body.code,
        name: body.name,
        parentId: body.parentId || null,
        headcountLimit: Number(body.headcountLimit) || 0
      }
    });
    return NextResponse.json(department);
  } catch {
    return NextResponse.json({ error: 'Failed to create department' }, { status: 500 });
  }
}
