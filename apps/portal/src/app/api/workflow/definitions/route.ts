import { NextResponse } from 'next/server';
import { prisma } from '@aios/data-service';

export async function GET() {
  try {
    const workflows = await prisma.workflowDefinition.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(workflows);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch workflows' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // UPSERT logic: if ID exists, update it, else create
    if (body.id) {
       const w = await prisma.workflowDefinition.update({
         where: { id: body.id },
         data: {
           nodes: body.nodes,
           edges: body.edges,
           isActive: body.isActive
         }
       });
       return NextResponse.json(w);
    } else {
       const w = await prisma.workflowDefinition.create({
         data: {
           code: `WF-${Date.now()}`,
           name: body.name || 'New Workflow',
           nodes: body.nodes,
           edges: body.edges,
           isActive: true
         }
       });
       return NextResponse.json(w);
    }
  } catch {
    return NextResponse.json({ error: 'Failed to save workflow' }, { status: 500 });
  }
}
