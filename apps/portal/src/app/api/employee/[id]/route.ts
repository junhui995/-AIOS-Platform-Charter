import { NextResponse } from 'next/server';
import { employeeRepository, prisma } from '@aios/data-service';
import { requirePermission, handleRouteError } from '@/lib/auth/guard';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission('HR', 'WRITE');
    const { id } = await params;
    const body = await req.json();

    const existing = await employeeRepository.findById(id);
    if (!existing) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });

    if (body.roleId !== undefined && body.roleId !== null) {
      const role = await prisma.role.findUnique({ where: { id: body.roleId } });
      if (!role) return NextResponse.json({ error: 'Role not found' }, { status: 400 });
    }

    const updated = await employeeRepository.update(id, {
      roleId: body.roleId !== undefined ? body.roleId : undefined,
      status: body.status !== undefined ? String(body.status).toUpperCase() : undefined,
      name: typeof body.name === 'string' ? body.name.trim() : undefined,
      personalLevel: body.personalLevel !== undefined ? body.personalLevel : undefined,
      phoneNumber: typeof body.phoneNumber === 'string' ? body.phoneNumber.trim() : undefined,
    });
    return NextResponse.json(updated);
  } catch (err) {
    return handleRouteError(err);
  }
}