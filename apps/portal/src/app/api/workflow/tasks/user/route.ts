import { NextResponse } from 'next/server';
import { workflowRepository } from '@aios/data-service';
import { requireAuth, handleRouteError } from '@/lib/auth/guard';

/**
 * Unified Task Center data endpoint.
 *
 * GET /api/workflow/tasks/user?employeeId=<id>&view=pending|initiated|done
 *  - pending:   approval tasks assigned to me (status PENDING)
 *  - initiated: process instances I started
 *  - done:      tasks I already handled (APPROVE/REJECT record me as assignee)
 */
export async function GET(req: Request) {
  try {
    await requireAuth();
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId');
    const view = searchParams.get('view') ?? 'pending';

    if (view === 'initiated') {
      const instances = await workflowRepository.listInstances(employeeId);
      return NextResponse.json({ view, data: instances });
    }

    if (view === 'done') {
      const tasks = await workflowRepository.listDoneTasks(employeeId);
      return NextResponse.json({ view, data: tasks });
    }

    const tasks = await workflowRepository.listPendingTasks(employeeId);
    return NextResponse.json({ view, data: tasks });
  } catch (err) {
    return handleRouteError(err);
  }
}