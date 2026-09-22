import { NextResponse } from 'next/server';
import { expenseRepository, workflowRepository } from '@aios/data-service';
import { eventBus, EventTypes } from '@aios/events';
import { completeApprovalTask, resolveApprover } from '@/lib/workflow/approval';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { action, operatorId, comment } = body;

    if (!['APPROVE', 'REJECT'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action; expected APPROVE|REJECT' }, { status: 400 });
    }

    const current = await expenseRepository.findById(id);
    if (!current) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }
    if (!['SUBMITTED', 'PENDING_APPROVAL'].includes(current.status)) {
      return NextResponse.json({ error: `Expense already finalized: ${current.status}` }, { status: 409 });
    }

    const decidedBy = operatorId || (await resolveApprover());

    let instanceId: string | null = null;
    let taskCompleted = false;
    try {
      const instance = await workflowRepository.findInstanceByFormField('expenseId', id);
      if (instance) {
        instanceId = instance.id;
        await completeApprovalTask({
          instanceId: instance.id,
          operatorId: decidedBy,
          action: action as 'APPROVE' | 'REJECT',
          comment,
        });
        taskCompleted = true;
      }
    } catch (err) {
      console.error('[expenses] Failed to complete workflow task:', err instanceof Error ? err.message : err);
    }

    const expense =
      action === 'APPROVE'
        ? await expenseRepository.approve(id, decidedBy)
        : await expenseRepository.reject(id, decidedBy);

    await eventBus.publish({
      eventType: action === 'APPROVE' ? EventTypes.EXPENSE_APPROVED : EventTypes.EXPENSE_REJECTED,
      aggregate: 'Expense',
      aggregateId: id,
      payload: {
        expenseId: id,
        code: current.code,
        amount: current.amount,
        decision: action,
        operatorId: decidedBy,
        comment: comment ?? null,
        processInstanceId: instanceId,
      },
    });

    return NextResponse.json({ expense, instanceId, taskCompleted });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to update expense';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/** Employee self-service: withdraw a pending expense and cancel its approval flow. */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const instance = await workflowRepository.findInstanceByFormField('expenseId', id);
    if (instance) {
      await workflowRepository.cancelPendingTasks(instance.id);
      await workflowRepository.cancelInstance(instance.id);
    }

    await expenseRepository.deletePending(id);
    await eventBus.publish({
      eventType: EventTypes.EXPENSE_CANCELLED,
      aggregate: 'Expense',
      aggregateId: id,
      payload: { expenseId: id, processInstanceId: instance?.id ?? null, decision: 'DELETED' },
    });

    return NextResponse.json({ deleted: true, instanceId: instance?.id ?? null });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to delete expense';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}