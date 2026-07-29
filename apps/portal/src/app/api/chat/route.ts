import { NextResponse } from 'next/server';
import { prisma } from '@aios/data-service';

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const enqueue = (msg: string) => controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: msg })}\n\n`));

        enqueue("正在初始化 AIOS 引擎...\n");
        await new Promise(r => setTimeout(r, 400));

        try {
            enqueue(`分析您的请求：${prompt}\n`);
            await new Promise(r => setTimeout(r, 600));

            // TODO: In Phase 3 we will integrate RuntimeEngine properly.
            // For now, this is a mock implementation requested by the user to quickly verify the end-to-end flow of the new schema.
            if (prompt.includes("请假") || prompt.includes("假") || prompt.includes("休息")) {
                enqueue("🔍 识别到业务域：【考勤与请假】\n正在查找员工张三 (EMP-001) 的假期额度...\n");
                await new Promise(r => setTimeout(r, 800));

                const emp = await prisma.employee.findFirst({ where: { name: '张三' } });

                if (emp) {
                    enqueue(`✅ 查找到张三的年假余额充足。\n正在调用内部工具 submitLeaveRequest...\n`);
                    await new Promise(r => setTimeout(r, 800));

                    await prisma.leaveRequest.create({
                        data: {
                            employeeId: emp.id,
                            leaveType: 'ANNUAL',
                            startDate: new Date('2026-08-01'),
                            endDate: new Date('2026-08-02'),
                            reason: 'AI 自动提交的代办请假单',
                            aiAnalysis: '该员工年假余额充足 (剩 8 天)，且本部门当日排班人力充足，AI 建议【同意】该申请。',
                            status: 'PENDING'
                        }
                    });

                    enqueue("\n[执行结果]: 🎉 已成功为您代办提交请假申请。AI 已附带合规审核建议，请在考勤面板中查看最新状态。");
                } else {
                    enqueue("\n[执行错误]: 未找到默认员工(张三)。请确保已运行 db:seed。");
                }
            } else {
               enqueue("\n[执行结果]: 引擎已收到请求。当前系统主要演示【考勤请假】模块的 AI 代办功能，您可以尝试输入：\"帮张三请明天的年假\"。");
            }

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
