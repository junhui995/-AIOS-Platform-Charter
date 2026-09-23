import { NextResponse } from 'next/server';
import { performanceRepository } from '@aios/data-service';
import { requirePermission, handleRouteError } from '@/lib/auth/guard';

export async function GET() {
  try {
    await requirePermission('HR', 'READ');
    const templates = await performanceRepository.listTemplates();
    return NextResponse.json(templates);
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function POST(req: Request) {
  try {
    await requirePermission('HR', 'WRITE');
    const body = await req.json();
    const template = await performanceRepository.createTemplate({
      name: body.name,
      targetType: body.targetType,
      metrics: body.metrics,
    });
    return NextResponse.json(template);
  } catch (err) {
    return handleRouteError(err);
  }
}