import { NextResponse } from 'next/server';
import { messageRepository } from '@aios/data-service';
import { requireAuth, handleRouteError } from '@/lib/auth/guard';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireAuth();
    const { id } = await params;
    const body = await req.json();
    // IDOR: 只能把别人发给我的或广播消息标为已读
    const employeeId = body.employeeId ?? ctx.employeeId;
    const updated = await messageRepository.markRead(id, employeeId);
    if (updated.count === 0) {
      return NextResponse.json({ error: 'Message not found or not mine' }, { status: 404 });
    }
    return NextResponse.json({ read: true });
  } catch (err) {
    return handleRouteError(err);
  }
}