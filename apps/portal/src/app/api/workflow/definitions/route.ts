import { NextResponse } from 'next/server';
import { workflowRepository } from '@aios/data-service';
import { requireAuth, requirePermission, handleRouteError } from '@/lib/auth/guard';

export async function GET() {
  try {
    await requireAuth();
    const workflows = await workflowRepository.listDefinitions();
    return NextResponse.json(workflows);
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function POST(req: Request) {
  try {
    await requirePermission('WORKFLOW', 'WRITE');
    const body = await req.json();
    const workflow = await workflowRepository.saveDefinition({
      id: body.id || undefined,
      name: body.name || 'New Workflow',
      nodes: body.nodes,
      edges: body.edges,
      isActive: body.isActive ?? true,
    });
    return NextResponse.json(workflow);
  } catch (err) {
    return handleRouteError(err);
  }
}