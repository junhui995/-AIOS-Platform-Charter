"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Receipt, CheckCircle2, XCircle, Trash2, Plus, AlertCircle } from "lucide-react";

interface EmployeeOption { id: string; name: string; code: string }
interface ExpenseRecord {
  id: string; code: string; employeeId: string; amount: string; reason: string;
  category: string | null; occurredOn: string | null; status: string;
  employee: { name: string; code: string };
  processInstanceId?: string | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  TRAVEL: '差旅', TAXI: '打车', MEAL: '餐饮', OFFICE: '办公', OTHER: '其他',
};
const CATEGORIES = ['TRAVEL', 'TAXI', 'MEAL', 'OFFICE', 'OTHER'];

const fmtMoney = (amount: string | number) => `¥${Number(amount).toFixed(2)}`;

export default function MyExpensesPage() {
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [me, setMe] = useState<string>('');
  const [records, setRecords] = useState<ExpenseRecord[]>([]);
  const [form, setForm] = useState({ category: 'TAXI', occurredOn: '', amount: '', reason: '' });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const pending = records.filter(r => r.status === 'PENDING_APPROVAL' || r.status === 'SUBMITTED');
  const approved = records.filter(r => r.status === 'APPROVED');
  const rejected = records.filter(r => r.status === 'REJECTED');
  const total = approved.reduce((sum, r) => sum + Number(r.amount), 0);

  const loadRecords = useCallback((employeeId: string) => {
    fetch(`/api/hr/expenses?employeeId=${employeeId}`).then(r => r.json()).then(rows => {
      setRecords(Array.isArray(rows) ? rows : []);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    fetch('/api/employee').then(r => r.json()).then(rows => {
      const list: EmployeeOption[] = Array.isArray(rows) ? rows : [];
      setEmployees(list);
      if (list.length) setMe(list[0].id);
    }).catch(() => {});
  }, []);

  useEffect(() => { if (me) loadRecords(me); }, [me, loadRecords]);

  const submit = async () => {
    if (!me) { setNotice({ kind: 'err', text: '缺失岗位身份' }); return; }
    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) { setNotice({ kind: 'err', text: '请填写有效金额（>0）' }); return; }
    if (!form.reason.trim()) { setNotice({ kind: 'err', text: '请填写事由' }); return; }
    setBusy(true); setNotice(null);
    try {
      const res = await fetch('/api/hr/expenses', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: me,
          amount,
          category: form.category,
          reason: form.reason.trim(),
          occurredOn: form.occurredOn || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) setNotice({ kind: 'err', text: `提交失败: ${data.error || '未知错误'}` });
      else {
        setNotice({ kind: 'ok', text: `已提交${data.instanceId ? '，报销审批流已启动' : ''}（单号 ${data.expense.code}）` });
        setForm({ category: 'TAXI', occurredOn: '', amount: '', reason: '' });
        loadRecords(me);
      }
    } finally { setBusy(false); }
  };

  const withdraw = async (id: string) => {
    setBusy(true); setNotice(null);
    try {
      const res = await fetch(`/api/hr/expenses/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) setNotice({ kind: 'err', text: data.error || '撤销失败' });
      else { setNotice({ kind: 'ok', text: '已撤销申请并取消审批流' }); loadRecords(me); }
    } finally { setBusy(false); }
  };

  const statusBadge = (s: string) => {
    if (s === 'APPROVED') return <span className="inline-flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded text-xs font-medium"><CheckCircle2 className="w-3 h-3" /> 已入账</span>;
    if (s === 'REJECTED') return <span className="inline-flex items-center gap-1 text-red-600 bg-red-50 px-2 py-1 rounded text-xs font-medium"><XCircle className="w-3 h-3" /> 已驳回</span>;
    return <span className="inline-flex items-center gap-1 text-orange-600 bg-orange-50 px-2 py-1 rounded text-xs font-medium"><AlertCircle className="w-3 h-3" /> 审批中</span>;
  };

  return (
    <div className="p-8 max-w-7xl mx-auto font-sans">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Receipt className="w-6 h-6 text-blue-600" /> 我的报销 (Self-Service)
          </h1>
          <p className="text-gray-500 mt-2">自助提交报销单（自动进入审批流与费用事件），随时跟踪审批结果、撤销未决申请。</p>
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

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-4">
          <div className="text-xs text-gray-500 mb-2">审批中</div>
          <div className="text-2xl font-bold text-orange-600">{pending.length} 笔</div>
          <div className="text-xs text-gray-400 mt-1">待处理申请</div>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-4">
          <div className="text-xs text-gray-500 mb-2">已入账</div>
          <div className="text-2xl font-bold text-emerald-600">{approved.length} 笔</div>
          <div className="text-xs text-gray-400 mt-1">审批通过记录</div>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-4">
          <div className="text-xs text-gray-500 mb-2">已驳回</div>
          <div className="text-2xl font-bold text-red-500">{rejected.length} 笔</div>
          <div className="text-xs text-gray-400 mt-1">需重新提交</div>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-4">
          <div className="text-xs text-gray-500 mb-2">累计到账金额</div>
          <div className="text-2xl font-bold text-gray-900">{fmtMoney(total)}</div>
          <div className="text-xs text-gray-400 mt-1">已入账报销合计</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Submit form */}
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5 h-fit">
          <div className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2"><Plus className="w-4 h-4 text-blue-600" /> 发起报销申请</div>
          <div className="space-y-4">
            <label className="text-xs text-gray-500 block">
              报销类别
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                {CATEGORIES.map(k => <option key={k} value={k}>{CATEGORY_LABELS[k]}</option>)}
              </select>
            </label>
            <label className="text-xs text-gray-500 block">
              票据日期
              <input type="date" value={form.occurredOn} onChange={e => setForm({ ...form, occurredOn: e.target.value })}
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </label>
            <label className="text-xs text-gray-500 block">
              金额（元）
              <input type="number" min={0} step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })}
                placeholder="如：128.50"
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </label>
            <label className="text-xs text-gray-500 block">
              事由
              <input value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} placeholder="如：见客户打车报销"
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </label>
            <button onClick={submit} disabled={busy}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 text-sm">
              提交并启动审批流
            </button>
          </div>
        </div>

        {/* My records */}
        <div className="lg:col-span-2 bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden h-fit">
          <div className="p-4 border-b border-gray-100 bg-gray-50 font-medium text-gray-700 text-sm">我的报销记录</div>
          <div className="overflow-x-auto min-h-[200px]">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-white border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 font-medium">单号</th>
                  <th className="px-6 py-4 font-medium">类别</th>
                  <th className="px-6 py-4 font-medium">金额</th>
                  <th className="px-6 py-4 font-medium">票据日期</th>
                  <th className="px-6 py-4 font-medium">事由</th>
                  <th className="px-6 py-4 font-medium">状态</th>
                  <th className="px-6 py-4 font-medium text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {records.length === 0 ? (
                  <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-400">暂无报销记录</td></tr>
                ) : (
                  records.map((r, idx) => (
                    <motion.tr key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.03 }}
                      className="hover:bg-blue-50/50 transition-colors">
                      <td className="px-6 py-4 text-gray-600 font-mono text-xs">{r.code}</td>
                      <td className="px-6 py-4 text-gray-600">{r.category ? (CATEGORY_LABELS[r.category] || r.category) : '-'}</td>
                      <td className="px-6 py-4 text-gray-900 font-semibold">{fmtMoney(r.amount)}</td>
                      <td className="px-6 py-4 text-xs text-gray-500">{r.occurredOn ? new Date(r.occurredOn).toLocaleDateString('zh-CN') : '-'}</td>
                      <td className="px-6 py-4 text-xs text-gray-500 max-w-[160px] truncate" title={r.reason || ''}>{r.reason || '-'}</td>
                      <td className="px-6 py-4">{statusBadge(r.status)}</td>
                      <td className="px-6 py-4 text-right">
                        {(r.status === 'PENDING_APPROVAL' || r.status === 'SUBMITTED') && (
                          <button onClick={() => withdraw(r.id)} disabled={busy}
                            className="text-xs flex items-center gap-1 px-3 py-1.5 ml-auto bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-red-50 hover:text-red-600 disabled:opacity-50">
                            <Trash2 className="w-3 h-3" /> 撤销
                          </button>
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
    </div>
  );
}