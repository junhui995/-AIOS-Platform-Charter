import { prisma } from '@aios/data-service';
import { WorkflowContext, WorkflowNode, WorkflowEdge } from './types';
import { NodeExecutorRegistry } from './executors';

export class WorkflowEngine {

    // --- Start a new Workflow Instance ---
    static async start(params: {
        definitionId: string,
        initiatorId: string | null,
        formData: Record<string, unknown>
    }) {
        const version = await prisma.workflowVersion.findFirst({
            where: { definitionId: params.definitionId, isPublished: true },
            orderBy: { version: 'desc' }
        });

        if (!version) {
            throw new Error("No published version found for this workflow definition");
        }

        const nodes = version.nodes as unknown as WorkflowNode[];
        const edges = version.edges as unknown as WorkflowEdge[];

        const startNode = nodes.find(n => n.type === 'input');
        if (!startNode) throw new Error("No start node defined");

        const instance = await prisma.processInstance.create({
            data: {
                versionId: version.id,
                initiatorId: params.initiatorId,
                formData: params.formData as unknown as { [key: string]: string | number | boolean },
                currentNodes: [startNode.id],
                status: 'RUNNING'
            }
        });

        await prisma.processLog.create({
            data: {
                instanceId: instance.id,
                actionType: 'INSTANCE_STARTED',
                operatorId: params.initiatorId,
                details: 'Process started'
            }
        });

        // Advance the engine from the start node
        await this.advance(instance.id, startNode.id, nodes, edges);

        return instance;
    }

    // --- Complete a pending User Task ---
    static async completeTask(params: {
        taskId: string,
        operatorId: string,
        action: 'APPROVE' | 'REJECT',
        comment?: string
    }) {
        const task = await prisma.processTask.findUnique({
            where: { id: params.taskId },
            include: {
                instance: {
                    include: { version: true }
                }
            }
        });

        if (!task) throw new Error("Task not found");
        if (task.status !== 'PENDING') throw new Error("Task is not pending");

        const newStatus = params.action === 'APPROVE' ? 'COMPLETED' : 'REJECTED';

        await prisma.$transaction(async (tx) => {
            await tx.processTask.update({
                where: { id: params.taskId },
                data: {
                    status: newStatus,
                    completedAt: new Date(),
                    assigneeId: params.operatorId
                }
            });

            await tx.processLog.create({
                data: {
                    instanceId: task.instanceId,
                    taskId: task.id,
                    actionType: `TASK_${params.action}D`,
                    operatorId: params.operatorId,
                    details: params.comment || `Task ${params.action}D`
                }
            });
        });

        if (params.action === 'REJECT') {
            // End workflow immediately on rejection (Phase 1)
            await prisma.processInstance.update({
                where: { id: task.instanceId },
                data: { status: 'REJECTED', endedAt: new Date() }
            });

            await prisma.processLog.create({
                data: {
                    instanceId: task.instanceId,
                    actionType: 'INSTANCE_REJECTED',
                    operatorId: params.operatorId,
                    details: 'Process terminated due to rejection'
                }
            });
            return;
        }

        // If Approved, continue workflow
        const nodes = task.instance.version.nodes as unknown as WorkflowNode[];
        const edges = task.instance.version.edges as unknown as WorkflowEdge[];

        await this.advance(task.instanceId, task.nodeId, nodes, edges);
    }

    // --- Internal Engine Loop ---
    private static async advance(
        instanceId: string,
        currentNodeId: string,
        nodes: WorkflowNode[],
        edges: WorkflowEdge[]
    ) {
        let currentInstance = await prisma.processInstance.findUniqueOrThrow({ where: { id: instanceId } });

        // Loop allows bypassing transient nodes like Gateway/Service tasks silently until a UserTask is hit
        let activeNodeIds = [currentNodeId];

        while (activeNodeIds.length > 0 && currentInstance.status === 'RUNNING') {
            const nextIterationNodes: string[] = [];

            for (const nodeId of activeNodeIds) {
                const context: WorkflowContext = {
                    instanceId,
                    definitionId: 'resolved',
                    versionId: currentInstance.versionId,
                    initiatorId: currentInstance.initiatorId,
                    formData: currentInstance.formData as Record<string, unknown>,
                    variables: {}, // Extendable for form calculations
                    currentNodeId: nodeId,
                    nodes,
                    edges
                };

                const node = nodes.find(n => n.id === nodeId);
                if (!node) continue;

                const executor = NodeExecutorRegistry.getExecutor(node);
                const result = await executor.execute(node, context);

                if (result.status === 'CONTINUE' && result.nextNodeIds) {
                    nextIterationNodes.push(...result.nextNodeIds);
                }
                // If WAITING or COMPLETED, we don't push into the next iteration loop for this branch.
            }

            activeNodeIds = nextIterationNodes;

            // Save state of current active nodes so we can restart from them later
            if (activeNodeIds.length > 0) {
                currentInstance = await prisma.processInstance.update({
                    where: { id: instanceId },
                    data: { currentNodes: activeNodeIds }
                });
            }
        }
    }


    // --- Get pending tasks (replacing raw prisma call in api) ---
    static async getTasks(assigneeId?: string | null) {
        return await prisma.processTask.findMany({
            where: assigneeId ? { assigneeId, status: 'PENDING' } : { status: 'PENDING' },
            include: {
                instance: {
                    select: {
                        formData: true,
                        initiatorId: true,
                        version: {
                            select: {
                                definition: { select: { name: true } }
                            }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    // --- Get instances (replacing raw prisma call in api) ---
    static async getInstances(initiatorId?: string | null) {
        return await prisma.processInstance.findMany({
            where: initiatorId ? { initiatorId } : {},
            include: {
                tasks: true,
                version: { select: { version: true, definition: { select: { name: true } } } }
            },
            orderBy: { startedAt: 'desc' }
        });
    }

    // --- Retro Execute ---
    static async retroExecute(_instanceId: string) {
        console.log(_instanceId);
        // [PLACEHOLDER] Stub for backwards compatibility mapping
        // In a real system, this resets activeNodeIds and forces advance()
        throw new Error("Retro execution not yet fully implemented in new WorkflowEngine");
    }

    // --- Simulate ---
    static async simulate(_definitionId: string, _formData: Record<string, unknown>) {
        console.log(_definitionId, _formData);
        // [PLACEHOLDER] Stub for backwards compatibility mapping
        // Dry run mode mapping path logic
        throw new Error("Simulation not yet fully implemented in new WorkflowEngine");
    }
}
