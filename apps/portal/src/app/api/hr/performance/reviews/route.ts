import { NextResponse } from 'next/server';
import { performanceRepository } from '@aios/data-service';
import { requirePermission, handleRouteError } from '@/lib/auth/guard';

export async function GET(req: Request) {
  try {
    await requirePermission('HR', 'READ');
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId');
    const period = searchParams.get('period');

    const reviews = await performanceRepository.listReviews(employeeId, period);
    return NextResponse.json(reviews);
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function POST(req: Request) {
  try {
    await requirePermission('HR', 'WRITE');
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
  } catch (err) {
    return handleRouteError(err);
  }
}