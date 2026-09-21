import { NextResponse } from 'next/server';
import { orgRepository } from '@aios/data-service';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const dimensionId = searchParams.get('dimensionId');

    const departments = await orgRepository.listDepartments(dimensionId);
    return NextResponse.json(departments);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch departments' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const department = await orgRepository.createDepartment({
      dimensionId: body.dimensionId,
      code: body.code,
      name: body.name,
      parentId: body.parentId || null,
      headcountLimit: Number(body.headcountLimit) || 0,
    });
    return NextResponse.json(department);
  } catch {
    return NextResponse.json({ error: 'Failed to create department' }, { status: 500 });
  }
}