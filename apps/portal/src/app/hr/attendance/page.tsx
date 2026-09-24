"use client";

import { useState, useEffect, useCallback } from "react";
import { CheckCircle2, Play, Calendar, AlertCircle } from "lucide-react";

interface DailyRecord {
  id: string;
  date: string;
  status: string;
  exceptionMemo: string;
  punchInTime?: string | null;
  punchOutTime?: string | null;
  employee?: { id: string; code: string; name: string } | null;
  schedule?: { name?: string } | null;
}

const STATUS_META: Record<string, { label: string; cls: string }> = {
  NORMAL: { label: '正常', cls: 'bg-green-50 text-green-700' },
  LATE: { label: '迟到', cls: 'bg-orange-50 text-orange-700' },
  EARLY_LEAVE: { label: '早退', cls: 'bg-orange-50 text-orange-700' },
  ABSENT: { label: '缺勤', cls: 'bg-red-50 text-red-700' },
  MISSED_PUNCH: { label: '漏卡', cls: 'bg-yellow-50 text-yellow-700' },
};

export default function AttendancePage() {
  const [month, setMonth] = useState('2026-07');
  const [targetDate, setTargetDate] = useState(new Date().toISOString().slice(0, 10));
  const [records, setRecords] = useState<DailyRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/hr/attendance/daily?month=${month}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '加载失败');
      setRecords(data);
    } catch (e) {
      setMsg({ kind: 'err', text: e instanceof Error ? e.message : '加载失败' });
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const runEngine = async () => {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch('/api/hr/attendance/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetDate }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '引擎运行失败');
      setMsg({ kind: 'ok', text: `引擎完成：处理 ${data.processed} 人（含缺勤 ${data.absent}），排班 ${data.schedule ?? '无'}` });
      fetchRecords();
    } catch (e) {
      setMsg({ kind: 'err', text: e instanceof Error ? e.message : '引擎运行失败' });
    } finally {
      setLoading(false);
    }
  };

  const summary = records.reduce(
    (acc, r) => {
      acc[r.status] = (acc[r.status] ?? 0) + 1;
      acc.total += 1;
      return acc;
    },
    { total: 0 } as Record<string, number>,
  );

  return (
    <div className="p-8 max-w-7xl mx-auto font-sans">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-blue-600" />
            考勤中心 (Time & Attendance)
          </h1>
          <p className="text-gray-500 mt-2">汇总每日打卡记录，运行异常识别引擎生成日判定，并为薪资计算提供考勤联动数据。</p>
        </div>
        <div className="flex items-center gap-2">
          <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700" />
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700" />
          <button onClick={runEngine} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50">
            <Play className="w-4 h-4" /> {loading ? '引擎计算中...' : '运行异常校验引擎'}
          </button>
        </div>
      </div>

      {msg && (
        <div className={`mb-4 px-4 py-3 rounded-lg text-sm flex items-center gap-2 ${msg.kind === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          <AlertCircle className="w-4 h-4" /> {msg.text}
        </div>
      )}

      <div className="grid grid-cols-7 gap-3 mb-6">
        {Object.entries({ NORMAL: '正常', LATE: '迟到', EARLY_LEAVE: '早退', ABSENT: '缺勤', MISSED_PUNCH: '漏卡' }).map(([k, label]) => (
          <div key={k} className="flex items-center gap-2 bg-white border border-gray-100 rounded-lg px-3 py-2 shadow-sm">
            <span className={`w-2 h-2 rounded-full ${(STATUS_META[k]?.cls ?? '').includes('red') ? 'bg-red-500' : (STATUS_META[k]?.cls ?? '').includes('orange') ? 'bg-orange-500' : (STATUS_META[k]?.cls ?? '').includes('yellow') ? 'bg-yellow-500' : 'bg-green-500'}`} />
            <span className="text-sm text-gray-500">{label}</span>
            <span className="ml-auto font-semibold text-gray-900">{summary[k] ?? 0}</span>
          </div>
        ))}
        <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 shadow-sm">
          <span className="text-sm text-blue-700">合计</span>
          <span className="ml-auto font-semibold text-blue-700">{summary.total}</span>
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50 font-medium text-gray-700">
          {month} 出勤明细 (Daily Attendance)
        </div>
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-gray-500 uppercase bg-white border-b border-gray-100">
            <tr>
              <th className="px-6 py-4 font-medium">日期</th>
              <th className="px-6 py-4 font-medium">员工</th>
              <th className="px-6 py-4 font-medium">打卡 (首 / 末)</th>
              <th className="px-6 py-4 font-medium">系统判定</th>
              <th className="px-6 py-4 font-medium">异常备注</th>
              <th className="px-6 py-4 font-medium">排班</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {records.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                  暂无考勤记录。首次启动已自动播种 2026-07 演示数据；其余月份先在 /api/hr/attendance/seed 播种或运行引擎逐日生成。
                </td>
              </tr>
            ) : (
              records.map((r) => (
                <tr key={r.id} className="hover:bg-blue-50/50 transition-colors">
                  <td className="px-6 py-4 text-gray-900 font-mono text-xs">{r.date.slice(0, 10)}</td>
                  <td className="px-6 py-4 font-medium text-gray-900">
                    <span className="font-mono text-xs text-gray-400 mr-2">{r.employee?.code}</span>
                    {r.employee?.name}
                  </td>
                  <td className="px-6 py-4 text-gray-600 font-mono text-xs">
                    {r.punchInTime ? r.punchInTime.slice(11, 16) : '--:--'}
                    {' - '}
                    {r.punchOutTime ? r.punchOutTime.slice(11, 16) : '--:--'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${STATUS_META[r.status]?.cls ?? 'bg-gray-50 text-gray-600'}`}>
                      {r.status === 'NORMAL' ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                      {STATUS_META[r.status]?.label ?? r.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-500 max-w-[220px] truncate" title={r.exceptionMemo}>
                    {r.exceptionMemo || '-'}
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-400">{r.schedule?.name ?? '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}