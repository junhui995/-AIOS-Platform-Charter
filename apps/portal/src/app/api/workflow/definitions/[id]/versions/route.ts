/* eslint-disable */
import { NextResponse } from 'next/server';
import { prisma } from '@aios/data-service';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const { nodes, edges } = await req.json();

    const latest = await prisma.workflowVersion.findFirst({
        where: { definitionId: params.id },
        orderBy: { version: 'desc' }
    });

    const nextVersionNum = latest ? latest.version + 1 : 1;

    const newVersion = await prisma.workflowVersion.create({
        data: {
           definitionId: params.id,
           version: nextVersionNum,
           nodes: nodes || [],
           edges: edges || [],
           isPublished: false
        }
    });

    return NextResponse.json(newVersion);
  } catch (error) {
    return NextResponse.json({ error: "Failed to create workflow version" }, { status: 500 });
  }
}
