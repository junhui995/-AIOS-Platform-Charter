import { NextResponse } from 'next/server';
import { attendanceRepository } from '@aios/data-service';
import { requirePermission, handleRouteError } from '@/lib/auth/guard';

export async function GET(req: Request) {
  try {
    await requirePermission('HR', 'READ');
    const { searchParams } = new URL(req.url);
    const from = searchParams.get('from') ?? undefined;
    const to = searchParams.get('to') ?? undefined;
    const employeeId = searchParams.get('employeeId') ?? undefined;
    const records = await attendanceRepository.listPunches({
      from: from ?? undefined,
      to: to ?? undefined,
      employeeId: employeeId ?? undefined,
    });
    return NextResponse.json(records);
  } catch (err) {
    return handleRouteError(err);
  }
}