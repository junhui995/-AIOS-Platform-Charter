import { NextResponse } from 'next/server';
import { performanceRepository } from '@aios/data-service';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId');
    const period = searchParams.get('period');

    const reviews = await performanceRepository.listReviews(employeeId, period);
    return NextResponse.json(reviews);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch performance reviews' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const review = await performanceRepository.createReview({
      employeeId: body.employeeId,
      templateId: body.templateId,
      period: body.period,
      score: body.score ? Number(body.score) : null,
      grade: body.grade || null,
      status: body.status || 'DRAFT',
    });
    return NextResponse.json(review);
  } catch {
    return NextResponse.json({ error: 'Failed to create performance review' }, { status: 500 });
  }
}