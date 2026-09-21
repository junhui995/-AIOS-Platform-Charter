import { NextResponse } from 'next/server';
import { performanceRepository } from '@aios/data-service';

export async function GET() {
  try {
    const templates = await performanceRepository.listTemplates();
    return NextResponse.json(templates);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch performance templates' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const template = await performanceRepository.createTemplate({
      name: body.name,
      targetType: body.targetType,
      metrics: body.metrics,
    });
    return NextResponse.json(template);
  } catch {
    return NextResponse.json({ error: 'Failed to create performance template' }, { status: 500 });
  }
}