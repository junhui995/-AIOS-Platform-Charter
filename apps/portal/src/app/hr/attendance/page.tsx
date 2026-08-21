"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Play, Calendar } from "lucide-react";

interface AttendanceRecord {
  id: string;
  status: string;
  exceptionMemo: string;
  punchInTime?: string;
  punchOutTime?: string;
  employee: {
    name: string;
    positions?: {
      isPrimary: boolean;
      position: { department: { name: string } }
    }[];
  };
}

export default function AttendancePage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [analyzing, setAnalyzing] = useState(false);

  const fetchRecords = () => {
    fetch('/api/hr/attendance/analyze').then(res => res.json()).then(setRecords);
  };

  useEffect(() => { fetchRecords(); }, []);

  const runEngine = async () => {
    setAnalyzing(true);
    try {
      const res = await fetch('/api/hr/attendance/analyze', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ targetDate: new Date().toISOString() })
      });
      if (res.ok) fetchRecords();
    } finally { setAnalyzing(false); }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto font-sans">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            考勤中心 (Time & Attendance)
          </h1>
          <p className="text-gray-500 mt-2">管理排班方案、汇总每日打卡记录，并运行异常识别引擎生成请假/补卡代办。</p>
        </div>
        <div className="flex gap-4">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
            <Calendar className="w-4 h-4" />
            排班方案管理
          </button>
          <button
            onClick={runEngine}
            disabled={analyzing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
          >
            <Play className="w-4 h-4" />
            {analyzing ? '引擎计算中...' : '运行今日异常校验引擎'}
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50 font-medium text-gray-700">
          今日出勤状态 (Daily Attendance Results)
        </div>
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-white border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 font-medium">员工姓名</th>
                <th className="px-6 py-4 font-medium">所属部门</th>
                <th className="px-6 py-4 font-medium">打卡记录 (首 / 末)</th>
                <th className="px-6 py-4 font-medium">系统判定结果</th>
                <th className="px-6 py-4 font-medium">AI 异常备注</th>
                <th className="px-6 py-4 font-medium text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {records.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                    暂无考勤结果，请点击右上角运行异常校验引擎
                  </td>
                </tr>
              ) : (
                records.map((r, idx) => {
                  const emp = r.employee;
                  const primaryPos = emp?.positions?.find(p => p.isPrimary)?.position;

                  return (
                    <motion.tr
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.05 }}
                      key={r.id}
                      className="hover:bg-blue-50/50 transition-colors"
                    >
                      <td className="px-6 py-4 font-medium text-gray-900">{emp?.name || '未知员工'}</td>
                      <td className="px-6 py-4 text-gray-600">{primaryPos?.department?.name || '-'}</td>
                      <td className="px-6 py-4 text-gray-600 font-mono text-xs">
                        {r.punchInTime ? new Date(r.punchInTime).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit'}) : '--:--'}
                        {' - '}
                        {r.punchOutTime ? new Date(r.punchOutTime).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit'}) : '--:--'}
                      </td>
                      <td className="px-6 py-4">
                        {r.status === 'NORMAL' ? (
                           <span className="inline-flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded text-xs font-medium"><CheckCircle2 className="w-3 h-3"/> 正常</span>
                        ) : r.status === 'ABSENT' ? (
                           <span className="inline-flex items-center gap-1 text-red-600 bg-red-50 px-2 py-1 rounded text-xs font-medium"><AlertTriangle className="w-3 h-3"/> 缺勤</span>
                        ) : (
                           <span className="inline-flex items-center gap-1 text-orange-600 bg-orange-50 px-2 py-1 rounded text-xs font-medium"><AlertTriangle className="w-3 h-3"/> {r.status}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-500 max-w-[200px] truncate" title={r.exceptionMemo}>
                        {r.exceptionMemo || '-'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {r.status !== 'NORMAL' && (
                          <button className="text-xs text-blue-600 hover:underline">发起提醒/补卡</button>
                        )}
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
