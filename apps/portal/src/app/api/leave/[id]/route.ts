import { NextResponse } from 'next/server';
import { workflowRepository, leaveRepository } from '@aios/data-service';
import { eventBus, EventTypes } from '@aios/events';
import { completeApprovalTask, resolveApprover } from '@/lib/workflow/approval';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { action, operatorId, comment } = body;

    // UPDATE / RETURN are employee self-service actions; APPROVE / REJECT are admin actions.
    if (action === 'UPDATE') {
      const updated = await leaveRepository.updateRequest(id, {
        leaveType: body.leaveType,
        startDate: body.startDate,
        endDate: body.endDate,
        reason: body.reason,
      });

      await eventBus.publish({
        eventType: EventTypes.LEAVE_REQUEST_STATUS_CHANGED,
        aggregate: 'LeaveRequest',
        aggregateId: id,
        payload: { leaveRequestId: id, decision: 'UPDATED', status: updated.status },
      });

      return NextResponse.json({ request: updated });
    }

    if (action === 'RETURN') {
      if (body.usedDays === undefined || Number.isNaN(Number(body.usedDays))) {
        return NextResponse.json({ error: 'usedDays is required for RETURN' }, { status: 400 });
      }
      const result = await leaveRepository.returnFromLeave(id, Number(body.usedDays), operatorId);

      await eventBus.publish({
        eventType: EventTypes.LEAVE_REQUEST_STATUS_CHANGED,
        aggregate: 'LeaveRequest',
        aggregateId: id,
        payload: {
          leaveRequestId: id,
          decision: 'RETURNED',
          status: 'RETURNED',
          approvedDays: result.approvedDays,
          used: result.used,
          refund: result.refund,
        },
      });

      return NextResponse.json(result);
    }

    if (!['APPROVE', 'REJECT'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action; expected APPROVE|REJECT|UPDATE|RETURN' }, { status: 400 });
    }

    // Leave request existence / status guard handled inside applyApproval.
    const decidedBy = operatorId || (await resolveApprover());
    const decision = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';

    // Complete the backing BPM task if an approval instance exists.
    let instanceId: string | null = null;
    let taskCompleted = false;
    try {
      const instance = await workflowRepository.findInstanceByFormField('leaveRequestId', id);
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
      console.error('[leave] Failed to complete workflow task:', err instanceof Error ? err.message : err);
    }

    const updated = await leaveRepository.applyApproval(id, decision);
    if (!updated) {
      return NextResponse.json({ error: 'Leave request not found' }, { status: 404 });
    }

    await eventBus.publish({
      eventType: EventTypes.LEAVE_REQUEST_STATUS_CHANGED,
      aggregate: 'LeaveRequest',
      aggregateId: id,
      payload: {
        leaveRequestId: id,
        status: decision,
        decision,
        operatorId: decidedBy,
        comment: comment ?? null,
        processInstanceId: instanceId,
        taskCompleted,
      },
    });

    return NextResponse.json({ request: updated, instanceId, taskCompleted });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to update leave request';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const instance = await workflowRepository.findInstanceByFormField('leaveRequestId', id);
    if (instance) {
      await workflowRepository.cancelPendingTasks(instance.id);
      await workflowRepository.cancelInstance(instance.id);
    }

    await leaveRepository.deletePending(id);
    await eventBus.publish({
      eventType: EventTypes.LEAVE_REQUEST_STATUS_CHANGED,
      aggregate: 'LeaveRequest',
      aggregateId: id,
      payload: { leaveRequestId: id, decision: 'DELETED', processInstanceId: instance?.id ?? null },
    });

    return NextResponse.json({ deleted: true, instanceId: instance?.id ?? null });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to delete leave request';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}