import { prisma } from '../index';

export const contractRepository = {
  async list(employeeId?: string | null) {
    return prisma.laborContract.findMany({
      where: employeeId ? { employeeId } : {},
      include: {
        employee: { select: { name: true, code: true } },
        template: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  async create(data: {
    employeeId: string;
    templateId?: string | null;
    startDate: string | Date;
    endDate: string | Date;
    code?: string;
    status?: string;
  }) {
    return prisma.laborContract.create({
      data: {
        code: data.code || `HT-${Date.now()}`,
        employeeId: data.employeeId,
        templateId: data.templateId ?? null,
        signDate: new Date(data.startDate),
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        status: data.status ?? 'DRAFT',
      },
    });
  },

  async findById(id: string) {
    return prisma.laborContract.findUnique({ where: { id } });
  },

  async updateStatus(id: string, status: string, signDate?: Date) {
    return prisma.laborContract.update({
      where: { id },
      data: { status, ...(signDate ? { signDate } : {}) },
    });
  },

  async countByStatus(status: string) {
    return prisma.laborContract.count({ where: { status } });
  },

  async countActiveExpiringWithin(days: number) {
    const now = new Date();
    const targetDate = new Date();
    targetDate.setDate(now.getDate() + days);
    return prisma.laborContract.count({
      where: { status: 'ACTIVE', endDate: { gte: now, lte: targetDate } },
    });
  },

  /**
   * Renews a contract atomically: terminates the old one and creates the
   * follow-up contract in a single transaction.
   */
  async renew(contractId: string, newEndDate?: string) {
    const contract = await prisma.laborContract.findUnique({
      where: { id: contractId },
    });
    if (!contract) return null;

    const defaultEnd = new Date();
    defaultEnd.setFullYear(defaultEnd.getFullYear() + 1);

    return prisma.$transaction(async (tx) => {
      await tx.laborContract.update({
        where: { id: contractId },
        data: { status: 'TERMINATED' },
      });
      return tx.laborContract.create({
        data: {
          code: `HT_R_${Date.now()}`,
          employeeId: contract.employeeId,
          templateId: contract.templateId,
          signDate: new Date(),
          startDate: new Date(),
          endDate: new Date(newEndDate || defaultEnd.toISOString()),
          status: 'DRAFT',
        },
      });
    });
  },
};