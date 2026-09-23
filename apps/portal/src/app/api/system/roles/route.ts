import { NextResponse } from 'next/server';
import { prisma } from '@aios/data-service';
import { requirePermission, handleRouteError } from '@/lib/auth/guard';

export async function GET() {
  try {
    await requirePermission('SYSTEM', 'READ');
    const roles = await prisma.role.findMany({
      include: {
        _count: { select: { employees: true } },
        permissions: { include: { dimension: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json({
      roles: roles.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        memberCount: r._count.employees,
        permissions: r.permissions.map((p) => ({
          module: p.module,
          action: p.action,
          dimensionCode: p.dimension?.code ?? null,
        })),
      })),
      modules: ['HR', 'ORG', 'FINANCE', 'WORKFLOW', 'MONITOR', 'KNOWLEDGE', 'MESSAGES', 'SYSTEM'],
    });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function POST(req: Request) {
  try {
    await requirePermission('SYSTEM', 'WRITE');
    const body = await req.json();
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) return NextResponse.json({ error: 'Role name is required' }, { status: 400 });
    if (name === '系统管理员') {
      return NextResponse.json({ error: '系统管理员为内置角色，不可重建' }, { status: 400 });
    }
    const role = await prisma.role.create({
      data: { name, description: body.description ?? null },
    });
    return NextResponse.json({ id: role.id, name: role.name }, { status: 201 });
  } catch (err) {
    if (err instanceof Error && String(err.message).toLowerCase().includes('unique')) {
      return NextResponse.json({ error: '角色名已存在' }, { status: 400 });
    }
    return handleRouteError(err);
  }
}