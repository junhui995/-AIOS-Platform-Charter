import { NextResponse } from 'next/server';
import { orgRepository } from '@aios/data-service';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const departmentId = searchParams.get('departmentId');

    const positions = await orgRepository.listPositions(departmentId);
    return NextResponse.json(positions);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch positions' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const position = await orgRepository.createPosition({
      departmentId: body.departmentId,
      code: body.code,
      name: body.name,
      level: body.level,
      baseSalaryRef: body.baseSalaryRef ? Number(body.baseSalaryRef) : null,
    });
    return NextResponse.json(position);
  } catch {
    return NextResponse.json({ error: 'Failed to create position' }, { status: 500 });
  }
}