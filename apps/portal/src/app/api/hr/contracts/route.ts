/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { prisma } from '@aios/data-service';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const where: any = {};
    if (employeeId) {
        where.employeeId = employeeId;
    }
    if (status) {
        where.status = status;
    }
    if (search) {
        where.OR = [
            { code: { contains: search, mode: 'insensitive' } },
            { employee: { name: { contains: search, mode: 'insensitive' } } }
        ];
    }

    const contracts = await prisma.laborContract.findMany({
       where,
       include: {
          employee: { select: { name: true, code: true } },
          template: { select: { name: true } }
       },
       orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(contracts);
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch contracts", details: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { employeeId, templateId, signDate, startDate, endDate, contractType, remark } = body;

    const contract = await prisma.laborContract.create({
       data: {
          code: 'HT' + Date.now(),
          employeeId,
          templateId,
          contractType: contractType || 'FIXED_TERM',
          signDate: signDate ? new Date(signDate) : new Date(startDate),
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          remark,
          status: 'DRAFT'
       }
    });

    return NextResponse.json(contract);
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: "Failed to create contract", details: error.message }, { status: 500 });
  }
}
