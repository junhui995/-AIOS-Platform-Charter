import { NextResponse } from 'next/server';
import { parseCondition } from '@aios/data-service';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const expr = typeof body?.conditionExpr === 'string' ? body.conditionExpr : '';
    const parsed = parseCondition(expr);
    return NextResponse.json(parsed.ok
      ? { ok: true }
      : { ok: false, error: parsed.error ?? 'Invalid expression' });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to validate expression';
    return NextResponse.json({ ok: false, error: msg });
  }
}