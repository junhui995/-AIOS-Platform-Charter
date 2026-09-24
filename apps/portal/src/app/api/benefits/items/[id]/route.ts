import { NextRequest, NextResponse } from 'next/server';
import { benefitRepository } from '@aios/data-service';
import { requirePermission, handleRouteError } from '@/lib/auth/guard';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requirePermission('HR', 'WRITE');
    const body = await req.json();
    const item = await benefitRepository.updateItem(params.id, {
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.category !== undefined ? { category: body.category } : {}),
      ...(body.periodCost !== undefined ? { periodCost: body.periodCost } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
    });
    return NextResponse.json(item);
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requirePermission('HR', 'WRITE');
    const removed = await benefitRepository.deleteItem(params.id);
    if (!removed) return NextResponse.json({ error: '福利项不存在' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleRouteError(err);
  }
}