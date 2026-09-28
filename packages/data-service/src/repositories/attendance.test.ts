import { describe, it, expect } from 'vitest';
import {
  classifyDay,
  isWorkDay,
  aggregateAttendance,
  resolveDayType,
  isPaidDayType,
  computeOvertimeMinutes,
  dayKey,
  seedRandom,
  OVERTIME_RATES,
  STANDARD_WORK_HOURS,
  MAX_DAILY_OVERTIME_MINUTES,
} from './attendance';

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
    expect(aggregateAttendance([])).toEqual({
      workDays: 0,
      absentDays: 0,
      lateCount: 0,
      earlyLeaveCount: 0,
      holidayDays: 0,
      workOvertimeMinutes: 0,
      restOvertimeMinutes: 0,
      holidayOvertimeMinutes: 0,
    });
  });

  it('splits overtime by day type and never counts a holiday as absent', () => {
    const agg = aggregateAttendance([
      { status: 'NORMAL', dayType: 'WORKDAY', overtimeMinutes: 90 },
      { status: 'NORMAL', dayType: 'MAKEUP_WORKDAY', overtimeMinutes: 45 },
      { status: 'NORMAL', dayType: 'RESTDAY', overtimeMinutes: 300 },
      { status: 'NORMAL', dayType: 'HOLIDAY', overtimeMinutes: 240 },
      { status: 'ABSENT', dayType: 'HOLIDAY' }, // must not be charged as absence
    ]);
    expect(agg.workDays).toBe(2);
    expect(agg.absentDays).toBe(0);
    expect(agg.holidayDays).toBe(2);
    expect(agg.workOvertimeMinutes).toBe(135);
    expect(agg.restOvertimeMinutes).toBe(300);
    expect(agg.holidayOvertimeMinutes).toBe(240);
  });

  it('handles STANDARD_WORK_HOURS constant', () => {
    expect(STANDARD_WORK_HOURS).toBe(8);
  });
});

describe('attendance - statutory calendar (dayKey / resolveDayType)', () => {
  const CALENDAR_2026 = [
    // 元旦 1/1-1/3 放假, 1/4 (Sun) 上班
    { date: new Date('2026-01-01T00:00:00Z'), dayType: 'HOLIDAY' },
    { date: new Date('2026-01-04T00:00:00Z'), dayType: 'MAKEUP_WORKDAY' },
    // 国庆 10/1-10/7 放假, 9/20 (Sun) + 10/10 (Sat) 上班
    { date: new Date('2026-10-01T00:00:00Z'), dayType: 'HOLIDAY' },
    { date: new Date('2026-09-20T00:00:00Z'), dayType: 'MAKEUP_WORKDAY' },
    { date: new Date('2026-10-10T00:00:00Z'), dayType: 'MAKEUP_WORKDAY' },
  ];

  it('normalises any date-ish input to a YYYY-MM-DD key', () => {
    expect(dayKey(new Date('2026-10-01T00:00:00Z'))).toBe('2026-10-01');
    expect(dayKey('2026-10-01')).toBe('2026-10-01');
    expect(dayKey(new Date('2026-10-01T23:30:00Z'))).toBe('2026-10-01');
  });

  it('falls back to the weekly schedule without a calendar', () => {
    // 2026-07-01 Wed => WORKDAY, 2026-07-04 Sat => RESTDAY
    expect(resolveDayType(new Date('2026-07-01T00:00:00Z'))).toBe('WORKDAY');
    expect(resolveDayType(new Date('2026-07-04T00:00:00Z'))).toBe('RESTDAY');
  });

  it('calendar wins: a make-up Sunday is a workday, a statutory Thursday is a holiday', () => {
    const opts = { calendar: CALENDAR_2026 };
    // 2026-01-04 is a Sunday but a make-up workday
    expect(resolveDayType(new Date('2026-01-04T00:00:00Z'), opts)).toBe('MAKEUP_WORKDAY');
    // 2026-10-01 is a Thursday but a statutory holiday
    expect(resolveDayType(new Date('2026-10-01T00:00:00Z'), opts)).toBe('HOLIDAY');
    // 2026-09-20 Sunday and 2026-10-10 Saturday are make-up workdays
    expect(resolveDayType(new Date('2026-09-20T00:00:00Z'), opts)).toBe('MAKEUP_WORKDAY');
    expect(resolveDayType(new Date('2026-10-10T00:00:00Z'), opts)).toBe('MAKEUP_WORKDAY');
    // untouched days keep the weekly schedule
    expect(resolveDayType(new Date('2026-07-01T00:00:00Z'), opts)).toBe('WORKDAY');
    expect(resolveDayType(new Date('2026-07-04T00:00:00Z'), opts)).toBe('RESTDAY');
  });

  it('a make-up workday follows the company work-day set, not the calendar weekday', () => {
    const sat = new Date('2026-10-10T00:00:00Z');
    expect(resolveDayType(sat, { calendar: CALENDAR_2026 })).toBe('MAKEUP_WORKDAY');
    expect(resolveDayType(sat)).toBe('RESTDAY');
  });

  it('RESTDAY is the only unpaid day type', () => {
    expect(isPaidDayType('WORKDAY')).toBe(true);
    expect(isPaidDayType('MAKEUP_WORKDAY')).toBe(true);
    expect(isPaidDayType('HOLIDAY')).toBe(true);
    expect(isPaidDayType('RESTDAY')).toBe(false);
  });

  it('a holiday span is fully paid: statutory and make-up rest days alike', () => {
    // 国庆 10/1-10/7: 3 statutory days (3x OT) + 4 make-up rest days (2x OT)
    const span = ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05', '2026-10-06', '2026-10-07'];
    const cal = span.map((date) => ({ date, dayType: 'HOLIDAY' }));
    const types = span.map((d) => resolveDayType(new Date(`${d}T00:00:00Z`), { calendar: cal }));
    expect(types.every((t) => t === 'HOLIDAY')).toBe(true);
    expect(types.every((t) => isPaidDayType(t))).toBe(true);
  });
});

describe('attendance - statutory overtime rules', () => {
  it('uses the labour-law multipliers', () => {
    expect(OVERTIME_RATES.WORKDAY).toBe(1.5);
    expect(OVERTIME_RATES.MAKEUP_WORKDAY).toBe(1.5);
    expect(OVERTIME_RATES.RESTDAY).toBe(2);
    expect(OVERTIME_RATES.HOLIDAY).toBe(3);
  });

  it('on a workday only time after the scheduled end is overtime', () => {
    // 18:00 schedule end, punched out 19:30 => 90 minutes
    expect(
      computeOvertimeMinutes({
        punchIn: '2026-07-01T09:00:00Z',
        punchOut: '2026-07-01T19:30:00Z',
        scheduledEnd: '18:00',
        dayType: 'WORKDAY',
      }),
    ).toBe(90);
    // punched out before the schedule end => no overtime
    expect(
      computeOvertimeMinutes({
        punchIn: '2026-07-01T09:00:00Z',
        punchOut: '2026-07-01T17:30:00Z',
        scheduledEnd: '18:00',
        dayType: 'WORKDAY',
      }),
    ).toBe(0);
  });

  it('on a rest day or statutory holiday the whole span is overtime', () => {
    // 10:00-15:30 = 330 minutes on a rest day
    expect(
      computeOvertimeMinutes({
        punchIn: '2026-07-04T10:00:00Z',
        punchOut: '2026-07-04T15:30:00Z',
        scheduledEnd: '18:00',
        dayType: 'RESTDAY',
      }),
    ).toBe(330);
    // a holiday ignores the schedule end entirely
    expect(
      computeOvertimeMinutes({
        punchIn: '2026-10-01T09:30:00Z',
        punchOut: '2026-10-01T12:00:00Z',
        scheduledEnd: '18:00',
        dayType: 'HOLIDAY',
      }),
    ).toBe(150);
  });

  it('caps a workday at 3h/day (MAX_DAILY_OVERTIME_MINUTES) and a rest day at one shift', () => {
    expect(MAX_DAILY_OVERTIME_MINUTES).toBe(180);
    // NOTE: punches are compared as minutes-of-day (the schedule model is
    // "HH:MM"), so overnight shifts are out of scope for this classifier.
    expect(
      computeOvertimeMinutes({
        punchIn: '2026-07-01T09:00:00Z',
        punchOut: '2026-07-01T23:00:00Z', // 14h after the 09:00 in
        scheduledEnd: '18:00',
        dayType: 'WORKDAY',
      }),
    ).toBe(180);
    expect(
      computeOvertimeMinutes({
        punchIn: '2026-07-04T06:00:00Z',
        punchOut: '2026-07-04T23:00:00Z', // 17 hours
        scheduledEnd: '18:00',
        dayType: 'RESTDAY',
      }),
    ).toBe(480);
  });

  it('a make-up workday is paid like a normal workday', () => {
    expect(
      computeOvertimeMinutes({
        punchIn: '2026-10-10T09:00:00Z',
        punchOut: '2026-10-10T20:00:00Z',
        scheduledEnd: '18:00',
        dayType: 'MAKEUP_WORKDAY',
      }),
    ).toBe(120);
  });

  it('missing punches never produce overtime', () => {
    expect(computeOvertimeMinutes({ punchIn: null, punchOut: null, scheduledEnd: '18:00', dayType: 'WORKDAY' })).toBe(0);
    expect(computeOvertimeMinutes({ punchIn: '2026-07-01T09:00:00Z', punchOut: null, scheduledEnd: '18:00', dayType: 'RESTDAY' })).toBe(0);
    expect(computeOvertimeMinutes({ punchIn: null, punchOut: '2026-07-01T22:00:00Z', scheduledEnd: '18:00', dayType: 'HOLIDAY' })).toBe(0);
  });
});

describe('attendance - seedRandom', () => {
  it('is deterministic for the same seed', () => {
    expect(seedRandom('EMP|2026-07-03')).toBe(seedRandom('EMP|2026-07-03'));
  });

  it('stays inside [0, 1) and spreads values across the buckets', () => {
    let inRange = true;
    const buckets = [0, 0, 0, 0, 0]; // 5 equal buckets
    for (let i = 0; i < 500; i++) {
      const r = seedRandom(`emp-${i}|2026-07-01`);
      if (!(r >= 0 && r < 1)) inRange = false;
      buckets[Math.min(4, Math.floor(r * 5))] += 1;
    }
    expect(inRange).toBe(true);
    // mulberry32 output is well spread: every bucket should be populated
    for (const b of buckets) expect(b).toBeGreaterThan(0);
  });
});
