export interface WorkflowNodeData {
    label?: string;
    assigneeStrategy?: string;
    action?: string;      // for Service Tasks / End nodes
    condition?: string;   // Optional condition data
    [key: string]: unknown;
}

export interface WorkflowNode {
    id: string;
    type?: string;        // 'input', 'approval', 'gateway', 'service', 'output' (React Flow map)
    data?: WorkflowNodeData;
    [key: string]: unknown;
}

export interface WorkflowEdge {
    id: string;
    source: string;
    target: string;
    data?: {
        condition?: {
            expression?: string; // e.g. "{{form.amount}} > 500"
        }
    };
    [key: string]: unknown;
}

export interface WorkflowContext {
    instanceId: string;
    definitionId: string;
    versionId: string;
    initiatorId: string | null;
    formData: Record<string, unknown>;
    variables: Record<string, unknown>;
    currentNodeId: string;
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
}

export interface AssigneeResolutionResult {
    type: 'USER' | 'ROLE' | 'GROUP';
    assigneeIds?: string[];
    groupId?: string;
}
