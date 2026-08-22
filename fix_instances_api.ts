import * as fs from 'fs';

let content = fs.readFileSync('apps/portal/src/app/api/workflow/instances/route.ts', 'utf8');

content = content.replace(
`    const definition = await prisma.workflowDefinition.findUnique({
      where: { id: definitionId },

    });

    if (!definition || definition.versions.length === 0) {
      return NextResponse.json({ error: "No published version found for this workflow definition" }, { status: 400 });
    }

    const latestVersion = definition.versions[0];`,
`    const version = await prisma.workflowVersion.findFirst({
      where: { definitionId: definitionId, isPublished: true },
      orderBy: { version: 'desc' }
    });

    if (!version) {
      return NextResponse.json({ error: "No published version found for this workflow definition" }, { status: 400 });
    }

    const latestVersion = version;`
);

fs.writeFileSync('apps/portal/src/app/api/workflow/instances/route.ts', content);
