import { NextResponse } from 'next/server';
import { contractRepository } from '@aios/data-service';
import { requirePermission, handleRouteError } from '@/lib/auth/guard';

export async function GET(req: Request) {
  try {
    await requirePermission('HR', 'READ');
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId');

    const contracts = await contractRepository.list(employeeId);
    return NextResponse.json(contracts);
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function POST(req: Request) {
  try {
    await requirePermission('HR', 'WRITE');
    const body = await req.json();
    const contract = await contractRepository.create({
      employeeId: body.employeeId,
      templateId: body.templateId,
      startDate: body.startDate,
      endDate: body.endDate,
    });
    return NextResponse.json(contract);
  } catch (err) {
    return handleRouteError(err);
  }
}