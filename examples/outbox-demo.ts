import { eventBus, EventTypes } from '@aios/events';
import { outboxRepository, prisma } from '@aios/data-service';

/**
 * P1 demo — Real outbox persistence.
 *
 * 1. publish() durably writes each event into the Postgres OutboxEvent table
 *    (status PENDING) through outboxRepository.
 * 2. dispatchOnce() claims the pending records, delivers to subscribers and
 *    marks them PUBLISHED.
 * 3. We re-read the table to prove the events survived in Postgres, with
 *    their original payloads.
 *
 * Requires DATABASE_URL (Postgres up). Durable by design: even if the
 * dispatcher process dies, the PENDING rows remain and are dispatched later.
 */

async function main(): Promise<void> {
  console.log('[Demo] Publishing 3 domain events (Postgres outbox available)...\n');

  await eventBus.publish({
    eventType: EventTypes.EXPENSE_CREATED,
    aggregate: 'Expense',
    aggregateId: 'exp-demo-1001',
    payload: { amount: 600, reason: '打车费', requestedBy: 'Alice' },
  });
  await eventBus.publish({
    eventType: EventTypes.LEAVE_REQUEST_CREATED,
    aggregate: 'LeaveRequest',
    aggregateId: 'lr-demo-2002',
    payload: { employeeId: 'emp-seed-001', days: 3, type: 'ANNUAL' },
  });
  await eventBus.publish({
    eventType: EventTypes.EXPENSE_APPROVAL_REQUIRED,
    aggregate: 'Expense',
    aggregateId: 'exp-demo-1001',
    payload: { amount: 600, workflowStatus: 'PENDING_FINANCE_APPROVAL' },
  });

  const before = await prisma.outboxEvent.findMany({
    orderBy: { createdAt: 'asc' },
  });
  console.log(`Durable rows in outbox BEFORE dispatch: ${before.length}`);
  for (const row of before) {
    console.log(`  [${row.status}] ${row.eventType} aggregate=${row.aggregate}/${row.aggregateId} payload=${JSON.stringify(row.payload)}`);
  }

  console.log('\n[Demo] Dispatching outbox (claim -> deliver -> MARK PUBLISHED)...\n');
  const dispatched = await eventBus.dispatchOnce();
  console.log(`Dispatched: ${dispatched} event(s)\n`);

  const after = await prisma.outboxEvent.findMany({
    orderBy: { createdAt: 'asc' },
  });
  console.log(`Durable rows in outbox AFTER dispatch: ${after.length}`);
  for (const row of after) {
    console.log(`  [${row.status}] ${row.eventType} attempts=${row.attempts} publishedAt=${row.publishedAt === null ? 'null' : row.publishedAt.toISOString()}`);
  }

  const pending = after.filter((r) => r.status === 'PENDING').length;
  const published = after.filter((r) => r.status === 'PUBLISHED').length;
  console.log(`\nResult: ${pending} PENDING, ${published} PUBLISHED — events survived in Postgres.`);
}

main()
  .catch((err) => {
    console.error('[Demo] failed:', err);
    process.exitCode = 1;
  })
  .finally(() => void prisma.$disconnect());