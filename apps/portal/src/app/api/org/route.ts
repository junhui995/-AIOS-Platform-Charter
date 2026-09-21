import { NextResponse } from 'next/server';
import { orgRepository } from '@aios/data-service';

export async function GET() {
  try {
    const orgTree = await orgRepository.tree();
    return NextResponse.json(orgTree);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch organization tree' }, { status: 500 });
  }
}