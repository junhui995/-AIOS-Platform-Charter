import { NextRequest, NextResponse } from 'next/server';
import { salaryRepository } from '@aios/data-service';
import { requireOwnerOrAdmin, requirePermission, handleRouteError } from '@/lib/auth/guard';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const slip = await salaryRepository.getSlip(params.id);
    if (!slip) return NextResponse.json({ error: '工资单不存在' }, { status: 404 });
    await requireOwnerOrAdmin(slip.employeeId, 'HR');
    return NextResponse.json(slip);
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requirePermission('HR', 'WRITE');
    const body = await req.json();
    const slip = await salaryRepository.updateSlip(params.id, body);
    if (!slip) return NextResponse.json({ error: '工资单不存在' }, { status: 404 });
    return NextResponse.json(slip);
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requirePermission('HR', 'WRITE');
    const removed = await salaryRepository.deleteSlip(params.id);
    if (!removed) return NextResponse.json({ error: '工资单不存在' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleRouteError(err);
  }
}