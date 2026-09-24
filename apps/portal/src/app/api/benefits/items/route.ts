import { NextResponse } from 'next/server';
import { benefitRepository } from '@aios/data-service';
import { requireAuth, requirePermission, handleRouteError } from '@/lib/auth/guard';

export async function GET() {
  try {
    await requireAuth();
    const items = await benefitRepository.listItems();
    return NextResponse.json(items);
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function POST(req: Request) {
  try {
    await requirePermission('HR', 'WRITE');
    const body = await req.json();
    const item = await benefitRepository.createItem({
      code: body.code,
      name: body.name,
      category: body.category,
      periodCost: body.periodCost ?? 0,
      description: body.description ?? null,
    });
    return NextResponse.json(item);
  } catch (err) {
    return handleRouteError(err);
  }
}