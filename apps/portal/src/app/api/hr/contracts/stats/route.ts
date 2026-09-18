import { NextResponse } from 'next/server';
import { prisma } from '@aios/data-service';

export async function GET() {
  try {
    const now = new Date();

    // Total active contracts
    const totalActive = await prisma.laborContract.count({
        where: { status: 'ACTIVE' }
    });

    // Expired
    const expired = await prisma.laborContract.count({
        where: { status: 'EXPIRED' }
    });

    // Helper for days range
    const getCountWithinDays = async (days: number) => {
        const targetDate = new Date();
        targetDate.setDate(now.getDate() + days);
        return await prisma.laborContract.count({
            where: {
                status: 'ACTIVE',
                endDate: {
                    gte: now,
                    lte: targetDate
                }
            }
        });
    };

    const within30 = await getCountWithinDays(30);
    const within60 = await getCountWithinDays(60);
    const within90 = await getCountWithinDays(90);

    return NextResponse.json({
        totalActive,
        within30,
        within60,
        within90,
        expired
    });
  } catch (error: unknown) {
    console.error("Error fetching contract stats:", error);
    return NextResponse.json({ error: "Failed to fetch contract stats" }, { status: 500 });
  }
}
