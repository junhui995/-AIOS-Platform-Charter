import { NextResponse } from 'next/server';
import { contractRepository } from '@aios/data-service';

export async function GET() {
  try {
    const [totalActive, expired, within30, within60, within90] = await Promise.all([
      contractRepository.countByStatus('ACTIVE'),
      contractRepository.countByStatus('EXPIRED'),
      contractRepository.countActiveExpiringWithin(30),
      contractRepository.countActiveExpiringWithin(60),
      contractRepository.countActiveExpiringWithin(90),
    ]);

    return NextResponse.json({ totalActive, within30, within60, within90, expired });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch contract stats' }, { status: 500 });
  }
}