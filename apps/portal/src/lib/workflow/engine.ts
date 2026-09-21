import { NodeExecutorRegistry } from './executors';
import { workflowRepository } from '@aios/data-service';
import { WorkflowContext, WorkflowNode, WorkflowEdge } from './types';
import { WorkflowRouter } from './router';

export class WorkflowEngine {

    // --- Start a new Workflow Instance ---
    static async start(params: {
        definitionId: string,
        initiatorId: string | null,
        formData: Record<string, unknown>
    }) {
        const version = await workflowRepository.findLatestPublishedVersion(params.definitionId);

        if (!version) {
            throw new Error("No published version found for this workflow definition");
        }

        const nodes = version.nodes as unknown as WorkflowNode[];
        const edges = version.edges as unknown as WorkflowEdge[];

        const startNode = nodes.find(n => n.type === 'input');
        if (!startNode) throw new Error("No start node defined");

        const instance = await workflowRepository.createInstance(
            version.id,
            params.initiatorId,
            params.formData,
            [startNode.id]
        );

        await workflowRepository.createLog({
            instanceId: instance.id,
            actionType: 'INSTANCE_STARTED',
            operatorId: params.initiatorId,
            details: 'Process started'
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
        const task = await workflowRepository.findTaskWithInstance(params.taskId);

        if (!task) throw new Error("Task not found");
        if (task.status !== 'PENDING') throw new Error("Task is not pending");

        const newStatus = params.action === 'APPROVE' ? 'COMPLETED' : 'REJECTED';

        await workflowRepository.completeTaskAndLog({
            taskId: params.taskId,
            operatorId: params.operatorId,
            newStatus,
            actionLabel: `TASK_${params.action}D`,
            comment: params.comment
        });

        if (params.action === 'REJECT') {
            // End workflow immediately on rejection (Phase 1)
            await workflowRepository.rejectInstance(task.instanceId);

            await workflowRepository.createLog({
                instanceId: task.instanceId,
                actionType: 'INSTANCE_REJECTED',
                operatorId: params.operatorId,
                details: 'Process terminated due to rejection'
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
        const snapshot = await workflowRepository.findInstance(instanceId);
        if (!snapshot) throw new Error("Instance not found");

        let currentInstance: {
            status: string;
            versionId: string;
            initiatorId: string | null;
            formData: unknown;
        } = snapshot;

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
                const updated = await workflowRepository.updateInstanceNodes(instanceId, activeNodeIds);
                currentInstance = updated;
            }
        }
    }

    // --- Get pending tasks ---
    static async getTasks(assigneeId?: string | null) {
        return await workflowRepository.listPendingTasks(assigneeId);
    }

    // --- Get instances ---
    static async getInstances(initiatorId?: string | null) {
        return await workflowRepository.listInstances(initiatorId);
    }

    // --- Retro Execute ---
    static async retroExecute(instanceId: string) {
        const instance = await workflowRepository.findInstance(instanceId);

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

        await workflowRepository.createLog({
            instanceId: instance.id,
            actionType: 'RETRO_EXECUTE',
            operatorId: 'SYSTEM',
            details: 'Retro executed workflow from current active nodes'
        });

        // Resume engine loop from current active nodes
        // (Normally we would need more complicated logic for parallel paths, but loop handles sequential)
        await this.advance(instance.id, currentNodes[0], nodes, edges);
    }

    // --- Simulate ---
    static async simulate(definitionId: string, formData: Record<string, unknown>) {
        const version = await workflowRepository.findLatestPublishedVersion(definitionId);

        if (!version) throw new Error("No published version found for this workflow definition");

        const nodes = version.nodes as unknown as WorkflowNode[];
        const edges = version.edges as unknown as WorkflowEdge[];

        const startNode = nodes.find(n => n.type === 'input');
        if (!startNode) throw new Error("No start node defined");

        const executionTrace: Record<string, string | undefined>[] = [];
        let activeNodeIds = [startNode.id];

        // Traverse using same execution logic but isolating database writes into a virtual array
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

                // We fake the execution by bypassing the actual database-heavy modifications
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