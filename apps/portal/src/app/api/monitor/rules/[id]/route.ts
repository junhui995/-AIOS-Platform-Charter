import { NextResponse } from 'next/server';
import { monitorRepository } from '@aios/data-service';
import { requirePermission, handleRouteError } from '@/lib/auth/guard';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission('MONITOR', 'WRITE');
    const { id } = await params;
    const body = await req.json();
    const { operatorId, ...update } = body;
    const rule = await monitorRepository.updateRule(id, update, operatorId ?? null);
    return NextResponse.json({ rule });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission('MONITOR', 'WRITE');
    const { id } = await params;
    await monitorRepository.deleteRule(id);
    return NextResponse.json({ deleted: true });
  } catch (err) {
    return handleRouteError(err);
  }
}