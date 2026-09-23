import { NextResponse } from 'next/server';
import { employeeRepository, hasPermission } from '@aios/data-service';
import { requireAuth, requirePermission, handleRouteError } from '@/lib/auth/guard';

const STRIPPED = (e: { id: string; code: string; name: string; email: string }) => ({
  id: e.id, code: e.code, name: e.name, email: e.email,
});

export async function GET() {
  try {
    const ctx = await requireAuth();
    const canReadFull = ctx.bypass || (await hasPermission(ctx.employeeId!, 'HR', 'WRITE'));
    const employees = await employeeRepository.listAll();
    if (canReadFull) return NextResponse.json(employees);
    // 无 HR 写权限：仅返回自助页所需的最小字段（id/code/name/email），避免花名册 PII 泄露
    return NextResponse.json(employees.map((e) => STRIPPED(e)));
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function POST(req: Request) {
  try {
    await requirePermission('HR', 'WRITE');
    const body = await req.json();
    const employee = await employeeRepository.create({
      code: body.code,
      name: body.name,
      phoneNumber: body.phoneNumber,
      email: body.email,
      hireDate: body.hireDate,
      status: body.status || 'ACTIVE',
      personalLevel: body.personalLevel || null,
      positionId: body.positionId,
    });
    return NextResponse.json(employee);
  } catch (err) {
    return handleRouteError(err);
  }
}