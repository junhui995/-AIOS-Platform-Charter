import { prisma } from '@aios/data-service';

/**
 * Read-only snapshot of finish-domain state after a demo run:
 * latest expenses with workflow status and the event outbox trail.
 */

async function main(): Promise<void> {
  const expenses = await prisma.expense.findMany({ orderBy: { createdAt: 'desc' }, take: 3 });
  console.log('EXPENSES =>');
  for (const e of expenses) {
    console.log(`  ${e.code} | CNY ${Number(e.amount)} | ${e.status}${e.approvedById ? ` | approvedBy=${e.approvedById}` : ''}`);
  }

  const rows = await prisma.outboxEvent.findMany({ orderBy: { createdAt: 'asc' } });
  console.log(`\nOUTBOX (${rows.length} total) =>`);
  for (const r of rows) {
    console.log(`  [${r.status}] ${r.eventType} ${r.aggregate}/${r.aggregateId} at=${r.createdAt.toISOString()}`);
  }
}

main()
  .catch((err) => {
    console.error('report failed:', err);
    process.exitCode = 1;
  })
  .finally(() => void prisma.$disconnect());