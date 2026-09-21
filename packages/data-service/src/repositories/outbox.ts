import { prisma } from '../index';

export interface OutboxEventRecord {
  id: string;
  eventType: string;
  aggregate: string;
  aggregateId: string;
  payload: unknown;
  status: string;
  attempts: number;
  lastError: string | null;
  createdAt: Date;
  publishedAt: Date | null;
}

export interface OutboxEnvelope {
  eventType: string;
  aggregate: string;
  aggregateId: string;
  payload: unknown;
}

/**
 * Single point of persistence for the event outbox.
 * All domain events must be written here before any async dispatch.
 */
export const outboxRepository = {
  async create(env: OutboxEnvelope): Promise<OutboxEventRecord> {
    return prisma.outboxEvent.create({
      data: {
        eventType: env.eventType,
        aggregate: env.aggregate,
        aggregateId: env.aggregateId,
        payload: env.payload as object,
      },
    }) as unknown as Promise<OutboxEventRecord>;
  },

  async claimNext(batch = 10): Promise<OutboxEventRecord[]> {
    const events = await prisma.outboxEvent.findMany({
      where: { status: 'PENDING' },
      take: batch,
      orderBy: { createdAt: 'asc' },
    });
    if (events.length > 0) {
      await prisma.outboxEvent.updateMany({
        where: { id: { in: events.map((e) => e.id) } },
        data: { attempts: { increment: 1 } },
      });
    }
    return events as unknown as OutboxEventRecord[];
  },

  async markPublished(id: string): Promise<void> {
    await prisma.outboxEvent.update({
      where: { id },
      data: { status: 'PUBLISHED', publishedAt: new Date() },
    });
  },

  async markFailed(id: string, error: string): Promise<void> {
    await prisma.outboxEvent.update({
      where: { id },
      data: { status: 'FAILED', lastError: error },
    });
  },
};