import { NextResponse } from 'next/server';
import { messageRepository } from '@aios/data-service';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId');
    const view = searchParams.get('view') === 'unread' ? 'unread' : 'all';

    const [items, unread, total] = await Promise.all([
      messageRepository.listMessages(employeeId, view),
      messageRepository.unreadCount(employeeId),
      messageRepository.listMessages(employeeId, 'all'),
    ]);

    return NextResponse.json({ items, unread, total: total.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch messages';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { employeeId } = body;
    const updated = await messageRepository.markAllRead(employeeId ?? null);
    return NextResponse.json({ marked: updated.count });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to mark all read';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}