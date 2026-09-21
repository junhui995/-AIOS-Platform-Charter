import { prisma } from '../index';

const employeeInclude = {
  positions: {
    include: {
      position: { include: { department: true } },
    },
  },
} as const;

export const employeeRepository = {
  async listAll() {
    return prisma.employee.findMany({
      include: employeeInclude,
      orderBy: { createdAt: 'desc' },
    });
  },

  async findByName(name: string) {
    return prisma.employee.findFirst({ where: { name }, include: employeeInclude });
  },

  async findById(id: string) {
    return prisma.employee.findUnique({ where: { id }, include: employeeInclude });
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
  }) {
    return prisma.employee.create({
      data: {
        code: data.code,
        name: data.name,
        phoneNumber: data.phoneNumber,
        email: data.email,
        hireDate: new Date(data.hireDate),
        status: data.status || 'ACTIVE',
        personalLevel: data.personalLevel || null,
        positions: data.positionId
          ? { create: { positionId: data.positionId, isPrimary: true } }
          : undefined,
      },
      include: employeeInclude,
    });
  },
};