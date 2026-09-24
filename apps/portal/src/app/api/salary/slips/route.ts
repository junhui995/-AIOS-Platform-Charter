import { NextResponse } from 'next/server';
import { salaryRepository } from '@aios/data-service';
import { requireAuth, requirePermission, handleRouteError } from '@/lib/auth/guard';

export async function GET(req: Request) {
  try {
    const ctx = await requireAuth();
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId');
    const month = searchParams.get('month');
    const status = searchParams.get('status');

    // Non-HR callers only ever see their own slips.
    let effectiveId: string | undefined;
    if (ctx.bypass) {
      effectiveId = employeeId ?? undefined;
    } else if (employeeId && employeeId !== ctx.employeeId) {
      await requirePermission('HR', 'WRITE');
      effectiveId = employeeId;
    } else {
      effectiveId = ctx.employeeId!;
    }

    const slips = await salaryRepository.listSlips({
      employeeId: effectiveId,
      month: month ?? undefined,
      status: status ?? undefined,
    });
    return NextResponse.json(slips);
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function POST(req: Request) {
  try {
    await requirePermission('HR', 'WRITE');
    const body = await req.json();
    const slip = await salaryRepository.upsertSlip({
      employeeId: body.employeeId,
      month: body.month,
      baseSalary: body.baseSalary,
      bonus: body.bonus ?? 0,
      deductions: body.deductions ?? 0,
      status: body.status ?? 'DRAFT',
    });
    return NextResponse.json(slip);
  } catch (err) {
    return handleRouteError(err);
  }
}