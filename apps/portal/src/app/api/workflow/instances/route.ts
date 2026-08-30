import { NextResponse } from 'next/server';
import { prisma } from '@aios/data-service';

interface WorkflowNodeData {
  label?: string;
  assigneeStrategy?: string;
  assigneeIds?: string[];
}

interface WorkflowNode {
  id: string;
  type: string;
  data: WorkflowNodeData;
}

interface WorkflowEdge {
  source: string;
  target: string;
}

function isWorkflowNodeArray(value: unknown): value is WorkflowNode[] {
  return Array.isArray(value);
}

function isWorkflowEdgeArray(value: unknown): value is WorkflowEdge[] {
  return Array.isArray(value);
}

// Start a new process instance
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { definitionId, initiatorId, formData } = body;

    const definition = await prisma.workflowDefinition.findUnique({
      where: { id: definitionId },
      include: {
        versions: {
          orderBy: { version: 'desc' },
          take: 1,
          where: { isPublished: true }
        }
      }
    });

    if (!definition || definition.versions.length === 0) {
      return NextResponse.json(
        { error: 'No published version found for this workflow definition' },
        { status: 400 }
      );
    }

    const latestVersion = definition.versions[0];

    if (
      !isWorkflowNodeArray(latestVersion.nodes) ||
      !isWorkflowEdgeArray(latestVersion.edges)
    ) {
      return NextResponse.json(
        { error: 'Invalid workflow definition structure' },
        { status: 400 }
      );
    }

    const nodes = latestVersion.nodes;
    const edges = latestVersion.edges;

    const startNode = nodes.find((n) => n.type === 'input');

    if (!startNode) {
      return NextResponse.json(
        { error: 'No start node defined' },
        { status: 400 }
      );
    }

    const firstEdge = edges.find(
      (e) => e.source === startNode.id
    );

    const initialCurrentNodes: string[] = [];

    if (firstEdge) {
      initialCurrentNodes.push(firstEdge.target);
    }

    const instance = await prisma.processInstance.create({
      data: {
        versionId: latestVersion.id,
        initiatorId,
        formData: formData || {},
        currentNodes: initialCurrentNodes,
        status: 'RUNNING'
      }
    });

    await prisma.processLog.create({
      data: {
        instanceId: instance.id,
        actionType: 'START',
        operatorId: initiatorId,
        details: 'Process started'
      }
    });

    if (firstEdge) {
      const nextNode = nodes.find(
        (n) => n.id === firstEdge.target
      );

      if (
        nextNode &&
        nextNode.type !== 'output' &&
        !nextNode.id.startsWith('gateway')
      ) {
        let assigneeId: string | null = null;
        let candidateGroup: string | null = null;

        const strategy = nextNode.data?.assigneeStrategy;

        // TODO:
        // Replace placeholder logic with AssigneeResolver
        if (strategy === 'DIRECT_MANAGER') {
          candidateGroup = 'MANAGER_ROLE';
        } else if (strategy === 'SPECIFIC_ROLE') {
          candidateGroup = 'HRBP';
        } else if (strategy === 'SPECIFIC_USER') {
          assigneeId =
            nextNode.data?.assigneeIds?.[0] || null;
        } else if (strategy === 'FORM_VARIABLE') {
          assigneeId =
            formData?.approverId || null;
        }

        await prisma.processTask.create({
          data: {
            instanceId: instance.id,
            nodeId: nextNode.id,
            nodeName:
              nextNode.data?.label || 'Approval Task',
            taskType: 'APPROVAL',
            assigneeId,
            candidateGroup,
            status: 'PENDING'
          }
        });
      }
    }

    return NextResponse.json(instance);

  } catch (error) {
    console.error(
      'Failed to start process instance:',
      error
    );

    return NextResponse.json(
      { error: 'Failed to start process instance' },
      { status: 500 }
    );
  }
}

// Get instances
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const initiatorId = searchParams.get('initiatorId');

  try {
    const instances = await prisma.processInstance.findMany({
      where: initiatorId ? { initiatorId } : {},
      include: {
        tasks: true,
        version: {
          select: {
            version: true,
            definition: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        startedAt: 'desc'
      }
    });

    return NextResponse.json(instances);

  } catch (error) {
    console.error(
      'Failed to fetch instances:',
      error
    );

    return NextResponse.json(
      { error: 'Failed to fetch instances' },
      { status: 500 }
    );
  }
}