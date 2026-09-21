import { NextResponse } from 'next/server';
import { alertRepository } from '@aios/data-service';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const alert = await alertRepository.resolve(id, body.note ?? undefined);
    return NextResponse.json(alert);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to resolve alert';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}