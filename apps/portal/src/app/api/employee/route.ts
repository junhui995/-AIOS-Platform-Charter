import { NextResponse } from 'next/server';
import { employeeRepository } from '@aios/data-service';

export async function GET() {
  try {
    const employees = await employeeRepository.listAll();
    return NextResponse.json(employees);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch employees' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const employee = await employeeRepository.create({
      code: body.code,
      name: body.name,
      phoneNumber: body.phoneNumber,
      email: body.email,
      hireDate: body.hireDate,
      status: body.status || 'ACTIVE',
      personalLevel: body.personalLevel || null,
      positionId: body.positionId,
    });
    return NextResponse.json(employee);
  } catch {
    return NextResponse.json({ error: 'Failed to create employee' }, { status: 500 });
  }
}