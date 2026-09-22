import { NextResponse } from 'next/server';
import { expenseRepository, workflowRepository, employeeRepository } from '@aios/data-service';
import { eventBus, EventTypes } from '@aios/events';
import { startApprovalProcess, resolveApprover } from '@/lib/workflow/approval';

const EXPENSE_CATEGORIES = ['TRAVEL', 'TAXI', 'MEAL', 'OFFICE', 'OTHER'];

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

/**
 * Employee self-service submit: create the expense as pending, immediately
 * start the EXPENSE approval flow and publish ExpenseCreated, so the record
 * shows up in both the user's own list and the BPM task center at once.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { employeeId, amount, reason, category, occurredOn } = body;

    if (!employeeId || amount === undefined || !reason?.trim()) {
      return NextResponse.json({ error: 'Missing required fields (employeeId, amount, reason)' }, { status: 400 });
    }

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json({ error: 'amount must be a positive number' }, { status: 400 });
    }
    if (category && !EXPENSE_CATEGORIES.includes(category)) {
      return NextResponse.json({ error: `Invalid category; expected one of ${EXPENSE_CATEGORIES.join(', ')}` }, { status: 400 });
    }

    const employee = await employeeRepository.findById(employeeId);
    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    const expense = await expenseRepository.createPending({
      employeeId,
      amount: parsedAmount,
      reason: reason.trim(),
      category: category ?? null,
      occurredOn: occurredOn ? new Date(occurredOn) : null,
    });

    let instanceId: string | null = null;
    let state = 'create';
    try {
      const instance = await startApprovalProcess({
        kind: 'EXPENSE',
        initiatorId: employeeId,
        domainId: expense.id,
        formData: {
          employeeId,
          amount: parsedAmount,
          reason: reason.trim(),
          category: category ?? null,
        },
      });
      instanceId = instance.id;
      state = 'create+workflow';
    } catch (err) {
      console.error('[expenses] Failed to start approval workflow:', err instanceof Error ? err.message : err);
    }

    await eventBus.publish({
      eventType: EventTypes.EXPENSE_CREATED,
      aggregate: 'Expense',
      aggregateId: expense.id,
      payload: {
        expenseId: expense.id,
        code: expense.code,
        employeeId,
        amount: parsedAmount,
        reason: reason.trim(),
        category: category ?? null,
        processInstanceId: instanceId,
      },
    });

    return NextResponse.json({ expense, instanceId, state }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to create expense';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}