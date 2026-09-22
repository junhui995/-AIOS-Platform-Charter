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

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { employeeId, annualTotal, sickTotal } = body;

    if (!employeeId) {
      return NextResponse.json({ error: 'employeeId is required' }, { status: 400 });
    }
    if (annualTotal !== undefined && (Number.isNaN(Number(annualTotal)) || Number(annualTotal) < 0)) {
      return NextResponse.json({ error: 'annualTotal must be a non-negative number' }, { status: 400 });
    }
    if (sickTotal !== undefined && (Number.isNaN(Number(sickTotal)) || Number(sickTotal) < 0)) {
      return NextResponse.json({ error: 'sickTotal must be a non-negative number' }, { status: 400 });
    }

    const balance = await leaveRepository.updateBalance(employeeId, {
      ...(annualTotal !== undefined ? { annualTotal: Number(annualTotal) } : {}),
      ...(sickTotal !== undefined ? { sickTotal: Number(sickTotal) } : {}),
    });
    return NextResponse.json(balance);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to update leave balance';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}