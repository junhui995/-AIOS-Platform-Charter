import { describe, it, expect } from 'vitest';
import { BusinessSemanticAST } from '@aios/compiler';
import { PlanningAgent, parseRequest, extractName, extractAmount, fillTemplates, applyStepResult } from './planner';

const ast: BusinessSemanticAST = { version: '1.0', domain: 'Finance', nodes: [] };

describe('parseRequest', () => {
  it('extracts finance intent, name and amount', () => {
    const parsed = parseRequest('帮 Alice 报销 600 块的打车费');
    expect(parsed.intent).toBe('expense_reimbursement');
    expect(parsed.domain).toBe('Finance');
    expect(parsed.employeeName).toBe('Alice');
    expect(parsed.amount).toBe(600);
  });

  it('extracts HR intent', () => {
    const parsed = parseRequest('帮张三请假两天');
    expect(parsed.intent).toBe('leave_request');
    expect(parsed.domain).toBe('HR');
    expect(parsed.employeeName).toBe('张三');
  });

  it('extractAmount handles 元 suffix', () => {
    expect(extractAmount('报销 1200 元')).toBe(1200);
  });

  it('extractName returns undefined when absent', () => {
    expect(extractName('请帮我报销')).toBeUndefined();
  });
});

describe('PlanningAgent', () => {
  it('plans a 3-step reimbursement flow with template dependencies', () => {
    const plan = new PlanningAgent().plan(parseRequest('帮 Alice 报销 600 块的打车费'), ast);
    expect(plan).toHaveLength(3);
    expect(plan.map((s) => s.tool)).toEqual(['getEmployeeIdByName', 'createExpense', 'autoApproveExpense']);
    expect(plan[1]?.args.employeeId).toBe('#{employee.id}');
    expect(plan[1]?.args.amount).toBe(600);
    expect(plan[2]?.args.expenseId).toBe('#{expense.id}');
  });

  it('plans a 2-step leave flow', () => {
    const plan = new PlanningAgent().plan(parseRequest('帮张三请假'), ast);
    expect(plan.map((s) => s.tool)).toEqual(['getEmployeeIdByName', 'submitLeaveRequest']);
  });
});

describe('fillTemplates & applyStepResult', () => {
  it('resolves template tokens from the execution context', () => {
    const ctx = { employee: { id: 'emp-1' }, expense: { id: 'exp-1' } };
    expect(fillTemplates('#{employee.id}', ctx)).toBe('emp-1');
    expect(fillTemplates({ employeeId: '#{employee.id}', amount: 600 }, ctx)).toEqual({ employeeId: 'emp-1', amount: 600 });
    expect(fillTemplates('#{missing.key}', ctx)).toBeUndefined();
  });

  it('stamps tool outputs into the context', () => {
    const ctx: Record<string, unknown> = {};
    applyStepResult(ctx, 'getEmployeeIdByName', { ok: true, data: { id: 'emp-1' } });
    expect(ctx.employee).toEqual({ id: 'emp-1' });
    applyStepResult(ctx, 'unknownTool', { ok: true, data: { x: 1 } });
    expect(ctx.unknownTool).toBeUndefined();
  });
});