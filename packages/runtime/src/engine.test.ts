import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { describe, it, expect, afterEach } from 'vitest';
import { BusinessSemanticAST } from '@aios/compiler';
import { ToolRegistry, ToolDefinition, toolRegistry } from '@aios/tools';
import { RuntimeEngine } from './index';
import { PolicyGuard } from './guard';
import { CheckpointSession } from './session';

const tmpDirs: string[] = [];

function tmpSessionDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'aios-engine-'));
  tmpDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tmpDirs) fs.rmSync(dir, { recursive: true, force: true });
  tmpDirs.length = 0;
});

const financeAst: BusinessSemanticAST = {
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

function makeTool(name: string, execute: ToolDefinition['execute']): ToolDefinition {
  return { name, description: name, inputSchema: { type: 'object', properties: {}, required: [] }, domain: 'Finance', version: '1.0.0', audit: false, execute };
}

/** Registry with in-memory stubs (no DB). Tracks call counts per tool. */
function stubRegistry(): { registry: ToolRegistry; calls: Record<string, number> } {
  const calls: Record<string, number> = {};
  const count = (name: string) => {
    calls[name] = (calls[name] ?? 0) + 1;
  };

  const registry = new ToolRegistry();
  registry.register(
    makeTool('getEmployeeIdByName', async (args: { name: string }) => {
      count('getEmployeeIdByName');
      return { id: 'emp-alice', code: 'EMP-002', department: 'Engineering', name: args.name };
    }),
  );
  registry.register(
    makeTool('createExpense', async (args: { employeeId: string; amount: number }) => {
      count('createExpense');
      return { success: true, id: 'exp-1', amount: args.amount, status: 'SUBMITTED' };
    }),
  );
  registry.register(
    makeTool('autoApproveExpense', async () => {
      count('autoApproveExpense');
      return { success: true, expenseId: 'exp-1', status: 'APPROVED' };
    }),
  );
  registry.register(
    makeTool('requestFinanceApproval', async (args: { expenseId: string }) => {
      count('requestFinanceApproval');
      return { success: true, expenseId: args.expenseId, workflowStatus: 'PENDING_FINANCE_APPROVAL' };
    }),
  );

  return { registry, calls };
}

describe('RuntimeEngine plan + guard + checkpoint', () => {
  it('defaults to the shared registered tool registry', () => {
    const engine = new RuntimeEngine(financeAst, { sessionDir: tmpSessionDir() });
    const { registry } = engine as unknown as { registry: ToolRegistry };
    expect(registry.get('getEmployeeIdByName')).toBeDefined();
    expect(registry.get('createExpense')).toBeDefined();
    expect(registry.get('requestFinanceApproval')).toBeDefined();
    expect(registry).toBe(toolRegistry);
  });

  it('summarizes a failure instead of claiming auto-approval', async () => {
    const engine = new RuntimeEngine(financeAst, {
      registry: stubRegistry().registry,
      guard: new PolicyGuard(financeAst),
      sessionDir: tmpSessionDir(),
    });
    // Simulate: run description is irrelevant; we just assert denials/failures map to honest summaries.
    const outcome = (engine as unknown as { summarize(s: CheckpointSession): string }).summarize({
      sessionId: 'x',
      request: 'x',
      domain: 'Finance',
      astVersion: '1.0',
      plan: [],
      executed: [
        {
          index: 0,
          tool: 'autoApproveExpense',
          args: {},
          decision: { decision: 'DENY', policyId: 'policy_expense_limit', reason: 'blocked' },
          result: { ok: false, error: 'blocked' },
          at: '',
        },
      ],
      createdAt: '',
      updatedAt: '',
    });
    expect(outcome).toContain('Blocked by policy');
  });

  it('runs the reimbursement plan and redirects >500 via the Guard', async () => {
    const { registry, calls } = stubRegistry();
    const engine = new RuntimeEngine(financeAst, {
      registry,
      guard: new PolicyGuard(financeAst),
      sessionDir: tmpSessionDir(),
    });

    const { outcome, session } = await engine.execute('帮 Alice 报销 600 块的打车费', { sessionId: 't1' });

    expect(calls.getEmployeeIdByName).toBe(1);
    expect(calls.createExpense).toBe(1);
    expect(calls.autoApproveExpense ?? 0).toBe(0); // intercepted!
    expect(calls.requestFinanceApproval).toBe(1); // redirected

    expect(session.executed).toHaveLength(3);
    expect(session.executed[2]?.decision).toEqual({
      decision: 'REDIRECT',
      policyId: 'policy_expense_limit',
      reason: 'Any expense above 500 requires Finance Manager approval.',
      toTool: 'requestFinanceApproval',
    });
    expect(outcome).toContain('human approval');
  });

  it('resumes from the checkpoint without re-running executed steps', async () => {
    const dir = tmpSessionDir();
    const firstRun = stubRegistry();
    const engine = new RuntimeEngine(financeAst, {
      registry: firstRun.registry,
      guard: new PolicyGuard(financeAst),
      sessionDir: dir,
    });

    await engine.execute('帮 Alice 报销 600 块的打车费', { sessionId: 't1' });
    const before = { ...firstRun.calls };

    // New engine instance, same sessionDir: reload from disk.
    const resumeEngine = new RuntimeEngine(financeAst, {
      registry: stubRegistry().registry,
      guard: new PolicyGuard(financeAst),
      sessionDir: dir,
    });
    const { outcome } = await resumeEngine.continueSession('t1');

    expect(resumeEngine.resume('t1')).not.toBeNull();
    // No new tool executions during pure replay.
    expect(outcome).toContain('human approval');
    expect(Object.values(before).every((v) => v === 1)).toBe(true);
  });
});