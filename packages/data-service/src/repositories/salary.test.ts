import { describe, it, expect } from 'vitest';
import {
  evaluateSalaryExpression,
  validateSalaryFormula,
  computeNetPay,
  slipEditable,
  slipIssueable,
  dailyRateOf,
  attendanceAdjustFor,
} from './salary';

describe('salary - arithmetic expression evaluator', () => {
  const env = { baseSalary: 12000, bonus: 1320, deductions: 1200, performanceScore: 1.1 };

  it('evaluates plain arithmetic with precedence and parens', () => {
    expect(evaluateSalaryExpression('baseSalary + 20 * 3', env)).toEqual({ ok: true, value: 12060 });
    expect(evaluateSalaryExpression('(baseSalary + bonus - deductions) * 0.1', env)).toEqual({ ok: true, value: 1212 });
    expect(evaluateSalaryExpression('100 % 30', env)).toEqual({ ok: true, value: 10 });
  });

  it('@field references read from the whitelisted env', () => {
    expect(evaluateSalaryExpression('@baseSalary * @performanceScore - @deductions', env)).toEqual({
      ok: true,
      value: 12000 * 1.1 - 1200,
    });
  });

  it('rejects unknown fields instead of returning NaN', () => {
    const r = evaluateSalaryExpression('@salary / 12', env);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain('salary');
  });

  it('rejects malformed input', () => {
    for (const bad of ['', 'foo + 1', '1 +', '(1 + 2', '1 ++ 2', '1 / 0', '1 % 0', '=DROP TABLE', 'A * B - C']) {
      const r = evaluateSalaryExpression(bad, env);
      expect(r.ok).toBe(false);
    }
  });

  it('handles unary minus and decimals', () => {
    expect(evaluateSalaryExpression('-@baseSalary + 5.5', env)).toEqual({ ok: true, value: -11994.5 });
  });

  it('sample env is used for formula validation', () => {
    expect(validateSalaryFormula('@baseSalary - @deductions').ok).toBe(true);
    expect(validateSalaryFormula('@nonexistent').ok).toBe(false);
    expect(validateSalaryFormula('baseSalary / 0').ok).toBe(false);
  });
});

describe('salary - net pay compute & state machine', () => {
  it('computes net = base + bonus - deductions', () => {
    expect(computeNetPay({ baseSalary: 12000, bonus: 1320, deductions: 1200 })).toBe(12000 + 1320 - 1200);
    expect(computeNetPay({ baseSalary: '25000', deductions: 2500 })).toBe(22500);
  });

  it('includes attendanceAdjust in net (default 0 for legacy)', () => {
    expect(computeNetPay({ baseSalary: 12000, attendanceAdjust: -1379.31 })).toBe(12000 - 1379.31);
    expect(computeNetPay({ baseSalary: 12000 })).toBe(12000);
  });

  it('throws on non-finite inputs', () => {
    expect(() => computeNetPay({ baseSalary: 'abc' })).toThrow();
    expect(() => computeNetPay({ baseSalary: NaN })).toThrow();
    expect(() => computeNetPay({ baseSalary: 1, attendanceAdjust: Number.NaN })).toThrow();
  });

  it('daily rate uses statutory 21.75', () => {
    expect(dailyRateOf(21750)).toBe(1000);
    expect(dailyRateOf(12000)).toBe(551.72);
  });

  it('attendance adjust is -(absentDays * dailyRate)', () => {
    expect(attendanceAdjustFor(2, 551.72)).toBe(-1103.44);
    expect(attendanceAdjustFor(0, 551.72)).toBe(0);
  });

  it('only DRAFT slips are editable/issuable', () => {
    expect(slipEditable('DRAFT')).toBe(true);
    expect(slipEditable('ISSUED')).toBe(false);
    expect(slipIssueable('DRAFT')).toBe(true);
    expect(slipIssueable('ISSUED')).toBe(false);
  });
});

describe('salary - attendance linkage in formulas', () => {
  it('evaluates attendance fields registered in the whitelist', () => {
    const r = evaluateSalaryExpression('@baseSalary - @absentDays * @dailyRate', {
      baseSalary: 12000,
      absentDays: 3,
      dailyRate: 551.72,
    });
    expect(r).toEqual({ ok: true, value: 12000 - 3 * 551.72 });
  });

  it('rejects attendance fields not registered', () => {
    const r = evaluateSalaryExpression('@overtimeHours * 20', { baseSalary: 1 });
    expect(r.ok).toBe(false);
  });

  it('validates a linkage formula through the sample env', () => {
    expect(validateSalaryFormula('@baseSalary - @absentDays * @dailyRate + @lateCount * 10').ok).toBe(true);
    expect(validateSalaryFormula('@absentDays').ok).toBe(true);
  });
});