import { NextResponse } from 'next/server';
import { monitorRepository } from '@aios/data-service';
import { requirePermission, handleRouteError } from '@/lib/auth/guard';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission('MONITOR', 'WRITE');
    const { id } = await params;
    const summary = await monitorRepository.runRule(id);
    return NextResponse.json({ summary });
  } catch (err) {
    return handleRouteError(err);
  }
}