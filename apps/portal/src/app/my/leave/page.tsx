"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { CalendarDays, CheckCircle2, XCircle, Pencil, Trash2, LogOut, Plus, AlertCircle } from "lucide-react";

interface EmployeeOption { id: string; name: string; code: string }
interface Balance {
  employeeId: string; annualTotal: number; annualUsed: number; sickTotal: number; sickUsed: number;
}
interface LeaveRecord {
  id: string; employeeId: string; leaveType: string; startDate: string; endDate: string;
  reason: string | null; status: string; employee: { name: string; code: string };
}

const TYPE_LABELS: Record<string, string> = {
  ANNUAL: '年假', SICK: '病假', UNPAID: '事假', MATERNITY: '产假', OTHER: '其他',
};

export default function MyLeavePage() {
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [me, setMe] = useState<string>('');
  const [balances, setBalances] = useState<Balance[]>([]);
  const [records, setRecords] = useState<LeaveRecord[]>([]);
  const [form, setForm] = useState({ leaveType: 'ANNUAL', startDate: '', endDate: '', reason: '' });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ leaveType: 'ANNUAL', startDate: '', endDate: '', reason: '' });
  const [returningId, setReturningId] = useState<string | null>(null);
  const [usedDays, setUsedDays] = useState<number>(1);

  const myBalance = balances.find(b => b.employeeId === me);

  const loadBalances = useCallback(() => {
    fetch('/api/leave/balances').then(r => r.json()).then(setBalances).catch(() => {});
  }, []);

  const loadRecords = useCallback((employeeId: string) => {
    fetch(`/api/leave?employeeId=${employeeId}`).then(r => r.json()).then(setRecords).catch(() => {});
  }, []);

  useEffect(() => {
    fetch('/api/employee').then(r => r.json()).then(rows => {
      const list: EmployeeOption[] = Array.isArray(rows) ? rows : [];
      setEmployees(list);
      if (list.length) setMe(list[0].id);
    }).catch(() => {});
    loadBalances();
  }, [loadBalances]);

  useEffect(() => { if (me) loadRecords(me); }, [me, loadRecords]);

  const daysOf = (start: string, end: string) =>
    Math.floor((new Date(end).getTime() - new Date(start).getTime()) / 86400000) + 1;

  const submit = async () => {
    if (!me || !form.startDate || !form.endDate) { setNotice({ kind: 'err', text: '请选择日期' }); return; }
    if (new Date(form.startDate) > new Date(form.endDate)) { setNotice({ kind: 'err', text: '开始日期不能晚于结束日期' }); return; }
    setBusy(true); setNotice(null);
    try {
      const res = await fetch('/api/leave', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: me, ...form }),
      });
      const data = await res.json();
      if (!res.ok) setNotice({ kind: 'err', text: `提交失败: ${data.error || '未知错误'}` });
      else {
        setNotice({ kind: 'ok', text: `已提交${data.instanceId ? '，审批流程已启动' : ''}` });
        setForm(f => ({ ...f, reason: '' }));
        loadRecords(me); loadBalances();
      }
    } finally { setBusy(false); }
  };

  const patch = async (id: string, body: Record<string, unknown>) => {
    setBusy(true); setNotice(null);
    try {
      const res = await fetch(`/api/leave/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) setNotice({ kind: 'err', text: data.error || '操作失败' });
      else { setNotice({ kind: 'ok', text: '操作成功' }); loadRecords(me); loadBalances(); }
    } finally { setBusy(false); }
  };

  const remove = async (id: string) => {
    setBusy(true); setNotice(null);
    try {
      const res = await fetch(`/api/leave/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) setNotice({ kind: 'err', text: data.error || '删除失败' });
      else { setNotice({ kind: 'ok', text: '已撤销申请并取消审批流' }); loadRecords(me); }
    } finally { setBusy(false); }
  };

  const startEdit = (r: LeaveRecord) => {
    setEditingId(r.id);
    setEditForm({
      leaveType: r.leaveType, startDate: r.startDate.slice(0, 10), endDate: r.endDate.slice(0, 10), reason: r.reason || '',
    });
  };

  const statusBadge = (s: string) => {
    if (s === 'APPROVED') return <span className="inline-flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded text-xs font-medium"><CheckCircle2 className="w-3 h-3" /> 已批准</span>;
    if (s === 'RETURNED') return <span className="inline-flex items-center gap-1 text-sky-600 bg-sky-50 px-2 py-1 rounded text-xs font-medium"><LogOut className="w-3 h-3" /> 已销假</span>;
    if (s === 'REJECTED' || s === 'REJECT') return <span className="inline-flex items-center gap-1 text-red-600 bg-red-50 px-2 py-1 rounded text-xs font-medium"><XCircle className="w-3 h-3" /> 已驳回</span>;
    return <span className="inline-flex items-center gap-1 text-orange-600 bg-orange-50 px-2 py-1 rounded text-xs font-medium"><AlertCircle className="w-3 h-3" /> 审批中</span>;
  };

  return (
    <div className="p-8 max-w-7xl mx-auto font-sans">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-blue-600" /> 我的假期 (Self-Service)
          </h1>
          <p className="text-gray-500 mt-2">自助提交 / 修改 / 撤销请假，已批准的可销假自动退还未休天数。</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-500 flex items-center gap-2">
            以员工身份操作
            <select value={me} onChange={e => setMe(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name} ({emp.code})</option>)}
            </select>
          </label>
          {notice && (
            <span className={`text-sm px-4 py-2 rounded-lg border ${notice.kind === 'ok' ? 'text-green-700 bg-green-50 border-green-200' : 'text-red-600 bg-red-50 border-red-200'}`}>{notice.text}</span>
          )}
        </div>
      </div>

      {/* My balances */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-4">
          <div className="text-xs text-gray-500 mb-2">年假额度</div>
          <div className="text-2xl font-bold text-blue-600">{myBalance ? myBalance.annualTotal - myBalance.annualUsed : '-'} 天</div>
          <div className="text-xs text-gray-400 mt-1">{myBalance?.annualUsed ?? '?'} 已用 / 共 {myBalance?.annualTotal ?? '?'} 天</div>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-4">
          <div className="text-xs text-gray-500 mb-2">病假额度</div>
          <div className="text-2xl font-bold text-emerald-600">{myBalance ? myBalance.sickTotal - myBalance.sickUsed : '-'} 天</div>
          <div className="text-xs text-gray-400 mt-1">{myBalance?.sickUsed ?? '?'} 已用 / 共 {myBalance?.sickTotal ?? '?'} 天</div>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-4">
          <div className="text-xs text-gray-500 mb-2">审批中</div>
          <div className="text-2xl font-bold text-orange-600">{records.filter(r => r.status === 'PENDING').length}</div>
          <div className="text-xs text-gray-400 mt-1">待处理申请</div>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-4">
          <div className="text-xs text-gray-500 mb-2">请假累计</div>
          <div className="text-2xl font-bold text-gray-900">{records.filter(r => ['APPROVED', 'RETURNED'].includes(r.status)).length} 笔</div>
          <div className="text-xs text-gray-400 mt-1">已批准 / 已销假记录</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Submit form */}
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5 h-fit">
          <div className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2"><Plus className="w-4 h-4 text-blue-600" /> 发起请假申请</div>
          <div className="space-y-4">
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
              <input value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} placeholder="如：回老家探亲"
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </label>
            {form.startDate && form.endDate && new Date(form.startDate) <= new Date(form.endDate) && (
              <div className="text-xs text-gray-400">本次申请 {daysOf(form.startDate, form.endDate)} 天</div>
            )}
            <button onClick={submit} disabled={busy}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 text-sm">
              提交并启动审批流
            </button>
          </div>
        </div>

        {/* My records */}
        <div className="lg:col-span-2 bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden h-fit">
          <div className="p-4 border-b border-gray-100 bg-gray-50 font-medium text-gray-700 text-sm">我的请假记录</div>
          <div className="overflow-x-auto min-h-[200px]">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-white border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 font-medium">假别</th>
                  <th className="px-6 py-4 font-medium">起止日期</th>
                  <th className="px-6 py-4 font-medium">事由</th>
                  <th className="px-6 py-4 font-medium">状态</th>
                  <th className="px-6 py-4 font-medium text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {records.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-400">暂无请假记录</td></tr>
                ) : (
                  records.map((r, idx) => {
                    const editing = editingId === r.id;
                    const returning = returningId === r.id;
                    return (
                      <motion.tr key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.03 }}
                        className="hover:bg-blue-50/50 transition-colors">
                        {editing ? (
                          <>
                            <td className="px-6 py-4">
                              <select value={editForm.leaveType} onChange={e => setEditForm({ ...editForm, leaveType: e.target.value })}
                                className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm">
                                {['ANNUAL', 'SICK', 'UNPAID'].map(k => <option key={k} value={k}>{TYPE_LABELS[k]}</option>)}
                              </select>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-1">
                                <input type="date" value={editForm.startDate} onChange={e => setEditForm({ ...editForm, startDate: e.target.value })}
                                  className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs" />
                                <span className="text-gray-400">~</span>
                                <input type="date" value={editForm.endDate} onChange={e => setEditForm({ ...editForm, endDate: e.target.value })}
                                  className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs" />
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <input value={editForm.reason} onChange={e => setEditForm({ ...editForm, reason: e.target.value })}
                                className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs" />
                            </td>
                            <td className="px-6 py-4">{statusBadge(r.status)}</td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex gap-2 justify-end">
                                <button onClick={() => patch(r.id, { action: 'UPDATE', ...editForm })} disabled={busy}
                                  className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">保存</button>
                                <button onClick={() => setEditingId(null)} className="text-xs px-3 py-1.5 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">取消</button>
                              </div>
                            </td>
                          </>
                        ) : returning ? (
                          <>
                            <td className="px-6 py-4 text-gray-600">{TYPE_LABELS[r.leaveType] || r.leaveType}</td>
                            <td className="px-6 py-4 text-gray-600 font-mono text-xs">
                              {new Date(r.startDate).toLocaleDateString('zh-CN')} ~ {new Date(r.endDate).toLocaleDateString('zh-CN')}
                              <div className="text-[10px] text-gray-400 mt-0.5">批准 {daysOf(r.startDate, r.endDate)} 天</div>
                            </td>
                            <td className="px-6 py-4 text-xs text-gray-500 max-w-[160px] truncate">{r.reason || '-'}</td>
                            <td className="px-6 py-4">{statusBadge(r.status)}</td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center gap-2 justify-end">
                                <span className="text-xs text-gray-500">实际休假（天）</span>
                                <input type="number" min={0} max={daysOf(r.startDate, r.endDate)} value={usedDays}
                                  onChange={e => setUsedDays(Number(e.target.value))}
                                  className="w-16 border border-gray-200 rounded-lg px-2 py-1.5 text-xs" />
                                <button onClick={() => patch(r.id, { action: 'RETURN', usedDays })} disabled={busy}
                                  className="text-xs px-3 py-1.5 bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:opacity-50">确认销假</button>
                                <button onClick={() => setReturningId(null)} className="text-xs px-3 py-1.5 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">取消</button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-6 py-4 text-gray-600">{TYPE_LABELS[r.leaveType] || r.leaveType}</td>
                            <td className="px-6 py-4 text-gray-600 font-mono text-xs">{new Date(r.startDate).toLocaleDateString('zh-CN')} ~ {new Date(r.endDate).toLocaleDateString('zh-CN')}</td>
                            <td className="px-6 py-4 text-xs text-gray-500 max-w-[160px] truncate" title={r.reason || ''}>{r.reason || '-'}</td>
                            <td className="px-6 py-4">{statusBadge(r.status)}</td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex gap-2 justify-end">
                                {r.status === 'PENDING' && (
                                  <>
                                    <button onClick={() => startEdit(r)} disabled={busy}
                                      className="text-xs flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-blue-50 hover:text-blue-700 disabled:opacity-50">
                                      <Pencil className="w-3 h-3" /> 修改
                                    </button>
                                    <button onClick={() => remove(r.id)} disabled={busy}
                                      className="text-xs flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-red-50 hover:text-red-600 disabled:opacity-50">
                                      <Trash2 className="w-3 h-3" /> 撤销
                                    </button>
                                  </>
                                )}
                                {r.status === 'APPROVED' && (
                                  <button onClick={() => { setReturningId(r.id); setUsedDays(daysOf(r.startDate, r.endDate)); }} disabled={busy}
                                    className="text-xs flex items-center gap-1 px-3 py-1.5 bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:opacity-50">
                                    <LogOut className="w-3 h-3" /> 销假
                                  </button>
                                )}
                              </div>
                            </td>
                          </>
                        )}
                      </motion.tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}