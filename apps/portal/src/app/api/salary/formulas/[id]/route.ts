import { NextRequest, NextResponse } from 'next/server';
import { salaryRepository } from '@aios/data-service';
import { requirePermission, handleRouteError } from '@/lib/auth/guard';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requirePermission('HR', 'WRITE');
    const body = await req.json();
    const formula = await salaryRepository.updateFormula(params.id, {
      ...(body.targetType !== undefined ? { targetType: body.targetType } : {}),
      ...(body.targetId !== undefined ? { targetId: body.targetId } : {}),
      ...(body.expression !== undefined ? { expression: body.expression } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
    });
    return NextResponse.json(formula);
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requirePermission('HR', 'WRITE');
    await salaryRepository.deleteFormula(params.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleRouteError(err);
  }
}