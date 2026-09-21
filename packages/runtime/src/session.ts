import * as fs from 'fs';
import * as path from 'path';
import { GuardDecision } from './guard';
import { PlanStep } from './planner';

export interface ExecutionContext {
  [key: string]: unknown;
}

export interface ExecutedStep {
  index: number;
  tool: string;
  args: Record<string, unknown>;
  decision: GuardDecision;
  result: { ok: boolean; data?: unknown; error?: string };
  at: string;
}

export interface CheckpointSession {
  sessionId: string;
  request: string;
  domain: string;
  astVersion: string;
  plan: PlanStep[];
  executed: ExecutedStep[];
  outcome?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * File-backed session store used for CLI checkpoints. After every step the
 * full execution state is persisted, so a killed process can `--resume` the
 * same session and deterministically replay already-executed steps before
 * continuing the remainder of the plan.
 */
export class SessionStore {
  constructor(private readonly dir: string = process.env.AIOS_SESSION_DIR ?? path.resolve(process.cwd(), '.aios', 'sessions')) {}

  private file(id: string): string {
    return path.join(this.dir, `${id}.json`);
  }

  private ensureDir(): void {
    if (!fs.existsSync(this.dir)) {
      fs.mkdirSync(this.dir, { recursive: true });
    }
  }

  create(sessionId: string | undefined, request: string, domain: string, astVersion: string, plan: PlanStep[]): CheckpointSession {
    const id = sessionId ?? `session-${Date.now()}`;
    const now = new Date().toISOString();
    return { sessionId: id, request, domain, astVersion, plan, executed: [], createdAt: now, updatedAt: now };
  }

  save(session: CheckpointSession): void {
    this.ensureDir();
    session.updatedAt = new Date().toISOString();
    fs.writeFileSync(this.file(session.sessionId), JSON.stringify(session, null, 2), 'utf8');
  }

  load(id: string): CheckpointSession | null {
    try {
      const raw = fs.readFileSync(this.file(id), 'utf8');
      return JSON.parse(raw) as CheckpointSession;
    } catch {
      return null;
    }
  }

  exists(id: string): boolean {
    return fs.existsSync(this.file(id));
  }

  destroy(id: string): void {
    try {
      fs.rmSync(this.file(id), { force: true });
    } catch {
      // best-effort cleanup
    }
  }
}