import { NextResponse } from 'next/server';
import { leaveRepository } from '@aios/data-service';

export async function GET() {
  try {
    const balances = await leaveRepository.balanceWithEmployees();
    return NextResponse.json(balances);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch leave balances' }, { status: 500 });
  }
}