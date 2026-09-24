import { NextRequest, NextResponse } from 'next/server';
import { benefitRepository } from '@aios/data-service';
import { requireAuth, requireOwnerOrAdmin, handleRouteError } from '@/lib/auth/guard';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAuth();
    const body = await req.json().catch(() => ({}));
    if (body.status !== 'OPTED_OUT' && body.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'status 必须是 ACTIVE 或 OPTED_OUT' }, { status: 400 });
    }
    const existing = await benefitRepository.listEnrollments();
    const row = existing.find((e) => e.id === params.id);
    if (!row) return NextResponse.json({ error: '福利登记不存在' }, { status: 404 });
    await requireOwnerOrAdmin(row.employeeId, 'HR');
    if (body.status === 'OPTED_OUT') {
      const updated = await benefitRepository.optOut(params.id);
      return NextResponse.json(updated);
    }
    const updated = await benefitRepository.enroll({
      employeeId: row.employeeId,
      itemId: row.itemId,
      startMonth: row.startMonth,
    });
    return NextResponse.json(updated);
  } catch (err) {
    return handleRouteError(err);
  }
}