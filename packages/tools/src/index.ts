import { employeeRepository, leaveRepository, expenseRepository, toExpenseDecisionEvent } from '@aios/data-service';
import { eventBus, EventTypes } from '@aios/events';

export interface ToolContext {
  actorId?: string | null;
}

/**
 * MCP-compatible tool definition. `inputSchema` follows the JSON Schema
 * subset used by MCP tools and OpenAI function calling.
 */
export interface ToolDefinition<Args = unknown> {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  domain: string;
  version: string;
  requiredPermissions?: string[];
  audit: boolean;
  execute(args: Args, ctx?: ToolContext): Promise<unknown>;
}

export type ToolResult =
  | { ok: true; data: unknown }
  | { ok: false; error: string };

export class ToolRegistry {
  private tools = new Map<string, ToolDefinition>();

  constructor(private readonly bus: { publish(env: { eventType: string; aggregate: string; aggregateId: string; payload: unknown }): Promise<void> } = eventBus) {}

  register(tool: ToolDefinition): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool ${tool.name} is already registered`);
    }
    this.tools.set(tool.name, tool);
  }

  get(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  list(): ToolDefinition[] {
    return [...this.tools.values()];
  }

  /**
   * Standard execution pipeline: audit trail event -> handler -> result.
   * Every call is traceable regardless of success.
   */
  async run(name: string, args: unknown, ctx?: ToolContext): Promise<ToolResult> {
    const tool = this.tools.get(name);
    if (!tool) return { ok: false, error: `Tool ${name} not found` };

    await this.bus.publish({
      eventType: EventTypes.TOOL_CALLED,
      aggregate: 'Tool',
      aggregateId: name,
      payload: { args, actorId: ctx?.actorId ?? null },
    });

    try {
      const data = await tool.execute(args, ctx);
      return { ok: true, data };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }
}

// ---------------------------------------------------------------------------
// Tool registrations (HR domain / first business domain)
// ---------------------------------------------------------------------------

const getEmployeeIdByName: ToolDefinition<{ name: string }> = {
  name: 'getEmployeeIdByName',
  description: 'Looks up an employee by their full name and returns their ID, code and department.',
  inputSchema: {
    type: 'object',
    properties: { name: { type: 'string', description: 'The full name of the employee (e.g. 张三, Alice)' } },
    required: ['name'],
  },
  domain: 'HR',
  version: '1.0.0',
  audit: false,
  execute: async (args) => {
    const emp = await employeeRepository.findByName(args.name);
    if (!emp) return { error: `Employee ${args.name} not found.` };
    const primaryPos = emp.positions.find((p) => p.isPrimary);
    const deptName = primaryPos?.position?.department?.name ?? 'Unknown';
    return { id: emp.id, code: emp.code, department: deptName };
  },
};

const checkLeaveBalance: ToolDefinition<{ employeeId: string }> = {
  name: 'checkLeaveBalance',
  description: 'Checks the remaining annual and sick leave balances for an employee.',
  inputSchema: {
    type: 'object',
    properties: { employeeId: { type: 'string', description: 'The unique ID of the employee' } },
    required: ['employeeId'],
  },
  domain: 'HR',
  version: '1.0.0',
  audit: false,
  execute: async (args) => {
    const balance = await leaveRepository.getBalance(args.employeeId);
    if (!balance) return { error: 'Leave balance not initialized for this employee.' };
    return {
      annualRemaining: balance.annualTotal - balance.annualUsed,
      sickRemaining: balance.sickTotal - balance.sickUsed,
    };
  },
};

const submitLeaveRequest: ToolDefinition<{
  employeeId: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason?: string;
  aiAnalysis?: string;
}> = {
  name: 'submitLeaveRequest',
  description: 'Submits a formal leave request for an employee. Persists the record and raises a LeaveRequestCreated event.',
  inputSchema: {
    type: 'object',
    properties: {
      employeeId: { type: 'string' },
      leaveType: { type: 'string', enum: ['ANNUAL', 'SICK', 'UNPAID', 'MATERNITY'] },
      startDate: { type: 'string', description: 'ISO Date string e.g. 2026-08-01' },
      endDate: { type: 'string', description: 'ISO Date string' },
      reason: { type: 'string' },
      aiAnalysis: { type: 'string' },
    },
    required: ['employeeId', 'leaveType', 'startDate', 'endDate'],
  },
  domain: 'HR',
  version: '1.0.0',
  audit: true,
  execute: async (args) => {
    const request = await leaveRepository.create({
      employeeId: args.employeeId,
      leaveType: args.leaveType,
      startDate: args.startDate,
      endDate: args.endDate,
      reason: args.reason ?? null,
      aiAnalysis: args.aiAnalysis ?? null,
      status: 'PENDING',
    });

    await eventBus.publish({
      eventType: EventTypes.LEAVE_REQUEST_CREATED,
      aggregate: 'LeaveRequest',
      aggregateId: request.id,
      payload: { employeeId: request.employeeId, leaveType: request.leaveType, amountDays: (new Date(request.endDate).getTime() - new Date(request.startDate).getTime()) / 86400000 },
    });

    return { success: true, requestId: request.id, status: request.status };
  },
};

const createExpense: ToolDefinition<{ employeeId: string; amount: number; reason: string }> = {
  name: 'createExpense',
  description: 'Creates a new expense record for an employee. Raises an ExpenseCreated event.',
  inputSchema: {
    type: 'object',
    properties: {
      employeeId: { type: 'string', description: 'The unique ID of the employee claiming the expense' },
      amount: { type: 'number', description: 'The expense amount in CNY' },
      reason: { type: 'string', description: 'Short reason, e.g. 打车费' },
    },
    required: ['employeeId', 'amount', 'reason'],
  },
  domain: 'Finance',
  version: '1.0.0',
  audit: true,
  execute: async (args) => {
    const expense = await expenseRepository.create({
      employeeId: args.employeeId,
      amount: args.amount,
      reason: args.reason,
    });

    await eventBus.publish({
      eventType: EventTypes.EXPENSE_CREATED,
      aggregate: 'Expense',
      aggregateId: expense.id,
      payload: { employeeId: expense.employeeId, amount: Number(expense.amount), reason: expense.reason },
    });

    return { success: true, id: expense.id, amount: Number(expense.amount), reason: expense.reason, status: expense.status };
  },
};

const autoApproveExpense: ToolDefinition<{ expenseId: string; approvedById?: string }> = {
  name: 'autoApproveExpense',
  description: 'Automatically approves an expense when it complies with policy (amount <= 500). The PolicyGuard prevents this tool from being used above the limit.',
  inputSchema: {
    type: 'object',
    properties: {
      expenseId: { type: 'string', description: 'The unique ID of the expense to approve' },
      approvedById: { type: 'string' },
    },
    required: ['expenseId'],
  },
  domain: 'Finance',
  version: '1.0.0',
  audit: true,
  execute: async (args) => {
    const expense = await expenseRepository.findById(args.expenseId);
    if (!expense) return { error: `Expense ${args.expenseId} not found.` };
    if (expense.status !== 'SUBMITTED') {
      return { error: `Expense is not in SUBMITTED state (current: ${expense.status}).` };
    }

    const approved = await expenseRepository.approve(args.expenseId, args.approvedById ?? undefined);

    await eventBus.publish({
      eventType: EventTypes.EXPENSE_APPROVED,
      aggregate: 'Expense',
      aggregateId: approved.id,
      payload: toExpenseDecisionEvent(approved, {
        decision: 'APPROVE',
        operatorId: args.approvedById ?? null,
      }),
    });

    return { success: true, expenseId: approved.id, status: 'APPROVED' };
  },
};

const requestFinanceApproval: ToolDefinition<{ expenseId: string; contextMsg?: string }> = {
  name: 'requestFinanceApproval',
  description: 'Routes an expense to a human Finance Manager for approval when it exceeds the policy limit (500).',
  inputSchema: {
    type: 'object',
    properties: {
      expenseId: { type: 'string', description: 'The unique ID of the expense that requires human approval' },
      contextMsg: { type: 'string', description: 'Explanation for why this was routed to finance' },
    },
    required: ['expenseId'],
  },
  domain: 'Finance',
  version: '2.0.0',
  audit: true,
  execute: async (args) => {
    const expense = await expenseRepository.findById(args.expenseId);
    if (!expense) return { error: `Expense ${args.expenseId} not found.` };

    await expenseRepository.markPendingApproval(args.expenseId);

    await eventBus.publish({
      eventType: EventTypes.EXPENSE_APPROVAL_REQUIRED,
      aggregate: 'Expense',
      aggregateId: expense.id,
      payload: { amount: Number(expense.amount), reason: expense.reason, contextMsg: args.contextMsg ?? null },
    });

    return { success: true, expenseId: expense.id, workflowStatus: 'PENDING_FINANCE_APPROVAL' };
  },
};

export const toolRegistry = new ToolRegistry();
toolRegistry.register(getEmployeeIdByName);
toolRegistry.register(checkLeaveBalance);
toolRegistry.register(submitLeaveRequest);
toolRegistry.register(createExpense);
toolRegistry.register(autoApproveExpense);
toolRegistry.register(requestFinanceApproval);

/**
 * Backwards-compatible plain map export, consumed by the legacy runtime
 * agent loop until it is replaced in the Orchestrator phase.
 */
export const tools: Record<string, ToolDefinition> = toolRegistry.list().reduce(
  (acc, t) => {
    acc[t.name] = t;
    return acc;
  },
  {} as Record<string, ToolDefinition>,
);