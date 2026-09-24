import { NextResponse } from 'next/server';
import { attendanceRepository } from '@aios/data-service';
import { requirePermission, handleRouteError } from '@/lib/auth/guard';

export async function GET(req: Request) {
  try {
    await requirePermission('HR', 'READ');
    const { searchParams } = new URL(req.url);
    const targetDate = searchParams.get('targetDate') ?? undefined;
    const employeeId = searchParams.get('employeeId') ?? undefined;
    const records = await attendanceRepository.listDaily({
      from: targetDate,
      to: targetDate,
      employeeId: employeeId ?? undefined,
    });
    return NextResponse.json(records);
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function POST(req: Request) {
  try {
    await requirePermission('HR', 'WRITE');
    const body = await req.json();
    const targetDate = String(body.targetDate ?? new Date().toISOString().slice(0, 10)).slice(0, 10);
    const result = await attendanceRepository.analyzeDay(targetDate);
    return NextResponse.json(result);
  } catch (err) {
    return handleRouteError(err);
  }
}