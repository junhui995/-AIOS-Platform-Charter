/* eslint-disable */
import { NextResponse } from 'next/server';
import { prisma } from '@aios/data-service';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const definition = await prisma.workflowDefinition.findUnique({
       where: { id: params.id },
       include: {
           versions: {
              select: { version: true, isPublished: true },
              orderBy: { version: 'desc' }
           }
       }
    });

    if (!definition) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({
       id: definition.id,
       name: definition.name,
       versions: definition.versions
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch workflow definition details" }, { status: 500 });
  }
}
