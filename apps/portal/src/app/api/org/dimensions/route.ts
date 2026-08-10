import { NextResponse } from 'next/server';
import { prisma } from '@aios/data-service';

export async function GET() {
  try {
    const dimensions = await prisma.orgDimension.findMany({
      orderBy: { createdAt: 'asc' }
    });
    return NextResponse.json(dimensions);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch dimensions' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const dimension = await prisma.orgDimension.create({
      data: {
        code: body.code,
        name: body.name,
        description: body.description
      }
    });
    return NextResponse.json(dimension);
  } catch {
    return NextResponse.json({ error: 'Failed to create dimension' }, { status: 500 });
  }
}
