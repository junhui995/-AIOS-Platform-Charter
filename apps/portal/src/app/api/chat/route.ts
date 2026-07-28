import { NextResponse } from 'next/server';
import { Compiler } from '@aios/compiler';
import path from 'path';

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const enqueue = (msg: string) => controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: msg })}\n\n`));

        enqueue("正在初始化 AIOS 引擎...\n");

        try {
            // Load the mock DNA since we are simulating the engine
            // In a real app we'd load this statically or from DB
            const compiler = new Compiler();
            compiler.compile(path.resolve(process.cwd(), '../../examples/enterprise-dna-demo/expense-dna.yaml'));

            // Because our current RuntimeEngine is not designed to stream natively yet,
            // we will simulate the streaming by intercepting console.log or just using a proxy response.
            // For MVP Phase 2, we will refactor RuntimeEngine to emit events or return a stream.
            // For now, we mock the real integration flow to prove architectural linkage.

            enqueue("✅ 已成功加载 Business Semantic AST\n");
            await new Promise(r => setTimeout(r, 600));

            enqueue(`分析您的请求：${prompt}\n`);
            await new Promise(r => setTimeout(r, 600));

            enqueue("正在调度 Tools...\n");
            await new Promise(r => setTimeout(r, 600));

            // To truly run the engine we would do `engine.execute(prompt)`
            // but it blocks and logs to stdout. Let's just output a success message for now.

            enqueue("\n[执行结果]: 引擎已尝试处理您的请求 (Mock 模式)。\n此能力将在下一阶段重构 RuntimeEngine 时完全对接大模型流式输出。");

        } catch (e: unknown) {
            enqueue(`\n[引擎错误]: ${(e as Error).message}\n`);
        }

        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch {
    return NextResponse.json({ error: 'Failed to process chat' }, { status: 500 });
  }
}
