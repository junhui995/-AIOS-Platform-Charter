"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CalendarDays, CheckCircle2, XCircle, AlertCircle, Settings2, LogOut } from "lucide-react";

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

export default function LeaveAdminPage() {
  const [balances, setBalances] = useState<Balance[]>([]);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [quotaEdit, setQuotaEdit] = useState<Record<string, { annualTotal: string; sickTotal: string }>>({});
  const [filter, setFilter] = useState('');

  const refresh = () => {
    fetch('/api/leave').then(r => r.json()).then(setRequests).catch(() => {});
    fetch('/api/leave/balances').then(r => r.json()).then(setBalances).catch(() => {});
  };

  useEffect(() => { refresh(); }, []);

  const decide = async (id: string, action: 'APPROVE' | 'REJECT') => {
    setBusy(true); setNotice(null);
    try {
      const res = await fetch(`/api/leave/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      setNotice(res.ok
        ? { kind: 'ok', text: `已${action === 'APPROVE' ? '通过' : '驳回'}${data.taskCompleted ? '（BPM 任务同步完成，余额已扣减）' : ''}` }
        : { kind: 'err', text: `操作失败: ${data.error || '未知错误'}` });
      refresh();
    } finally { setBusy(false); }
  };

  const startQuota = (b: Balance) => {
    setQuotaEdit(q => ({
      ...q,
      [b.employeeId]: { annualTotal: String(b.annualTotal), sickTotal: String(b.sickTotal) },
    }));
  };

  const saveQuota = async (employeeId: string) => {
    const q = quotaEdit[employeeId];
    if (!q) return;
    setBusy(true); setNotice(null);
    try {
      const body: Record<string, unknown> = { employeeId };
      if (q.annualTotal !== '') body.annualTotal = Number(q.annualTotal);
      if (q.sickTotal !== '') body.sickTotal = Number(q.sickTotal);
      const res = await fetch('/api/leave/balances', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) setNotice({ kind: 'err', text: `保存失败: ${data.error || '未知错误'}` });
      else {
        setNotice({ kind: 'ok', text: '已更新假期限额' });
        setQuotaEdit(qq => { const n = { ...qq }; delete n[employeeId]; return n; });
        refresh();
      }
    } finally { setBusy(false); }
  };

  const filtered = requests.filter(r =>
    !filter || r.employee.name.includes(filter) || r.employee.code.includes(filter) || r.status === filter);

  const statusBadge = (s: string) => {
    if (s === 'APPROVED') return <span className="inline-flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded text-xs font-medium"><CheckCircle2 className="w-3 h-3" /> 已批准</span>;
    if (s === 'RETURNED') return <span className="inline-flex items-center gap-1 text-sky-600 bg-sky-50 px-2 py-1 rounded text-xs font-medium"><LogOut className="w-3 h-3" /> 已销假</span>;
    if (s === 'REJECTED' || s === 'REJECT') return <span className="inline-flex items-center gap-1 text-red-600 bg-red-50 px-2 py-1 rounded text-xs font-medium"><XCircle className="w-3 h-3" /> 已驳回</span>;
    return <span className="inline-flex items-center gap-1 text-orange-600 bg-orange-50 px-2 py-1 rounded text-xs font-medium"><AlertCircle className="w-3 h-3" /> 待审批</span>;
  };

  return (
    <div className="p-8 max-w-7xl mx-auto font-sans">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-blue-600" /> 请假与假期 · 管理端
          </h1>
          <p className="text-gray-500 mt-2">查看全部请假记录、审批待处理申请、设置员工年假/病假限额。（员工自助请走「我的假期」入口）</p>
        </div>
        {notice && (
          <span className={`text-sm px-4 py-2 rounded-lg border ${notice.kind === 'ok' ? 'text-green-700 bg-green-50 border-green-200' : 'text-red-600 bg-red-50 border-red-200'}`}>{notice.text}</span>
        )}
      </div>

      {/* Balance & quota management */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {balances.map((b) => {
          const editing = quotaEdit[b.employeeId];
          return (
            <div key={b.employeeId} className="bg-white border border-gray-100 rounded-xl shadow-sm p-4">
              <div className="flex justify-between items-center mb-3">
                <span className="font-medium text-gray-900 text-sm">{b.employee.name} <span className="text-gray-400 text-xs">{b.employee.code}</span></span>
                {!editing ? (
                  <button onClick={() => startQuota(b)} className="text-xs flex items-center gap-1 text-gray-500 hover:text-blue-600 cursor-pointer border border-gray-200 rounded px-2 py-1">
                    <Settings2 className="w-3 h-3" /> 设限额
                  </button>
                ) : (
                  <span className="text-xs text-blue-600 font-medium">编辑中</span>
                )}
              </div>
              {!editing ? (
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
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <label className="text-xs text-gray-500 block">
                    年假总额
                    <input type="number" min={0} value={editing.annualTotal}
                      onChange={e => setQuotaEdit(q => ({ ...q, [b.employeeId]: { ...q[b.employeeId], annualTotal: e.target.value } }))}
                      className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm" />
                  </label>
                  <label className="text-xs text-gray-500 block">
                    病假总额
                    <input type="number" min={0} value={editing.sickTotal}
                      onChange={e => setQuotaEdit(q => ({ ...q, [b.employeeId]: { ...q[b.employeeId], sickTotal: e.target.value } }))}
                      className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm" />
                  </label>
                  <div className="col-span-2 flex gap-2">
                    <button onClick={() => saveQuota(b.employeeId)} disabled={busy}
                      className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">保存限额</button>
                    <button onClick={() => setQuotaEdit(q => { const n = { ...q }; delete n[b.employeeId]; return n; })}
                      className="text-xs px-3 py-1.5 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">取消</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Requests table */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
          <span className="font-medium text-gray-700 text-sm">请假记录 (Leave Requests)</span>
          <select value={filter} onChange={e => setFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">全部状态</option>
            <option value="PENDING">待审批</option>
            <option value="APPROVED">已批准</option>
            <option value="REJECTED">已驳回</option>
            <option value="RETURNED">已销假</option>
          </select>
        </div>
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
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400">暂无请假记录</td></tr>
              ) : (
                filtered.map((r, idx) => (
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