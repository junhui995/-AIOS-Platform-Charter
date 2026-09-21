import { BusinessSemanticAST, PolicyNode } from '@aios/compiler';
import { ToolContext, ToolRegistry } from '@aios/tools';

export type GuardDecision =
  | { decision: 'ALLOW'; policyId?: string; note?: string }
  | { decision: 'DENY'; policyId: string; reason: string; redirectTo?: string }
  | { decision: 'REDIRECT'; policyId: string; reason: string; toTool: string };

export interface GuardContext {
  actor?: string | null;
  vars?: Record<string, unknown>;
}

export interface GuardedResult {
  tool: string;
  decision: GuardDecision;
  result: { ok: boolean; data?: unknown; error?: string };
}

// ---------------------------------------------------------------------------
// Safe constraint evaluator. No `eval`: a tiny tokenizer + recursive descent
// parser supporting `>` `>=` `<` `<=` `==` `!=`, `&&`, `||` and parentheses
// over numbers, strings, booleans and identifiers (resolved from vars).
// ---------------------------------------------------------------------------

type CmpOp = '>' | '>=' | '<' | '<=' | '==' | '!=';

function tokenize(expr: string): string[] {
  const tokens: string[] = [];
  let i = 0;
  const isDigit = (c: string): boolean => c >= '0' && c <= '9';
  const isIdentStart = (c: string): boolean => /[A-Za-z_]/.test(c);
  const isIdentPart = (c: string): boolean => /[A-Za-z0-9_]/.test(c);

  while (i < expr.length) {
    const c = expr[i];
    if (/\s/.test(c)) {
      i += 1;
      continue;
    }
    if (c === '(' || c === ')') {
      tokens.push(c);
      i += 1;
      continue;
    }
    if (c === '&' && expr[i + 1] === '&') {
      tokens.push('&&');
      i += 2;
      continue;
    }
    if (c === '|' && expr[i + 1] === '|') {
      tokens.push('||');
      i += 2;
      continue;
    }
    const two = expr.slice(i, i + 2);
    if (two === '>=' || two === '<=' || two === '==' || two === '!=') {
      tokens.push(two);
      i += 2;
      continue;
    }
    if (c === '>' || c === '<') {
      tokens.push(c);
      i += 1;
      continue;
    }
    if (c === "'" || c === '"') {
      const quote = c;
      let j = i + 1;
      let s = '';
      while (j < expr.length && expr[j] !== quote) {
        s += expr[j];
        j += 1;
      }
      tokens.push(`STR:${s}`);
      i = j + 1;
      continue;
    }
    if (isDigit(c) || (c === '.' && isDigit(expr[i + 1] ?? ''))) {
      let j = i;
      let num = '';
      while (j < expr.length && (isDigit(expr[j]) || expr[j] === '.')) {
        num += expr[j];
        j += 1;
      }
      tokens.push(num);
      i = j;
      continue;
    }
    if (isIdentStart(c)) {
      let j = i;
      let s = '';
      while (j < expr.length && isIdentPart(expr[j])) {
        s += expr[j];
        j += 1;
      }
      tokens.push(s);
      i = j;
      continue;
    }
    throw new Error(`Unexpected token '${c}' in constraint expression`);
  }
  return tokens;
}

class ConstraintParser {
  private pos = 0;

  constructor(
    private readonly tokens: string[],
    private readonly vars: Record<string, unknown>,
  ) {}

  parse(): boolean {
    const value = this.parseOr();
    if (this.pos !== this.tokens.length) throw new Error('Trailing tokens in constraint expression');
    return value;
  }

  private peek(): string {
    return this.tokens[this.pos] as string;
  }

  private next(): string {
    return this.tokens[this.pos++] as string;
  }

  private parseOr(): boolean {
    let left = this.parseAnd();
    while (this.peek() === '||') {
      this.next();
      const right = this.parseAnd();
      left = left || right;
    }
    return left;
  }

  private parseAnd(): boolean {
    let left = this.parseComparison();
    while (this.peek() === '&&') {
      this.next();
      const right = this.parseComparison();
      left = left && right;
    }
    return left;
  }

  private parseComparison(): boolean {
    const left = this.parseOperand();
    const op = this.peek();
    if (op === '>' || op === '>=' || op === '<' || op === '<=' || op === '==' || op === '!=') {
      this.next();
      const right = this.parseOperand();
      return this.compare(left, right, op as CmpOp);
    }
    return Boolean(left);
  }

  private parseOperand(): unknown {
    const t = this.next();
    if (t === '(') {
      const value = this.parseOr();
      if (this.next() !== ')') throw new Error('Missing closing parenthesis in constraint');
      return value;
    }
    if (t === 'true') return true;
    if (t === 'false') return false;
    if (t.startsWith('STR:')) return t.slice(4);
    const num = Number(t);
    if (t.trim() !== '' && !Number.isNaN(num)) return num;
    if (/^[A-Za-z_]/.test(t)) {
      return t in this.vars ? this.vars[t] : undefined;
    }
    return t; // string literal
  }

  private compare(a: unknown, b: unknown, op: CmpOp): boolean {
    if (a === undefined || b === undefined) return false;

    const aNum = Number(a);
    const bNum = Number(b);
    const aIsNum = typeof a === 'number' || (typeof a === 'string' && a.trim() !== '' && !Number.isNaN(aNum));
    const bIsNum = typeof b === 'number' || (typeof b === 'string' && b.trim() !== '' && !Number.isNaN(bNum));

    if (aIsNum && bIsNum) {
      switch (op) {
        case '>':
          return aNum > bNum;
        case '>=':
          return aNum >= bNum;
        case '<':
          return aNum < bNum;
        case '<=':
          return aNum <= bNum;
        case '==':
          return aNum === bNum;
        case '!=':
          return aNum !== bNum;
      }
    }

    const sa = String(a);
    const sb = String(b);
    if (op === '==') return sa === sb;
    if (op === '!=') return sa !== sb;
    return false;
  }
}

export function evaluateConstraint(constraint: string, vars: Record<string, unknown>): boolean {
  const tokens = tokenize(constraint);
  return new ConstraintParser(tokens, vars).parse();
}

export function formatDecision(decision: GuardDecision): string {
  switch (decision.decision) {
    case 'ALLOW':
      return decision.policyId
        ? `ALLOW (policy ${decision.policyId}${decision.note ? `: ${decision.note}` : ''})`
        : `ALLOW (${decision.note ?? 'no policy triggered'})`;
    case 'DENY':
      return `DENY by ${decision.policyId}: ${decision.reason}`;
    case 'REDIRECT':
      return `REDIRECT by ${decision.policyId}: ${decision.reason} -> ${decision.toTool}`;
  }
}

/**
 * Deterministic guard that evaluates Enterprise DNA policies against tool
 * calls BEFORE they execute. This is the "确定性 + AI 双模" seam: the AI
 * proposes an action, the Guard adjudicates it against declared policy.
 */
export class PolicyGuard {
  constructor(private readonly ast: BusinessSemanticAST) {}

  private policies(): PolicyNode[] {
    return this.ast.nodes.filter((n): n is PolicyNode => n.type === 'Policy');
  }

  private resolveApprovalTool(_policy: PolicyNode): string {
    // Map the policy role to the registered approval tool (single phase-1
    // approval tool; a configurable action->tool map replaces this later).
    return 'requestFinanceApproval';
  }

  /**
   * Pure inspection: decides ALLOW / DENY / REDIRECT without side effects.
   */
  async inspect(toolName: string, args: unknown, ctx: GuardContext = {}): Promise<GuardDecision> {
    const argMap = (args && typeof args === 'object' ? args : {}) as Record<string, unknown>;
    const vars = { ...(ctx.vars ?? {}), ...argMap };

    for (const policy of this.policies()) {
      const scoped = policy.payload.tools;
      if (scoped && scoped.length > 0 && !scoped.includes(toolName)) continue;

      let triggered = false;
      try {
        triggered = evaluateConstraint(policy.payload.constraint, vars);
      } catch {
        triggered = false;
      }
      if (!triggered) continue;

      const action = policy.payload.action;
      if (action === 'deny') {
        return { decision: 'DENY', policyId: policy.id, reason: policy.payload.description };
      }
      if (action === 'allow') {
        return { decision: 'ALLOW', policyId: policy.id, note: 'explicit allow policy' };
      }
      if (action === 'require_approval') {
        const approvalTool = this.resolveApprovalTool(policy);
        if (toolName === approvalTool) {
          return { decision: 'ALLOW', policyId: policy.id, note: 'human approval tool invoked (policy compliant path)' };
        }
        return { decision: 'REDIRECT', policyId: policy.id, reason: policy.payload.description, toTool: approvalTool };
      }
    }

    return { decision: 'ALLOW', note: 'no policy triggered' };
  }

  /**
   * Guarded execution: inspect first, then either run the tool, deny it, or
   * redirect to the policy-mandated tool.
   */
  async executeWithGuard(registry: ToolRegistry, toolName: string, args: unknown, ctx: GuardContext = {}): Promise<GuardedResult> {
    const decision = await this.inspect(toolName, args, ctx);
    const toolCtx: ToolContext | undefined = ctx.actor !== undefined ? { actorId: ctx.actor ?? null } : undefined;

    if (decision.decision === 'DENY') {
      return { tool: toolName, decision, result: { ok: false, error: decision.reason } };
    }

    if (decision.decision === 'REDIRECT') {
      if (!registry.get(decision.toTool)) {
        return {
          tool: toolName,
          decision: { decision: 'DENY', policyId: decision.policyId, reason: `Redirect target ${decision.toTool} is not registered`, redirectTo: decision.toTool },
          result: { ok: false, error: `Redirect target ${decision.toTool} is not registered` },
        };
      }
      const result = await registry.run(decision.toTool, args, toolCtx);
      return { tool: toolName, decision, result };
    }

    const result = await registry.run(toolName, args, toolCtx);
    return { tool: toolName, decision, result };
  }
}