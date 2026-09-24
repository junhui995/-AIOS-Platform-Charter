import { NextResponse } from 'next/server';
import { benefitRepository } from '@aios/data-service';
import { requireAuth, requirePermission, handleRouteError } from '@/lib/auth/guard';

export async function GET(req: Request) {
  try {
    const ctx = await requireAuth();
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId');
    const status = searchParams.get('status');

    let effectiveId: string | undefined;
    if (ctx.bypass) {
      effectiveId = employeeId ?? undefined;
    } else if (employeeId && employeeId !== ctx.employeeId) {
      await requirePermission('HR', 'WRITE');
      effectiveId = employeeId;
    } else {
      effectiveId = ctx.employeeId!;
    }

    const enrollments = await benefitRepository.listEnrollments({
      employeeId: effectiveId,
      status: status ?? undefined,
    });
    return NextResponse.json(enrollments);
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function POST(req: Request) {
  try {
    await requirePermission('HR', 'WRITE');
    const body = await req.json();
    const enrollment = await benefitRepository.enroll({
      employeeId: body.employeeId,
      itemId: body.itemId,
      startMonth: body.startMonth ?? null,
    });
    return NextResponse.json(enrollment);
  } catch (err) {
    return handleRouteError(err);
  }
}