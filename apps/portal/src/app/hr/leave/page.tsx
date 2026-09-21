"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CalendarDays, CheckCircle2, XCircle, Plus, AlertCircle } from "lucide-react";

interface EmployeeOption {
  id: string;
  name: string;
  code: string;
}

interface Balance {
  employeeId: string;
  annualTotal: number;
  annualUsed: number;
  sickTotal: number;
  sickUsed: number;
  employee: { id: string; name: string; code: string };
}

interface LeaveRequest {
  id: string;
  employeeId: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string | null;
  status: string;
  employee: { name: string; code: string };
}

const TYPE_LABELS: Record<string, string> = {
  ANNUAL: '年假', SICK: '病假', UNPAID: '事假', MATERNITY: '产假', OTHER: '其他',
};

export default function LeavePage() {
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [form, setForm] = useState({ employeeId: '', leaveType: 'ANNUAL', startDate: '', endDate: '', reason: '' });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = () => {
    fetch('/api/leave').then(r => r.json()).then(setRequests).catch(() => {});
    fetch('/api/leave/balances').then(r => r.json()).then(setBalances).catch(() => {});
  };

  useEffect(() => {
    fetch('/api/employee').then(r => r.json()).then(rows => {
      setEmployees(rows?.map ? rows : []);
      if (rows?.length) setForm(f => ({ ...f, employeeId: rows[0].id }));
    }).catch(() => {});
    refresh();
  }, []);

  const submit = async () => {
    if (!form.employeeId || !form.startDate || !form.endDate) {
      setNotice('请选择员工与起止日期');
      return;
    }
    if (new Date(form.startDate) > new Date(form.endDate)) {
      setNotice('开始日期不能晚于结束日期');
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch('/api/leave', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setNotice(`提交失败: ${data.error || '未知错误'}`);
      } else {
        setNotice(`已提交，审批流 ${data.instanceId ? '已启动 #' + data.instanceId.slice(0, 8) : '已创建'}`);
        setForm(f => ({ ...f, reason: '' }));
        refresh();
      }
    } finally { setBusy(false); }
  };

  const decide = async (id: string, action: 'APPROVE' | 'REJECT') => {
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch(`/api/leave/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      setNotice(res.ok
        ? `已${action === 'APPROVE' ? '通过' : '驳回'}${data.taskCompleted ? '（BPM 任务同步完成）' : ''}`
        : `操作失败: ${data.error || '未知错误'}`);
      refresh();
    } finally { setBusy(false); }
  };

  const statusBadge = (status: string) => {
    if (status === 'APPROVED') return <span className="inline-flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded text-xs font-medium"><CheckCircle2 className="w-3 h-3"/> 已批准</span>;
    if (status === 'REJECTED' || status === 'REJECT') return <span className="inline-flex items-center gap-1 text-red-600 bg-red-50 px-2 py-1 rounded text-xs font-medium"><XCircle className="w-3 h-3"/> 已驳回</span>;
    return <span className="inline-flex items-center gap-1 text-orange-600 bg-orange-50 px-2 py-1 rounded text-xs font-medium"><AlertCircle className="w-3 h-3"/> 待审批</span>;
  };

  return (
    <div className="p-8 max-w-7xl mx-auto font-sans">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-blue-600" /> 请假与假期 (Leave & Balance)
          </h1>
          <p className="text-gray-500 mt-2">自助提交请假、查看剩余额度；审批即启动 BPM 审批流，通过后自动扣减假期余额。</p>
        </div>
        {notice && <div className="text-sm text-blue-700 bg-blue-50 border border-blue-200 px-4 py-2 rounded-lg">{notice}</div>}
      </div>

      {/* Submit form */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5 mb-6">
        <div className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2"><Plus className="w-4 h-4 text-blue-600" /> 提交请假申请</div>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <label className="text-xs text-gray-500 block">
            员工
            <select value={form.employeeId} onChange={e => setForm({ ...form, employeeId: e.target.value })}
              className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.name} ({emp.code})</option>
              ))}
            </select>
          </label>
          <label className="text-xs text-gray-500 block">
            假别
            <select value={form.leaveType} onChange={e => setForm({ ...form, leaveType: e.target.value })}
              className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          <label className="text-xs text-gray-500 block">
            开始日期
            <input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })}
              className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </label>
          <label className="text-xs text-gray-500 block">
            结束日期
            <input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })}
              className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </label>
          <label className="text-xs text-gray-500 block">
            事由
            <input value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })}
              placeholder="如：回老家探亲"
              className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </label>
        </div>
        <button onClick={submit} disabled={busy}
          className="mt-4 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 text-sm">
          提交并启动审批流
        </button>
      </div>

      {/* Balances */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {balances.map((b) => (
          <div key={b.employeeId} className="bg-white border border-gray-100 rounded-xl shadow-sm p-4">
            <div className="flex justify-between items-center mb-3">
              <span className="font-medium text-gray-900 text-sm">{b.employee.name}</span>
              <span className="text-xs text-gray-400">{b.employee.code}</span>
            </div>
            <div className="flex gap-6 text-xs">
              <div>
                <div className="text-gray-500 mb-1">年假</div>
                <div className="flex gap-1.5 h-2 w-full max-w-[90px] bg-gray-100 rounded">
                  <div className="h-2 bg-blue-500 rounded" style={{ width: `${Math.min(100, (b.annualUsed / Math.max(1, b.annualTotal)) * 100)}%` }} />
                </div>
                <div className="mt-1 text-gray-700 font-mono">{b.annualTotal - b.annualUsed}/{b.annualTotal} 天</div>
              </div>
              <div>
                <div className="text-gray-500 mb-1">病假</div>
                <div className="flex gap-1.5 h-2 w-full max-w-[90px] bg-gray-100 rounded">
                  <div className="h-2 bg-emerald-500 rounded" style={{ width: `${Math.min(100, (b.sickUsed / Math.max(1, b.sickTotal)) * 100)}%` }} />
                </div>
                <div className="mt-1 text-gray-700 font-mono">{b.sickTotal - b.sickUsed}/{b.sickTotal} 天</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Requests table */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50 font-medium text-gray-700 text-sm">请假记录 (Leave Requests)</div>
        <div className="overflow-x-auto min-h-[200px]">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-white border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 font-medium">员工</th>
                <th className="px-6 py-4 font-medium">假别</th>
                <th className="px-6 py-4 font-medium">起止日期</th>
                <th className="px-6 py-4 font-medium">事由</th>
                <th className="px-6 py-4 font-medium">状态</th>
                <th className="px-6 py-4 font-medium text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400">暂无请假记录，去上方提交一条吧</td>
                </tr>
              ) : (
                requests.map((r, idx) => (
                  <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.04 }}
                    key={r.id} className="hover:bg-blue-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">{r.employee.name} <span className="text-gray-400 font-normal">{r.employee.code}</span></td>
                    <td className="px-6 py-4 text-gray-600">{TYPE_LABELS[r.leaveType] || r.leaveType}</td>
                    <td className="px-6 py-4 text-gray-600 font-mono text-xs">
                      {new Date(r.startDate).toLocaleDateString('zh-CN')} ~ {new Date(r.endDate).toLocaleDateString('zh-CN')}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500 max-w-[220px] truncate" title={r.reason || ''}>{r.reason || '-'}</td>
                    <td className="px-6 py-4">{statusBadge(r.status)}</td>
                    <td className="px-6 py-4 text-right">
                      {r.status === 'PENDING' && (
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => decide(r.id, 'APPROVE')} disabled={busy}
                            className="text-xs flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
                            <CheckCircle2 className="w-3 h-3" /> 通过
                          </button>
                          <button onClick={() => decide(r.id, 'REJECT')} disabled={busy}
                            className="text-xs flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-red-50 hover:text-red-600 disabled:opacity-50">
                            <XCircle className="w-3 h-3" /> 驳回
                          </button>
                        </div>
                      )}
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}