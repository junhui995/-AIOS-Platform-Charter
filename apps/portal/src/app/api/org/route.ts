import { NextResponse } from 'next/server';
import { orgRepository } from '@aios/data-service';
import { requireAuth, handleRouteError } from '@/lib/auth/guard';

export async function GET() {
  try {
    await requireAuth();
    const orgTree = await orgRepository.tree();
    return NextResponse.json(orgTree);
  } catch (err) {
    return handleRouteError(err);
  }
}