import { NextRequest, NextResponse } from 'next/server';
import { attendanceRepository } from '@aios/data-service';
import { requirePermission, handleRouteError } from '@/lib/auth/guard';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requirePermission('HR', 'WRITE');
    const body = await req.json();
    const schedule = await attendanceRepository.updateSchedule(params.id, {
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.workTimeStart !== undefined ? { workTimeStart: body.workTimeStart } : {}),
      ...(body.workTimeEnd !== undefined ? { workTimeEnd: body.workTimeEnd } : {}),
      ...(body.lateTolerance !== undefined ? { lateTolerance: Number(body.lateTolerance) } : {}),
      ...(body.workDays !== undefined ? { workDays: body.workDays } : {}),
    });
    return NextResponse.json(schedule);
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requirePermission('HR', 'WRITE');
    await attendanceRepository.deleteSchedule(params.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleRouteError(err);
  }
}