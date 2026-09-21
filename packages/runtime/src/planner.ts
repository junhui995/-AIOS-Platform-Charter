import { BusinessSemanticAST } from '@aios/compiler';

export interface PlanStep {
  tool: string;
  args: Record<string, unknown>;
  reason: string;
  /** Enterreprise context the Guard can evaluate policies against (e.g. amount). */
  facts?: Record<string, unknown>;
}

export interface ParsedRequest {
  intent: 'expense_reimbursement' | 'leave_request' | 'unknown';
  domain: 'Finance' | 'HR' | 'unknown';
  employeeName?: string;
  amount?: number;
  raw: string;
}

const NAME_RE = /帮\s*([\u4e00-\u9fa5A-Za-z][\u4e00-\u9fa5A-Za-z ]{0,12}?)\s*(?:报销|请假|请|付|交)/;
const AMOUNT_RE = /(\d+(?:\.\d+)?)\s*(?:元|块钱|元人民币|块)/;
const PRONOUNS = ['我', '你', '他', '她', '咱', '它', '这', '那'];

export function extractName(request: string): string | undefined {
  const m = request.match(NAME_RE);
  const name = m?.[1]?.trim();
  if (!name) return undefined;
  if (name.length === 1 && PRONOUNS.includes(name)) return undefined;
  return name;
}

export function extractAmount(request: string): number | undefined {
  const m = request.match(AMOUNT_RE);
  if (!m) return undefined;
  const n = Number(m[1]);
  return Number.isNaN(n) ? undefined : n;
}

export function parseRequest(request: string): ParsedRequest {
  const raw = request.trim();

  if (/报销|reimburse|报销费/i.test(raw)) {
    return {
      intent: 'expense_reimbursement',
      domain: 'Finance',
      employeeName: extractName(raw),
      amount: extractAmount(raw),
      raw,
    };
  }

  if (/请假|休|leave/i.test(raw)) {
    return { intent: 'leave_request', domain: 'HR', employeeName: extractName(raw), raw };
  }

  return { intent: 'unknown', domain: 'unknown', raw };
}

/**
 * Deterministic planner: translates a parsed natural-language request into an
 * ordered tool-call plan. Template tokens like `#{employee.id}` are resolved
 * at execution time from the outputs of previous steps.
 */
export class PlanningAgent {
  plan(parsed: ParsedRequest, _ast: BusinessSemanticAST): PlanStep[] {
    if (parsed.intent === 'expense_reimbursement') {
      const employeeName = parsed.employeeName ?? '张三';
      const amount = parsed.amount ?? 0;
      return [
        { tool: 'getEmployeeIdByName', args: { name: employeeName }, reason: `Resolve employee "${employeeName}" from name to ID` },
        { tool: 'createExpense', args: { employeeId: '#{employee.id}', amount, reason: '打车费' }, reason: `Record expense of ${amount} CNY` },
        {
          tool: 'autoApproveExpense',
          args: { expenseId: '#{expense.id}' },
          reason: 'Tentative auto-approval; the PolicyGuard decides based on the compiled DNA',
          facts: { amount },
        },
      ];
    }

    if (parsed.intent === 'leave_request') {
      const employeeName = parsed.employeeName ?? '张三';
      return [
        { tool: 'getEmployeeIdByName', args: { name: employeeName }, reason: `Resolve employee "${employeeName}" from name to ID` },
        {
          tool: 'submitLeaveRequest',
          args: { employeeId: '#{employee.id}', leaveType: 'ANNUAL', startDate: '2026-08-01', endDate: '2026-08-02' },
          reason: 'Submit an annual leave request on behalf of the employee',
        },
      ];
    }

    throw new Error(`Unsupported request: ${parsed.raw}`);
  }
}

/**
 * Resolves `#{key}` templates in an argument tree against the execution context.
 */
export function fillTemplates(value: unknown, ctx: Record<string, unknown>): unknown {
  if (typeof value === 'string') {
    const m = value.match(/^#\{([\w.]+)\}$/);
    if (m) return resolveKey(m[1] as string, ctx);
    return value;
  }
  if (Array.isArray(value)) return value.map((v) => fillTemplates(v, ctx));
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = fillTemplates(v, ctx);
    return out;
  }
  return value;
}

function resolveKey(key: string, ctx: Record<string, unknown>): unknown {
  const [top, ...rest] = key.split('.');
  let value: unknown = ctx[top as string];
  for (const part of rest) {
    if (value && typeof value === 'object') value = (value as Record<string, unknown>)[part as string];
    else return undefined;
  }
  return value;
}

/**
 * Stamps step outputs into the execution context under a tool-specific key so
 * downstream template tokens resolve. Safe no-op for unknown tools.
 */
const CTX_KEY_BY_TOOL: Record<string, string> = {
  getEmployeeIdByName: 'employee',
  createExpense: 'expense',
  submitLeaveRequest: 'request',
};

export function applyStepResult(ctx: Record<string, unknown>, tool: string, result: { ok: boolean; data?: unknown }): void {
  const key = CTX_KEY_BY_TOOL[tool];
  if (key && result.ok) ctx[key] = result.data;
}