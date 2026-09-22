import { NextResponse } from 'next/server';
import { monitorRepository } from '@aios/data-service';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(_req.url);
    const take = Math.min(Math.max(Number(searchParams.get('take') ?? 20) || 20, 1), 100);
    const logs = await monitorRepository.listRunLogs(id, take);
    return NextResponse.json({ logs });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to list monitor run logs';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}