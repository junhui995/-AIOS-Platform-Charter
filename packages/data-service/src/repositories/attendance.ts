import { prisma } from '../index';

export const ATTENDANCE_STATUS = ['NORMAL', 'LATE', 'EARLY_LEAVE', 'ABSENT', 'MISSED_PUNCH'] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUS)[number];

export const STANDARD_WORK_HOURS = 8;

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
  const toMin = (d: Date | string | null | undefined): number | null => {
    if (!d) return null;
    if (typeof d === 'string') {
      const m = /^(\d{1,2}):(\d{2})$/.exec(d.trim());
      if (m) return Number(m[1]) * 60 + Number(m[2]);
    }
    const t = new Date(d);
    if (Number.isNaN(t.getTime())) return null;
    return t.getUTCHours() * 60 + t.getUTCMinutes();
  };
  const inMin = toMin(params.punchIn);
  const outMin = toMin(params.punchOut);
  const lateTol = params.lateTolerance ?? 0;

  if (inMin === null && outMin === null) {
    return { status: 'ABSENT', memo: '全天无打卡记录' };
  }
  if (inMin === null || outMin === null) {
    return { status: 'MISSED_PUNCH', memo: inMin === null ? '缺少上班卡' : '缺少下班卡' };
  }

  const start = toMin(params.workTimeStart);
  const end = toMin(params.workTimeEnd);
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

/** Pure monthly attendances aggregation for the linkage/pay-run. */
export function aggregateAttendance(records: Array<{ status: string }>): {
  workDays: number;
  absentDays: number;
  lateCount: number;
  earlyLeaveCount: number;
} {
  let workDays = 0;
  let absentDays = 0;
  let lateCount = 0;
  let earlyLeaveCount = 0;
  for (const r of records) {
    if (r.status === 'ABSENT') absentDays += 1;
    else if (r.status === 'LATE') { workDays += 1; lateCount += 1; }
    else if (r.status === 'EARLY_LEAVE') { workDays += 1; earlyLeaveCount += 1; }
    else if (r.status === 'NORMAL') workDays += 1;
    // MISSED_PUNCH counts as a workday (paid but flagged)
    else workDays += 1;
  }
  return { workDays, absentDays, lateCount, earlyLeaveCount };
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
   * data, using the default schedule (Standard or the first matching schedule).
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

    const employees = await prisma.employee.findMany({
      where: { status: { in: ['ACTIVE', 'PROBATION'] } },
      include: { positions: { where: { isPrimary: true }, include: { position: true } } },
    });

    let processed = 0;
    let absent = 0;
    for (const emp of employees) {
      if (schedule && !isWorkDay(day)) continue; // skip non-workdays when a schedule exists

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

      const result = classifyDay({
        workTimeStart: schedule?.workTimeStart ?? null,
        workTimeEnd: schedule?.workTimeEnd ?? null,
        lateTolerance: schedule?.lateTolerance ?? 0,
        punchIn,
        punchOut,
      });

      await prisma.dailyAttendance.upsert({
        where: { employeeId_date: { employeeId: emp.id, date: day } },
        update: { status: result.status, exceptionMemo: result.memo, scheduleId: schedule?.id ?? null, punchInTime: punchIn, punchOutTime: punchOut },
        create: { employeeId: emp.id, date: day, scheduleId: schedule?.id ?? null, status: result.status, exceptionMemo: result.memo, punchInTime: punchIn, punchOutTime: punchOut },
      });
      processed += 1;
      if (result.status === 'ABSENT') absent += 1;
    }
    return { targetDate, schedule: schedule?.name ?? null, processed, absent };
  },

  /**
   * Idempotent monthly attendance seed: creates the default schedule and a full
   * month of punch + daily records for every ACTIVE/PROBATION employee.
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

    const daysInMonth = new Date(y, m, 0).getDate();
    let days = 0;
    let punches = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(Date.UTC(y, m - 1, d));
      if (!isWorkDay(date, schedule.workDays)) continue;
      for (const emp of employees) {
        const r = seedRandom(`${emp.id}|${month}-${d}`);
        // ~78% normal, rest spread across late/early/missed/absent
        const kind = r < 0.78 ? 'NORMAL' : r < 0.86 ? 'LATE' : r < 0.92 ? 'EARLY_LEAVE' : r < 0.98 ? 'MISSED_PUNCH' : 'ABSENT';

        let punchIn: Date | null = null;
        let punchOut: Date | null = null;
        if (kind !== 'ABSENT') {
          const lateMin = kind === 'LATE' ? 11 + Math.floor(r * 30) : 4 + Math.floor(r * 5);
          punchIn = new Date(Date.UTC(y, m - 1, d, 9, lateMin, 0));
          punchOut = new Date(Date.UTC(y, m - 1, d, 18, 5 + Math.floor(r * 8), 0));
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
        const outTime = punchIn && kind === 'EARLY_LEAVE' ? new Date(punchIn.getTime() + (STANDARD_WORK_HOURS - 1) * 3600_000) : punchOut;
        await prisma.dailyAttendance.upsert({
          where: { employeeId_date: { employeeId: emp.id, date } },
          update: { status: kind, scheduleId: schedule.id, punchInTime: punchIn, punchOutTime: outTime },
          create: { employeeId: emp.id, date, scheduleId: schedule.id, status: kind, punchInTime: punchIn, punchOutTime: outTime },
        });
        days += 1;
      }
    }
    return { month, schedule: schedule.name, workdaysOnly: true, days, punches };
  },
};