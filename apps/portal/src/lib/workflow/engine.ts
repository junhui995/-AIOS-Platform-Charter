import { NodeExecutorRegistry } from './executors';
import { prisma } from '@aios/data-service';
import { WorkflowContext, WorkflowNode, WorkflowEdge } from './types';
import { WorkflowRouter } from './router';

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

                // Load the executor from the registry dynamically based on the node Type

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
    static async retroExecute(instanceId: string) {
        const instance = await prisma.processInstance.findUnique({
            where: { id: instanceId },
            include: { version: true }
        });

        if (!instance) throw new Error("Instance not found");
        if (instance.status !== 'RUNNING' && instance.status !== 'ERROR') {
             throw new Error("Can only retro execute a running or error workflow");
        }

        const nodes = instance.version.nodes as unknown as WorkflowNode[];
        const edges = instance.version.edges as unknown as WorkflowEdge[];
        const currentNodes = instance.currentNodes as string[];

        if (!currentNodes || currentNodes.length === 0) {
             throw new Error("No active nodes to retro execute from");
        }

        await prisma.processLog.create({
            data: {
                instanceId: instance.id,
                actionType: 'RETRO_EXECUTE',
                operatorId: 'SYSTEM',
                details: 'Retro executed workflow from current active nodes'
            }
        });

        // Resume engine loop from current active nodes
        // (Normally we would need more complicated logic for parallel paths, but loop handles sequential)
        await this.advance(instance.id, currentNodes[0], nodes, edges);
    }

    // --- Simulate ---
    static async simulate(definitionId: string, formData: Record<string, unknown>) {
        const version = await prisma.workflowVersion.findFirst({
            where: { definitionId: definitionId, isPublished: true },
            orderBy: { version: 'desc' }
        });

        if (!version) throw new Error("No published version found for this workflow definition");

        const nodes = version.nodes as unknown as WorkflowNode[];
        const edges = version.edges as unknown as WorkflowEdge[];

        const startNode = nodes.find(n => n.type === 'input');
        if (!startNode) throw new Error("No start node defined");

        const executionTrace: Record<string, string | undefined>[] = [];
        let activeNodeIds = [startNode.id];

        // Traverse using same execution logic but isolating Prisma DB writes into a virtual array
        while (activeNodeIds.length > 0) {
            const nextIterationNodes: string[] = [];

            for (const nodeId of activeNodeIds) {
                const node = nodes.find(n => n.id === nodeId);
                if (!node) continue;

                executionTrace.push({ nodeId: node.id, actionType: 'NODE_ENTERED', type: node.type });

                const context: WorkflowContext = {
                    instanceId: 'SIMULATED',
                    definitionId: 'SIMULATED',
                    versionId: version.id,
                    initiatorId: 'SIMULATED',
                    formData: formData,
                    variables: {},
                    currentNodeId: nodeId,
                    nodes,
                    edges
                };


                // We fake the execution by bypassing the actual Prisma-heavy DB modifications
                // Instead of calling .execute(), we simulate the Router logic directly for Dry-Run
                if (node.type === 'input') {
                    const nextNodes = WorkflowRouter.route(context);
                    if (nextNodes.length > 0) nextIterationNodes.push(...nextNodes);
                } else if (node.type === 'output') {
                    executionTrace.push({ nodeId: node.id, actionType: 'INSTANCE_COMPLETED' });
                } else if (node.type === 'gateway' || node.id.startsWith('gateway')) {
                    const nextNodes = WorkflowRouter.route(context);
                    executionTrace.push({ nodeId: node.id, actionType: 'GATEWAY_EVALUATED', details: `Evaluated to nodes: ${nextNodes.join(',')}` });
                    if (nextNodes.length > 0) nextIterationNodes.push(...nextNodes);
                } else if (node.type === 'service') {
                    executionTrace.push({ nodeId: node.id, actionType: 'TOOL_CALLED' });
                    const nextNodes = WorkflowRouter.route(context);
                    if (nextNodes.length > 0) nextIterationNodes.push(...nextNodes);
                } else {
                    // Default User Task
                    executionTrace.push({ nodeId: node.id, actionType: 'TASK_CREATED' });
                    // To simulate flowing past a user task, we assume auto-approve
                    executionTrace.push({ nodeId: node.id, actionType: 'TASK_COMPLETED' });
                    const nextNodes = WorkflowRouter.route(context);
                    if (nextNodes.length > 0) nextIterationNodes.push(...nextNodes);
                }
            }

            activeNodeIds = nextIterationNodes;
        }

        return { executionTrace };
    }
}
