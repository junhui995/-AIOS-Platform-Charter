import { prisma } from '../index';
import type { NotificationLog } from '@prisma/client';

/**
 * In-app message inbox over NotificationLog (channel = 'inapp').
 * employeeId null rows are treated as broadcasts visible to everyone.
 */
export const messageRepository = {
  async listMessages(employeeId?: string | null, view: 'all' | 'unread' = 'all'): Promise<NotificationLog[]> {
    const base = {
      channel: 'inapp',
      OR: employeeId ? [{ employeeId }, { employeeId: null }] : undefined,
    };
    return prisma.notificationLog.findMany({
      where: {
        ...(base.OR ? { channel: base.channel, OR: base.OR } : { channel: base.channel }),
        ...(view === 'unread' ? { readAt: null } : {}),
      },
      orderBy: { sentAt: 'desc' },
    });
  },

  async unreadCount(employeeId?: string | null) {
    return prisma.notificationLog.count({
      where: {
        channel: 'inapp',
        readAt: null,
        ...(employeeId ? { OR: [{ employeeId }, { employeeId: null }] } : {}),
      },
    });
  },

  async markRead(id: string, employeeId?: string | null) {
    return prisma.notificationLog.updateMany({
      where: { id, channel: 'inapp', ...(employeeId ? { OR: [{ employeeId }, { employeeId: null }] } : {}) },
      data: { readAt: new Date() },
    });
  },

  async markAllRead(employeeId?: string | null) {
    return prisma.notificationLog.updateMany({
      where: {
        channel: 'inapp',
        readAt: null,
        ...(employeeId ? { OR: [{ employeeId }, { employeeId: null }] } : {}),
      },
      data: { readAt: new Date() },
    });
  },
};