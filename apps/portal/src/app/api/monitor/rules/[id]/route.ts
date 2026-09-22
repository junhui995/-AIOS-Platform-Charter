import { NextResponse } from 'next/server';
import { monitorRepository } from '@aios/data-service';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { operatorId, ...update } = body;
    const rule = await monitorRepository.updateRule(id, update, operatorId ?? null);
    return NextResponse.json({ rule });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to update monitor rule';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await monitorRepository.deleteRule(id);
    return NextResponse.json({ deleted: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to delete monitor rule';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}