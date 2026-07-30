import { NextResponse } from 'next/server';
import { prisma } from '@aios/data-service';

export async function GET() {
  try {
    const employees = await prisma.employee.findMany({
      include: {
        positions: {
          include: {
            position: {
              include: {
                department: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(employees);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch employees' }, { status: 500 });
  }
}
