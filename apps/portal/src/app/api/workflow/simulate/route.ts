import { NextResponse } from 'next/server';
import { WorkflowEngine } from '@/lib/workflow/engine';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        await WorkflowEngine.simulate(body.definitionId, body.formData);
        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : "Failed to simulate workflow";
        return NextResponse.json({ error: msg }, { status: 400 });
    }
}

export async function GET() {
    return NextResponse.json([]);
}
