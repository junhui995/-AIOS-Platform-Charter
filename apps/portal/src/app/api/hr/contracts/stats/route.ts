/* eslint-disable */
import { NextResponse } from 'next/server';
import { prisma } from '@aios/data-service';

export async function GET() {
  try {
    const now = new Date();

    // We fetch all active contracts and calculate expiring windows locally to avoid complex Prisma raw queries
    const activeContracts = await prisma.laborContract.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true, endDate: true }
    });

    let within30 = 0;
    let within60 = 0;
    let within90 = 0;
    let expired = 0;

    for (const c of activeContracts) {
        if (!c.endDate) continue;
        const diffDays = Math.floor((new Date(c.endDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays < 0) {
            expired++;
        } else if (diffDays <= 30) {
            within30++;
        } else if (diffDays <= 60) {
            within60++;
        } else if (diffDays <= 90) {
            within90++;
        }
    }

    const totalActive = activeContracts.length;

    // Also explicitly count expired status if any
    const explicitlyExpiredCount = await prisma.laborContract.count({
        where: { status: 'EXPIRED' }
    });

    return NextResponse.json({
        totalActive,
        within30,
        within60,
        within90,
        expired: expired + explicitlyExpiredCount
    });
  } catch (error: unknown) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
