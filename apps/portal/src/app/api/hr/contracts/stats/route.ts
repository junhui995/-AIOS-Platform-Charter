/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { prisma } from '@aios/data-service';

export async function GET() {
  try {
    const today = new Date();
    const active = await prisma.laborContract.count({ where: { status: 'ACTIVE' } });

    // Add logic to count contracts expiring soon based on endDate
    const within30 = await prisma.laborContract.count({
      where: {
        status: 'ACTIVE',
        endDate: {
          lte: new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000),
          gt: today
        }
      }
    });

    const within60 = await prisma.laborContract.count({
      where: {
        status: 'ACTIVE',
        endDate: {
          lte: new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000),
          gt: new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
        }
      }
    });

    const within90 = await prisma.laborContract.count({
      where: {
        status: 'ACTIVE',
        endDate: {
          lte: new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000),
          gt: new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000)
        }
      }
    });

    const expired = await prisma.laborContract.count({
      where: {
        endDate: { lt: today },
        status: { notIn: ['TERMINATED'] }
      }
    });

    return NextResponse.json({
        totalActive: active,
        within30,
        within60,
        within90,
        expired
    });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch contract stats", details: error.message }, { status: 500 });
  }
}
