import { NextResponse } from 'next/server';
import { salaryRepository } from '@aios/data-service';
import { requirePermission, handleRouteError } from '@/lib/auth/guard';

export async function GET() {
  try {
    await requirePermission('HR', 'READ');
    const formulas = await salaryRepository.listFormulas();
    return NextResponse.json(formulas);
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function POST(req: Request) {
  try {
    await requirePermission('HR', 'WRITE');
    const body = await req.json();
    const formula = await salaryRepository.createFormula({
      targetType: body.targetType,
      targetId: body.targetId ?? null,
      expression: body.expression,
      description: body.description ?? null,
    });
    return NextResponse.json(formula);
  } catch (err) {
    return handleRouteError(err);
  }
}