import { describe, it, expect } from 'vitest';
import { BusinessSemanticAST } from '@aios/compiler';
import { evaluateConstraint, PolicyGuard } from './guard';
import { ToolRegistry } from '@aios/tools';

const ast: BusinessSemanticAST = {
  version: '1.0',
  domain: 'Finance',
  nodes: [
    {
      type: 'Policy',
      id: 'policy_expense_limit',
      payload: { id: 'policy_expense_limit', description: 'Any expense above 500 requires Finance Manager approval.', constraint: 'amount > 500', action: 'require_approval', role: 'Finance Manager' },
    },
    {
      type: 'Policy',
      id: 'policy_forbid_night',
      payload: { id: 'policy_forbid_night', description: 'Night time submissions are forbidden.', constraint: 'night == true', action: 'deny' },
    },
  ],
};

describe('evaluateConstraint', () => {
  it('evaluates numeric comparisons', () => {
    expect(evaluateConstraint('amount > 500', { amount: 600 })).toBe(true);
    expect(evaluateConstraint('amount > 500', { amount: 300 })).toBe(false);
    expect(evaluateConstraint('amount >= 500', { amount: 500 })).toBe(true);
    expect(evaluateConstraint('days <= 3', { days: 2 })).toBe(true);
  });

  it('supports boolean operators and parentheses', () => {
    expect(evaluateConstraint('a > 1 && b < 10', { a: 2, b: 5 })).toBe(true);
    expect(evaluateConstraint('a > 1 && b < 10', { a: 2, b: 20 })).toBe(false);
    expect(evaluateConstraint('(a > 1 || night == true) && b < 10', { a: 0, night: true, b: 5 })).toBe(true);
  });

  it('supports string equality', () => {
    expect(evaluateConstraint("status == 'ACTIVE'", { status: 'ACTIVE' })).toBe(true);
    expect(evaluateConstraint("status == 'ACTIVE'", { status: 'DRAFT' })).toBe(false);
  });

  it('does not trigger for unknown variables (safe default)', () => {
    expect(evaluateConstraint('amount > 500', {})).toBe(false);
  });
});

describe('PolicyGuard', () => {
  const guard = new PolicyGuard(ast);

  it('ALLOWs when no policy triggers', async () => {
    const d = await guard.inspect('submitLeaveRequest', { amount: 300 });
    expect(d.decision).toBe('ALLOW');
  });

  it('REDIRECTs an auto-approve attempt above the limit', async () => {
    const d = await guard.inspect('autoApproveExpense', { expenseId: 'e-1', amount: 600 });
    expect(d.decision).toBe('REDIRECT');
    if (d.decision === 'REDIRECT') {
      expect(d.policyId).toBe('policy_expense_limit');
      expect(d.toTool).toBe('requestFinanceApproval');
    }
  });

  it('ALLOWs the human approval tool for a violating expense', async () => {
    const d = await guard.inspect('requestFinanceApproval', { expenseId: 'e-1', amount: 600 });
    expect(d.decision).toBe('ALLOW');
  });

  it('honors the policy tools scope (only guards listed tools)', async () => {
    const scopedAst: BusinessSemanticAST = {
      version: '1.0',
      domain: 'Finance',
      nodes: [
        {
          type: 'Policy',
          id: 'policy_expense_limit',
          payload: {
            id: 'policy_expense_limit',
            description: 'Any expense above 500 requires Finance Manager approval.',
            constraint: 'amount > 500',
            action: 'require_approval',
            role: 'Finance Manager',
            tools: ['autoApproveExpense'],
          },
        },
      ],
    };
    const scoped = new PolicyGuard(scopedAst);

    // Recording the expense is not the guarded action.
    expect((await scoped.inspect('createExpense', { amount: 600 })).decision).toBe('ALLOW');
    // Approving it IS the guarded action.
    expect((await scoped.inspect('autoApproveExpense', { amount: 600 })).decision).toBe('REDIRECT');
  });

  it('DENYs when a deny policy triggers', async () => {
    const d = await guard.inspect('createExpense', { amount: 100, night: false });
    expect(d.decision).toBe('ALLOW');
    const denied = await guard.inspect('createExpense', { amount: 100, night: true });
    expect(denied.decision).toBe('DENY');
    if (denied.decision === 'DENY') expect(denied.policyId).toBe('policy_forbid_night');
  });

  it('executeWithGuard redirects through the registry', async () => {
    const registry = new ToolRegistry();
    const calls: string[] = [];
    registry.register({
      name: 'autoApproveExpense',
      description: '',
      inputSchema: { type: 'object', properties: {}, required: [] },
      domain: 'Finance',
      version: '1.0.0',
      audit: false,
      async execute() {
        calls.push('autoApproveExpense');
        return { ok: true };
      },
    });
    registry.register({
      name: 'requestFinanceApproval',
      description: '',
      inputSchema: { type: 'object', properties: {}, required: [] },
      domain: 'Finance',
      version: '1.0.0',
      audit: false,
      async execute() {
        calls.push('requestFinanceApproval');
        return { ok: true, expenseId: 'e-1' };
      },
    });

    const res = await guard.executeWithGuard(registry, 'autoApproveExpense', { expenseId: 'e-1', amount: 600 });
    expect(calls).toEqual(['requestFinanceApproval']);
    expect(res.decision.decision).toBe('REDIRECT');
    expect(res.result.ok).toBe(true);
  });
});