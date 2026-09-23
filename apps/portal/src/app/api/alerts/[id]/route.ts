import { NextResponse } from 'next/server';
import { alertRepository } from '@aios/data-service';
import { requirePermission, handleRouteError } from '@/lib/auth/guard';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission('MONITOR', 'WRITE');
    const { id } = await params;
    const body = await req.json();
    const alert = await alertRepository.resolve(id, body.note ?? undefined);
    return NextResponse.json(alert);
  } catch (err) {
    return handleRouteError(err);
  }
}