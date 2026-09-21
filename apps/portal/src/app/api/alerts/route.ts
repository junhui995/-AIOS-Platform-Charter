import { NextResponse } from 'next/server';
import { alertRepository } from '@aios/data-service';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const alerts = await alertRepository.list({
      type: searchParams.get('type') ?? undefined,
      level: searchParams.get('level') ?? undefined,
      status: searchParams.get('status') ?? undefined,
    });
    const counts = await alertRepository.counts();
    return NextResponse.json({ alerts, counts });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 });
  }
}

export async function POST() {
  try {
    const result = await alertRepository.runRules();
    const counts = await alertRepository.counts();
    return NextResponse.json({ ...result, counts });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to run alert rules';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}