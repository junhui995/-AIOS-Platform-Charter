import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { describe, it, expect, afterEach } from 'vitest';
import { SessionStore } from './session';
import { PlanStep } from './planner';

const tmpDirs: string[] = [];

function tmpSessionDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'aios-sess-'));
  tmpDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tmpDirs) fs.rmSync(dir, { recursive: true, force: true });
  tmpDirs.length = 0;
});

describe('SessionStore (checkpoint)', () => {
  it('round-trips a session through disk', () => {
    const store = new SessionStore(tmpSessionDir());
    const plan: PlanStep[] = [
      { tool: 'getEmployeeIdByName', args: { name: 'Alice' }, reason: 'resolve' },
      { tool: 'createExpense', args: { employeeId: '#{employee.id}', amount: 600 }, reason: 'record' },
    ];
    const session = store.create('sess-1', '帮 Alice 报销 600', 'Finance', '1.0', plan);
    session.executed.push({
      index: 0,
      tool: 'getEmployeeIdByName',
      args: { name: 'Alice' },
      decision: { decision: 'ALLOW', note: 'no policy triggered' },
      result: { ok: true, data: { id: 'emp-1' } },
      at: new Date().toISOString(),
    });
    store.save(session);

    const loaded = store.load('sess-1');
    expect(loaded).not.toBeNull();
    expect(loaded?.sessionId).toBe('sess-1');
    expect(loaded?.executed).toHaveLength(1);
    expect(loaded?.executed[0]?.decision.decision).toBe('ALLOW');
    expect(loaded?.plan).toHaveLength(2);
  });

  it('load returns null for a missing session', () => {
    const store = new SessionStore(tmpSessionDir());
    expect(store.load('nope')).toBeNull();
    expect(store.exists('nope')).toBe(false);
  });

  it('destroy removes the checkpoint file', () => {
    const store = new SessionStore(tmpSessionDir());
    store.save(store.create('sess-2', 'request', 'Finance', '1.0', []));
    expect(store.exists('sess-2')).toBe(true);
    store.destroy('sess-2');
    expect(store.exists('sess-2')).toBe(false);
  });
});