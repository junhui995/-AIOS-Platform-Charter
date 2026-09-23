import { prisma } from '../index';
import { Prisma } from '@prisma/client';
import { parseCondition, compileCondition, renderTemplate } from './ruleEngine';
import { getRegistryEntity } from './registry';
import { leaveDays } from './leave';

export interface RuleActionInput {
  channel: string;
  template?: string;
  throttleSec?: number;
  enabled?: boolean;
}

export interface RuleInput {
  code: string;
  name: string;
  module?: string;
  level?: 'high' | 'medium' | 'low';
  enabled?: boolean;
  target: string;
  scopeFilter?: Record<string, unknown> | null;
  conditionExpr: string;
  schedule: { kind: 'interval' | 'dailyAt' | 'manual'; minutes?: number; at?: string };
  actions?: RuleActionInput[];
}

export interface RuleRunSummary {
  ruleId: string;
  code: string;
  ranAt: string;
  scanned: number;
  hit: number;
  raised: number;
  skipped: number;
  durationMs: number;
  status: string;
}

interface FetcherRow {
  id: string;
  [key: string]: unknown;
}

const DEFAULT_TEMPLATE = '{{ruleName}}: 命中 {{targetLabel}} 记录 ({{objectId}})';

function toJsonValue(v: Record<string, unknown> | null | undefined): Prisma.InputJsonValue | undefined {
  if (v == null) return undefined;
  return v as unknown as Prisma.InputJsonValue;
}

async function fetchTargetRows(rule: {
  target: string;
  scopeFilter?: unknown;
}): Promise<FetcherRow[]> {
  const { target, scopeFilter } = rule;
  const where = { ...((scopeFilter as Record<string, unknown> | null) ?? {}) };

  switch (target) {
    case 'laborContract': {
      const rows = await prisma.laborContract.findMany({
        where,
        include: { employee: { select: { name: true, code: true } } },
      });
      return rows.map((r) => ({
        id: r.id,
        employeeId: r.employeeId,
        code: r.code,
        employeeName: r.employee.name,
        employeeCode: r.employee.code,
        status: r.status,
        startDate: r.startDate,
        endDate: r.endDate,
        daysRemaining: Math.ceil((r.endDate.getTime() - Date.now()) / 86400000),
      }));
    }
    case 'employee': {
      const rows = await prisma.employee.findMany({ where });
      return rows.map((r) => {
        const probationEnd = new Date(r.hireDate);
        probationEnd.setMonth(probationEnd.getMonth() + 6);
        return {
          id: r.id,
          employeeId: r.id,
          name: r.name,
          code: r.code,
          status: r.status,
          hireDate: r.hireDate,
          probationEndDate: probationEnd,
          daysToProbationEnd: Math.floor((probationEnd.getTime() - Date.now()) / 86400000),
        };
      });
    }
    case 'leaveRequest': {
      const rows = await prisma.leaveRequest.findMany({
        where,
        include: { employee: { select: { name: true, code: true } } },
      });
      return rows.map((r) => ({
        id: r.id,
        employeeId: r.employeeId,
        employeeName: r.employee.name,
        employeeCode: r.employee.code,
        leaveType: r.leaveType,
        startDate: r.startDate,
        endDate: r.endDate,
        reason: r.reason,
        status: r.status,
        days: leaveDays(r.startDate, r.endDate),
      }));
    }
    case 'expense': {
      const rows = await prisma.expense.findMany({
        where,
        include: { employee: { select: { name: true, code: true } } },
      });
      return rows.map((r) => ({
        id: r.id,
        employeeId: r.employeeId,
        applicantName: r.employee.name,
        applicantCode: r.employee.code,
        amount: Number(r.amount),
        status: r.status,
        reason: r.reason,
        createdAt: r.createdAt,
      }));
    }
    case 'dailyAttendance': {
      const rows = await prisma.dailyAttendance.findMany({
        where,
        include: { employee: { select: { name: true, code: true } } },
      });
      return rows.map((r) => ({
        id: r.id,
        employeeId: r.employeeId,
        employeeName: r.employee.name,
        employeeCode: r.employee.code,
        date: r.date,
        status: r.status,
        exceptionMemo: r.exceptionMemo ?? '',
      }));
    }
    default:
      throw new Error(`Unsupported monitoring target: ${target}`);
  }
}

function validateRule(input: RuleInput): void {
  if (!input.code || !input.code.trim()) throw new Error('code is required');
  if (!input.name || !input.name.trim()) throw new Error('name is required');
  if (!input.target) throw new Error('target is required');
  const entity = getRegistryEntity(input.target);
  if (!entity) throw new Error(`Unknown monitor target: ${input.target}`);
  if (!input.conditionExpr || !input.conditionExpr.trim()) throw new Error('conditionExpr is required');
  const parsed = parseCondition(input.conditionExpr);
  if (!parsed.ok) throw new Error(`Invalid condition expression: ${parsed.error}`);
  if (!input.schedule || !['interval', 'dailyAt', 'manual'].includes(input.schedule.kind)) {
    throw new Error('Invalid schedule.kind; expected interval|dailyAt|manual');
  }
  if (input.schedule.kind === 'interval' && (!input.schedule.minutes || input.schedule.minutes < 1)) {
    throw new Error('schedule.minutes is required for interval kind');
  }
  if (input.schedule.kind === 'dailyAt' && !/^\d{2}:\d{2}$/.test(input.schedule.at ?? '')) {
    throw new Error('schedule.at must be HH:mm for dailyAt kind');
  }
}

function normalizeSchedule(input: { schedule: RuleInput['schedule'] }): RuleInput['schedule'] {
  return {
    kind: input.schedule.kind,
    ...(input.schedule.kind === 'interval' ? { minutes: input.schedule.minutes } : {}),
    ...(input.schedule.kind === 'dailyAt' ? { at: input.schedule.at } : {}),
  };
}

function isDue(schedule: RuleInput['schedule'], lastRunAt: Date | null, now: Date): boolean {
  if (schedule.kind === 'manual') return false;
  if (schedule.kind === 'interval') {
    const minutes = schedule.minutes ?? 60;
    if (!lastRunAt) return true;
    return now.getTime() - lastRunAt.getTime() >= minutes * 60000;
  }
  // dailyAt
  const at = schedule.at ?? '09:00';
  const [hh, mm] = at.split(':').map(Number);
  const todayAt = new Date(now);
  todayAt.setHours(hh, mm, 0, 0);
  if (now.getTime() < todayAt.getTime()) return false;
  if (!lastRunAt) return true;
  return lastRunAt.getTime() < todayAt.getTime();
}

export const monitorRepository = {
  listRules(enabledOnly = false) {
    return prisma.monitorRule.findMany({
      where: enabledOnly ? { enabled: true } : {},
      include: {
        actions: true,
        runs: { orderBy: { ranAt: 'desc' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  getRule(id: string) {
    return prisma.monitorRule.findUnique({ where: { id }, include: { actions: true } });
  },

  async createRule(input: RuleInput, operatorId?: string | null) {
    validateRule(input);
    const existing = await prisma.monitorRule.findUnique({ where: { code: input.code } });
    if (existing) throw new Error(`Monitor rule code already exists: ${input.code}`);
    return prisma.monitorRule.create({
      data: {
        code: input.code,
        name: input.name,
        module: input.module ?? 'hr',
        level: input.level ?? 'medium',
        enabled: input.enabled ?? true,
        target: input.target,
        ...(input.scopeFilter != null ? { scopeFilter: toJsonValue(input.scopeFilter) } : {}),
        conditionExpr: input.conditionExpr,
        schedule: normalizeSchedule(input) as unknown as Prisma.InputJsonValue,
        createdBy: operatorId ?? null,
        actions: {
          create: (input.actions ?? [{ channel: 'inapp', template: DEFAULT_TEMPLATE }]).map((a) => ({
            channel: a.channel,
            template: a.template ?? DEFAULT_TEMPLATE,
            throttleSec: a.throttleSec ?? 0,
            enabled: a.enabled ?? true,
          })),
        },
      },
      include: { actions: true },
    });
  },

  async updateRule(id: string, input: Partial<RuleInput> & { conditionExpr?: string }, operatorId?: string | null) {
    const rule = await prisma.monitorRule.findUnique({ where: { id } });
    if (!rule) throw new Error(`Monitor rule not found: ${id}`);

    if (input.conditionExpr !== undefined) {
      const parsed = parseCondition(input.conditionExpr);
      if (!parsed.ok) throw new Error(`Invalid condition expression: ${parsed.error}`);
    }
    if (input.target !== undefined) {
      const entity = getRegistryEntity(input.target);
      if (!entity) throw new Error(`Unknown monitor target: ${input.target}`);
    }

    const next = { ...rule, ...input, schedule: input.schedule ? normalizeSchedule({ schedule: input.schedule }) : (rule.schedule as RuleInput['schedule']) };

    await prisma.monitorRule.update({
      where: { id },
      data: {
        ...(input.name ? { name: input.name } : {}),
        ...(input.module ? { module: input.module } : {}),
        ...(input.level ? { level: input.level } : {}),
        ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
        ...(input.target ? { target: input.target } : {}),
        ...(input.scopeFilter === undefined ? {} : input.scopeFilter === null ? { scopeFilter: Prisma.JsonNull } : { scopeFilter: toJsonValue(input.scopeFilter) }),
        ...(input.conditionExpr !== undefined ? { conditionExpr: input.conditionExpr } : {}),
        ...(input.schedule ? { schedule: next.schedule as unknown as Prisma.InputJsonValue } : {}),
        version: { increment: 1 },
        updatedBy: operatorId ?? null,
      },
    });

    if (input.actions) {
      await prisma.monitorRuleAction.deleteMany({ where: { ruleId: id } });
      await prisma.monitorRuleAction.createMany({
        data: input.actions.map((a) => ({
          ruleId: id,
          channel: a.channel,
          template: a.template ?? DEFAULT_TEMPLATE,
          throttleSec: a.throttleSec ?? 0,
          enabled: a.enabled ?? true,
        })),
      });
    }

    return this.getRule(id);
  },

  deleteRule(id: string) {
    return prisma.monitorRule.delete({ where: { id } });
  },

  listRunLogs(ruleId: string, take = 20) {
    return prisma.ruleRunLog.findMany({ where: { ruleId }, orderBy: { ranAt: 'desc' }, take });
  },

  async runRule(id: string): Promise<RuleRunSummary> {
    const rule = await prisma.monitorRule.findUnique({
      where: { id },
      include: { actions: true },
    });
    if (!rule) throw new Error(`Monitor rule not found: ${id}`);
    const entity = getRegistryEntity(rule.target);
    if (!entity) throw new Error(`Unknown monitor target: ${rule.target}`);
    const started = Date.now();

    // safe guard: recent run within 10s for the same rule (prevents double-fire)
    if (rule.lastRunAt && Date.now() - rule.lastRunAt.getTime() < 10000) {
      const recent = await prisma.ruleRunLog.findFirst({
        where: { ruleId: id },
        orderBy: { ranAt: 'desc' },
      });
      if (recent && recent.status !== 'error') {
        return {
          ruleId: id,
          code: rule.code,
          ranAt: recent.ranAt.toISOString(),
          scanned: recent.scanned,
          hit: recent.hit,
          raised: recent.raised,
          skipped: recent.skipped,
          durationMs: recent.durationMs,
          status: 'cancelled',
        };
      }
    }

    const compiled = compileCondition(rule.conditionExpr);
    const rows = await fetchTargetRows(rule);
    let scanned = 0;
    let hit = 0;
    let raised = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const row of rows) {
      scanned += 1;
      let match = false;
      try {
        match = compiled(row);
      } catch (err) {
        errors.push(`row ${row.id}: ${err instanceof Error ? err.message : String(err)}`);
        continue;
      }
      if (!match) continue;
      hit += 1;

      const objectId = String(getRegistryEntity(rule.target)?.fields.some((field) => field.name === 'code') ? row.code ?? row.id : row.id) as string;
      const env = { ...row, ruleName: rule.name, targetLabel: entity.label, objectId };

      const existing = await prisma.alert.findFirst({
        where: { type: rule.code, relatedObjectId: objectId, status: { in: ['pending', 'processing'] } },
      });
      if (existing) {
        skipped += 1;
        continue;
      }

      try {
        const createdAlert = await prisma.alert.create({
          data: {
            type: rule.code,
            code: `ALERT-${Date.now()}-${raised}`,
            level: rule.level,
            title: `${rule.name}: ${entity.label} 命中`,
            description: renderTemplate(rule.actions[0]?.template ?? DEFAULT_TEMPLATE, env),
            triggerTime: new Date(),
            triggerRule: rule.code,
            relatedObjectId: objectId,
            status: 'pending',
            availableActions: [],
          },
        });
        raised += 1;
        for (const action of rule.actions) {
          await prisma.notificationLog.create({
            data: {
              ruleId: rule.id,
              channel: action.channel,
              alertId: createdAlert.id,
              target: objectId,
              employeeId: (row.employeeId as string | null | undefined) ?? null,
              title: createdAlert.title,
              body: createdAlert.description,
              ok: action.channel === 'inapp',
              error: action.channel === 'inapp' ? null : '外部渠道适配器待接入（Phase C）',
            },
          });
        }
      } catch (err) {
        errors.push(`alert row ${row.id}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    const durationMs = Date.now() - started;
    const runLog = await prisma.ruleRunLog.create({
      data: {
        ruleId: id,
        ranAt: new Date(),
        scanned,
        hit,
        raised,
        skipped,
        durationMs,
        status: 'ok',
        error: errors.length ? errors.join('; ') : null,
      },
    });
    await prisma.monitorRule.update({ where: { id }, data: { lastRunAt: new Date() } });

    return {
      ruleId: id,
      code: rule.code,
      ranAt: runLog.ranAt.toISOString(),
      scanned,
      hit,
      raised,
      skipped,
      durationMs,
      status: 'ok',
    };
  },

  /** Run all enabled rules that are due now; used by the scheduler tick. */
  async runDueRules(): Promise<RuleRunSummary[]> {
    const now = new Date();
    const rules = await prisma.monitorRule.findMany({ where: { enabled: true } });
    const summaries: RuleRunSummary[] = [];
    for (const rule of rules) {
      if (!isDue(rule.schedule as RuleInput['schedule'], rule.lastRunAt, now)) continue;
      try {
        summaries.push(await this.runRule(rule.id));
      } catch (err) {
        await prisma.ruleRunLog.create({
          data: {
            ruleId: rule.id,
            ranAt: new Date(),
            scanned: 0,
            hit: 0,
            raised: 0,
            skipped: 0,
            durationMs: 0,
            status: 'error',
            error: err instanceof Error ? err.message : String(err),
          },
        });
      }
    }
    return summaries;
  },

  /** Idempotently seed the built-in demo rules (mirrors alert.ts rules in the new engine). */
  async seedDefaultRules(operatorId?: string | null) {
    const defaults: RuleInput[] = [
      {
        code: 'RULE-CONTRACT-EXPIRY',
        name: '劳动合同即将到期',
        module: 'hr',
        level: 'medium',
        target: 'laborContract',
        scopeFilter: { status: 'ACTIVE' },
        conditionExpr: '@daysRemaining <= 60 && @daysRemaining > 0',
        schedule: { kind: 'dailyAt', at: '09:00' },
        actions: [{ channel: 'inapp', template: '{{employeeName}}（{{employeeCode}}）合同 {{code}} 剩余 {{daysRemaining}} 天到期，请及时办理续签。' }],
      },
      {
        code: 'RULE-PROBATION-EXPIRY',
        name: '试用期即将结束',
        module: 'hr',
        level: 'medium',
        target: 'employee',
        scopeFilter: { status: 'PROBATION' },
        conditionExpr: '@daysToProbationEnd <= 90 && @daysToProbationEnd > 0',
        schedule: { kind: 'dailyAt', at: '09:10' },
        actions: [{ channel: 'inapp', template: '{{name}}（{{code}}）试用期将于 {{probationEndDate}} 结束，剩余 {{daysToProbationEnd}} 天，请安排转正评估。' }],
      },
      {
        code: 'RULE-ATTENDANCE-ANOMALY',
        name: '近7天考勤异常',
        module: 'hr',
        level: 'high',
        target: 'dailyAttendance',
        scopeFilter: {
          status: { not: 'NORMAL' },
          date: { gte: new Date(Date.now() - 7 * 86400000) },
        },
        conditionExpr: "@status != 'NORMAL' && daysSince(@date) <= 7",
        schedule: { kind: 'dailyAt', at: '09:20' },
        actions: [{ channel: 'inapp', template: '{{employeeName}}（{{employeeCode}}）{{date}} 考勤 {{status}}，异常说明：{{exceptionMemo}}。' }],
      },
    ];

    const created: string[] = [];
    for (const input of defaults) {
      const existing = await prisma.monitorRule.findUnique({ where: { code: input.code } });
      if (existing) {
        created.push(`${input.code}:exists`);
        continue;
      }
      const parsed = parseCondition(input.conditionExpr);
      if (!parsed.ok) {
        throw new Error(`Seeded rule ${input.code} has invalid condition: ${parsed.error}`);
      }
      await prisma.monitorRule.create({
        data: {
          code: input.code,
          name: input.name,
          module: input.module ?? 'hr',
          level: input.level ?? 'medium',
          enabled: true,
          target: input.target,
          ...(input.scopeFilter != null ? { scopeFilter: toJsonValue(input.scopeFilter) } : {}),
          conditionExpr: input.conditionExpr,
          schedule: normalizeSchedule(input) as unknown as Prisma.InputJsonValue,
          createdBy: operatorId ?? null,
          actions: {
            create: (input.actions ?? []).map((a) => ({
              channel: a.channel,
              template: a.template ?? DEFAULT_TEMPLATE,
              throttleSec: a.throttleSec ?? 0,
              enabled: a.enabled ?? true,
            })),
          },
        },
      });
      created.push(`${input.code}:created`);
    }
    return created;
  },
};

export { fetchTargetRows };