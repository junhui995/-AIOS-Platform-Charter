import { prisma } from '../index';

export const ATTENDANCE_STATUS = ['NORMAL', 'LATE', 'EARLY_LEAVE', 'ABSENT', 'MISSED_PUNCH'] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUS)[number];

/** Day type after applying the statutory holiday / make-up workday calendar. */
export const DAY_TYPES = ['WORKDAY', 'RESTDAY', 'HOLIDAY', 'MAKEUP_WORKDAY'] as const;
export type DayType = (typeof DAY_TYPES)[number];

/** Statutory overtime multipliers (中华人民共和国劳动法第四十四条). */
export const OVERTIME_RATES: Record<DayType, number> = {
  WORKDAY: 1.5, // 工作日延长工作时间
  MAKEUP_WORKDAY: 1.5, // 调休上班日按工作日
  RESTDAY: 2, // 休息日加班
  HOLIDAY: 3, // 法定节假日加班
};

/** 劳动法：延长工作时间每日不超过 3 小时。 */
export const MAX_DAILY_OVERTIME_MINUTES = 180;
/** 劳动法：延长工作时间每月不超过 36 小时（仅约束工作日延时部分）。 */
export const MAX_MONTHLY_OVERTIME_MINUTES = 2160;

export const STANDARD_WORK_HOURS = 8;

/** Minutes-since-midnight for a punch/schedule value: "HH:MM" or ISO timestamp. */
function toMinutes(d: Date | string | null | undefined): number | null {
  if (!d) return null;
  if (typeof d === 'string') {
    const m = /^(\d{1,2}):(\d{2})$/.exec(d.trim());
    if (m) return Number(m[1]) * 60 + Number(m[2]);
  }
  const t = new Date(d);
  if (Number.isNaN(t.getTime())) return null;
  return t.getUTCHours() * 60 + t.getUTCMinutes();
}

/**
 * Pure day-status classifier (no IO): given scheduled start/end, punches and
 * late tolerance minutes, decide the day status for a single employee record.
 * Priority: ABSENT (no punches) > MISSED_PUNCH (single punch / impossible pair)
 * > LATE / EARLY_LEAVE (tolerance-aware) > NORMAL.
 */
export function classifyDay(params: {
  workTimeStart?: string | null; // "09:00"
  workTimeEnd?: string | null; // "18:00"
  lateTolerance?: number | null; // minutes
  punchIn?: Date | string | null;
  punchOut?: Date | string | null;
}): { status: AttendanceStatus; memo: string } {
  const inMin = toMinutes(params.punchIn);
  const outMin = toMinutes(params.punchOut);
  const lateTol = params.lateTolerance ?? 0;

  if (inMin === null && outMin === null) {
    return { status: 'ABSENT', memo: '全天无打卡记录' };
  }
  if (inMin === null || outMin === null) {
    return { status: 'MISSED_PUNCH', memo: inMin === null ? '缺少上班卡' : '缺少下班卡' };
  }

  const start = toMinutes(params.workTimeStart);
  const end = toMinutes(params.workTimeEnd);
  if (start === null || end === null) {
    return { status: 'NORMAL', memo: '无排班，仅记录打卡' };
  }

  const lateBy = inMin - (start + lateTol);
  const earlyBy = (end - lateTol) - outMin;
  if (lateBy > 0) {
    return { status: 'LATE', memo: `迟到 ${lateBy} 分钟` };
  }
  if (earlyBy > 0) {
    return { status: 'EARLY_LEAVE', memo: `早退 ${earlyBy} 分钟` };
  }
  return { status: 'NORMAL', memo: '正常出勤' };
}

/** Working-day check: Mon-Fri by default; returns true if a day is a workday. */
export function isWorkDay(date: Date, workDays: number[] = [1, 2, 3, 4, 5]): boolean {
  const dow = date.getDay(); // 0=Sun
  return workDays.includes(dow);
}

/** A calendar entry for one date (HolidayCalendar row, date-only shape). */
export interface CalendarEntry {
  date: Date | string;
  dayType: string; // HOLIDAY | MAKEUP_WORKDAY
  isStatutory?: boolean;
  name?: string | null;
}

/** UTC date-only key (YYYY-MM-DD) used to look a day up in the calendar. */
export function dayKey(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(`${date.slice(0, 10)}T00:00:00Z`) : new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  return d.toISOString().slice(0, 10);
}

/**
 * Resolve a day's type: the statutory calendar wins over the weekly schedule
 * (a make-up Saturday is a workday; a statutory Wednesday is a paid holiday).
 */
export function resolveDayType(
  date: Date,
  opts: { workDays?: number[]; calendar?: CalendarEntry[] } = {},
): DayType {
  const key = dayKey(date);
  const entry = (opts.calendar ?? []).find((c) => dayKey(c.date) === key);
  if (entry) {
    if (entry.dayType === 'MAKEUP_WORKDAY') return 'MAKEUP_WORKDAY';
    if (entry.dayType === 'HOLIDAY') return 'HOLIDAY';
  }
  return isWorkDay(date, opts.workDays ?? [1, 2, 3, 4, 5]) ? 'WORKDAY' : 'RESTDAY';
}

/** Paid day types: workdays, make-up workdays and statutory holidays. */
export function isPaidDayType(dayType: DayType): boolean {
  return dayType !== 'RESTDAY';
}

/**
 * Overtime minutes for one day (pure):
 * - workday / make-up workday: only time after the scheduled end counts
 *   (capped at 3h/day by labour law);
 * - rest day / statutory holiday: the whole punch span counts
 *   (capped at 8h, i.e. one full shift).
 */
export function computeOvertimeMinutes(params: {
  punchIn?: Date | string | null;
  punchOut?: Date | string | null;
  scheduledEnd?: Date | string | null;
  dayType: DayType;
}): number {
  const inMin = toMinutes(params.punchIn);
  const outMin = toMinutes(params.punchOut);
  if (inMin === null || outMin === null) return 0;
  const isFullDayPenalty = params.dayType === 'RESTDAY' || params.dayType === 'HOLIDAY';
  const base = isFullDayPenalty ? 0 : toMinutes(params.scheduledEnd) ?? 0;
  const minutes = outMin - Math.max(inMin, base);
  if (minutes <= 0) return 0;
  const cap = isFullDayPenalty ? STANDARD_WORK_HOURS * 60 : MAX_DAILY_OVERTIME_MINUTES;
  return Math.min(Math.round(minutes), cap);
}

/** Pure monthly attendance aggregation for the linkage/pay-run. */
export function aggregateAttendance(
  records: Array<{ status: string; dayType?: string; overtimeMinutes?: number }>,
): {
  workDays: number;
  absentDays: number;
  lateCount: number;
  earlyLeaveCount: number;
  holidayDays: number;
  workOvertimeMinutes: number;
  restOvertimeMinutes: number;
  holidayOvertimeMinutes: number;
} {
  let workDays = 0;
  let absentDays = 0;
  let lateCount = 0;
  let earlyLeaveCount = 0;
  let holidayDays = 0;
  let workOvertimeMinutes = 0;
  let restOvertimeMinutes = 0;
  let holidayOvertimeMinutes = 0;

  for (const r of records) {
    const dayType = (r.dayType ?? 'WORKDAY') as DayType;
    const ot = Math.max(0, Math.round(r.overtimeMinutes ?? 0));
    if (dayType === 'HOLIDAY') {
      holidayDays += 1;
      holidayOvertimeMinutes += ot;
      continue;
    }
    if (dayType === 'RESTDAY') {
      restOvertimeMinutes += ot;
      continue; // a rest day without punches is not recorded at all
    }
    // WORKDAY / MAKEUP_WORKDAY
    if (dayType === 'WORKDAY' || dayType === 'MAKEUP_WORKDAY') workOvertimeMinutes += ot;
    if (r.status === 'ABSENT') absentDays += 1;
    else if (r.status === 'LATE') { workDays += 1; lateCount += 1; }
    else if (r.status === 'EARLY_LEAVE') { workDays += 1; earlyLeaveCount += 1; }
    else if (r.status === 'NORMAL') workDays += 1;
    // MISSED_PUNCH counts as a workday (paid but flagged)
    else workDays += 1;
  }
  return { workDays, absentDays, lateCount, earlyLeaveCount, holidayDays, workOvertimeMinutes, restOvertimeMinutes, holidayOvertimeMinutes };
}

/** 32-bit string hash + mulberry32 PRNG so seeded demo data is stable & well-spread. */
export function seedRandom(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 2654435761);
  h = (h ^ (h >>> 13)) | 0;
  let t = (h >>> 0) + 0x6d2b79f5;
  t |= 0;
  t = (t + 0x6d2b79f5) | 0;
  let v = Math.imul(t ^ (t >>> 15), 1 | t);
  v = (v + Math.imul(v ^ (v >>> 7), 61 | v)) ^ v;
  return ((v ^ (v >>> 14)) >>> 0) / 4294967296;
}

export const attendanceRepository = {
  // ---- statutory calendar ----
  async listCalendar(opts: { from?: string; to?: string; year?: string } = {}) {
    const gte = opts.from ? new Date(`${opts.from}T00:00:00Z`) : opts.year ? new Date(`${opts.year}-01-01T00:00:00Z`) : undefined;
    const lte = opts.to
      ? new Date(`${opts.to}T23:59:59Z`)
      : opts.year
        ? new Date(`${opts.year}-12-31T23:59:59Z`)
        : undefined;
    return prisma.holidayCalendar.findMany({
      where: { ...(gte ? { date: { gte } } : {}), ...(lte ? { date: { lte } } : {}) },
      orderBy: { date: 'asc' },
    });
  },

  /** Calendar entries whose date falls inside [from, to] (YYYY-MM-DD, inclusive). */
  async calendarBetween(from: string, to: string) {
    const gte = new Date(`${from}T00:00:00Z`);
    const lte = new Date(`${to}T23:59:59Z`);
    if (Number.isNaN(gte.getTime()) || Number.isNaN(lte.getTime())) throw new Error(`日期区间格式错误: ${from} ~ ${to}`);
    return prisma.holidayCalendar.findMany({
      where: { date: { gte, lte } },
      orderBy: { date: 'asc' },
    });
  },

  /** Upsert by date (the natural key): holidays and make-up workdays. */
  async upsertCalendarEntry(data: { date: string; name: string; dayType: string; isStatutory?: boolean; note?: string | null }) {
    const day = new Date(`${data.date.slice(0, 10)}T00:00:00Z`);
    if (Number.isNaN(day.getTime())) throw new Error(`日期格式错误: ${data.date}`);
    if (!['HOLIDAY', 'MAKEUP_WORKDAY'].includes(data.dayType)) {
      throw new Error('dayType 必须是 HOLIDAY 或 MAKEUP_WORKDAY');
    }
    if (!data.name.trim()) throw new Error('name 不能为空');
    const name = data.name.trim();
    const dayType = data.dayType;
    const isStatutory = data.isStatutory ?? (dayType === 'HOLIDAY');
    return prisma.holidayCalendar.upsert({
      where: { date: day },
      update: { name, dayType, isStatutory, note: data.note ?? null },
      create: { date: day, name, dayType, isStatutory, note: data.note ?? null },
    });
  },

  async deleteCalendarEntry(date: string) {
    const day = new Date(`${date.slice(0, 10)}T00:00:00Z`);
    if (Number.isNaN(day.getTime())) throw new Error(`日期格式错误: ${date}`);
    const existing = await prisma.holidayCalendar.findUnique({ where: { date: day } });
    if (!existing) return false;
    await prisma.holidayCalendar.delete({ where: { date: day } });
    return true;
  },

  /**
   * Idempotent statutory calendar seed. 2026 data is transcribed from
   * 国务院办公厅《关于2026年部分节假日安排的通知》(国办发明电〔2025〕7号).
   * `isStatutory` marks the legally-paid statutory days; the remaining days of
   * each 调休 span are rest days assembled from weekends.
   */
  async seedCalendar(year: number) {
    const plan: Array<{ from: string; to: string; name: string; statutory: string[] }> = [
      { from: '01-01', to: '01-03', name: '元旦', statutory: ['01-01'] },
      { from: '02-15', to: '02-23', name: '春节', statutory: ['02-16', '02-17', '02-18', '02-19'] },
      { from: '04-04', to: '04-06', name: '清明节', statutory: ['04-05'] },
      { from: '05-01', to: '05-05', name: '劳动节', statutory: ['05-01', '05-02'] },
      { from: '06-19', to: '06-21', name: '端午节', statutory: ['06-19'] },
      { from: '09-25', to: '09-27', name: '中秋节', statutory: ['09-25'] },
      { from: '10-01', to: '10-07', name: '国庆节', statutory: ['10-01', '10-02', '10-03'] },
    ];
    const makeups: Array<{ date: string; name: string }> = [
      { date: '01-04', name: '元旦调休上班' },
      { date: '02-14', name: '春节调休上班' },
      { date: '02-28', name: '春节调休上班' },
      { date: '05-09', name: '劳动节调休上班' },
      { date: '09-20', name: '国庆节调休上班' },
      { date: '10-10', name: '国庆节调休上班' },
    ];

    let holidays = 0;
    let workdays = 0;
    for (const span of plan) {
      const [fm, fd] = span.from.split('-');
      const [tm, td] = span.to.split('-');
      const start = new Date(Date.UTC(year, Number(fm) - 1, Number(fd)));
      const end = new Date(Date.UTC(year, Number(tm) - 1, Number(td)));
      for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
        const key = d.toISOString().slice(0, 10);
        const statutory = span.statutory.includes(key.slice(5));
        await prisma.holidayCalendar.upsert({
          where: { date: d },
          update: { name: span.name, dayType: 'HOLIDAY', isStatutory: statutory },
          create: { date: d, name: span.name, dayType: 'HOLIDAY', isStatutory: statutory, note: statutory ? '法定节假日' : '调休放假' },
        });
        holidays += 1;
      }
    }
    for (const m of makeups) {
      const d = new Date(`${year}-${m.date}T00:00:00Z`);
      await prisma.holidayCalendar.upsert({
        where: { date: d },
        update: { name: m.name, dayType: 'MAKEUP_WORKDAY', isStatutory: false },
        create: { date: d, name: m.name, dayType: 'MAKEUP_WORKDAY', isStatutory: false, note: '调休上班' },
      });
      workdays += 1;
    }
    return { year, holidays, workdays };
  },

  // ---- schedules ----
  async listSchedules() {
    return prisma.schedulePlan.findMany({ orderBy: { createdAt: 'asc' } });
  },

  async createSchedule(data: { name: string; workTimeStart: string; workTimeEnd: string; lateTolerance?: number; workDays?: number[] }) {
    return prisma.schedulePlan.create({
      data: {
        name: data.name.trim(),
        workTimeStart: data.workTimeStart,
        workTimeEnd: data.workTimeEnd,
        lateTolerance: data.lateTolerance ?? 0,
        workDays: data.workDays ?? [1, 2, 3, 4, 5],
      },
    });
  },

  async updateSchedule(id: string, data: Partial<{ name: string; workTimeStart: string; workTimeEnd: string; lateTolerance: number; workDays: number[] }>) {
    return prisma.schedulePlan.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name.trim() } : {}),
        ...(data.workTimeStart !== undefined ? { workTimeStart: data.workTimeStart } : {}),
        ...(data.workTimeEnd !== undefined ? { workTimeEnd: data.workTimeEnd } : {}),
        ...(data.lateTolerance !== undefined ? { lateTolerance: data.lateTolerance } : {}),
        ...(data.workDays !== undefined ? { workDays: data.workDays } : {}),
      },
    });
  },

  async deleteSchedule(id: string) {
    const used = await prisma.dailyAttendance.count({ where: { scheduleId: id } });
    if (used > 0) throw new Error(`该排班已被 ${used} 条考勤记录引用，不可删除`);
    await prisma.schedulePlan.delete({ where: { id } });
    return true;
  },

  async upsertSchedule(data: { name: string; workTimeStart: string; workTimeEnd: string; lateTolerance?: number; workDays?: number[] }) {
    return prisma.schedulePlan.upsert({
      where: { name: data.name.trim() },
      update: {
        workTimeStart: data.workTimeStart,
        workTimeEnd: data.workTimeEnd,
        lateTolerance: data.lateTolerance ?? 0,
        workDays: data.workDays ?? [1, 2, 3, 4, 5],
      },
      create: {
        name: data.name.trim(),
        workTimeStart: data.workTimeStart,
        workTimeEnd: data.workTimeEnd,
        lateTolerance: data.lateTolerance ?? 0,
        workDays: data.workDays ?? [1, 2, 3, 4, 5],
      },
    });
  },

  // ---- daily records ----
  async listDaily(opts: { from?: string; to?: string; month?: string; employeeId?: string; status?: string } = {}) {
    const gte = opts.from ? new Date(`${opts.from}T00:00:00Z`) : opts.month ? new Date(`${opts.month}-01T00:00:00Z`) : undefined;
    const lte = opts.to
      ? new Date(`${opts.to}T23:59:59Z`)
      : opts.month
        ? new Date(`${opts.month}-31T23:59:59Z`)
        : undefined;
    return prisma.dailyAttendance.findMany({
      where: {
        ...(opts.employeeId ? { employeeId: opts.employeeId } : {}),
        ...(opts.status ? { status: opts.status } : {}),
        ...(gte ? { date: { gte } } : {}),
        ...(lte ? { date: { lte } } : {}),
      },
      include: {
        employee: {
          select: { id: true, code: true, name: true },
        },
        schedule: { select: { id: true, name: true } },
      },
      orderBy: [{ date: 'asc' }, { employee: { code: 'asc' } }],
    });
  },

  async listPunches(opts: { from?: string; to?: string; employeeId?: string } = {}) {
    return prisma.punchRecord.findMany({
      where: {
        ...(opts.employeeId ? { employeeId: opts.employeeId } : {}),
        ...(opts.from ? { punchTime: { gte: new Date(`${opts.from}T00:00:00Z`) } } : {}),
        ...(opts.to ? { punchTime: { lte: new Date(`${opts.to}T23:59:59Z`) } } : {}),
      },
      include: { employee: { select: { id: true, code: true, name: true } } },
      orderBy: [{ punchTime: 'desc' }],
    });
  },

  /**
   * Day analyzer / exception engine (idempotent): for a given date, derive the
   * DailyAttendance status of every ACTIVE/PROBATION employee from PunchRecord
   * data, using the default schedule and the statutory calendar.
   * Calendar rules: a statutory holiday is a paid day (never ABSENT); a rest
   * day only produces a record when somebody actually punched (overtime).
   * Existing records for the date are refreshed (upsert), so reruns are safe.
   */
  async analyzeDay(targetDate: string) {
    const day = new Date(`${targetDate}T00:00:00Z`);
    if (Number.isNaN(day.getTime())) throw new Error(`日期格式错误: ${targetDate}`);

    const from = new Date(day.getTime());
    const to = new Date(day.getTime());
    to.setHours(23, 59, 59, 999);

    const schedules = await prisma.schedulePlan.findMany({ orderBy: { createdAt: 'asc' } });
    const schedule = schedules[0] ?? null;

    const calendar = await attendanceRepository.calendarBetween(targetDate, targetDate);
    const holidayName = calendar[0]?.name ?? null;
    const dayType = resolveDayType(day, { workDays: schedule?.workDays ?? [1, 2, 3, 4, 5], calendar });
    const paid = isPaidDayType(dayType);

    const employees = await prisma.employee.findMany({
      where: { status: { in: ['ACTIVE', 'PROBATION'] } },
      include: { positions: { where: { isPrimary: true }, include: { position: true } } },
    });

    let processed = 0;
    let absent = 0;
    let overtimeMinutes = 0;
    for (const emp of employees) {
      const punches = await prisma.punchRecord.findMany({
        where: {
          employeeId: emp.id,
          punchTime: { gte: from, lte: to },
        },
        orderBy: { punchTime: 'asc' },
        select: { punchType: true, punchTime: true },
      });
      const punchIn = punches.find((p) => p.punchType === 'IN')?.punchTime ?? null;
      const punchOut = [...punches].reverse().find((p) => p.punchType === 'OUT')?.punchTime ?? null;

      // A rest day nobody worked on leaves no attendance record at all.
      if (!paid && !punchIn && !punchOut) continue;

      const ot = computeOvertimeMinutes({ punchIn, punchOut, scheduledEnd: schedule?.workTimeEnd ?? null, dayType });

      let result: { status: AttendanceStatus; memo: string };
      if (dayType === 'HOLIDAY') {
        result = {
          status: 'NORMAL',
          memo: !punchIn && !punchOut ? `${holidayName ?? '法定假日'}（带薪）` : `${holidayName ?? '法定假日'}加班 ${ot} 分钟`,
        };
      } else if (!paid) {
        result = { status: 'NORMAL', memo: `休息日加班 ${ot} 分钟` };
      } else {
        result = classifyDay({
          workTimeStart: schedule?.workTimeStart ?? null,
          workTimeEnd: schedule?.workTimeEnd ?? null,
          lateTolerance: schedule?.lateTolerance ?? 0,
          punchIn,
          punchOut,
        });
      }

      await prisma.dailyAttendance.upsert({
        where: { employeeId_date: { employeeId: emp.id, date: day } },
        update: {
          status: result.status,
          exceptionMemo: result.memo,
          scheduleId: schedule?.id ?? null,
          punchInTime: punchIn,
          punchOutTime: punchOut,
          dayType,
          overtimeMinutes: ot,
        },
        create: {
          employeeId: emp.id,
          date: day,
          scheduleId: schedule?.id ?? null,
          status: result.status,
          exceptionMemo: result.memo,
          punchInTime: punchIn,
          punchOutTime: punchOut,
          dayType,
          overtimeMinutes: ot,
        },
      });
      processed += 1;
      overtimeMinutes += ot;
      if (result.status === 'ABSENT') absent += 1;
    }
    return { targetDate, dayType, holiday: holidayName, schedule: schedule?.name ?? null, processed, absent, overtimeMinutes };
  },

  /**
   * Idempotent monthly attendance seed: default schedule, statutory calendar
   * entries for the month, then punch + daily records for every
   * ACTIVE/PROBATION employee — workdays (with weekday overtime), rest days
   * (somebody worked overtime) and paid statutory holidays.
   * Uses a stable pseudo-random so reruns never duplicate.
   */
  async seedAttendance(month: string, opts: { force?: boolean } = {}) {
    const [y, m] = month.split('-').map(Number);
    if (!y || !m) throw new Error(`月份格式错误: ${month}`);

    const schedule = await attendanceRepository.upsertSchedule({
      name: 'Standard 9-to-6',
      workTimeStart: '09:00',
      workTimeEnd: '18:00',
      lateTolerance: 10,
      workDays: [1, 2, 3, 4, 5],
    });

    const employees = await prisma.employee.findMany({
      where: { status: { in: ['ACTIVE', 'PROBATION'] } },
      select: { id: true },
    });

    const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const calendar = await attendanceRepository.calendarBetween(`${month}-01`, `${month}-${String(daysInMonth).padStart(2, '0')}`);
    const holidayByDay = new Map(calendar.map((c) => [dayKey(c.date), c]));

    let days = 0;
    let punches = 0;
    let holidayDays = 0;
    let restOvertimeDays = 0;
    let weekdayOvertimeDays = 0;

    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(Date.UTC(y, m - 1, d));
      const entry = holidayByDay.get(dayKey(date)) ?? null;
      const dayType = resolveDayType(date, { workDays: schedule.workDays, calendar });

      for (const emp of employees) {
        const r = seedRandom(`${emp.id}|${month}-${d}`);
        const r2 = seedRandom(`${month}-${d}|${emp.id}`);

        let punchIn: Date | null = null;
        let punchOut: Date | null = null;
        let status: AttendanceStatus = 'NORMAL';
        let memo: string | null = null;

        if (dayType === 'HOLIDAY') {
          // Paid statutory holiday: recorded for every employee, nobody is absent.
          memo = `${entry?.name ?? '法定假日'}（带薪）`;
          holidayDays += 1;
        } else if (dayType === 'RESTDAY') {
          // Rest day: only overtime workers leave punches (~35%).
          if (r2 < 0.35) {
            punchIn = new Date(Date.UTC(y, m - 1, d, 10, Math.floor(r * 25), 0));
            punchOut = new Date(Date.UTC(y, m - 1, d, 15, 30 + Math.floor(r * 25), 0));
            memo = '休息日加班';
            restOvertimeDays += 1;
          } else {
            continue; // no punches on a rest day => no attendance record
          }
        } else {
          // Workday / make-up workday: ~78% normal, rest across exceptions.
          const kind = r < 0.78 ? 'NORMAL' : r < 0.86 ? 'LATE' : r < 0.92 ? 'EARLY_LEAVE' : r < 0.98 ? 'MISSED_PUNCH' : 'ABSENT';
          status = kind;
          if (kind !== 'ABSENT') {
            const lateMin = kind === 'LATE' ? 11 + Math.floor(r * 30) : 4 + Math.floor(r * 5);
            punchIn = new Date(Date.UTC(y, m - 1, d, 9, lateMin, 0));
            // ~25% of workdays end with paid overtime after 18:00.
            if (r2 < 0.25) {
              punchOut = new Date(Date.UTC(y, m - 1, d, 19, Math.floor(r2 * 120), 0));
              weekdayOvertimeDays += 1;
            } else {
              punchOut = new Date(Date.UTC(y, m - 1, d, 18, Math.floor(r * 4), 0));
            }
          }
          if (kind === 'LATE') memo = '迟到';
          if (kind === 'EARLY_LEAVE') memo = '早退';
          if (kind === 'MISSED_PUNCH') {
            punchOut = null;
            memo = '缺少下班卡';
          }
        }

        const existing = await prisma.dailyAttendance.findUnique({
          where: { employeeId_date: { employeeId: emp.id, date } },
        });
        if (existing && !opts.force) { days += 1; continue; }

        if (punchIn) {
          await prisma.punchRecord.create({ data: { employeeId: emp.id, punchTime: punchIn, punchType: 'IN', source: 'WECHAT' } });
          punches += 1;
        }
        if (punchOut) {
          await prisma.punchRecord.create({ data: { employeeId: emp.id, punchTime: punchOut, punchType: 'OUT', source: 'WECHAT' } });
          punches += 1;
        }
        const outTime = punchIn && status === 'EARLY_LEAVE' ? new Date(punchIn.getTime() + (STANDARD_WORK_HOURS - 1) * 3600_000) : punchOut;
        const ot = computeOvertimeMinutes({ punchIn, punchOut: outTime, scheduledEnd: schedule.workTimeEnd, dayType });
        await prisma.dailyAttendance.upsert({
          where: { employeeId_date: { employeeId: emp.id, date } },
          update: { status, scheduleId: schedule.id, punchInTime: punchIn, punchOutTime: outTime, exceptionMemo: memo, dayType, overtimeMinutes: ot },
          create: { employeeId: emp.id, date, scheduleId: schedule.id, status, punchInTime: punchIn, punchOutTime: outTime, exceptionMemo: memo, dayType, overtimeMinutes: ot },
        });
        days += 1;
      }
    }
    return { month, schedule: schedule.name, days, punches, holidayDays, restOvertimeDays, weekdayOvertimeDays };
  },
};
