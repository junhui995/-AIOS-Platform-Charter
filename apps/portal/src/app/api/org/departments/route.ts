import { NextResponse } from 'next/server';
import { orgRepository } from '@aios/data-service';
import { requireAuth, requirePermission, handleRouteError } from '@/lib/auth/guard';

export async function GET(req: Request) {
  try {
    await requireAuth();
    const { searchParams } = new URL(req.url);
    const dimensionId = searchParams.get('dimensionId');

    const departments = await orgRepository.listDepartments(dimensionId);
    return NextResponse.json(departments);
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function POST(req: Request) {
  try {
    await requirePermission('ORG', 'WRITE');
    const body = await req.json();
    const department = await orgRepository.createDepartment({
      dimensionId: body.dimensionId,
      code: body.code,
      name: body.name,
      parentId: body.parentId || null,
      headcountLimit: Number(body.headcountLimit) || 0,
    });
    return NextResponse.json(department);
  } catch (err) {
    return handleRouteError(err);
  }
}