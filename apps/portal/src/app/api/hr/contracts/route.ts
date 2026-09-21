import { NextResponse } from 'next/server';
import { contractRepository } from '@aios/data-service';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId');

    const contracts = await contractRepository.list(employeeId);
    return NextResponse.json(contracts);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch contracts' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const contract = await contractRepository.create({
      employeeId: body.employeeId,
      templateId: body.templateId,
      startDate: body.startDate,
      endDate: body.endDate,
    });
    return NextResponse.json(contract);
  } catch {
    return NextResponse.json({ error: 'Failed to create contract' }, { status: 500 });
  }
}