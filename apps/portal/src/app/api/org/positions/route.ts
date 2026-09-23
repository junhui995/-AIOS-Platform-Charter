import { NextResponse } from 'next/server';
import { orgRepository } from '@aios/data-service';
import { requireAuth, requirePermission, handleRouteError } from '@/lib/auth/guard';

export async function GET(req: Request) {
  try {
    await requireAuth();
    const { searchParams } = new URL(req.url);
    const departmentId = searchParams.get('departmentId');

    const positions = await orgRepository.listPositions(departmentId);
    return NextResponse.json(positions);
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function POST(req: Request) {
  try {
    await requirePermission('ORG', 'WRITE');
    const body = await req.json();
    const position = await orgRepository.createPosition({
      departmentId: body.departmentId,
      code: body.code,
      name: body.name,
      level: body.level,
      baseSalaryRef: body.baseSalaryRef ? Number(body.baseSalaryRef) : null,
    });
    return NextResponse.json(position);
  } catch (err) {
    return handleRouteError(err);
  }
}