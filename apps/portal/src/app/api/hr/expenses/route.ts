import { NextResponse } from 'next/server';
import { expenseRepository, workflowRepository, employeeRepository } from '@aios/data-service';
import { startApprovalProcess, resolveApprover } from '@/lib/workflow/approval';

/**
 * GET returns expenses; any PENDING_APPROVAL expense that is not yet backed
 * by a running approval instance gets one started on read (idempotent
 * reconciliation), so every pending expense also surfaces in the BPM task
 * center.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId');
    const expenses = await expenseRepository.listWithDetails(employeeId);

    const pending = expenses.filter((e) => e.status === 'PENDING_APPROVAL');
    const enriched: (typeof expenses[number] & { processInstanceId: string | null })[] = [];

    // Sequential reconciliation: concurrent starts race on the definition
    // unique-code constraint, so run expense by expense.
    for (const expense of expenses) {
      let processInstanceId: string | null = null;
      if (pending.some((p) => p.id === expense.id)) {
        try {
          const existing = await workflowRepository.findInstanceByFormField('expenseId', expense.id);
          if (existing) {
            processInstanceId = existing.id;
          } else {
            const initiator = await employeeRepository.findById(expense.employeeId);
            const inst = await startApprovalProcess({
              kind: 'EXPENSE',
              initiatorId: initiator ? initiator.id : (await resolveApprover()),
              domainId: expense.id,
              formData: {
                employeeId: expense.employeeId,
                amount: expense.amount,
                reason: expense.reason,
              },
            });
            processInstanceId = inst.id;
          }
        } catch (err) {
          console.error('[expenses] Failed to reconcile approval flow:', err instanceof Error ? err.message : err);
        }
      }
      enriched.push({ ...expense, processInstanceId });
    }

    return NextResponse.json(enriched);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch expenses';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}