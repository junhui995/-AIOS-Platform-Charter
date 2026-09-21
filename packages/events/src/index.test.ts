import { vi, describe, it, expect, beforeEach } from 'vitest';

const { mockCreate, mockClaimNext, mockMarkPublished, mockMarkFailed } = vi.hoisted(() => ({
  mockCreate: vi.fn(),
  mockClaimNext: vi.fn(),
  mockMarkPublished: vi.fn(),
  mockMarkFailed: vi.fn(),
}));

vi.mock('@aios/data-service', () => ({
  outboxRepository: {
    create: mockCreate,
    claimNext: mockClaimNext,
    markPublished: mockMarkPublished,
    markFailed: mockMarkFailed,
  },
}));

import { EventBus, EventTypes } from './index';

const record = (id: string, eventType: string) => ({
  id,
  eventType,
  aggregate: 'LeaveRequest',
  aggregateId: 'lr-1',
  payload: { amount: 100 },
  status: 'PENDING',
  attempts: 0,
  lastError: null,
  createdAt: new Date(),
  publishedAt: null,
});

describe('EventBus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('publishes an event durably to the outbox', async () => {
    const bus = new EventBus();
    await bus.publish({ eventType: EventTypes.LEAVE_REQUEST_CREATED, aggregate: 'LeaveRequest', aggregateId: 'lr-1', payload: {} });
    expect(mockCreate).toHaveBeenCalledWith({
      eventType: EventTypes.LEAVE_REQUEST_CREATED,
      aggregate: 'LeaveRequest',
      aggregateId: 'lr-1',
      payload: {},
    });
  });

  it('delivers claimed events to subscribers and marks them published', async () => {
    mockClaimNext.mockResolvedValueOnce([record('1', EventTypes.LEAVE_REQUEST_CREATED)]);
    const bus = new EventBus();
    const handler = vi.fn();
    bus.subscribe(EventTypes.LEAVE_REQUEST_CREATED, handler);

    const dispatched = await bus.dispatchOnce();

    expect(dispatched).toBe(1);
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ eventType: EventTypes.LEAVE_REQUEST_CREATED, aggregateId: 'lr-1' }));
    expect(mockMarkPublished).toHaveBeenCalledWith('1');
    expect(mockMarkFailed).not.toHaveBeenCalled();
  });

  it('marks an event FAILED when its handler throws', async () => {
    mockClaimNext.mockResolvedValueOnce([record('2', EventTypes.TOOL_CALLED)]);
    const bus = new EventBus();
    bus.subscribe(EventTypes.TOOL_CALLED, () => {
      throw new Error('boom');
    });

    const dispatched = await bus.dispatchOnce();

    expect(dispatched).toBe(0);
    expect(mockMarkFailed).toHaveBeenCalledWith('2', 'boom');
    expect(mockMarkPublished).not.toHaveBeenCalled();
  });
});