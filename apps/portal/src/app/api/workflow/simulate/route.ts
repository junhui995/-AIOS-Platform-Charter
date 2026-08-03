import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Predictive / Simulation Endpoint
// Allows the frontend to send form data and see which nodes will be hit without saving anything.
export async function POST(req: Request) {
  try {
    const { definitionId, formData } = await req.json();

    const definition = await prisma.workflowDefinition.findUnique({
      where: { id: definitionId },
      include: { versions: { orderBy: { version: 'desc' }, take: 1, where: { isPublished: true } } }
    });

    if (!definition || definition.versions.length === 0) {
      return NextResponse.json({ error: "No published version found" }, { status: 400 });
    }

    const version = definition.versions[0];
    const nodes = version.nodes as any[];
    const edges = version.edges as any[];

    // Simple BFS to trace the execution path based on dummy/test form data
    const startNode = nodes.find(n => n.type === 'input');
    if (!startNode) return NextResponse.json({ path: [] });

    const executionPath = [startNode.id];
    let currentNodes = [startNode.id];
    let safeLoopBreaker = 0;

    while (currentNodes.length > 0 && safeLoopBreaker < 50) {
        safeLoopBreaker++;
        let nextLevelNodes = [];

        for (const currId of currentNodes) {
             const outEdges = edges.filter(e => e.source === currId);

             for (const edge of outEdges) {
                  const targetNode = nodes.find(n => n.id === edge.target);
                  if (!targetNode) continue;

                  // Evaluate Gateway Conditions
                  if (targetNode.id.startsWith('gateway')) {
                       // Gateway itself is hit
                       executionPath.push(targetNode.id);

                       const gwOutEdges = edges.filter(e => e.source === targetNode.id);
                       // SIMULATION LOGIC: normally evaluate expressions.
                       // For demo, we just take the first route.
                       if (gwOutEdges.length > 0) {
                            nextLevelNodes.push(gwOutEdges[0].target);
                       }
                  } else {
                       nextLevelNodes.push(targetNode.id);
                  }
             }
        }

        // Add to path and continue
        executionPath.push(...nextLevelNodes);
        currentNodes = nextLevelNodes;

        // Stop if we hit end node
        if (currentNodes.some(id => nodes.find(n => n.id === id)?.type === 'output')) {
            break;
        }
    }

    return NextResponse.json({
        message: "Simulation complete",
        executionPath: Array.from(new Set(executionPath)) // Return unique hit nodes
    });

  } catch (error) {
    console.error("Simulation failed:", error);
    return NextResponse.json({ error: "Failed to simulate workflow" }, { status: 500 });
  }
}
