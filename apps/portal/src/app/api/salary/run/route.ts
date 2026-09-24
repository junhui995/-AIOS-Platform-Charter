import { NextResponse } from 'next/server';
import { salaryRepository } from '@aios/data-service';
import { requirePermission, handleRouteError } from '@/lib/auth/guard';

export async function POST(req: Request) {
  try {
    await requirePermission('HR', 'WRITE');
    const body = await req.json();
    const month = String(body.month ?? '').trim();
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ error: 'month 格式应为 YYYY-MM' }, { status: 400 });
    }
    const result = await salaryRepository.payRun(month, {
      linkAttendance: body.linkAttendance !== false,
      formulaExpr: body.formulaExpr ? String(body.formulaExpr) : null,
      refresh: body.refresh === true,
    });
    return NextResponse.json(result);
  } catch (err) {
    return handleRouteError(err);
  }
}