import { NextResponse } from 'next/server';
import { orgRepository } from '@aios/data-service';
import { requireAuth, requirePermission, handleRouteError } from '@/lib/auth/guard';

export async function GET() {
  try {
    await requireAuth();
    const dimensions = await orgRepository.listDimensions();
    return NextResponse.json(dimensions);
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function POST(req: Request) {
  try {
    await requirePermission('ORG', 'WRITE');
    const body = await req.json();
    const dimension = await orgRepository.createDimension({
      code: body.code,
      name: body.name,
      description: body.description,
    });
    return NextResponse.json(dimension);
  } catch (err) {
    return handleRouteError(err);
  }
}