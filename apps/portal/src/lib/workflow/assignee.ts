import { WorkflowContext, AssigneeResolutionResult, WorkflowNode } from './types';


export class AssigneeResolver {
    static async resolve(node: WorkflowNode, context: WorkflowContext): Promise<AssigneeResolutionResult> {
        const strategy = node.data?.assigneeStrategy;

        switch (strategy) {
            case 'DIRECT_MANAGER':
                if (context.initiatorId) {
                    // Extremely simplified: Fetch manager from Employee tree
                    // (Assuming an employee.managerId relationship could be navigated via positions in the future)
                    return { type: 'ROLE', groupId: 'MANAGER_ROLE' }; // Simplified fallback
                }
                return { type: 'USER', assigneeIds: [] };

            case 'SPECIFIC_USER':
                // In a real system, node.data.assigneeIds would store an array
                // For now, resolve placeholder correctly or fall back to system
                const assigneeIds = Array.isArray(node.data?.assigneeIds) ? (node.data.assigneeIds as string[]) : [];
                if (assigneeIds.length === 0) throw new Error('Assignee resolution failed: SPECIFIC_USER requires at least one assigneeId configured in node.data');
                return { type: 'USER', assigneeIds };

            case 'SPECIFIC_ROLE':
                // Query system roles to resolve users in the future
                const groupId = typeof node.data?.assigneeRole === 'string' ? node.data.assigneeRole : '';
                if (!groupId) throw new Error('Assignee resolution failed: SPECIFIC_ROLE requires an assigneeRole configured in node.data');
                return { type: 'ROLE', groupId };

            case 'FORM_VARIABLE':
                const approverId = context.formData['approverId'];
                if (typeof approverId === 'string') {
                    return { type: 'USER', assigneeIds: [approverId] };
                }
                return { type: 'USER', assigneeIds: [] };

            default:
                return { type: 'USER', assigneeIds: [] };
        }
    }
}
