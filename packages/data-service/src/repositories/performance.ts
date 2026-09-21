import { prisma } from '../index';

export const performanceRepository = {
  async listTemplates() {
    return prisma.performanceTemplate.findMany({
      include: { _count: { select: { reviews: true } } },
      orderBy: { createdAt: 'desc' },
    });
  },

  async createTemplate(data: { name: string; targetType?: string; metrics?: object }) {
    return prisma.performanceTemplate.create({
      data: {
        name: data.name,
        targetType: data.targetType || 'EMPLOYEE',
        metrics: (data.metrics ?? {}) as object,
      },
    });
  },

  async listReviews(employeeId?: string | null, period?: string | null) {
    const where: Record<string, unknown> = {};
    if (employeeId) where.employeeId = employeeId;
    if (period) where.period = period;
    return prisma.performanceReview.findMany({
      where,
      include: { employee: true, template: true },
      orderBy: { createdAt: 'desc' },
    });
  },

  async createReview(data: {
    employeeId: string;
    templateId: string;
    period: string;
    score?: number | null;
    grade?: string | null;
    status?: string;
  }) {
    return prisma.performanceReview.create({
      data: {
        employeeId: data.employeeId,
        templateId: data.templateId,
        period: data.period,
        score: data.score ?? null,
        grade: data.grade ?? null,
        status: data.status ?? 'DRAFT',
      },
    });
  },
};