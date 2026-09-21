import { NextResponse } from 'next/server';
import { workflowRepository } from '@aios/data-service';

export async function GET() {
  try {
    const workflows = await workflowRepository.listDefinitions();
    return NextResponse.json(workflows);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch workflows' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const workflow = await workflowRepository.saveDefinition({
      id: body.id || undefined,
      name: body.name || 'New Workflow',
      nodes: body.nodes,
      edges: body.edges,
      isActive: body.isActive ?? true,
    });
    return NextResponse.json(workflow);
  } catch {
    return NextResponse.json({ error: 'Failed to save workflow' }, { status: 500 });
  }
}