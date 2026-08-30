import { NextResponse } from 'next/server';

export async function POST() {
    return NextResponse.json({ error: "Workflow endpoints not fully supported yet" }, { status: 400 });
}

export async function GET() {
    return NextResponse.json([]);
}