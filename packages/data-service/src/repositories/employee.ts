import { prisma } from '../index';

const employeeInclude = {
  role: { select: { id: true, name: true } },
  positions: {
    include: {
      position: { include: { department: true } },
    },
  },
} as const;

/** Employee rows may carry passwordHash internally; never expose it outside the repo. */
function sanitize<T extends { passwordHash: string | null }>(e: T): Omit<T, 'passwordHash'> {
  const { passwordHash: _ignored, ...rest } = e;
  return rest;
}

export const employeeRepository = {
  async listAll() {
    const rows = await prisma.employee.findMany({
      include: employeeInclude,
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(sanitize);
  },

  async findByName(name: string) {
    const row = await prisma.employee.findFirst({ where: { name }, include: employeeInclude });
    return row ? sanitize(row) : null;
  },

  async findByCode(code: string) {
    const row = await prisma.employee.findFirst({ where: { code }, include: employeeInclude });
    return row ? sanitize(row) : null;
  },

  async findById(id: string) {
    const row = await prisma.employee.findUnique({ where: { id }, include: employeeInclude });
    return row ? sanitize(row) : null;
  },

  async create(data: {
    code: string;
    name: string;
    phoneNumber: string;
    email: string;
    hireDate: string | Date;
    status?: string;
    personalLevel?: string | null;
    positionId?: string;
    roleId?: string | null;
  }) {
    return sanitize(await prisma.employee.create({
      data: {
        code: data.code,
        name: data.name,
        phoneNumber: data.phoneNumber,
        email: data.email,
        hireDate: new Date(data.hireDate),
        status: data.status || 'ACTIVE',
        personalLevel: data.personalLevel || null,
        roleId: data.roleId ?? null,
        positions: data.positionId
          ? { create: { positionId: data.positionId, isPrimary: true } }
          : undefined,
      },
      include: employeeInclude,
    }));
  },

  async update(
    id: string,
    data: {
      roleId?: string | null;
      status?: string;
      name?: string;
      personalLevel?: string | null;
      phoneNumber?: string;
    },
  ) {
    const row = await prisma.employee.update({
      where: { id },
      data: {
        ...(data.roleId !== undefined ? { roleId: data.roleId } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.personalLevel !== undefined ? { personalLevel: data.personalLevel } : {}),
        ...(data.phoneNumber !== undefined ? { phoneNumber: data.phoneNumber } : {}),
      },
      include: employeeInclude,
    });
    return sanitize(row);
  },
};