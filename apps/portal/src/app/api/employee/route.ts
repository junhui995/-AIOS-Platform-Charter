/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { prisma } from '@aios/data-service';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const departmentId = searchParams.get('departmentId');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const where: any = {};
    if (departmentId) {
        where.positions = { some: { position: { departmentId } } };
    }
    if (status) {
        where.status = status;
    }
    if (search) {
        where.OR = [
            { name: { contains: search, mode: 'insensitive' } },
            { code: { contains: search, mode: 'insensitive' } },
            { phoneNumber: { contains: search } }
        ];
    }

    const employees = await prisma.employee.findMany({
      where,
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
  } catch (e: any) {
    return NextResponse.json({ error: 'Failed to fetch employees', details: e.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Auto-generate code if not provided
    const code = body.code || `EMP-${Date.now()}`;

    const employee = await prisma.employee.create({
      data: {
        code,
        name: body.name,
        gender: body.gender,
        idNumber: body.idNumber,
        birthDate: body.birthDate ? new Date(body.birthDate) : undefined,
        address: body.address,
        phoneNumber: body.phoneNumber || `TEMP-${Date.now()}`, // Temporary fallback if not provided but required
        email: body.email || `temp-${Date.now()}@example.com`,
        hireDate: body.hireDate ? new Date(body.hireDate) : new Date(),
        probationDate: body.probationDate ? new Date(body.probationDate) : undefined,
        resignationDate: body.resignationDate ? new Date(body.resignationDate) : undefined,
        status: body.status || 'ACTIVE',
        personalLevel: body.personalLevel || null,
        emergencyContactName: body.emergencyContactName,
        emergencyContactPhone: body.emergencyContactPhone,
        remark: body.remark,
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
  } catch (e: any) {
    console.error("Employee Creation Error:", e);
    return NextResponse.json({ error: 'Failed to create employee', details: e.message }, { status: 500 });
  }
}
