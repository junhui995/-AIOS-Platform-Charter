import { NextResponse } from 'next/server';
import { alertRepository } from '@aios/data-service';
import { requirePermission, handleRouteError } from '@/lib/auth/guard';

export async function GET(req: Request) {
  try {
    await requirePermission('MONITOR', 'READ');
    const { searchParams } = new URL(req.url);
    const alerts = await alertRepository.list({
      type: searchParams.get('type') ?? undefined,
      level: searchParams.get('level') ?? undefined,
      status: searchParams.get('status') ?? undefined,
    });
    const counts = await alertRepository.counts();
    return NextResponse.json({ alerts, counts });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function POST() {
  try {
    await requirePermission('MONITOR', 'WRITE');
    const result = await alertRepository.runRules();
    const counts = await alertRepository.counts();
    return NextResponse.json({ ...result, counts });
  } catch (err) {
    return handleRouteError(err);
  }
}