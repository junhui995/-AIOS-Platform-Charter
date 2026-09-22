"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { ShieldAlert, BellRing, CheckCircle2, Zap, AlertTriangle, Info, SearchCheck } from "lucide-react";

interface AlertRow {
  id: string;
  code: string;
  type: string;
  level: string;
  title: string;
  description: string;
  triggerTime: string;
  triggerRule: string;
  relatedObjectId: string;
  status: string;
  availableActions: string[];
}

interface Counts {
  total: number;
  open: number;
  byLevel: Record<string, number>;
}

interface RuleRunDetail {
  rule: string;
  scanned: number;
  hit: number;
  raised: number;
  skipped: number;
}

interface RunResult {
  raised: number;
  skipped: number;
  ranAt: string;
  rules: RuleRunDetail[];
}

const TYPE_LABELS: Record<string, string> = {
  contractExpiry: '合同到期', probationExpiry: '试用期到期', attendanceAnomaly: '考勤异常',
  overduePayment: '逾期付款', budgetOverrun: '预算超支',
};

const LEVEL_STYLE: Record<string, string> = {
  high: 'text-red-600 bg-red-50',
  medium: 'text-orange-600 bg-orange-50',
  low: 'text-blue-600 bg-blue-50',
};

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [counts, setCounts] = useState<Counts | null>(null);
  const [filter, setFilter] = useState({ type: '', level: '', status: '' });
  const [running, setRunning] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const [runError, setRunError] = useState<string | null>(null);

  const refresh = useCallback((filters = filter) => {
    const qs = new URLSearchParams(
      Object.entries(filters).filter(([, v]) => v).map(([k, v]) => [k, v] as [string, string])
    ).toString();
    fetch(`/api/alerts${qs ? `?${qs}` : ''}`).then(r => r.json()).then(d => {
      setAlerts(Array.isArray(d.alerts) ? d.alerts : []);
      setCounts(d.counts ?? null);
    }).catch(() => {});
  }, [filter]);

  useEffect(() => { refresh(); }, [refresh]);

  const run = async () => {
    setRunning(true);
    setRunError(null);
    try {
      const res = await fetch('/api/alerts', { method: 'POST' });
      const text = await res.text();
      if (!res.ok) {
        setRunError(text.startsWith('<') ? '服务返回异常页面，请刷新后重试' : (JSON.parse(text).error || '规则引擎运行失败'));
      } else {
        setRunResult(JSON.parse(text).run ?? JSON.parse(text));
      }
      refresh();
    } catch (err) {
      setRunError(err instanceof Error ? err.message : '规则引擎运行失败');
    } finally { setRunning(false); }
  };

  const resolve = async (id: string) => {
    setBusyId(id);
    try {
      await fetch(`/api/alerts/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ note: '已处理' }),
      });
      refresh();
    } finally { setBusyId(null); }
  };

  const typeFilter = (updates: Partial<typeof filter>) => {
    const next = { ...filter, ...updates };
    setFilter(next);
    refresh(next);
  };

  const open = counts?.open ?? 0;

  return (
    <div className="p-8 max-w-7xl mx-auto font-sans">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-blue-600" /> 预警中心 (Alert Center)
          </h1>
          <p className="text-gray-500 mt-2">规则引擎扫描合同到期 / 试用期到期 / 考勤异常，产出可跟踪、可关闭的预警，可接入消息推送。</p>
        </div>
        <button onClick={run} disabled={running}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 text-sm">
          <Zap className="w-4 h-4" /> {running ? '规则引擎运行中...' : '运行规则引擎'}
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-4">
          <div className="text-xs text-gray-500 flex items-center gap-1 mb-1"><BellRing className="w-3 h-3" /> 待处理预警</div>
          <div className="text-2xl font-bold text-orange-600">{counts ? open : '-'}</div>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-4">
          <div className="text-xs text-gray-500 flex items-center gap-1 mb-1">高风险</div>
          <div className="text-2xl font-bold text-red-600">{counts?.byLevel?.high ?? '-'}</div>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-4">
          <div className="text-xs text-gray-500 flex items-center gap-1 mb-1">中风险</div>
          <div className="text-2xl font-bold text-orange-500">{counts?.byLevel?.medium ?? '-'}</div>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-4">
          <div className="text-xs text-gray-500 flex items-center gap-1 mb-1">历史累计</div>
          <div className="text-2xl font-bold text-gray-900">{counts?.total ?? '-'}</div>
        </div>
      </div>

      {/* Run result panel */}
      {(running || runResult || runError) && (
        <div className={`bg-white border rounded-xl shadow-sm p-5 mb-6 ${runError ? 'border-red-200' : 'border-emerald-200'}`}>
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-4">
            <SearchCheck className={`w-4 h-4 ${runError ? 'text-red-600' : 'text-emerald-600'}`} />
            {runError
              ? <span className="text-red-600">规则引擎运行失败</span>
              : runResult
                ? `最近一次规则引擎运行 · ${new Date(runResult.ranAt).toLocaleString('zh-CN')}`
                : '规则引擎正在扫描…'}
          </div>
          {runError ? <div className="text-sm text-red-600">{runError}</div> : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-emerald-50 rounded-lg p-3">
                <div className="text-xs text-emerald-600 mb-0.5">本次新增预警</div>
                <div className="text-xl font-bold text-emerald-700">{running ? '…' : runResult?.raised ?? 0}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-0.5">幂等跳过（已存在）</div>
                <div className="text-xl font-bold text-gray-700">{running ? '…' : runResult?.skipped ?? 0}</div>
              </div>
              <div className="bg-blue-50 rounded-lg p-3">
                <div className="text-xs text-blue-600 mb-0.5">扫描记录 / 命中规则</div>
                <div className="text-xl font-bold text-blue-700">
                  {running ? '…' : runResult ? `${runResult.rules.reduce((s, r) => s + r.scanned, 0)} / ${runResult.rules.reduce((s, r) => s + r.hit, 0)}` : '-'}
                </div>
              </div>
              <div className="bg-white border border-gray-100 rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-0.5">覆盖规则</div>
                <div className="text-xl font-bold text-gray-700">{running ? '…' : runResult?.rules.length ?? 0}</div>
              </div>
            </div>
          )}
          {runResult && (
            <div className="mt-4 space-y-2">
              {runResult.rules.map(rr => {
                const [label, sub] = rr.rule === 'contractExpiry'
                  ? ['合同到期', '剩余≤60天']
                  : rr.rule === 'probationExpiry' ? ['试用期到期', '剩余≤90天'] : ['考勤异常', '近7天非正常'];
                return (
                  <div key={rr.rule} className="flex flex-wrap items-center gap-3 text-xs">
                    <span className="w-24 font-medium text-gray-700">{label}</span>
                    <span className="text-gray-400">扫描 {rr.scanned} · 命中 {rr.hit}</span>
                    <span className={`${rr.raised > 0 ? 'text-emerald-600 font-semibold' : 'text-gray-500'}`}>新增 {rr.raised}</span>
                    {rr.skipped > 0 && <span className="text-gray-400">跳过 {rr.skipped}</span>}
                    <span className="text-gray-300 ml-auto">{sub}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        {(['', 'contractExpiry', 'probationExpiry', 'attendanceAnomaly'] as const).map(t => (
          <button key={t}
            onClick={() => typeFilter({ type: t === '' ? '' : t })}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${filter.type === t ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'}`}>
            {t === '' ? '全部类型' : TYPE_LABELS[t]}
          </button>
        ))}
        <div className="flex-1" />
        {(['', 'pending', 'resolved'] as const).map(s => (
          <button key={s}
            onClick={() => typeFilter({ status: s === '' ? '' : s })}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${filter.status === s ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}>
            {s === '' ? '全部状态' : s === 'pending' ? '待处理' : '已关闭'}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto min-h-[200px]">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-white border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 font-medium">级别</th>
                <th className="px-6 py-4 font-medium">类型</th>
                <th className="px-6 py-4 font-medium">标题</th>
                <th className="px-6 py-4 font-medium">触发时间</th>
                <th className="px-6 py-4 font-medium">状态</th>
                <th className="px-6 py-4 font-medium text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {alerts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400 flex flex-col items-center justify-center">
                    <AlertTriangle className="w-5 h-5 mb-2 mx-auto" />
                    暂无预警，点击右上角运行规则引擎
                  </td>
                </tr>
              ) : (
                alerts.map((a, idx) => (
                  <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.03 }}
                    key={a.id} className="hover:bg-blue-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${LEVEL_STYLE[a.level] || 'text-gray-600 bg-gray-50'}`}>
                        {a.level === 'high' ? <AlertTriangle className="w-3 h-3" /> : a.level === 'medium' ? <ShieldAlert className="w-3 h-3" /> : <Info className="w-3 h-3" />}
                        {a.level === 'high' ? '高' : a.level === 'medium' ? '中' : '低'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500">{TYPE_LABELS[a.type] || a.type}</td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{a.title}</div>
                      <div className="text-xs text-gray-400 mt-0.5 max-w-[280px] truncate" title={a.description}>{a.description}</div>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500">{new Date(a.triggerTime).toLocaleString('zh-CN')}</td>
                    <td className="px-6 py-4">
                      {a.status === 'resolved'
                        ? <span className="inline-flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded text-xs font-medium"><CheckCircle2 className="w-3 h-3" /> 已关闭</span>
                        : <span className="inline-flex items-center gap-1 text-orange-600 bg-orange-50 px-2 py-1 rounded text-xs font-medium"><BellRing className="w-3 h-3" /> {a.status === 'processing' ? '处理中' : '待处理'}</span>}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {a.status !== 'resolved' && (
                        <button onClick={() => resolve(a.id)} disabled={busyId === a.id}
                          className="text-xs px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-green-50 hover:text-green-700 disabled:opacity-50">
                          标记已处理
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
  );
}