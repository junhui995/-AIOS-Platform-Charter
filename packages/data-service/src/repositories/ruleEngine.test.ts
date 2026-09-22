import { describe, it, expect } from 'vitest';
import {
  parseCondition,
  evaluateCondition,
  compileCondition,
  renderTemplate,
  RuleEvalError,
} from './ruleEngine';

describe('ruleEngine DSL', () => {
  it('rejects malformed expressions with a readable error', () => {
    expect(parseCondition('@days <=')).toMatchObject({ ok: false });
    expect(parseCondition('@x == ')).toMatchObject({ ok: false });
    expect(parseCondition('nope(')).toMatchObject({ ok: false });
    expect(parseCondition('bogusFn(@x)')).toMatchObject({ ok: false });
    expect(parseCondition('@x behind 5')).toMatchObject({ ok: false });
  });

  it('accepts valid boolean expressions', () => {
    expect(parseCondition('@daysRemaining <= 60 && @daysRemaining > 0')).toMatchObject({ ok: true });
    expect(parseCondition("@status == 'ACTIVE' || @status == 'PROBATION'")).toMatchObject({ ok: true });
    expect(parseCondition('daysUntil(@endDate) <= 60 && @enabled == true')).toMatchObject({ ok: true });
    expect(parseCondition('!( @x == 1 )')).toMatchObject({ ok: true });
  });

  it('evaluates numeric and string comparisons', () => {
    const env = { daysRemaining: 45, status: 'ACTIVE' };
    expect(evaluateCondition('@daysRemaining <= 60 && @daysRemaining > 0', env)).toBe(true);
    expect(evaluateCondition('@status == "ACTIVE"', env)).toBe(true);
    expect(evaluateCondition('@status == \'ARCHIVED\'', env)).toBe(false);
    expect(evaluateCondition('@daysRemaining + 10 == 55', env)).toBe(true);
    expect(evaluateCondition('@daysRemaining % 2 == 1', env)).toBe(true);
  });

  it('supports date math via builtin functions', () => {
    const now = new Date('2026-09-22T00:00:00Z').getTime();
    const env = { endDate: new Date('2026-11-01T00:00:00Z') };
    expect(evaluateCondition('daysUntil(@endDate) <= 60', env, now)).toBe(true);
    expect(evaluateCondition('daysUntil(@endDate) == 40', env, now)).toBe(true);
    expect(evaluateCondition('@endDate > now()', env, now)).toBe(true);
  });

  it('handles missing fields as falsy/undefined without throwing when short-circuited', () => {
    const env = { status: 'PENDING' };
    expect(evaluateCondition('@missing == null', env)).toBe(true);
    expect(evaluateCondition('@missing == null && @status == "PENDING"', env)).toBe(true);
    expect(evaluateCondition('@missing != null', env)).toBe(false);
  });

  it('guards against prototype access through field paths', () => {
    const env = {};
    expect(() => evaluateCondition('@__proto__.polluted == 1', env)).not.toThrow();
    expect(evaluateCondition('@constructor == null', env)).toBe(true);
  });

  it('throws RuleEvalError for wrong types inside strict comparisons', () => {
    const env = { amount: 'abc' };
    expect(() => evaluateCondition('@amount > 5', env)).toThrow(RuleEvalError);
  });

  it('compiles to a reusable predicate', () => {
    const pred = compileCondition('@amount >= 500');
    expect(pred({ amount: 600 })).toBe(true);
    expect(pred({ amount: 100 })).toBe(false);
  });

  it('interpolates templates with field values', () => {
    const env = { employeeName: 'Alice', code: 'HT-001', daysRemaining: 12 };
    expect(renderTemplate('{{employeeName}}（{{code}}）剩余 {{daysRemaining}} 天', env)).toBe('Alice（HT-001）剩余 12 天');
    expect(renderTemplate('无引用字段保留 {{nope}}', env)).toBe('无引用字段保留 {{nope}}');
  });
});