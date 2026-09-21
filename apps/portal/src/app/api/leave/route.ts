import { NextResponse } from 'next/server';
import { employeeRepository, leaveRepository, leaveDays } from '@aios/data-service';
import { eventBus, EventTypes } from '@aios/events';
import { startApprovalProcess } from '@/lib/workflow/approval';

const LEAVE_TYPES = ['ANNUAL', 'SICK', 'UNPAID', 'MATERNITY', 'OTHER'];

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId');
    const requests = await leaveRepository.listWithDetails(employeeId);
    return NextResponse.json(requests);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch leave requests' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { employeeId, leaveType, startDate, endDate, reason } = body;

    if (!employeeId || !leaveType || !startDate || !endDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    if (!LEAVE_TYPES.includes(leaveType)) {
      return NextResponse.json({ error: `Invalid leaveType; expected one of ${LEAVE_TYPES.join(', ')}` }, { status: 400 });
    }

    const employee = await employeeRepository.findById(employeeId);
    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start.getTime() > end.getTime()) {
      return NextResponse.json({ error: 'startDate must be before endDate' }, { status: 400 });
    }

    await leaveRepository.ensureBalance(employeeId);
    const request = await leaveRepository.create({
      employeeId,
      leaveType,
      startDate: start,
      endDate: end,
      reason: reason ?? null,
    });

    let instanceId: string | null = null;
    let funcName = 'create';
    try {
      const instance = await startApprovalProcess({
        kind: 'LEAVE',
        initiatorId: employeeId,
        domainId: request.id,
        formData: {
          employeeId,
          leaveType,
          startDate: start.toISOString(),
          endDate: end.toISOString(),
          days: leaveDays(start, end),
          reason: reason ?? '',
        },
      });
      instanceId = instance.id;
      funcName = 'create+workflow';
    } catch (err) {
      console.error('[leave] Failed to start approval workflow:', err instanceof Error ? err.message : err);
    }

    await eventBus.publish({
      eventType: EventTypes.LEAVE_REQUEST_CREATED,
      aggregate: 'LeaveRequest',
      aggregateId: request.id,
      payload: {
        leaveRequestId: request.id,
        employeeId,
        leaveType,
        days: leaveDays(start, end),
        reason: reason ?? '',
        processInstanceId: instanceId,
      },
    });

    return NextResponse.json({ request, instanceId, state: funcName });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to create leave request';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}