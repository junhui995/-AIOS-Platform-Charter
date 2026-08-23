import { NextResponse } from 'next/server';
import { prisma } from '@aios/data-service';

// --- Type Definitions ---
interface WorkflowNodeData {
    label?: string;
    assigneeStrategy?: string;
    [key: string]: unknown;
}

interface WorkflowNode {
    id: string;
    type?: string;
    data?: WorkflowNodeData;
    [key: string]: unknown;
}

interface WorkflowEdge {
    id: string;
    source: string;
    target: string;
    [key: string]: unknown;
}

// --- Type Guards ---
function isWorkflowNodeArray(value: unknown): value is WorkflowNode[] {
    if (!Array.isArray(value)) return false;
    return value.every(item =>
        item !== null &&
        typeof item === 'object' &&
        'id' in item &&
        typeof (item as Record<string, unknown>).id === 'string'
    );
}

function isWorkflowEdgeArray(value: unknown): value is WorkflowEdge[] {
    if (!Array.isArray(value)) return false;
    return value.every(item =>
        item !== null &&
        typeof item === 'object' &&
        'id' in item && typeof (item as Record<string, unknown>).id === 'string' &&
        'source' in item && typeof (item as Record<string, unknown>).source === 'string' &&
        'target' in item && typeof (item as Record<string, unknown>).target === 'string'
    );
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { definitionId, initiatorId, formData } = body;

    const version = await prisma.workflowVersion.findFirst({
      where: { definitionId: definitionId, isPublished: true },
      orderBy: { version: 'desc' }
    });

    if (!version) {
      return NextResponse.json({ error: "No published version found for this workflow definition" }, { status: 400 });
    }

    const rawNodes = version.nodes;
    const rawEdges = version.edges;

    if (!isWorkflowNodeArray(rawNodes)) {
        return NextResponse.json({ error: "Invalid workflow nodes format" }, { status: 400 });
    }

    if (!isWorkflowEdgeArray(rawEdges)) {
        return NextResponse.json({ error: "Invalid workflow edges format" }, { status: 400 });
    }

    const nodes: WorkflowNode[] = rawNodes;
    const edges: WorkflowEdge[] = rawEdges;

    // Find start node
    const startNode = nodes.find((n) => n.type === 'input');
    if (!startNode) return NextResponse.json({ error: "No start node defined" }, { status: 400 });

    const firstEdge = edges.find((e) => e.source === startNode.id);
    const initialCurrentNodes: string[] = [];
    if (firstEdge) {
      initialCurrentNodes.push(firstEdge.target);
    }

    const instance = await prisma.processInstance.create({
      data: {
        versionId: version.id,
        initiatorId: initiatorId,
        formData: formData || {},
        currentNodes: initialCurrentNodes,
        status: "RUNNING",
      }
    });

    await prisma.processLog.create({
      data: {
        instanceId: instance.id,
        actionType: 'START',
        operatorId: initiatorId,
        details: 'Process started',
      }
    });

    if (firstEdge) {
      const nextNode = nodes.find((n) => n.id === firstEdge.target);
      if (nextNode && nextNode.type !== 'output' && !nextNode.id.startsWith('gateway')) {
         let assigneeId: string | null = null;
         let candidateGroup: string | null = null;
         const nodeData = nextNode.data || {};

         if (nodeData.assigneeStrategy === 'DIRECT_MANAGER') {
            candidateGroup = "MANAGER_ROLE";
         } else if (nodeData.assigneeStrategy === 'SPECIFIC_ROLE') {
            candidateGroup = "HRBP";
         } else if (nodeData.assigneeStrategy === 'SPECIFIC_USER') {
            // [PLACEHOLDER] Target for future specific employee resolution query
            assigneeId = "EMP-SPECIFIC-ID";
         } else if (nodeData.assigneeStrategy === 'FORM_VARIABLE') {
            const typedFormData = formData as Record<string, unknown>;
            if (typedFormData && typeof typedFormData['approverId'] === 'string') {
               assigneeId = typedFormData['approverId'];
            }
         }

         await prisma.processTask.create({
            data: {
              instanceId: instance.id,
              nodeId: nextNode.id,
              nodeName: nodeData.label || 'Approval Task',
              taskType: 'APPROVAL',
              assigneeId: assigneeId,
              candidateGroup: candidateGroup,
              status: 'PENDING'
            }
         });
      }
    }

    return NextResponse.json(instance);
  } catch {
    return NextResponse.json({ error: "Failed to start process instance" }, { status: 500 });
  }
}

export async function GET(req: Request) {
   const { searchParams } = new URL(req.url);
   const initiatorId = searchParams.get('initiatorId');

   try {
     const instances = await prisma.processInstance.findMany({
       where: initiatorId ? { initiatorId } : {},
       include: {
         tasks: true,
         version: { select: { version: true, definition: { select: { name: true } } } }
       },
       orderBy: { startedAt: 'desc' }
     });
     return NextResponse.json(instances);
   } catch {
     return NextResponse.json({ error: "Failed to fetch instances" }, { status: 500 });
   }
}
