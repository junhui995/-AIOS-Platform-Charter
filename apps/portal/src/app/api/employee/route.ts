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

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const employee = await prisma.employee.create({
      data: {
        code: body.code,
        name: body.name,
        phoneNumber: body.phoneNumber,
        email: body.email,
        hireDate: new Date(body.hireDate),
        status: body.status || 'ACTIVE',
        personalLevel: body.personalLevel || null,
        positions: body.positionId ? {
          create: {
            positionId: body.positionId,
            isPrimary: true
          }
        } : undefined
      },
      include: {
        positions: {
          include: { position: { include: { department: true } } }
        }
      }
    });
    return NextResponse.json(employee);
  } catch {
    return NextResponse.json({ error: 'Failed to create employee' }, { status: 500 });
  }
}
