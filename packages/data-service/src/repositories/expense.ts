import { prisma } from '../index';

export const expenseRepository = {
  async create(data: { employeeId: string; amount: number; reason: string; departmentId?: string | null }) {
    return prisma.expense.create({
      data: {
        code: `EXP-${Date.now()}`,
        employeeId: data.employeeId,
        amount: data.amount,
        reason: data.reason,
        departmentId: data.departmentId ?? null,
        status: 'SUBMITTED',
      },
    });
  },

  async list(employeeId?: string | null) {
    return prisma.expense.findMany({
      where: employeeId ? { employeeId } : {},
      orderBy: { createdAt: 'desc' },
    });
  },

  async listWithDetails(employeeId?: string | null) {
    return prisma.expense.findMany({
      where: employeeId ? { employeeId } : {},
      include: {
        employee: { select: { name: true, code: true } },
        department: { select: { name: true } },
        approvedBy: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  async findById(id: string) {
    return prisma.expense.findUnique({ where: { id } });
  },

  async updateStatus(id: string, status: string, approvedById?: string) {
    return prisma.expense.update({
      where: { id },
      data: { status, ...(approvedById ? { approvedById } : {}) },
    });
  },

  async markPendingApproval(id: string) {
    return prisma.expense.update({
      where: { id },
      data: { status: 'PENDING_APPROVAL' },
    });
  },

  async approve(id: string, approvedById?: string) {
    return prisma.expense.update({
      where: { id },
      data: { status: 'APPROVED', ...(approvedById ? { approvedById } : {}) },
    });
  },

  async reject(id: string, approvedById?: string) {
    return prisma.expense.update({
      where: { id },
      data: { status: 'REJECTED', ...(approvedById ? { approvedById } : {}) },
    });
  },
};