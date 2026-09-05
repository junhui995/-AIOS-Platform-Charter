import { NextResponse } from 'next/server';
import { WorkflowEngine } from '@/lib/workflow/engine';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { definitionId, initiatorId, formData } = body;

    const instance = await WorkflowEngine.start({
        definitionId,
        initiatorId,
        formData: formData || {}
    });

    return NextResponse.json(instance);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to start process instance";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET(req: Request) {
   const { searchParams } = new URL(req.url);
   const initiatorId = searchParams.get('initiatorId');

   try {
     const instances = await WorkflowEngine.getInstances(initiatorId);
     return NextResponse.json(instances);
   } catch {
     return NextResponse.json({ error: "Failed to fetch instances" }, { status: 500 });
   }
}
