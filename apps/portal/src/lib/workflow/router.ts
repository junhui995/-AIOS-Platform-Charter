import { WorkflowContext } from './types';

export class WorkflowRouter {
  static route(context: WorkflowContext): string[] {
    // Find outgoing edges from current node
    const outgoingEdges = context.edges.filter(
      (e) => e.source === context.currentNodeId
    );

    if (outgoingEdges.length === 0) {
      return [];
    }

    const currentNode = context.nodes.find(
      (n) => n.id === context.currentNodeId
    );

    const isGateway =
      currentNode?.type === 'gateway' ||
      currentNode?.id.startsWith('gateway');

    // For non-gateway nodes, all outgoing transitions are valid.
    if (!isGateway) {
      return outgoingEdges.map((e) => e.target);
    }

    // Gateway evaluation logic (XOR - Exclusive)
    //
    // Conditions are evaluated sequentially.
    // An explicitly configured default route is only used when
    // none of the conditional routes match.
    let defaultRoute: string | null = null;

    for (const edge of outgoingEdges) {
      const expression = edge.data?.condition?.expression;

      // Empty expression or explicit "default" means default route.
      if (!expression || expression === 'default') {
        defaultRoute = edge.target;
        continue;
      }

      // Evaluate the gateway condition.
      if (this.evaluateCondition(expression, context.formData)) {
        return [edge.target];
      }
    }

    // If no explicit condition matches, use the default route.
    if (defaultRoute) {
      return [defaultRoute];
    }

    // No matching condition and no default route.
    // Throw explicitly instead of silently returning an empty route,
    // which could otherwise cause the workflow to become deadlocked.
    throw new Error(
      `Gateway evaluation failed at node ${context.currentNodeId}: ` +
        `No matching conditions and no default route defined.`
    );
  }

  static evaluateCondition(
    expression: string,
    formData: Record<string, unknown>
  ): boolean {
    try {
      /*
       * Supported examples:
       *
       * {{form.amount}} > 500
       * {{form.amount}} <= 500
       * {{form.status}} == approved
       * {{form.status}} != rejected
       * {{form.department}} contains sales
       *
       * The parser intentionally supports simple expressions for
       * the current workflow phase.
       */

      const regex =
        /\{\{form\.([^}]+)\}\}\s*(<=|>=|<|>|==|!=|contains)\s*([a-zA-Z0-9_.-]+)/;

      const match = expression.match(regex);

      if (!match) {
        // Invalid expressions must fail explicitly.
        // Do NOT fail-safe to true, otherwise malformed workflow
        // conditions could accidentally approve a route.
        throw new Error(
          `Failed to parse gateway condition expression: ${expression}`
        );
      }

      const field = match[1];
      const operator = match[2];
      const rawValue = match[3];
      const formValue = formData[field];

      // Numeric comparison
      const isNumericComparison = ['<=', '>=', '<', '>'].includes(operator);

      if (isNumericComparison) {
        const numericFormValue = Number(formValue);
        const numericCompareValue = Number(rawValue);

        if (
          Number.isNaN(numericFormValue) ||
          Number.isNaN(numericCompareValue)
        ) {
          throw new Error(
            `Non-numeric value supplied for numeric gateway condition: ${expression}`
          );
        }

        switch (operator) {
          case '<=':
            return numericFormValue <= numericCompareValue;
          case '>=':
            return numericFormValue >= numericCompareValue;
          case '<':
            return numericFormValue < numericCompareValue;
          case '>':
            return numericFormValue > numericCompareValue;
          default:
            return false;
        }
      }

      // String / generic comparison
      const strFormValue =
        formValue === null || formValue === undefined
          ? ''
          : String(formValue);

      const strCompareValue = String(rawValue);

      switch (operator) {
        case '==':
          return strFormValue === strCompareValue;
        case '!=':
          return strFormValue !== strCompareValue;
        case 'contains':
          return strFormValue.includes(strCompareValue);
        default:
          return false;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Condition Evaluation Error: ${msg}`);
    }
  }
}