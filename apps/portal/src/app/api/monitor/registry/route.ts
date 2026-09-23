import { NextResponse } from 'next/server';
import { entityRegistry } from '@aios/data-service';
import { requireAuth, handleRouteError } from '@/lib/auth/guard';

export async function GET() {
  try {
    await requireAuth();
    return NextResponse.json(entityRegistry);
  } catch (err) {
    return handleRouteError(err);
  }
}