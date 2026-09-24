import { NextResponse } from 'next/server';
import { attendanceRepository } from '@aios/data-service';
import { requirePermission, handleRouteError } from '@/lib/auth/guard';

export async function GET() {
  try {
    await requirePermission('HR', 'READ');
    const schedules = await attendanceRepository.listSchedules();
    return NextResponse.json(schedules);
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function POST(req: Request) {
  try {
    await requirePermission('HR', 'WRITE');
    const body = await req.json();
    const schedule = await attendanceRepository.createSchedule({
      name: body.name,
      workTimeStart: body.workTimeStart,
      workTimeEnd: body.workTimeEnd,
      lateTolerance: body.lateTolerance ?? 0,
      workDays: Array.isArray(body.workDays) ? body.workDays : undefined,
    });
    return NextResponse.json(schedule);
  } catch (err) {
    return handleRouteError(err);
  }
}