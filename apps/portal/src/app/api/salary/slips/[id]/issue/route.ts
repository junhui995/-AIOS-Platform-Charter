import { NextRequest, NextResponse } from 'next/server';
import { salaryRepository } from '@aios/data-service';
import { requirePermission, handleRouteError } from '@/lib/auth/guard';

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requirePermission('HR', 'WRITE');
    const slip = await salaryRepository.issueSlip(params.id);
    if (!slip) return NextResponse.json({ error: '工资单不存在' }, { status: 404 });
    return NextResponse.json(slip);
  } catch (err) {
    return handleRouteError(err);
  }
}