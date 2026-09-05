import { WorkflowContext } from './types';

export class WorkflowRouter {
    static route(context: WorkflowContext): string[] {
        // Find outgoing edges from current node
        const outgoingEdges = context.edges.filter(e => e.source === context.currentNodeId);

        if (outgoingEdges.length === 0) {
            return [];
        }

        // For first phase XOR Gateway (exclusive): Evaluate conditions sequentially
        // For non-gateways (simple transitions), just return the targets.

        const currentNode = context.nodes.find(n => n.id === context.currentNodeId);
        const isGateway = currentNode?.type === 'gateway' || currentNode?.id.startsWith('gateway');

        if (!isGateway) {
            return outgoingEdges.map(e => e.target);
        }

        // Gateway evaluation logic
        for (const edge of outgoingEdges) {
            const expression = edge.data?.condition?.expression;
            if (!expression) {
                // Default path if no condition
                return [edge.target];
            }

            // Primitive expression parsing for Phase 1 Demo (e.g., "{{form.amount}} > 500")
            if (this.evaluateCondition(expression, context.formData)) {
                return [edge.target];
            }
        }

        // If no conditions match, return empty to signify blockage (should handle via default route)
        return [];
    }

    private static evaluateCondition(expression: string, formData: Record<string, unknown>): boolean {
        // Ex: "{{form.amount}} <= 500"
        try {
            const regex = /\{\{form\.([^}]+)\}\}\s*(<=|>=|<|>|==|!=)\s*([0-9]+)/;
            const match = expression.match(regex);
            if (!match) return true; // Fail safe to true for simple demos if poorly formatted

            const field = match[1];
            const operator = match[2];
            const value = Number(match[3]);

            const formValue = Number(formData[field]) || 0;

            switch (operator) {
                case '<=': return formValue <= value;
                case '>=': return formValue >= value;
                case '<': return formValue < value;
                case '>': return formValue > value;
                case '==': return formValue == value;
                case '!=': return formValue != value;
                default: return false;
            }
        } catch {
            return false;
        }
    }
}
