/* eslint-disable */
import { NextResponse } from 'next/server';
import { prisma } from '@aios/data-service';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const version = await prisma.workflowVersion.update({
        where: { id: params.id },
        data: {
           isPublished: true,
           publishedAt: new Date()
        }
    });

    return NextResponse.json(version);
  } catch (error) {
    return NextResponse.json({ error: "Failed to publish workflow version" }, { status: 500 });
  }
}
