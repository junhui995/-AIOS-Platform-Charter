import { NextResponse } from 'next/server';
import { validateSalaryFormula, SALARY_EXPR_FIELDS } from '@aios/data-service';
import { requireAuth, handleRouteError } from '@/lib/auth/guard';

export async function POST(req: Request) {
  try {
    await requireAuth();
    const body = await req.json();
    const expression = String(body.expression ?? '').trim();
    const result = validateSalaryFormula(expression);
    return NextResponse.json({
      ok: result.ok,
      error: result.ok ? null : result.error,
      allowedFields: SALARY_EXPR_FIELDS,
    });
  } catch (err) {
    return handleRouteError(err);
  }
}