import { WorkflowContext } from './types';

export class WorkflowRouter {
    static route(context: WorkflowContext): string[] {
        // Find outgoing edges from current node
        const outgoingEdges = context.edges.filter(e => e.source === context.currentNodeId);

        if (outgoingEdges.length === 0) {
            return [];
        }

        const currentNode = context.nodes.find(n => n.id === context.currentNodeId);
        const isGateway = currentNode?.type === 'gateway' || currentNode?.id.startsWith('gateway');

        if (!isGateway) {
            return outgoingEdges.map(e => e.target);
        }

        // Gateway evaluation logic (XOR - Exclusive)
        let defaultRoute: string | null = null;

        for (const edge of outgoingEdges) {
            const expression = edge.data?.condition?.expression;

            // Explicitly mark an edge with an empty expression or explicit "default" flag as the default route
            if (!expression || expression === 'default') {
                defaultRoute = edge.target;
                continue;
            }

            // Primitive expression parsing for Phase 1 Demo (e.g., "{{form.amount}} > 500")
            const isMatch = this.evaluateCondition(expression, context.formData);
            if (isMatch) {
                return [edge.target];
            }
        }

        // If no explicit conditions match, and a default route exists, take it.
        if (defaultRoute) {
            return [defaultRoute];
        }

        // Explicitly throw if no conditions match and no default route is defined to force FAILED state instead of dead-locking implicitly
        throw new Error(`Gateway evaluation failed at node ${context.currentNodeId}: No matching conditions and no default route defined.`);
    }

    static evaluateCondition(expression: string, formData: Record<string, unknown>): boolean {
        // Ex: "{{form.amount}} <= 500"
        try {
            // Enhanced regex to handle string containment as well (basic parsing)
            const regex = /\{\{form\.([^}]+)\}\}\s*(<=|>=|<|>|==|!=|contains)\s*([a-zA-Z0-9_.-]+)/;
            const match = expression.match(regex);

            if (!match) {
                // ILLEGAL CONDITION MUST EXPLICITLY FAIL
                throw new Error(`Failed to parse gateway condition expression: ${expression}`);
            }

            const field = match[1];
            const operator = match[2];
            const rawValue = match[3];

            const formValue = formData[field];

            // Type conversion
            const isNumericComparison = ['<=', '>=', '<', '>'].includes(operator);

            if (isNumericComparison) {
                const numericFormValue = Number(formValue);
                const numericCompareValue = Number(rawValue);

                if (isNaN(numericFormValue) || isNaN(numericCompareValue)) {
                    throw new Error(`Non-numeric value supplied for numeric gateway condition: ${expression}`);
                }

                switch (operator) {
                    case '<=': return numericFormValue <= numericCompareValue;
                    case '>=': return numericFormValue >= numericCompareValue;
                    case '<': return numericFormValue < numericCompareValue;
                    case '>': return numericFormValue > numericCompareValue;
                }
            } else {
                // String or generic equality
                const strFormValue = String(formValue || '');
                const strCompareValue = String(rawValue);

                switch (operator) {
                    case '==': return strFormValue === strCompareValue;
                    case '!=': return strFormValue !== strCompareValue;
                    case 'contains': return strFormValue.includes(strCompareValue);
                }
            }

            return false;
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            throw new Error(`Condition Evaluation Error: ${msg}`);
        }
    }
}
