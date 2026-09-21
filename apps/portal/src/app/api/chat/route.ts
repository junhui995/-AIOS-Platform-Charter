import { NextResponse } from 'next/server';
import { toolRegistry } from '@aios/tools';

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const enqueue = (msg: string) => controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: msg })}\n\n`));

        enqueue("正在初始化 AIOS 引擎...\n");
        await new Promise((r) => setTimeout(r, 400));

        if (prompt.includes("请假") || prompt.includes("假") || prompt.includes("休息")) {
          enqueue("识别到业务域：【考勤与请假】\n正在通过 Tool 查找员工张三...\n");

          const empRes = await toolRegistry.run('getEmployeeIdByName', { name: '张三' });
          const emp = empRes.ok ? (empRes.data as { id?: string }) : null;

          if (!emp?.id) {
            enqueue("\n[执行错误]: 未找到默认员工(张三)。请确保已运行 db:seed。");
          } else {
            enqueue(`查找到张三。正在通过 Tool submitLeaveRequest 提交年假申请...\n`);

            const submitRes = await toolRegistry.run('submitLeaveRequest', {
              employeeId: emp.id,
              leaveType: 'ANNUAL',
              startDate: '2026-08-01',
              endDate: '2026-08-02',
              reason: 'AI 自动提交的代办请假单',
              aiAnalysis: 'AI 建议【同意】该申请。',
            });

            if (submitRes.ok) {
              const data = submitRes.data as { requestId?: string };
              enqueue(`\n[执行结果]: 已为您代办提交请假申请 (ID: ${data.requestId})。AI 已附带合规审核建议，请在考勤面板中查看最新状态。`);
            } else {
              enqueue(`\n[执行错误]: ${submitRes.error}`);
            }
          }
        } else {
          enqueue('\n[执行结果]: 引擎已收到请求。当前系统主要演示【考勤请假】模块的 AI 代办功能，您可以尝试输入："帮张三请明天的年假"。');
        }

        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      },
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