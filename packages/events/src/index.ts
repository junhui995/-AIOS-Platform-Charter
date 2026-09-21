import { outboxRepository } from '@aios/data-service';

export interface DomainEvent {
  eventType: string;
  aggregate: string;
  aggregateId: string;
  payload: unknown;
  occurredAt: Date;
}

export interface Envelope {
  eventType: string;
  aggregate: string;
  aggregateId: string;
  payload: unknown;
}

export interface EventHandler {
  (event: DomainEvent): Promise<void> | void;
}

export interface EventBusOptions {
  pollIntervalMs?: number;
}

/**
 * Event bus backed by a Postgres outbox with a bounded in-memory buffer.
 *
 * - publish() durably writes the event to the outbox table when the
 *   database is available; otherwise it is buffered in-memory so that
 *   the execution layer never hard-fails because the queue is down.
 * - dispatchOnce() first drains the in-memory buffer, then claims pending
 *   records from the outbox and fans them out to subscribers, marking each
 *   PUBLISHED/FAILED.
 * - startDispatcher() polls on an interval.
 *
 * Single-instance semantics for now; multi-instance claiming is planned to
 * be replaced by durable execution (Temporal) in a later phase.
 */
export class EventBus {
  private handlers = new Map<string, EventHandler[]>();
  private queue: Envelope[] = [];
  private outboxDown = false;
  private timer: NodeJS.Timeout | null = null;
  private running = false;
  private readonly pollIntervalMs: number;

  constructor(options: EventBusOptions = {}) {
    this.pollIntervalMs = options.pollIntervalMs ?? 2000;
  }

  subscribe(eventType: string, handler: EventHandler): void {
    const list = this.handlers.get(eventType) ?? [];
    list.push(handler);
    this.handlers.set(eventType, list);
  }

  async publish(env: Envelope): Promise<void> {
    this.queue.push(env);

    if (this.outboxDown) return;
    try {
      await outboxRepository.create(env);
    } catch (err) {
      this.outboxDown = true;
      console.warn('[EventBus] Outbox unavailable, buffering events in-memory:', err instanceof Error ? err.message : err);
    }
  }

  startDispatcher(): void {
    if (this.running) return;
    this.running = true;
    const tick = async (): Promise<void> => {
      if (!this.running) return;
      try {
        await this.dispatchOnce();
      } finally {
        this.timer = setTimeout(() => void tick(), this.pollIntervalMs);
      }
    };
    void tick();
  }

  async dispatchOnce(): Promise<number> {
    let dispatched = 0;

    // 1. Drain the in-memory buffer (events published while DB was down).
    while (this.queue.length > 0) {
      const env = this.queue.shift() as Envelope;
      await this.deliver(this.toDomainEvent(env));
      dispatched += 1;
    }

    // 2. Claim durable outbox records and deliver them.
    try {
      const records = await outboxRepository.claimNext();
      for (const record of records) {
        const event: DomainEvent = {
          eventType: record.eventType,
          aggregate: record.aggregate,
          aggregateId: record.aggregateId,
          payload: record.payload,
          occurredAt: record.createdAt,
        };
        try {
          await this.deliver(event, record.id);
          dispatched += 1;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          await outboxRepository.markFailed(record.id, msg);
        }
      }
    } catch (err) {
      console.warn('[EventBus] Outbox unavailable during dispatch:', err instanceof Error ? err.message : err);
    }

    return dispatched;
  }

  private async deliver(event: DomainEvent, recordId?: string): Promise<void> {
    const handlers = this.handlers.get(event.eventType) ?? [];
    for (const h of handlers) await h(event);
    if (recordId) await outboxRepository.markPublished(recordId);
  }

  private toDomainEvent(env: Envelope): DomainEvent {
    return {
      eventType: env.eventType,
      aggregate: env.aggregate,
      aggregateId: env.aggregateId,
      payload: env.payload,
      occurredAt: new Date(),
    };
  }

  stopDispatcher(): void {
    this.running = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}

export const EventTypes = {
  LEAVE_REQUEST_CREATED: 'LeaveRequestCreated',
  LEAVE_REQUEST_STATUS_CHANGED: 'LeaveRequestStatusChanged',
  EXPENSE_CREATED: 'ExpenseCreated',
  EXPENSE_APPROVED: 'ExpenseApproved',
  EXPENSE_APPROVAL_REQUIRED: 'ExpenseApprovalRequired',
  TOOL_CALLED: 'ToolCalled',
  PROCESS_INSTANCE_STARTED: 'ProcessInstanceStarted',
  PROCESS_TASK_CREATED: 'ProcessTaskCreated',
  PROCESS_INSTANCE_COMPLETED: 'ProcessInstanceCompleted',
} as const;

/** Shared application-wide event bus instance. */
export const eventBus = new EventBus();