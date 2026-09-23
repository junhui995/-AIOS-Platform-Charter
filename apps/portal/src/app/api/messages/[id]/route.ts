import { NextResponse } from 'next/server';
import { messageRepository } from '@aios/data-service';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const updated = await messageRepository.markRead(id, body.employeeId ?? null);
    if (updated.count === 0) {
      return NextResponse.json({ error: 'Message not found or not mine' }, { status: 404 });
    }
    return NextResponse.json({ read: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to mark message read';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}