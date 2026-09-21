"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Wallet, CheckCircle2, XCircle, Clock, Gift, AlertTriangle } from "lucide-react";

interface ExpenseRow {
  id: string;
  code: string;
  amount: string | number;
  reason: string;
  status: string;
  employee: { name: string; code: string };
  department?: { name: string } | null;
  approvedBy?: { name: string } | null;
  createdAt: string;
  processInstanceId?: string | null;
}

export default function ExpensesPage() {
  const [rows, setRows] = useState<ExpenseRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = () => {
    fetch('/api/hr/expenses').then(r => r.json()).then(setRows).catch(() => {});
  };

  useEffect(() => { refresh(); }, []);

  const decide = async (id: string, action: 'APPROVE' | 'REJECT') => {
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch(`/api/hr/expenses/${id}`, {
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

  const statusBadge = (s: string) => {
    switch (s) {
      case 'APPROVED': return <span className="inline-flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded text-xs font-medium"><CheckCircle2 className="w-3 h-3" /> 已通过</span>;
      case 'REJECTED': return <span className="inline-flex items-center gap-1 text-red-600 bg-red-50 px-2 py-1 rounded text-xs font-medium"><XCircle className="w-3 h-3" /> 已驳回</span>;
      case 'PENDING_APPROVAL': return <span className="inline-flex items-center gap-1 text-orange-600 bg-orange-50 px-2 py-1 rounded text-xs font-medium"><Clock className="w-3 h-3" /> 待财务审批</span>;
      case 'SUBMITTED': return <span className="inline-flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-1 rounded text-xs font-medium"><Clock className="w-3 h-3" /> 已提交</span>;
      default: return <span className="inline-flex items-center gap-1 text-gray-600 bg-gray-50 px-2 py-1 rounded text-xs font-medium">{s}</span>;
    }
  };

  const counts = {
    pending: rows.filter(r => r.status === 'PENDING_APPROVAL' || r.status === 'SUBMITTED').length,
    approved: rows.filter(r => r.status === 'APPROVED').length,
    rejected: rows.filter(r => r.status === 'REJECTED').length,
    total: rows.length,
  };

  return (
    <div className="p-8 max-w-7xl mx-auto font-sans">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Wallet className="w-6 h-6 text-blue-600" /> 报销审批工作台 (Expense Approvals)
          </h1>
          <p className="text-gray-500 mt-2">AI 助手（AIOS Runtime）识别出的报销单在此汇聚，审批/驳回即回写事件总线并同步 BPM 审批流。</p>
        </div>
        {notice && <div className="text-sm text-blue-700 bg-blue-50 border border-blue-200 px-4 py-2 rounded-lg">{notice}</div>}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-4">
          <div className="text-xs text-gray-500 flex items-center gap-1 mb-1">待审批 + 已提交</div>
          <div className="text-2xl font-bold text-orange-600">{counts.pending}</div>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-4">
          <div className="text-xs text-gray-500 flex items-center gap-1 mb-1">已通过</div>
          <div className="text-2xl font-bold text-green-600">{counts.approved}</div>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-4">
          <div className="text-xs text-gray-500 flex items-center gap-1 mb-1">已驳回</div>
          <div className="text-2xl font-bold text-red-500">{counts.rejected}</div>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-4">
          <div className="text-xs text-gray-500 flex items-center gap-1 mb-1">本月总额</div>
          <div className="text-2xl font-bold text-gray-900">￥{rows.reduce((sum, r) => sum + Number(r.amount), 0).toFixed(2)}</div>
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100 bg-gray-50">
          <span className="font-medium text-gray-700 text-sm">报销单列表 (Expense Requests)</span>
          <button onClick={refresh} className="text-xs text-blue-600 hover:underline">刷新（含流程补开）</button>
        </div>
        <div className="overflow-x-auto min-h-[200px]">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-white border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 font-medium">单号</th>
                <th className="px-6 py-4 font-medium">申请人</th>
                <th className="px-6 py-4 font-medium">金额</th>
                <th className="px-6 py-4 font-medium">事由</th>
                <th className="px-6 py-4 font-medium">提交时间</th>
                <th className="px-6 py-4 font-medium">状态</th>
                <th className="px-6 py-4 font-medium text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-400">暂无报销单。让 AI 助手帮你报销一笔试试。</td>
                </tr>
              ) : (
                rows.map((r, idx) => {
                  const actionable = ['SUBMITTED', 'PENDING_APPROVAL'].includes(r.status);
                  return (
                    <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.04 }}
                      key={r.id} className="hover:bg-blue-50/50 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs text-gray-500">
                        {r.code}
                        {r.processInstanceId && <div className="text-[10px] text-blue-500 mt-0.5 flex items-center gap-1"><Gift className="w-3 h-3" />流程 #{r.processInstanceId.slice(0, 8)}</div>}
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-900">{r.employee?.name || '-'}</td>
                      <td className="px-6 py-4 font-mono text-gray-900">￥{Number(r.amount).toFixed(2)}</td>
                      <td className="px-6 py-4 text-xs text-gray-500 max-w-[220px] truncate" title={r.reason}>{r.reason}</td>
                      <td className="px-6 py-4 text-xs text-gray-500">{new Date(r.createdAt).toLocaleString('zh-CN')}</td>
                      <td className="px-6 py-4">{statusBadge(r.status)}</td>
                      <td className="px-6 py-4 text-right">
                        {actionable && (
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
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      <div className="mt-4 flex items-start gap-2 text-xs text-gray-400">
        <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
        <span>流程状态为 AIOS Runtime 侧 Guard 判定的主单据状态；页面上「通过/驳回」同时完成同一条 BPM 审批实例，可在「任务中心」看到审批历史。</span>
      </div>
    </div>
  );
}