import { prisma } from '../index';

export interface AlertFilters {
  type?: string;
  level?: string;
  status?: string;
}

export interface AlertInput {
  type: string;
  level: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  triggerRule: string;
  relatedObjectId: string;
  availableActions?: string[];
}

/**
 * Alerting engine, phase 1.
 *
 * The rule engine is read-only against the domain tables and writes
 * idempotent alerts (skips when an open alert of the same type already
 * exists for the same related object). Rules are deliberately small and
 * auditable so they can later be moved to the runtime layer.
 */
export const alertRepository = {
  async list(filters: AlertFilters = {}) {
    return prisma.alert.findMany({
      where: {
        ...(filters.type ? { type: filters.type } : {}),
        ...(filters.level ? { level: filters.level } : {}),
        ...(filters.status ? { status: filters.status } : {}),
      },
      orderBy: [{ triggerTime: 'desc' }],
      take: 200,
    });
  },

  async findOpen(type: string, relatedObjectId: string) {
    return prisma.alert.findFirst({
      where: { type, relatedObjectId, status: { in: ['pending', 'processing'] } },
    });
  },

  async record(input: AlertInput) {
    const existing = await this.findOpen(input.type, input.relatedObjectId);
    if (existing) return null;

    return prisma.alert.create({
      data: {
        code: `WARN-${input.type.toUpperCase().slice(0, 4)}-${Date.now()}`,
        type: input.type,
        level: input.level,
        title: input.title,
        description: input.description,
        triggerTime: new Date(),
        triggerRule: input.triggerRule,
        relatedObjectId: input.relatedObjectId,
        status: 'pending',
        availableActions: input.availableActions ?? ['markResolved'],
      },
    });
  },

  async resolve(id: string, note?: string) {
    const current = await prisma.alert.findUnique({ where: { id } });
    if (!current) throw new Error(`Alert not found: ${id}`);

    return prisma.alert.update({
      where: { id },
      data: {
        status: 'resolved',
        description: note ? `${current.description}\n[Resolved] ${note}` : `${current.description}\n[Resolved]`,
      },
    });
  },

  async counts() {
    const all = await prisma.alert.groupBy({ by: ['level'], _count: { _all: true } });
    const total = await prisma.alert.count();
    const open = await prisma.alert.count({ where: { status: { in: ['pending', 'processing'] } } });
    return { total, open, byLevel: Object.fromEntries(all.map((r) => [r.level, r._count._all])) };
  },

/** Run every registered rule once. Returns per-rule scan detail. */
  async runRules() {
    let raised = 0;
    let skipped = 0;
    const rules: { rule: string; scanned: number; hit: number; raised: number; skipped: number }[] = [];
    const now = new Date();

    // --- Rule 1: Labor contract expiry (contractExpiry) ---
    {
      const rule = 'contractExpiry';
      let scanned = 0, hit = 0, raisedR = 0, skippedR = 0;
      const expiringContracts = await prisma.laborContract.findMany({
        where: { status: 'ACTIVE' },
        include: { employee: { select: { name: true } } },
      });
      for (const contract of expiringContracts) {
        scanned += 1;
        const days = Math.ceil((contract.endDate.getTime() - now.getTime()) / 86400000);
        if (days <= 0 || days > 60) continue;
        hit += 1;
        const fresh = await this.record({
          type: rule,
          level: days <= 30 ? 'high' : 'medium',
          title: `${contract.employee.name || '员工'} 合同 ${days} 天内到期`,
          description: `${contract.code} 于 ${contract.endDate.toISOString().slice(0, 10)} 到期，剩余 ${days} 天`,
          triggerRule: `${rule}|active|<=60d`,
          relatedObjectId: contract.id,
          availableActions: ['applyRenewal', 'markResolved'],
        });
        if (fresh) { raisedR += 1; } else { skippedR += 1; }
      }
      raised += raisedR;
      skipped += skippedR;
      rules.push({ rule, scanned, hit, raised: raisedR, skipped: skippedR });
    }

    // --- Rule 2: Probation expiry (probationExpiry, 6-month default stint) ---
    {
      const rule = 'probationExpiry';
      let scanned = 0, hit = 0, raisedR = 0, skippedR = 0;
      const probationEmployees = await prisma.employee.findMany({
        where: { status: 'PROBATION' },
        select: { id: true, name: true, hireDate: true },
      });
      for (const emp of probationEmployees) {
        scanned += 1;
        const probationEnd = new Date(emp.hireDate);
        probationEnd.setMonth(probationEnd.getMonth() + 6);
        const days = Math.ceil((probationEnd.getTime() - now.getTime()) / 86400000);
        if (days <= 0 || days > 90) continue;
        hit += 1;
        const fresh = await this.record({
          type: rule,
          level: days <= 30 ? 'high' : 'medium',
          title: `${emp.name} 试用期 ${days} 天内结束`,
          description: `试用期评估截止 ${probationEnd.toISOString().slice(0, 10)}，剩余 ${days} 天`,
          triggerRule: `${rule}|PROBATION|<=90d`,
          relatedObjectId: emp.id,
          availableActions: ['runReview', 'markResolved'],
        });
        if (fresh) { raisedR += 1; } else { skippedR += 1; }
      }
      raised += raisedR;
      skipped += skippedR;
      rules.push({ rule, scanned, hit, raised: raisedR, skipped: skippedR });
    }

    // --- Rule 3: Attendance anomalies in the last 7 days (attendanceAnomaly) ---
    {
      const rule = 'attendanceAnomaly';
      let scanned = 0, hit = 0, raisedR = 0, skippedR = 0;
      const since = new Date(now);
      since.setDate(since.getDate() - 7);
      const anomalies = await prisma.dailyAttendance.findMany({
        where: { status: { not: 'NORMAL' }, date: { gte: since } },
        include: { employee: { select: { name: true } } },
      });
      for (const row of anomalies) {
        scanned += 1;
        hit += 1;
        const fresh = await this.record({
          type: rule,
          level: row.status === 'ABSENT' ? 'high' : 'medium',
          title: `${row.employee?.name || '员工'} 考勤异常: ${row.status}`,
          description: `${row.date.toISOString().slice(0, 10)} ${row.exceptionMemo || row.status}`,
          triggerRule: `${rule}|7d|nonNormal`,
          relatedObjectId: row.id,
          availableActions: ['requestAmendment', 'markResolved'],
        });
        if (fresh) { raisedR += 1; } else { skippedR += 1; }
      }
      raised += raisedR;
      skipped += skippedR;
      rules.push({ rule, scanned, hit, raised: raisedR, skipped: skippedR });
    }

    return { raised, skipped, ranAt: now.toISOString(), rules };
  },
};