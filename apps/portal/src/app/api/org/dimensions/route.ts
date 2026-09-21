import { NextResponse } from 'next/server';
import { orgRepository } from '@aios/data-service';

export async function GET() {
  try {
    const dimensions = await orgRepository.listDimensions();
    return NextResponse.json(dimensions);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch dimensions' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const dimension = await orgRepository.createDimension({
      code: body.code,
      name: body.name,
      description: body.description,
    });
    return NextResponse.json(dimension);
  } catch {
    return NextResponse.json({ error: 'Failed to create dimension' }, { status: 500 });
  }
}