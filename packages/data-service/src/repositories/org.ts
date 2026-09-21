import { prisma } from '../index';

export const orgRepository = {
  async tree() {
    return prisma.department.findMany({
      where: { parentId: null },
      include: { children: { include: { children: true } } },
    });
  },

  async listDepartments(dimensionId?: string | null) {
    return prisma.department.findMany({
      where: dimensionId ? { dimensionId } : {},
      include: {
        positions: true,
        children: { include: { positions: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  },

  async createDepartment(data: {
    dimensionId: string;
    code: string;
    name: string;
    parentId?: string | null;
    headcountLimit?: number;
  }) {
    return prisma.department.create({
      data: {
        dimensionId: data.dimensionId,
        code: data.code,
        name: data.name,
        parentId: data.parentId || null,
        headcountLimit: data.headcountLimit || 0,
      },
    });
  },

  async listDimensions() {
    return prisma.orgDimension.findMany({ orderBy: { createdAt: 'asc' } });
  },

  async createDimension(data: { code: string; name: string; description?: string }) {
    return prisma.orgDimension.create({ data });
  },

  async listPositions(departmentId?: string | null) {
    return prisma.position.findMany({
      where: departmentId ? { departmentId } : {},
      include: { employees: { include: { employee: true } } },
      orderBy: { createdAt: 'asc' },
    });
  },

  async createPosition(data: {
    departmentId: string;
    code: string;
    name: string;
    level: string;
    baseSalaryRef?: number | null;
  }) {
    return prisma.position.create({
      data: {
        departmentId: data.departmentId,
        code: data.code,
        name: data.name,
        level: data.level,
        baseSalaryRef: data.baseSalaryRef ?? null,
      },
    });
  },
};