import * as fs from 'fs';

let content = fs.readFileSync('apps/portal/src/app/api/workflow/instances/route.ts', 'utf8');

const regex = /\/\/ Find the latest published version of the definition[\s\S]*?const latestVersion = definition\.versions\[0\];/;

const replacement = `    const version = await prisma.workflowVersion.findFirst({
      where: { definitionId: definitionId, isPublished: true },
      orderBy: { version: 'desc' }
    });

    if (!version) {
      return NextResponse.json({ error: "No published version found for this workflow definition" }, { status: 400 });
    }

    const latestVersion = version;`;

content = content.replace(regex, replacement);
fs.writeFileSync('apps/portal/src/app/api/workflow/instances/route.ts', content);
