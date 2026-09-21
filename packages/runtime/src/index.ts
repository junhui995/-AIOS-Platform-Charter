import { OpenAI } from 'openai';
import { ToolDefinition, ToolRegistry } from '@aios/tools';
import { BusinessSemanticAST } from '@aios/compiler';
import { PolicyGuard, GuardedResult, formatDecision } from './guard';
import { PlanningAgent, PlanStep, parseRequest, fillTemplates, applyStepResult } from './planner';
import { CheckpointSession, ExecutionContext, SessionStore } from './session';

export interface RuntimeOptions {
  registry?: ToolRegistry;
  guard?: PolicyGuard;
  sessionDir?: string;
}

export interface ExecuteResult {
  session: CheckpointSession;
  outcome: string;
}

/**
 * AIOS Runtime Engine (Phase 2 — Orchestration Center).
 *
 * Deterministic half: a PlanningAgent turns the request into an ordered plan;
 * a PolicyGuard adjudicates every tool call against the compiled DNA BEFORE
 * it runs (ALLOW / DENY / REDIRECT). Each step is checkpointed to disk so an
 * interrupted run can be resumed. When OPENAI_API_KEY is present the same
 * guard pipeline wraps the model-driven loop.
 */
export class RuntimeEngine {
  private openai: OpenAI | null;
  private readonly registry: ToolRegistry;
  private readonly guard: PolicyGuard;
  private readonly planner = new PlanningAgent();
  private readonly sessions: SessionStore;
  private readonly astContext: BusinessSemanticAST;

  constructor(ast: BusinessSemanticAST, options: RuntimeOptions = {}) {
    this.astContext = ast;
    this.registry = options.registry ?? new ToolRegistry();
    this.guard = options.guard ?? new PolicyGuard(ast);
    this.sessions = new SessionStore(options.sessionDir);

    const apiKey = process.env.OPENAI_API_KEY;
    this.openai = apiKey ? new OpenAI({ apiKey }) : null;
    if (!this.openai) {
      console.warn('[Runtime] No OPENAI_API_KEY found. Engine will run in deterministic Plan+Guard mode.');
    }
  }

  resume(sessionId: string): CheckpointSession | null {
    return this.sessions.load(sessionId);
  }

  async execute(userRequest: string, options: { sessionId?: string } = {}): Promise<ExecuteResult> {
    const parsed = parseRequest(userRequest);
    console.log(`[System] Parsed intent: ${parsed.intent} (domain: ${parsed.domain})`);

    if (parsed.intent === 'unknown' && this.openai) {
      await this.agentLoop(userRequest);
      return { session: this.sessions.create(options.sessionId, userRequest, 'unknown', this.astContext.version, []), outcome: 'agent_loop_finished' };
    }

    const plan = this.planner.plan(parsed, this.astContext);
    const session = this.sessions.create(options.sessionId, userRequest, parsed.domain, this.astContext.version, plan);
    console.log(`[PlanningAgent] Produced ${plan.length} step(s) for (${parsed.domain}).`);
    this.sessions.save(session);

    await this.runPlan(session);
    return { session, outcome: session.outcome ?? 'finished' };
  }

  async continueSession(sessionId: string): Promise<ExecuteResult> {
    const session = this.sessions.load(sessionId);
    if (!session) throw new Error(`No checkpoint found for session "${sessionId}"`);
    await this.runPlan(session);
    return { session, outcome: session.outcome ?? 'finished' };
  }

  // -------------------------------------------------------------------------
  // Deterministic execution of a plan with per-step checkpoints
  // -------------------------------------------------------------------------

  private async runPlan(session: CheckpointSession): Promise<void> {
    const ctx: ExecutionContext = {};

    for (let index = 0; index < session.plan.length; index += 1) {
      const step = session.plan[index] as PlanStep;
      const previous = session.executed.find((e) => e.index === index);

      if (previous) {
        // Checkpoint replay: restore context from the recorded result,
        // never re-run a tool for a step that already executed.
        console.log(`\n[Checkpoint] Replaying step ${index + 1}/${session.plan.length}: ${step.tool} (ran at ${previous.at})`);
        applyStepResult(ctx, step.tool, { ok: previous.result.ok, data: previous.result.data });
        continue;
      }

      const args = fillTemplates(step.args, ctx) as Record<string, unknown>;
      console.log(`\n[Agent Step] ${index + 1}/${session.plan.length}: ${step.tool} — ${step.reason}`);

      const guarded = await this.guard.executeWithGuard(
        this.registry,
        step.tool,
        args,
        { actor: null, vars: { ...(step.facts ?? {}) } },
      );
      console.log(`[Guard] ${formatDecision(guarded.decision)}`);
      console.log(`[Tool Result] ${JSON.stringify(guarded.result)}`);

      session.executed.push({
        index,
        tool: step.tool,
        args,
        decision: guarded.decision,
        result: guarded.result,
        at: new Date().toISOString(),
      });

      applyStepResult(ctx, step.tool, guarded.result);
      this.sessions.save(session);
    }

    session.outcome = this.summarize(session);
    this.sessions.save(session);
    console.log(`\n[Agent Response] ${session.outcome}`);
  }

  private summarize(session: CheckpointSession): string {
    const redirects = session.executed.filter((e) => e.decision.decision === 'REDIRECT');
    if (redirects.length > 0) {
      const first = redirects[0] as ExecutedStepLike;
      const policyId = 'policyId' in first.decision ? first.decision.policyId : undefined;
      return `The action was intercepted by policy ${policyId ?? '(policy)'} and routed to a Finance Manager for human approval.`;
    }

    const last = session.executed[session.executed.length - 1];
    if (!last) return 'No steps were executed.';

    if (last.tool === 'autoApproveExpense') {
      return `Expense approved automatically (compliant with policy).`;
    }
    if (last.tool === 'submitLeaveRequest') {
      return `Leave request submitted successfully for the employee.`;
    }
    return `Finished ${session.executed.length} step(s) with ${last.tool}.`;
  }

  // -------------------------------------------------------------------------
  // Model-driven agent loop (optional, wrapped by the same PolicyGuard)
  // -------------------------------------------------------------------------

  private async agentLoop(userRequest: string): Promise<void> {
    if (!this.openai) return;

    const policies = this.astContext.nodes.filter((n) => n.type === 'Policy');
    const policyDescriptions = policies.map((p) => `- ${p.payload.description}`).join('\n');

    const systemPrompt = `
You are the AIOS Runtime Planner. Fulfill the user's request by calling the provided tools.
A deterministic PolicyGuard will intercept and enforce the following enterprise policies:
${policyDescriptions}
If the guard redirects you, follow its instruction.
`;

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userRequest },
    ];

    const toolsArray: OpenAI.Chat.ChatCompletionTool[] = this.registry.list().map((tool: ToolDefinition) => ({
      type: 'function',
      function: { name: tool.name, description: tool.description, parameters: tool.inputSchema },
    }));

    let isDone = false;
    while (!isDone) {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages,
        tools: toolsArray,
      });

      const message = response.choices[0]?.message;
      if (!message) break;
      messages.push(message);

      if (message.tool_calls && message.tool_calls.length > 0) {
        for (const toolCall of message.tool_calls) {
          if (toolCall.type !== 'function') continue;
          const toolName = toolCall.function.name;
          let args: unknown = {};
          try {
            args = JSON.parse(toolCall.function.arguments);
          } catch {
            // keep empty args
          }

          console.log(`\n[Agent Action] Intends to call: ${toolName}`);
          console.log(`[Agent Action] Arguments: ${JSON.stringify(args)}`);

          const guarded: GuardedResult = await this.guard.executeWithGuard(this.registry, toolName, args, { actor: null });
          console.log(`[Guard] ${formatDecision(guarded.decision)}`);
          console.log(`[Tool Result] ${JSON.stringify(guarded.result)}`);

          messages.push({ role: 'tool', tool_call_id: toolCall.id, content: JSON.stringify(guarded.result) });
        }
      } else {
        console.log(`\n[Agent Response] ${message.content}`);
        isDone = true;
      }
    }
  }
}

type ExecutedStepLike = { decision: { policyId?: string } };