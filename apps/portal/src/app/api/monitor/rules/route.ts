import { NextResponse } from 'next/server';
import { monitorRepository, prisma } from '@aios/data-service';
import { requirePermission, handleRouteError } from '@/lib/auth/guard';

export async function GET() {
  try {
    await requirePermission('MONITOR', 'READ');
    const rules = await monitorRepository.listRules();
    const total = await prisma.monitorRule.count();
    const enabled = await prisma.monitorRule.count({ where: { enabled: true } });
    const lastRunAt = (
      await prisma.ruleRunLog.findFirst({ orderBy: { ranAt: 'desc' } })
    )?.ranAt ?? null;
    const openAlerts = await prisma.alert.groupBy({
      by: ['triggerRule'],
      _count: { _all: true },
      where: { triggerRule: { in: rules.map((r) => r.code) }, status: { in: ['pending', 'processing'] } },
    });
    return NextResponse.json({
      rules,
      summary: {
        total,
        enabled,
        lastRunAt,
        openAlerts: Object.fromEntries(openAlerts.map((a) => [a.triggerRule, a._count._all])),
      },
    });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function POST(req: Request) {
  try {
    await requirePermission('MONITOR', 'WRITE');
    const body = await req.json();
    const { operatorId, ...rule } = body;
    const created = await monitorRepository.createRule(rule, operatorId ?? null);
    return NextResponse.json({ rule: created }, { status: 201 });
  } catch (err) {
    return handleRouteError(err);
  }
}