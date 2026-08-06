import { NextResponse } from 'next/server';
import { prisma } from '@aios/data-service';

export async function GET() {
  try {
    const templates = await prisma.performanceTemplate.findMany({
      include: {
        _count: {
          select: { reviews: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(templates);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch performance templates' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const template = await prisma.performanceTemplate.create({
      data: {
        name: body.name,
        targetType: body.targetType || 'EMPLOYEE',
        metrics: body.metrics || {} // JSON type
      }
    });
    return NextResponse.json(template);
  } catch {
    return NextResponse.json({ error: 'Failed to create performance template' }, { status: 500 });
  }
}
