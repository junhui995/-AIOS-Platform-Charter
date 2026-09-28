import { NextResponse } from 'next/server';
import { attendanceRepository } from '@aios/data-service';
import { requirePermission, handleRouteError } from '@/lib/auth/guard';

export async function DELETE(_req: Request, ctx: { params: Promise<{ date: string }> }) {
  try {
    await requirePermission('HR', 'WRITE');
    const { date } = await ctx.params;
    const key = decodeURIComponent(date).slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) {
      return NextResponse.json({ error: 'date 格式应为 YYYY-MM-DD' }, { status: 400 });
    }
    const removed = await attendanceRepository.deleteCalendarEntry(key);
    if (!removed) return NextResponse.json({ error: '该日期没有日历配置' }, { status: 404 });
    return NextResponse.json({ deleted: true, date: key });
  } catch (err) {
    return handleRouteError(err);
  }
}
