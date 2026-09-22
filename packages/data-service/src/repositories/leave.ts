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

export interface ApprovalDecision {
  decision: 'APPROVED' | 'REJECTED';
  operatorId?: string | null;
  comment?: string | null;
}

const leaveDetailInclude = {
  employee: { select: { id: true, name: true, code: true } },
} as const;

/** Inclusive day count between two dates (same day = 1). */
export function leaveDays(startDate: Date, endDate: Date): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const ms = Math.max(0, end.getTime() - start.getTime());
  return Math.floor(ms / 86400000) + 1;
}

export const leaveRepository = {
  async list(employeeId?: string | null) {
    return prisma.leaveRequest.findMany({
      where: employeeId ? { employeeId } : {},
      include: { employee: true },
      orderBy: { createdAt: 'desc' },
    });
  },

  async listWithDetails(employeeId?: string | null) {
    return prisma.leaveRequest.findMany({
      where: employeeId ? { employeeId } : {},
      include: leaveDetailInclude,
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

  /** Create a default balance on first request if none exists yet. */
  async ensureBalance(employeeId: string, totals: { annualTotal?: number; sickTotal?: number } = {}) {
    return prisma.leaveBalance.upsert({
      where: { employeeId },
      update: {},
      create: {
        employeeId,
        annualTotal: totals.annualTotal ?? 10,
        sickTotal: totals.sickTotal ?? 5,
      },
    });
  },

  async balanceWithEmployees() {
    return prisma.leaveBalance.findMany({
      include: { employee: { select: { id: true, name: true, code: true } } },
      orderBy: { employee: { name: 'asc' } },
    });
  },

  /**
   * Applies the approval decision to a leave request.
   * Approvals deduct the approved days from the employee's balance.
   * Idempotent: only acts when the request is still PENDING.
   */
  async applyApproval(id: string, decision: ApprovalDecision['decision']) {
    return prisma.$transaction(async (tx) => {
      const request = await tx.leaveRequest.findUnique({ where: { id } });

      if (!request) throw new Error(`Leave request not found: ${id}`);
      if (request.status !== 'PENDING') return request;

      if (decision === 'APPROVED') {
        const balance = await tx.leaveBalance.findUnique({ where: { employeeId: request.employeeId } });
        const days = leaveDays(request.startDate, request.endDate);

        if (balance) {
          const isAnnual = request.leaveType === 'ANNUAL';
          const used = isAnnual ? balance.annualUsed : balance.sickUsed;
          const total = isAnnual ? balance.annualTotal : balance.sickTotal;

          if (used + days > total) {
            throw new Error(
              `Insufficient ${request.leaveType} balance: ${total - used} day(s) left, ${days} requested`
            );
          }

          const data =
            request.leaveType === 'ANNUAL'
              ? { annualUsed: used + days }
              : request.leaveType === 'SICK'
                ? { sickUsed: used + days }
                : {};

          if (Object.keys(data).length > 0) {
            await tx.leaveBalance.update({ where: { id: balance.id }, data });
          }
        }
      }

      return tx.leaveRequest.update({
        where: { id },
        data: { status: decision },
      });
    });
  },

  /** Edit a still-pending request (dates / type / reason). */
  async updateRequest(
    id: string,
    data: { leaveType?: string; startDate?: Date | string; endDate?: Date | string; reason?: string | null }
  ) {
    return prisma.$transaction(async (tx) => {
      const request = await tx.leaveRequest.findUnique({ where: { id } });
      if (!request) throw new Error(`Leave request not found: ${id}`);
      if (request.status !== 'PENDING') throw new Error(`Only a PENDING request can be edited (current: ${request.status})`);

      const start = data.startDate ? new Date(data.startDate) : request.startDate;
      const end = data.endDate ? new Date(data.endDate) : request.endDate;
      if (start.getTime() > end.getTime()) throw new Error('startDate must be before endDate');

      return tx.leaveRequest.update({
        where: { id },
        data: {
          ...(data.leaveType ? { leaveType: data.leaveType } : {}),
          ...(data.startDate ? { startDate: start } : {}),
          ...(data.endDate ? { endDate: end } : {}),
          ...(data.reason !== undefined ? { reason: data.reason } : {}),
        },
      });
    });
  },

  /**
   * 销假 (return from leave). Only an APPROVED request can be returned.
   * `usedDays` is how many days were actually taken; unused days are
   * refunded to the annual/sick balance.
   */
  async returnFromLeave(id: string, usedDays: number, operatorId?: string | null) {
    return prisma.$transaction(async (tx) => {
      const request = await tx.leaveRequest.findUnique({ where: { id } });
      if (!request) throw new Error(`Leave request not found: ${id}`);
      if (request.status === 'RETURNED') throw new Error('Leave already returned');
      if (request.status !== 'APPROVED') throw new Error(`Only an APPROVED leave can be returned (current: ${request.status})`);

      const approvedDays = leaveDays(request.startDate, request.endDate);
      const used = Math.max(0, Math.min(Number(usedDays) || 0, approvedDays));
      const refund = approvedDays - used;

      if (refund > 0) {
        const balance = await tx.leaveBalance.findUnique({ where: { employeeId: request.employeeId } });
        if (balance) {
          const data =
            request.leaveType === 'ANNUAL'
              ? { annualUsed: Math.max(0, balance.annualUsed - refund) }
              : request.leaveType === 'SICK'
                ? { sickUsed: Math.max(0, balance.sickUsed - refund) }
                : {};
          if (Object.keys(data).length > 0) {
            await tx.leaveBalance.update({ where: { id: balance.id }, data });
          }
        }
      }

      const updated = await tx.leaveRequest.update({
        where: { id },
        data: { status: 'RETURNED' },
      });

      return { request: updated, approvedDays, used, refund, operatorId: operatorId ?? null };
    });
  },

  /** Admin sets leave limits (annual/sick totals). */
  async updateBalance(
    employeeId: string,
    totals: { annualTotal?: number; sickTotal?: number }
  ) {
    return prisma.leaveBalance.upsert({
      where: { employeeId },
      update: {
        ...(totals.annualTotal !== undefined ? { annualTotal: totals.annualTotal } : {}),
        ...(totals.sickTotal !== undefined ? { sickTotal: totals.sickTotal } : {}),
      },
      create: {
        employeeId,
        annualTotal: totals.annualTotal ?? 10,
        sickTotal: totals.sickTotal ?? 5,
      },
    });
  },

  /** Delete a still-pending request (self-service withdraw). */
  async deletePending(id: string) {
    return prisma.$transaction(async (tx) => {
      const request = await tx.leaveRequest.findUnique({ where: { id } });
      if (!request) throw new Error(`Leave request not found: ${id}`);
      if (request.status !== 'PENDING') {
        throw new Error(`Only a PENDING request can be deleted (current: ${request.status})`);
      }
      return tx.leaveRequest.delete({ where: { id } });
    });
  },
};