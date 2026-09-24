import { describe, it, expect } from 'vitest';
import { classifyDay, isWorkDay, aggregateAttendance, STANDARD_WORK_HOURS } from './attendance';

describe('attendance - classifyDay status machine', () => {
  it('reports ABSENT when both punches are missing', () => {
    const r = classifyDay({ workTimeStart: '09:00', workTimeEnd: '18:00', punchIn: null, punchOut: null });
    expect(r.status).toBe('ABSENT');
    expect(r.memo).toContain('无打卡');
  });

  it('reports MISSED_PUNCH when only one punch exists', () => {
    expect(classifyDay({ workTimeStart: '09:00', workTimeEnd: '18:00', punchIn: '2026-07-01T09:00:00Z', punchOut: null }).status).toBe('MISSED_PUNCH');
    expect(classifyDay({ workTimeStart: '09:00', workTimeEnd: '18:00', punchIn: null, punchOut: '2026-07-01T18:05:00Z' }).status).toBe('MISSED_PUNCH');
  });

  it('reports LATE when punch-in is past tolerance', () => {
    const r = classifyDay({ workTimeStart: '09:00', workTimeEnd: '18:00', lateTolerance: 10, punchIn: '2026-07-01T09:25:00Z', punchOut: '2026-07-01T18:05:00Z' });
    expect(r.status).toBe('LATE');
    expect(r.memo).toContain('迟到');
  });

  it('LATE within tolerance counts as NORMAL', () => {
    const r = classifyDay({ workTimeStart: '09:00', workTimeEnd: '18:00', lateTolerance: 10, punchIn: '2026-07-01T09:05:00Z', punchOut: '2026-07-01T18:10:00Z' });
    expect(r.status).toBe('NORMAL');
  });

  it('reports EARLY_LEAVE when punch-out is before schedule end', () => {
    const r = classifyDay({ workTimeStart: '09:00', workTimeEnd: '18:00', punchIn: '2026-07-01T09:00:00Z', punchOut: '2026-07-01T17:30:00Z' });
    expect(r.status).toBe('EARLY_LEAVE');
    expect(r.memo).toContain('早退');
  });

  it('a clean pair within tolerance is NORMAL', () => {
    const r = classifyDay({ workTimeStart: '09:00', workTimeEnd: '18:00', lateTolerance: 5, punchIn: '2026-07-01T09:00:00Z', punchOut: '2026-07-01T18:30:00Z' });
    expect(r.status).toBe('NORMAL');
  });

  it('no schedule => NORMAL when punches exist (record only)', () => {
    const r = classifyDay({ workTimeStart: null, workTimeEnd: null, punchIn: '2026-07-01T09:00:00Z', punchOut: '2026-07-01T18:00:00Z' });
    expect(r.status).toBe('NORMAL');
  });
});

describe('attendance - isWorkDay', () => {
  it('treats Mon-Fri as workdays and Sat-Sun as rest (default)', () => {
    // 2026-07-01 = Wednesday (workday), 2026-07-04 = Saturday (rest), 2026-07-05 = Sunday (rest)
    expect(isWorkDay(new Date('2026-07-01T00:00:00Z'))).toBe(true);
    expect(isWorkDay(new Date('2026-07-04T00:00:00Z'))).toBe(false);
    expect(isWorkDay(new Date('2026-07-05T00:00:00Z'))).toBe(false);
  });

  it('supports custom work day sets (e.g., 6-day week)', () => {
    expect(isWorkDay(new Date('2026-07-04T00:00:00Z'), [1, 2, 3, 4, 5, 6])).toBe(true);
  });
});

describe('attendance - aggregateAttendance', () => {
  it('aggregates statuses into monthly counters', () => {
    const agg = aggregateAttendance([
      { status: 'NORMAL' },
      { status: 'LATE' },
      { status: 'EARLY_LEAVE' },
      { status: 'MISSED_PUNCH' },
      { status: 'ABSENT' },
      { status: 'ABSENT' },
    ]);
    expect(agg.workDays).toBe(4);
    expect(agg.absentDays).toBe(2);
    expect(agg.lateCount).toBe(1);
    expect(agg.earlyLeaveCount).toBe(1);
  });

  it('returns all-zero for empty input', () => {
    expect(aggregateAttendance([])).toEqual({ workDays: 0, absentDays: 0, lateCount: 0, earlyLeaveCount: 0 });
  });

  it('handles STANDARD_WORK_HOURS constant', () => {
    expect(STANDARD_WORK_HOURS).toBe(8);
  });
});