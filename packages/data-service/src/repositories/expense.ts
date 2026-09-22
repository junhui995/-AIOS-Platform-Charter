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

  /** Create an expense that enters the approval flow immediately. */
  async createPending(data: {
    employeeId: string;
    amount: number;
    reason: string;
    category?: string | null;
    occurredOn?: Date | null;
    departmentId?: string | null;
  }) {
    return prisma.expense.create({
      data: {
        code: `EXP-${Date.now()}`,
        employeeId: data.employeeId,
        amount: data.amount,
        reason: data.reason,
        category: data.category ?? null,
        occurredOn: data.occurredOn ?? null,
        departmentId: data.departmentId ?? null,
        status: 'PENDING_APPROVAL',
      },
    });
  },

  /** Employee self-service: withdraw before an admin decides. */
  async deletePending(id: string) {
    return prisma.$transaction(async (tx) => {
      const expense = await tx.expense.findUnique({ where: { id } });
      if (!expense) throw new Error(`Expense not found: ${id}`);
      if (!['SUBMITTED', 'PENDING_APPROVAL'].includes(expense.status)) {
        throw new Error(`Only a pending expense can be deleted (current: ${expense.status})`);
      }
      return tx.expense.delete({ where: { id } });
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