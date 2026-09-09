/* eslint-disable */
import { NextResponse } from 'next/server';
import { prisma } from '@aios/data-service';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId');

    const contracts = await prisma.laborContract.findMany({
       where: employeeId ? { employeeId } : {},
       include: {
          employee: { select: { name: true, code: true } },
          template: { select: { name: true } }
       },
       orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(contracts);
  } catch (error: unknown) {
    return NextResponse.json({ error: "Failed to fetch contracts" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { employeeId, templateId, contractType, startDate, endDate, probationMonths, salary, position, department, remark } = body;

    const contract = await prisma.laborContract.create({
       data: {
          code: 'HT' + Date.now(),
          employeeId,
          templateId,
          signDate: new Date(startDate),
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          status: 'DRAFT'
       }
    });

    return NextResponse.json(contract);
  } catch (error: unknown) {
    console.error(error);
    return NextResponse.json({ error: "Failed to create contract" }, { status: 500 });
  }
}
