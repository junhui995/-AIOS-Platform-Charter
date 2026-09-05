/* eslint-disable */
import { NextResponse } from 'next/server';
import { prisma } from '@aios/data-service';

export async function GET() {
  return NextResponse.json({ totalActive: 0, within30: 0, within60: 0, within90: 0, expired: 0 });
}
