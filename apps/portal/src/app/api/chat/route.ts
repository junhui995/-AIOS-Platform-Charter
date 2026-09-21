import { NextResponse } from 'next/server';
import * as os from 'os';
import * as path from 'path';
import { Compiler, BusinessSemanticAST } from '@aios/compiler';
import { eventBus } from '@aios/events';
import { RuntimeEngine } from '@aios/runtime';
import { toolRegistry } from '@aios/tools';

// The AIOS Runtime drives the enterprise DNA shown in the P2 closed-loop demo.
const DNA_PATH = path.resolve(process.cwd(), '../../examples/enterprise-dna-demo/expense-dna.yaml');
const SESSION_DIR = process.env.AIOS_SESSION_DIR ?? path.join(os.tmpdir(), 'aios-portal-sessions');

let cachedAst: BusinessSemanticAST | null = null;
function compileAst(): BusinessSemanticAST {
  if (!cachedAst) {
    cachedAst = new Compiler().compile(DNA_PATH);
  }
  return cachedAst;
}

function buildEngine(): RuntimeEngine {
  return new RuntimeEngine(compileAst(), {
    registry: toolRegistry,
    sessionDir: SESSION_DIR,
  });
}

function sse(controller: ReadableStreamDefaultController<Uint8Array>, encoder: TextEncoder, payload: unknown): void {
  controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function POST(req: Request) {
  try {
    const { prompt, resumeSessionId } = (await req.json()) as { prompt?: string; resumeSessionId?: string };
    const userPrompt = (prompt ?? '').trim();

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          sse(controller, encoder, { text: '正在初始化 AIOS Runtime...\n' });
          await sleep(200);

          const runtime = buildEngine();
          eventBus.startDispatcher();

          try {
            if (!userPrompt) {
              sse(controller, encoder, { text: '[执行错误]: 请求文本为空。' });
              return;
            }

            let sessionId: string | undefined;
            let outcome = '';
            const lines: Array<{ n: number; m: number; tool: string; reason: string; decision: string; result: string }> = [];

            if (resumeSessionId && /^(继续|continue|接着|继续执行|再来)$/i.test(userPrompt)) {
              const resumed = runtime.resume(resumeSessionId);
              if (!resumed) {
                sse(controller, encoder, { text: `[检查点错误]: 未找到会话 ${resumeSessionId} 的检查点。` });
                return;
              }
              sse(controller, encoder, { text: `恢复会话 ${resumed.sessionId}（请求: "${resumed.request}"）\n` });
              const res = await runtime.continueSession(resumeSessionId);
              sessionId = res.session.sessionId;
              outcome = res.outcome;
            } else {
              const res = await runtime.execute(userPrompt);
              sessionId = res.session.sessionId;
              outcome = res.outcome;
            }

            const session = runtime.resume(sessionId);
            for (const step of session?.executed ?? []) {
              const decision = step.decision as { decision: string };
              const suffix = decision.decision === 'REDIRECT'
                ? ` by ${(step.decision as { policyId?: string })?.policyId}: ${(step.decision as { reason?: string })?.reason} -> ${(step.decision as { toTool?: string })?.toTool}`
                : decision.decision === 'DENY'
                  ? ` by ${(step.decision as { policyId?: string })?.policyId}: ${(step.decision as { reason?: string })?.reason}`
                  : '';
              lines.push({
                n: step.index + 1,
                m: session!.plan.length,
                tool: step.tool,
                reason: session!.plan[step.index]?.reason ?? '',
                decision: `[Guard] ${decision.decision}${suffix}`,
                result: JSON.stringify(step.result),
              });
            }

            for (const line of lines) {
              sse(controller, encoder, { text: `\n[Agent Step] ${line.n}/${line.m}: ${line.tool} — ${line.reason}` });
              sse(controller, encoder, { text: `\n${line.decision}` });
              sse(controller, encoder, { text: `\n[Tool Result] ${line.result}` });
              await sleep(150);
            }

            sse(controller, encoder, { text: `\n\n[Agent Response] ${outcome}` });
            sse(controller, encoder, { sessionId });
          } finally {
            eventBus.stopDispatcher();
          }
        } catch (err) {
          const reason = err instanceof Error ? err.message : String(err);
          const friendly = reason.includes('Unsupported request')
            ? '无法识别的业务请求。可以试试：「帮张三请假」或「帮 Alice 报销 600 块的打车费」。'
            : `[系统错误]: ${reason}`;
          sse(controller, encoder, { text: `\n${friendly}` });
        } finally {
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (e) {
    console.error('[chat] POST failed:', e);
    return NextResponse.json({ error: 'Failed to process chat' }, { status: 500 });
  }
}