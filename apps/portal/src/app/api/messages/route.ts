import { NextResponse } from 'next/server';
import { messageRepository } from '@aios/data-service';
import { requireAuth, handleRouteError } from '@/lib/auth/guard';

export async function GET(req: Request) {
  try {
    const ctx = await requireAuth();
    const { searchParams } = new URL(req.url);
    // 只允许查看自己的收件箱
    const employeeId = searchParams.get('employeeId') ?? ctx.employeeId;
    const view = searchParams.get('view') === 'unread' ? 'unread' : 'all';

    const [items, unread, total] = await Promise.all([
      messageRepository.listMessages(employeeId, view),
      messageRepository.unreadCount(employeeId),
      messageRepository.listMessages(employeeId, 'all'),
    ]);

    return NextResponse.json({ items, unread, total: total.length });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireAuth();
    const body = await req.json();
    const employeeId = body.employeeId ?? ctx.employeeId;
    const updated = await messageRepository.markAllRead(employeeId ?? null);
    return NextResponse.json({ marked: updated.count });
  } catch (err) {
    return handleRouteError(err);
  }
}