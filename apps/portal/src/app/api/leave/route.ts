import { NextResponse } from 'next/server';
import { leaveRepository } from '@aios/data-service';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get('employeeId');

  try {
    const requests = await leaveRepository.list(employeeId);
    return NextResponse.json(requests);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch leave requests' }, { status: 500 });
  }
}