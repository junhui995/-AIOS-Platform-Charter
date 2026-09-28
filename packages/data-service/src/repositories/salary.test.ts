import { describe, it, expect } from 'vitest';
import {
  evaluateSalaryExpression,
  validateSalaryFormula,
  computeNetPay,
  slipEditable,
  slipIssueable,
  dailyRateOf,
  hourlyRateOf,
  attendanceAdjustFor,
  overtimePayFor,
  overtimeHoursOf,
  SALARY_EXPR_FIELDS,
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
    const r = evaluateSalaryExpression('@holidayOvertimeMinutes * 20', { baseSalary: 1 });
    expect(r.ok).toBe(false);
  });

  it('validates a linkage formula through the sample env', () => {
    expect(validateSalaryFormula('@baseSalary - @absentDays * @dailyRate + @lateCount * 10').ok).toBe(true);
    expect(validateSalaryFormula('@absentDays').ok).toBe(true);
  });

  it('registers the overtime fields in the whitelist', () => {
    expect(SALARY_EXPR_FIELDS).toContain('overtimeHours');
    expect(SALARY_EXPR_FIELDS).toContain('hourlyRate');
    expect(SALARY_EXPR_FIELDS).toHaveLength(11);
    const r = evaluateSalaryExpression('@overtimeHours * @hourlyRate * 1.5', { overtimeHours: 10, hourlyRate: 60 });
    expect(r).toEqual({ ok: true, value: 900 });
  });
});

describe('salary - statutory overtime pay', () => {
  it('hourly rate = base / 21.75 / 8 (4 decimals, payroll convention)', () => {
    expect(hourlyRateOf(21750)).toBe(125);
    expect(hourlyRateOf(12000)).toBe(68.9655);
  });

  it('applies 1.5x / 2x / 3x by day type', () => {
    // 60 min each at 60/h => (1*1.5 + 1*2 + 1*3) * 60
    expect(
      overtimePayFor({ workOvertimeMinutes: 60, restOvertimeMinutes: 60, holidayOvertimeMinutes: 60, hourlyRate: 60 }),
    ).toBe(390);
    expect(
      overtimePayFor({ workOvertimeMinutes: 120, restOvertimeMinutes: 0, holidayOvertimeMinutes: 0, hourlyRate: 100 }),
    ).toBe(300); // 2h * 1.5 * 100
    expect(
      overtimePayFor({ workOvertimeMinutes: 0, restOvertimeMinutes: 240, holidayOvertimeMinutes: 0, hourlyRate: 50 }),
    ).toBe(400); // 4h * 2 * 50
    expect(
      overtimePayFor({ workOvertimeMinutes: 0, restOvertimeMinutes: 0, holidayOvertimeMinutes: 180, hourlyRate: 80 }),
    ).toBe(720); // 3h * 3 * 80
  });

  it('caps workday overtime at 36h/month but pays rest/holiday in full', () => {
    // 3000 min (50h) workday OT caps to 36h => 36*1.5*100
    expect(
      overtimePayFor({ workOvertimeMinutes: 3000, restOvertimeMinutes: 0, holidayOvertimeMinutes: 0, hourlyRate: 100 }),
    ).toBe(5400);
    // rest day / holiday overtime is not capped: 8h*2*100 + 8h*3*100
    expect(
      overtimePayFor({ workOvertimeMinutes: 0, restOvertimeMinutes: 480, holidayOvertimeMinutes: 480, hourlyRate: 100 }),
    ).toBe(4000);
  });

  it('is zero without overtime and ignores negative inputs', () => {
    expect(overtimePayFor({ workOvertimeMinutes: 0, restOvertimeMinutes: 0, holidayOvertimeMinutes: 0, hourlyRate: 100 })).toBe(0);
    expect(overtimePayFor({ workOvertimeMinutes: -50, restOvertimeMinutes: 0, holidayOvertimeMinutes: 0, hourlyRate: 100 })).toBe(0);
  });

  it('total overtime hours snapshot', () => {
    expect(overtimeHoursOf({ workOvertimeMinutes: 90, restOvertimeMinutes: 300, holidayOvertimeMinutes: 150 })).toBe(9);
    expect(overtimeHoursOf({ workOvertimeMinutes: 0, restOvertimeMinutes: 0, holidayOvertimeMinutes: 0 })).toBe(0);
  });

  it('net pay includes overtime pay', () => {
    expect(
      computeNetPay({ baseSalary: 12000, bonus: 500, deductions: 200, attendanceAdjust: -551.72, overtimePay: 900 }),
    ).toBe(12648.28);
  });

  it('net pay is unchanged when overtime is absent (backwards compatible)', () => {
    expect(computeNetPay({ baseSalary: 10000, bonus: 500, deductions: 100 })).toBe(10400);
  });
});
