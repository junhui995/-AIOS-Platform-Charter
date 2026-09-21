import { WorkflowContext, WorkflowNode } from '../types';
import { AssigneeResolver } from '../assignee';
import { WorkflowRouter } from '../router';
import { workflowRepository } from '@aios/data-service';
import { tools } from '@aios/tools'; // Import the Tool Registry

export interface NodeExecutionResult {
    status: 'CONTINUE' | 'WAITING' | 'COMPLETED' | 'ERROR';
    nextNodeIds?: string[];
}

export abstract class BaseNodeExecutor {
    abstract execute(node: WorkflowNode, context: WorkflowContext): Promise<NodeExecutionResult>;
}

export class StartNodeExecutor extends BaseNodeExecutor {
    async execute(node: WorkflowNode, context: WorkflowContext): Promise<NodeExecutionResult> {
        // Start node just passes through
        const nextNodes = WorkflowRouter.route(context);
        return { status: 'CONTINUE', nextNodeIds: nextNodes };
    }
}

export class UserTaskExecutor extends BaseNodeExecutor {
    async execute(node: WorkflowNode, context: WorkflowContext): Promise<NodeExecutionResult> {
        // Create the task and wait
        const resolution = await AssigneeResolver.resolve(node, context);

        await workflowRepository.createTask({
            instanceId: context.instanceId,
            nodeId: node.id,
            nodeName: node.data?.label || 'Approval Task',
            taskType: 'APPROVAL',
            assigneeId: resolution.type === 'USER' ? resolution.assigneeIds?.[0] : null,
            candidateGroup: resolution.type === 'ROLE' ? resolution.groupId : null
        });

        // Halt workflow execution pending human interaction
        return { status: 'WAITING' };
    }
}

export class GatewayExecutor extends BaseNodeExecutor {
    async execute(node: WorkflowNode, context: WorkflowContext): Promise<NodeExecutionResult> {
        const nextNodes = WorkflowRouter.route(context);

        await workflowRepository.createLog({
            instanceId: context.instanceId,
            actionType: 'GATEWAY_EVALUATED',
            operatorId: 'SYSTEM',
            details: `Gateway evaluated to nodes: ${nextNodes.join(',')}`
        });

        return { status: 'CONTINUE', nextNodeIds: nextNodes };
    }
}

export class EndNodeExecutor extends BaseNodeExecutor {
    async execute(node: WorkflowNode, context: WorkflowContext): Promise<NodeExecutionResult> {
        // Signal complete
        await workflowRepository.completeInstance(context.instanceId);

        await workflowRepository.createLog({
            instanceId: context.instanceId,
            actionType: 'INSTANCE_COMPLETED',
            operatorId: 'SYSTEM',
            details: 'Process reached end node'
        });

        return { status: 'COMPLETED' };
    }
}

export class ServiceTaskExecutor extends BaseNodeExecutor {
    async execute(node: WorkflowNode, context: WorkflowContext): Promise<NodeExecutionResult> {
        const toolName = node.data?.action;
        let success = true;
        let details = `Tool executed: ${toolName}`;

        if (toolName && typeof toolName === 'string' && tools[toolName]) {
            try {
                // Phase 1: pass form data through to the registered Tool.
                const toolResult = (await tools[toolName].execute(context.formData as Record<string, unknown>, { actorId: null })) as {
                    ok?: boolean;
                    success?: boolean;
                    error?: string;
                };

                success = toolResult.ok === false || toolResult.success === false ? false : true;
                details = success
                    ? `Tool ${toolName} executed successfully`
                    : `Tool ${toolName} execution failed: ${toolResult.error || 'unknown error'}`;
            } catch (err: unknown) {
                success = false;
                details = `Tool ${toolName} execution failed: ${err instanceof Error ? err.message : String(err)}`;
            }
        } else {
            success = false;
            details = `Tool ${toolName || 'Unknown'} not found in registry`;
        }

        // Log tool execution
        await workflowRepository.createLog({
            instanceId: context.instanceId,
            actionType: success ? 'TOOL_COMPLETED' : 'TOOL_FAILED',
            operatorId: 'SYSTEM',
            details: details
        });

        if (!success) {
            return { status: 'ERROR' }; // Or 'WAITING' to allow retry depending on logic
        }

        const nextNodes = WorkflowRouter.route(context);
        return { status: 'CONTINUE', nextNodeIds: nextNodes };
    }
}

export class NodeExecutorRegistry {
    static getExecutor(node: WorkflowNode): BaseNodeExecutor {
        const type = node.type || 'default';
        if (type === 'input') return new StartNodeExecutor();
        if (type === 'output') return new EndNodeExecutor();
        if (type === 'gateway' || node.id.startsWith('gateway')) return new GatewayExecutor();
        if (type === 'service') return new ServiceTaskExecutor();
        return new UserTaskExecutor(); // Default to approval tasks
    }
}