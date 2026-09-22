import { NextResponse } from 'next/server';
import { entityRegistry } from '@aios/data-service';

export async function GET() {
  return NextResponse.json({ entities: entityRegistry });
}