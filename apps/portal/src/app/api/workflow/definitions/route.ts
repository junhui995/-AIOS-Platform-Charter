/* eslint-disable */
import { NextResponse } from 'next/server';
import { prisma } from '@aios/data-service';

export async function GET() {
  try {
    const definitions = await prisma.workflowDefinition.findMany({
      include: {
         versions: {
            orderBy: { version: 'desc' },
            take: 1
         }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Map to the requested output
    const result = definitions.map(def => ({
        id: def.id,
        code: def.code,
        name: def.name,
        isActive: def.isActive,
        latestVersion: def.versions[0]?.version || 0
    }));

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch workflow definitions" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { code, name, description } = await req.json();

    if (!code || !name) {
       return NextResponse.json({ error: "Code and name are required" }, { status: 400 });
    }

    const definition = await prisma.workflowDefinition.create({
       data: {
          code,
          name,
          description
       }
    });

    return NextResponse.json({ id: definition.id, code: definition.code });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create workflow definition" }, { status: 500 });
  }
}
