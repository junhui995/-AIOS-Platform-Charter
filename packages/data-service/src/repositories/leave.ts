import { prisma } from '../index';

export interface CreateLeaveRequestInput {
  employeeId: string;
  leaveType: string;
  startDate: Date | string;
  endDate: Date | string;
  reason?: string | null;
  aiAnalysis?: string | null;
  status?: string;
}

export const leaveRepository = {
  async list(employeeId?: string | null) {
    return prisma.leaveRequest.findMany({
      where: employeeId ? { employeeId } : {},
      include: { employee: true },
      orderBy: { createdAt: 'desc' },
    });
  },

  async create(input: CreateLeaveRequestInput) {
    return prisma.leaveRequest.create({
      data: {
        employeeId: input.employeeId,
        leaveType: input.leaveType,
        startDate: new Date(input.startDate),
        endDate: new Date(input.endDate),
        reason: input.reason ?? null,
        aiAnalysis: input.aiAnalysis ?? null,
        status: input.status ?? 'PENDING',
      },
    });
  },

  async updateStatus(id: string, status: string) {
    return prisma.leaveRequest.update({ where: { id }, data: { status } });
  },

  async getBalance(employeeId: string) {
    return prisma.leaveBalance.findUnique({ where: { employeeId } });
  },
};