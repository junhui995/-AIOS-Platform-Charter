import { NextResponse } from 'next/server';
import { attendanceRepository } from '@aios/data-service';
import { requirePermission, handleRouteError } from '@/lib/auth/guard';

export async function GET(req: Request) {
  try {
    await requirePermission('HR', 'READ');
    const { searchParams } = new URL(req.url);
    const month = searchParams.get('month') ?? undefined;
    const from = searchParams.get('from') ?? undefined;
    const to = searchParams.get('to') ?? undefined;
    const employeeId = searchParams.get('employeeId') ?? undefined;
    const status = searchParams.get('status') ?? undefined;
    const records = await attendanceRepository.listDaily({
      month: month ?? undefined,
      from: from ?? undefined,
      to: to ?? undefined,
      employeeId: employeeId ?? undefined,
      status: status ?? undefined,
    });
    return NextResponse.json(records);
  } catch (err) {
    return handleRouteError(err);
  }
}