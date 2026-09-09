import { NextResponse } from 'next/server';
import { WorkflowEngine } from '@/lib/workflow/engine';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        await WorkflowEngine.retroExecute(body.instanceId);
        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : "Failed to retro execute workflow";
        return NextResponse.json({ error: msg }, { status: 400 });
    }
}

export async function GET() {
    return NextResponse.json([]);
}
