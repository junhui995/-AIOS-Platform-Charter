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
                return { type: 'USER', assigneeIds: ['EMP-SPECIFIC-ID'] };

            case 'SPECIFIC_ROLE':
                // Query system roles to resolve users in the future
                return { type: 'ROLE', groupId: 'HRBP' };

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
