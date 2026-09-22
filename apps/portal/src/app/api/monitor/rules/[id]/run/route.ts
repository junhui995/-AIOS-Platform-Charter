import { NextResponse } from 'next/server';
import { monitorRepository } from '@aios/data-service';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const summary = await monitorRepository.runRule(id);
    return NextResponse.json({ summary });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to run monitor rule';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}