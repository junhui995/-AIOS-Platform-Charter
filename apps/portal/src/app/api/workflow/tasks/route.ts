import { NextResponse } from 'next/server';
import { WorkflowEngine } from '@/lib/workflow/engine';

// Advance a task
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { taskId, action, operatorId, comment } = body;

    if (!['APPROVE', 'REJECT'].includes(action)) {
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    await WorkflowEngine.completeTask({
        taskId,
        action: action as 'APPROVE' | 'REJECT',
        operatorId,
        comment
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to process task";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// Get Tasks
export async function GET(req: Request) {
   const { searchParams } = new URL(req.url);
   const assigneeId = searchParams.get('assigneeId');

   try {
     const tasks = await WorkflowEngine.getTasks(assigneeId);
     return NextResponse.json(tasks);
   } catch {
     return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 });
   }
}
