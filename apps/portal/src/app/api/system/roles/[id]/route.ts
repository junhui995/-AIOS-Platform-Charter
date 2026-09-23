import { NextResponse } from 'next/server';
import { prisma } from '@aios/data-service';
import { requirePermission, handleRouteError } from '@/lib/auth/guard';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission('SYSTEM', 'WRITE');
    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.role.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    if (existing.name === '系统管理员') {
      return NextResponse.json({ error: '系统管理员为内置角色，不可修改' }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      if (body.name !== undefined || body.description !== undefined) {
        await tx.role.update({
          where: { id },
          data: {
            ...(body.name !== undefined ? { name: String(body.name).trim() } : {}),
            ...(body.description !== undefined ? { description: body.description } : {}),
          },
        });
      }

      // Full permission matrix replacement (module + action + dimension)
      if (Array.isArray(body.permissions)) {
        await tx.rolePermission.deleteMany({ where: { roleId: id } });
        const company = await tx.orgDimension.findUnique({ where: { code: 'COMPANY_DIMENSION' } });
        for (const p of body.permissions) {
          const mod = String(p.module).toUpperCase();
          const action = String(p.action).toUpperCase();
          const allowedActions = ['READ', 'WRITE', 'ADMIN'];
          if (!p.module || !allowedActions.includes(action)) continue;
          await tx.rolePermission.create({
            data: { roleId: id, module: mod, action, dimensionId: company?.id ?? null },
          });
        }
      }
    });

    const fresh = await prisma.role.findUnique({
      where: { id },
      include: {
        _count: { select: { employees: true } },
        permissions: { include: { dimension: true } },
      },
    });
    return NextResponse.json({
      id: fresh?.id,
      name: fresh?.name,
      description: fresh?.description,
      memberCount: fresh?._count.employees ?? 0,
      permissions: fresh?.permissions.map((p) => ({
        module: p.module,
        action: p.action,
        dimensionCode: p.dimension?.code ?? null,
      })) ?? [],
    });
  } catch (err) {
    if (err instanceof Error && String(err.message).toLowerCase().includes('unique')) {
      return NextResponse.json({ error: '角色名已存在' }, { status: 400 });
    }
    return handleRouteError(err);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission('SYSTEM', 'WRITE');
    const { id } = await params;
    const existing = await prisma.role.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    if (existing.name === '系统管理员') {
      return NextResponse.json({ error: '系统管理员为内置角色，不可删除' }, { status: 400 });
    }
    const memberCount = await prisma.employee.count({ where: { roleId: id } });
    if (memberCount > 0) {
      return NextResponse.json({ error: `仍有 ${memberCount} 名员工绑定该角色，请先解绑` }, { status: 400 });
    }
    await prisma.rolePermission.deleteMany({ where: { roleId: id } });
    await prisma.role.delete({ where: { id } });
    return NextResponse.json({ deleted: true });
  } catch (err) {
    return handleRouteError(err);
  }
}