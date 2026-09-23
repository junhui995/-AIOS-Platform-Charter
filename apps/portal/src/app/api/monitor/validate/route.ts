import { NextResponse } from 'next/server';
import { parseCondition, assertRuleConditionFields } from '@aios/data-service';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const expr = typeof body?.conditionExpr === 'string' ? body.conditionExpr : '';
    const target = typeof body?.target === 'string' && body.target ? body.target : undefined;

    const parsed = parseCondition(expr);
    if (!parsed.ok) {
      return NextResponse.json({ ok: false, error: parsed.error ?? 'Invalid expression' });
    }

    if (target) {
      try {
        assertRuleConditionFields(expr, target);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Field not allowed by Registry';
        return NextResponse.json({ ok: false, error: msg });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to validate expression';
    return NextResponse.json({ ok: false, error: msg });
  }
}