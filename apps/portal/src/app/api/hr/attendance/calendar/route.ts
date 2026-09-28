import { NextResponse } from 'next/server';
import { attendanceRepository } from '@aios/data-service';
import { requirePermission, handleRouteError } from '@/lib/auth/guard';

export async function GET(req: Request) {
  try {
    await requirePermission('HR', 'READ');
    const { searchParams } = new URL(req.url);
    const year = searchParams.get('year')?.trim() || undefined;
    const from = searchParams.get('from')?.trim() || undefined;
    const to = searchParams.get('to')?.trim() || undefined;
    const entries = await attendanceRepository.listCalendar({ year, from, to });
    return NextResponse.json(entries);
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function POST(req: Request) {
  try {
    await requirePermission('HR', 'WRITE');
    const body = await req.json();
    const date = String(body.date ?? '').trim().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: 'date 格式应为 YYYY-MM-DD' }, { status: 400 });
    }
    if (body.seedYear !== undefined) {
      const year = Number(body.seedYear);
      if (!Number.isInteger(year) || year < 2000 || year > 2100) {
        return NextResponse.json({ error: 'seedYear 应为 2000-2100 之间的整数' }, { status: 400 });
      }
      const result = await attendanceRepository.seedCalendar(year);
      return NextResponse.json(result);
    }
    const name = String(body.name ?? '').trim();
    if (!name) return NextResponse.json({ error: 'name 不能为空' }, { status: 400 });
    const dayType = String(body.dayType ?? 'HOLIDAY');
    if (!['HOLIDAY', 'MAKEUP_WORKDAY'].includes(dayType)) {
      return NextResponse.json({ error: 'dayType 必须是 HOLIDAY 或 MAKEUP_WORKDAY' }, { status: 400 });
    }
    const entry = await attendanceRepository.upsertCalendarEntry({
      date,
      name,
      dayType,
      isStatutory: body.isStatutory === true ? true : body.isStatutory === false ? false : undefined,
      note: body.note ?? null,
    });
    return NextResponse.json(entry, { status: 201 });
  } catch (err) {
    return handleRouteError(err);
  }
}
