import { NextResponse } from 'next/server';
import { WorkflowEngine } from '@/lib/workflow/engine';
import { workflowRepository, leaveRepository, expenseRepository } from '@aios/data-service';
import { eventBus, EventTypes } from '@aios/events';

/**
 * Complete a pending BPM task and synchronize the underlying domain record
 * (leave / expense) so the Task Center is a first-class approval surface:
 * approving here updates the domain status + publishes the domain event.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { taskId, action, operatorId, comment } = body;

    if (!['APPROVE', 'REJECT'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action; expected APPROVE|REJECT' }, { status: 400 });
    }

    const task = await workflowRepository.findTaskWithInstance(taskId);
    if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    if (task.status !== 'PENDING') {
      return NextResponse.json({ error: `Task already handled: ${task.status}` }, { status: 409 });
    }

    await WorkflowEngine.completeTask({
      taskId,
      action: action as 'APPROVE' | 'REJECT',
      operatorId,
      comment,
    });

    const formData = task.instance.formData as Record<string, unknown>;
    const decidedBy = operatorId;
    let domain: { kind: 'LEAVE' | 'EXPENSE'; recordId: string | null } = { kind: 'LEAVE', recordId: null };

    if (typeof formData.leaveRequestId === 'string') {
      domain.recordId = formData.leaveRequestId;
      const decision = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
      const updated = await leaveRepository.applyApproval(formData.leaveRequestId, decision);
      if (updated) {
        await eventBus.publish({
          eventType: EventTypes.LEAVE_REQUEST_STATUS_CHANGED,
          aggregate: 'LeaveRequest',
          aggregateId: formData.leaveRequestId,
          payload: {
            leaveRequestId: formData.leaveRequestId,
            status: decision,
            decision,
            operatorId: decidedBy,
            comment: comment ?? null,
            processInstanceId: task.instanceId,
          },
        });
      }
    } else if (typeof formData.expenseId === 'string') {
      domain = { kind: 'EXPENSE', recordId: formData.expenseId };
      if (action === 'APPROVE') {
        const expense = await expenseRepository.approve(formData.expenseId, decidedBy);
        await eventBus.publish({
          eventType: EventTypes.EXPENSE_APPROVED,
          aggregate: 'Expense',
          aggregateId: formData.expenseId,
          payload: {
            expenseId: formData.expenseId,
            code: expense.code,
            amount: expense.amount,
            decision: 'APPROVE',
            operatorId: decidedBy,
            comment: comment ?? null,
            processInstanceId: task.instanceId,
          },
        });
      } else {
        const expense = await expenseRepository.reject(formData.expenseId, decidedBy);
        await eventBus.publish({
          eventType: EventTypes.EXPENSE_REJECTED,
          aggregate: 'Expense',
          aggregateId: formData.expenseId,
          payload: {
            expenseId: formData.expenseId,
            code: expense.code,
            amount: expense.amount,
            decision: 'REJECT',
            operatorId: decidedBy,
            comment: comment ?? null,
            processInstanceId: task.instanceId,
          },
        });
      }
    }

    return NextResponse.json({ success: true, domain, processInstanceId: task.instanceId });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to process task';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// List pending tasks by assignee (kept for the workflow designer / history).
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const assigneeId = searchParams.get('assigneeId');

  try {
    const tasks = await WorkflowEngine.getTasks(assigneeId);
    return NextResponse.json(tasks);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}