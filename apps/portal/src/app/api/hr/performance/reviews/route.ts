/* eslint-disable */
import { NextResponse } from 'next/server';
import { prisma } from '@aios/data-service';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId');
    const period = searchParams.get('period');

    const whereClause: Record<string, unknown> = {};
    if (employeeId) whereClause.employeeId = employeeId;
    if (period) whereClause.period = period;

    const reviews = await prisma.performanceReview.findMany({
      where: whereClause,
      include: { employee: true, template: true },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(reviews);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch performance reviews' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const review = await prisma.performanceReview.create({
      data: {
        employeeId: body.employeeId,
        templateId: body.templateId,
        period: body.period,
        score: body.score ? Number(body.score) : null,
        grade: body.grade || null,
        status: body.status || 'DRAFT'
      }
    });
    return NextResponse.json(review);
  } catch {
    return NextResponse.json({ error: 'Failed to create performance review' }, { status: 500 });
  }
}
