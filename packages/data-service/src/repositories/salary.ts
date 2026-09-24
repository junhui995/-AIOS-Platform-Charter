import { prisma } from '../index';

// ---------------------------------------------------------------------------
// Arithmetic expression evaluator for salary formulas.
// Grammar (whitelisted on purpose): numbers, @field references, + - * / % ( ),
// unary minus. No assignment, no function calls, no names other than @field.
// Evaluation is a pure function: no IO, no prototype access, unknown field => error.
// ---------------------------------------------------------------------------

export interface SalaryEnv {
  [field: string]: number;
}

export type FormulaEvalResult = { ok: true; value: number } | { ok: false; error: string };

const TOKEN_RE = /\s*(\d+(?:\.\d+)?|@[A-Za-z_][A-Za-z0-9_]*|[A-Za-z_][A-Za-z0-9_]*|[+\-*/%()])/y;

export function evaluateSalaryExpression(expr: string, env: SalaryEnv): FormulaEvalResult {
  const src = expr.trim();
  if (!src) return { ok: false, error: '表达式为空' };

  const tokens: Array<{ type: 'num'; v: number } | { type: 'ref'; name: string } | { type: 'op'; op: string }> = [];
  let pos = 0;
  while (pos < src.length) {
    TOKEN_RE.lastIndex = pos;
    const m = TOKEN_RE.exec(src);
    if (!m || m[0].trim() === '') return { ok: false, error: `非法字符: "${src.slice(pos, pos + 8)}"` };
    const raw = m[1];
    pos = m.index + m[0].length;
    if (/^\d/.test(raw)) tokens.push({ type: 'num', v: Number(raw) });
    else if (raw.startsWith('@')) tokens.push({ type: 'ref', name: raw.slice(1) });
    else if (/[A-Za-z_]/.test(raw)) tokens.push({ type: 'ref', name: raw });
    else tokens.push({ type: 'op', op: raw });
  }

  let i = 0;
  const peek = () => tokens[i];
  const next = () => tokens[i++];
  const expect = (op: string) => {
    const t = next();
    if (!t || t.type !== 'op' || t.op !== op) return false;
    return true;
  };

  const parsePrimary = (): FormulaEvalResult => {
    const t = peek();
    if (!t) return { ok: false, error: '表达式不完整' };
    if (t.type === 'num') {
      next();
      return { ok: true, value: t.v };
    }
    if (t.type === 'ref') {
      next();
      const key = Object.prototype.hasOwnProperty.call(env, t.name);
      if (!key) return { ok: false, error: `未注册的字段: @${t.name}（允许: ${Object.keys(env).join(', ') || '无'}）` };
      const v = Number(env[t.name]);
      if (!Number.isFinite(v)) return { ok: false, error: `字段 @${t.name} 不是数值` };
      return { ok: true, value: v };
    }
    if (t.type === 'op' && t.op === '(') {
      next();
      const inner = parseAddSub();
      if (!inner.ok) return inner;
      if (!expect(')')) return { ok: false, error: '缺少右括号 )' };
      return inner;
    }
    return { ok: false, error: `意外的符号: "${(next() as { op?: string }).op ?? ''}"` };
  };

  const parseUnary = (): FormulaEvalResult => {
    const t = peek();
    if (t && t.type === 'op' && t.op === '-') {
      next();
      const inner = parseUnary();
      return inner.ok ? { ok: true, value: -inner.value } : inner;
    }
    return parsePrimary();
  };

  const parseMulDiv = (): FormulaEvalResult => {
    let acc = parseUnary();
    if (!acc.ok) return acc;
    for (;;) {
      const t = peek();
      if (t && t.type === 'op' && (t.op === '*' || t.op === '/' || t.op === '%')) {
        next();
        const rhs = parseUnary();
        if (!rhs.ok) return rhs;
        if (t.op === '/') {
          if (rhs.value === 0) return { ok: false, error: '除以零' };
          acc = { ok: true, value: acc.value / rhs.value };
        } else if (t.op === '%') {
          if (rhs.value === 0) return { ok: false, error: '取模零' };
          acc = { ok: true, value: acc.value % rhs.value };
        } else {
          acc = { ok: true, value: acc.value * rhs.value };
        }
      } else return acc;
    }
  };

  const parseAddSub = (): FormulaEvalResult => {
    let acc = parseMulDiv();
    if (!acc.ok) return acc;
    for (;;) {
      const t = peek();
      if (t && t.type === 'op' && (t.op === '+' || t.op === '-')) {
        next();
        const rhs = parseMulDiv();
        if (!rhs.ok) return rhs;
        acc = { ok: true, value: t.op === '+' ? acc.value + rhs.value : acc.value - rhs.value };
      } else return acc;
    }
  };

  const result = parseAddSub();
  if (!result.ok) return result;
  if (i < tokens.length) return { ok: false, error: '存在未解析的符号' };
  if (!Number.isFinite(result.value)) return { ok: false, error: '结果不是有限数值' };
  return result;
}

/** Registered fields allowed inside salary expressions. */
export const SALARY_EXPR_FIELDS = ['baseSalary', 'bonus', 'deductions', 'performanceScore'] as const;
export type SalaryExprField = (typeof SALARY_EXPR_FIELDS)[number];

export function sampleSalaryEnv(overrides: Partial<Record<SalaryExprField, number>> = {}): SalaryEnv {
  const base: SalaryEnv = { baseSalary: 10000, bonus: 0, deductions: 200, performanceScore: 1 };
  for (const k of Object.keys(overrides)) base[k] = overrides[k as SalaryExprField] as number;
  return base;
}

/** Validate a formula string against the registered field whitelist + sample env. */
export function validateSalaryFormula(expr: string): FormulaEvalResult {
  return evaluateSalaryExpression(expr, sampleSalaryEnv());
}

/** Pure net-pay compute used by both single create and mass pay-run. */
export function computeNetPay(input: {
  baseSalary: number | string;
  bonus?: number | string;
  deductions?: number | string;
}): number {
  const base = Number(input.baseSalary);
  const bonus = Number(input.bonus ?? 0);
  const deductions = Number(input.deductions ?? 0);
  if (!Number.isFinite(base) || !Number.isFinite(bonus) || !Number.isFinite(deductions)) throw new Error('薪资字段必须是有限数值');
  return Math.round((base + bonus - deductions) * 100) / 100;
}

export function slipEditable(status: string): boolean {
  return status === 'DRAFT';
}

export function slipIssueable(status: string): boolean {
  return status === 'DRAFT';
}

// ---------------------------------------------------------------------------
// Repositories
// ---------------------------------------------------------------------------

export const salaryRepository = {
  async listSlips(opts: { employeeId?: string; month?: string; status?: string } = {}) {
    return prisma.salarySlip.findMany({
      where: {
        ...(opts.employeeId ? { employeeId: opts.employeeId } : {}),
        ...(opts.month ? { month: opts.month } : {}),
        ...(opts.status ? { status: opts.status } : {}),
      },
      include: {
        employee: {
          include: {
            role: { select: { id: true, name: true } },
            positions: { include: { position: { include: { department: true } } } },
          },
        },
      },
      orderBy: [{ month: 'desc' }, { employee: { code: 'asc' } }],
    });
  },

  async getSlip(id: string) {
    return prisma.salarySlip.findUnique({
      where: { id },
      include: {
        employee: {
          include: {
            role: { select: { id: true, name: true } },
            positions: { include: { position: { include: { department: true } } } },
          },
        },
      },
    });
  },

  async upsertSlip(data: {
    employeeId: string;
    month: string;
    baseSalary: number | string;
    bonus?: number | string;
    deductions?: number | string;
    status?: string;
  }) {
    const baseSalary = Number(data.baseSalary);
    const bonus = Number(data.bonus ?? 0);
    const deductions = Number(data.deductions ?? 0);
    const netPay = computeNetPay({ baseSalary, bonus, deductions });
    return prisma.salarySlip.upsert({
      where: { employeeId_month: { employeeId: data.employeeId, month: data.month } },
      update: {
        baseSalary,
        bonus,
        deductions,
        netPay,
        status: data.status ?? 'DRAFT',
      },
      create: {
        employeeId: data.employeeId,
        month: data.month,
        baseSalary,
        bonus,
        deductions,
        netPay,
        status: data.status ?? 'DRAFT',
      },
      include: { employee: true },
    });
  },

  /** Update only DRAFT slips; recompute net. */
  async updateSlip(
    id: string,
    data: { baseSalary?: number | string; bonus?: number | string; deductions?: number | string },
  ) {
    const existing = await prisma.salarySlip.findUnique({ where: { id } });
    if (!existing) return null;
    if (!slipEditable(existing.status)) throw new Error(`已发布的工资单不可修改 (${existing.status})`);
    const baseSalary = data.baseSalary !== undefined ? Number(data.baseSalary) : Number(existing.baseSalary);
    const bonus = data.bonus !== undefined ? Number(data.bonus) : Number(existing.bonus);
    const deductions = data.deductions !== undefined ? Number(data.deductions) : Number(existing.deductions);
    const netPay = computeNetPay({ baseSalary, bonus, deductions });
    return prisma.salarySlip.update({
      where: { id },
      data: { baseSalary, bonus, deductions, netPay },
      include: { employee: true },
    });
  },

  async issueSlip(id: string) {
    const existing = await prisma.salarySlip.findUnique({ where: { id } });
    if (!existing) return null;
    if (!slipIssueable(existing.status)) throw new Error(`工资单已是 ${existing.status}，不可重复发布`);
    return prisma.salarySlip.update({ where: { id }, data: { status: 'ISSUED', issuedAt: new Date() } });
  },

  async deleteSlip(id: string) {
    const existing = await prisma.salarySlip.findUnique({ where: { id } });
    if (!existing) return false;
    if (!slipEditable(existing.status)) throw new Error(`已发布的工资单不可删除 (${existing.status})`);
    await prisma.salarySlip.delete({ where: { id } });
    return true;
  },

  /**
   * Mass pay-run (idempotent): for every ACTIVE/PROBATION employee with a primary
   * position, create a DRAFT slip for the month using position.baseSalaryRef as
   * the base. Slips that already exist for (employeeId, month) are skipped.
   */
  async payRun(month: string) {
    const employees = await prisma.employee.findMany({
      where: { status: { in: ['ACTIVE', 'PROBATION'] } },
      include: { positions: { where: { isPrimary: true }, include: { position: true } } },
    });
    let created = 0;
    let skipped = 0;
    for (const emp of employees) {
      const baseSalary = Number(emp.positions[0]?.position.baseSalaryRef ?? 0);
      const existing = await prisma.salarySlip.findUnique({
        where: { employeeId_month: { employeeId: emp.id, month } },
      });
      if (existing) {
        skipped += 1;
        continue;
      }
      await salaryRepository.upsertSlip({ employeeId: emp.id, month, baseSalary });
      created += 1;
    }
    return { month, created, skipped, employees: employees.length };
  },

  async listFormulas() {
    return prisma.salaryFormula.findMany({ orderBy: { createdAt: 'asc' } });
  },

  async createFormula(data: { targetType: string; targetId?: string | null; expression: string; description?: string | null }) {
    const check = validateSalaryFormula(data.expression);
    if (!check.ok) throw new Error(`表达式校验失败: ${check.error}`);
    if (!['COMPANY', 'DEPARTMENT', 'POSITION', 'EMPLOYEE'].includes(data.targetType)) {
      throw new Error('targetType 必须是 COMPANY/DEPARTMENT/POSITION/EMPLOYEE');
    }
    return prisma.salaryFormula.create({
      data: {
        targetType: data.targetType,
        targetId: data.targetId ?? null,
        expression: data.expression,
        description: data.description ?? null,
      },
    });
  },

  async updateFormula(id: string, data: { targetType?: string; targetId?: string | null; expression?: string; description?: string | null }) {
    if (data.expression !== undefined) {
      const check = validateSalaryFormula(data.expression);
      if (!check.ok) throw new Error(`表达式校验失败: ${check.error}`);
    }
    return prisma.salaryFormula.update({
      where: { id },
      data: {
        ...(data.targetType !== undefined ? { targetType: data.targetType } : {}),
        ...(data.targetId !== undefined ? { targetId: data.targetId } : {}),
        ...(data.expression !== undefined ? { expression: data.expression } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
      },
    });
  },

  async deleteFormula(id: string) {
    await prisma.salaryFormula.delete({ where: { id } });
    return true;
  },
};

// ---------------------------------------------------------------------------
// Benefits
// ---------------------------------------------------------------------------

export const BENEFIT_CATEGORIES = ['INSURANCE', 'ALLOWANCE', 'WELFARE'] as const;

export const benefitRepository = {
  async listItems() {
    return prisma.benefitItem.findMany({
      include: { _count: { select: { enrollments: true } } },
      orderBy: { createdAt: 'asc' },
    });
  },

  async getItem(id: string) {
    return prisma.benefitItem.findUnique({
      where: { id },
      include: { _count: { select: { enrollments: true } } },
    });
  },

  async createItem(data: { code: string; name: string; category: string; periodCost?: number | string; description?: string | null }) {
    if (!BENEFIT_CATEGORIES.includes(data.category as (typeof BENEFIT_CATEGORIES)[number])) {
      throw new Error(`category 必须是 ${BENEFIT_CATEGORIES.join('/')}`);
    }
    return prisma.benefitItem.create({
      data: {
        code: data.code.trim(),
        name: data.name.trim(),
        category: data.category,
        periodCost: Number(data.periodCost ?? 0),
        description: data.description ?? null,
      },
    });
  },

  async updateItem(id: string, data: { name?: string; category?: string; periodCost?: number | string; description?: string | null }) {
    if (data.category !== undefined && !BENEFIT_CATEGORIES.includes(data.category as (typeof BENEFIT_CATEGORIES)[number])) {
      throw new Error(`category 必须是 ${BENEFIT_CATEGORIES.join('/')}`);
    }
    return prisma.benefitItem.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name.trim() } : {}),
        ...(data.category !== undefined ? { category: data.category } : {}),
        ...(data.periodCost !== undefined ? { periodCost: Number(data.periodCost) } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
      },
    });
  },

  async deleteItem(id: string) {
    const count = await prisma.employeeBenefit.count({ where: { itemId: id, status: { in: ['ACTIVE', 'OPTED_OUT'] } } });
    if (count > 0) throw new Error(`仍有 ${count} 条有效登记，请先解除该福利`);
    await prisma.benefitItem.delete({ where: { id } });
    return true;
  },

  async listEnrollments(opts: { employeeId?: string; status?: string } = {}) {
    return prisma.employeeBenefit.findMany({
      where: {
        ...(opts.employeeId ? { employeeId: opts.employeeId } : {}),
        ...(opts.status ? { status: opts.status } : {}),
      },
      include: {
        employee: { include: { role: { select: { id: true, name: true } } } },
        item: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  async enroll(data: { employeeId: string; itemId: string; startMonth?: string | null }) {
    return prisma.employeeBenefit.upsert({
      where: { employeeId_itemId: { employeeId: data.employeeId, itemId: data.itemId } },
      update: { status: 'ACTIVE', startMonth: data.startMonth ?? null, endMonth: null },
      create: {
        employeeId: data.employeeId,
        itemId: data.itemId,
        status: 'ACTIVE',
        startMonth: data.startMonth ?? null,
      },
      include: { employee: true, item: true },
    });
  },

  async optOut(id: string) {
    const existing = await prisma.employeeBenefit.findUnique({ where: { id } });
    if (!existing) return null;
    return prisma.employeeBenefit.update({
      where: { id },
      data: { status: 'OPTED_OUT', endMonth: new Date().toISOString().slice(0, 7) },
      include: { item: true },
    });
  },

  async seedBenefits() {
    const items: Array<{ code: string; name: string; category: string; periodCost: number; description: string }> = [
      { code: 'MEDICAL', name: '补充医疗保险', category: 'INSURANCE', periodCost: 300, description: '团队补充医疗，覆盖门诊与住院自付部分。' },
      { code: 'HOUSING_FUND', name: '公积金', category: 'WELFARE', periodCost: 800, description: '公积金单位缴存部分。' },
      { code: 'TRANSPORT', name: '交通补贴', category: 'ALLOWANCE', periodCost: 200, description: '通勤交通补贴。' },
    ];
    const names: string[] = [];
    for (const it of items) {
      await prisma.benefitItem.upsert({
        where: { code: it.code },
        update: { name: it.name, category: it.category, periodCost: it.periodCost, description: it.description },
        create: it,
      });
      names.push(it.code);
    }

    // Demo enrollments: every ACTIVE/PROBATION employee gets all items.
    const allItems = await prisma.benefitItem.findMany();
    const employees = await prisma.employee.findMany({
      where: { status: { in: ['ACTIVE', 'PROBATION'] } },
      select: { id: true },
    });
    let enrolled = 0;
    for (const emp of employees) {
      for (const item of allItems) {
        const exists = await prisma.employeeBenefit.findUnique({
          where: { employeeId_itemId: { employeeId: emp.id, itemId: item.id } },
        });
        if (!exists) {
          await prisma.employeeBenefit.create({
            data: { employeeId: emp.id, itemId: item.id, status: 'ACTIVE' },
          });
          enrolled += 1;
        }
      }
    }
    return { items: names, enrolled };
  },
};