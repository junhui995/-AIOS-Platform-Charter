"use client";

import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Gauge, Plus, RefreshCw, CalendarClock, AlarmClockPlus, Hand, BellRing, Zap, History, Pencil, AlertTriangle, Info, ShieldAlert } from 'lucide-react';
import RuleDrawer, { type MonitorRule, type RegistryEntity } from '@/components/rules/RuleDrawer';

interface Summary {
  total: number;
  enabled: number;
  lastRunAt: string | null;
  openAlerts: Record<string, number>;
}

const LEVEL_STYLE: Record<string, string> = {
  high: 'text-red-600 bg-red-50',
  medium: 'text-orange-600 bg-orange-50',
  low: 'text-blue-600 bg-blue-50',
};
const LEVEL_LABEL: Record<string, string> = { high: '高', medium: '中', low: '低' };
const LEVEL_ICON: Record<string, typeof AlertTriangle> = { high: AlertTriangle, medium: ShieldAlert, low: Info };

const TYPE_LABEL: Record<string, string> = {
  laborContract: '劳动合同', employee: '员工花名册', leaveRequest: '请假申请', expense: '报销单', dailyAttendance: '日考勤',
};

function scheduleText(s: MonitorRule['schedule']): string {
  if (!s) return '-';
  if (s.kind === 'interval') return `每 ${s.minutes ?? 60} 分钟`;
  if (s.kind === 'dailyAt') return `每日 ${s.at ?? '09:00'}`;
  return '仅手动';
}

async function readJson(res: Response): Promise<Record<string, unknown>> {
  const raw = await res.text();
  try { return raw ? JSON.parse(raw) : {}; } catch { return {}; }
}

export default function RulesPage() {
  const [rules, setRules] = useState<MonitorRule[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [entities, setEntities] = useState<RegistryEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawer, setDrawer] = useState<{ mode: 'create' | 'edit'; rule: MonitorRule | null } | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [ruleRes, regRes] = await Promise.all([
        fetch('/api/monitor/rules'),
        fetch('/api/monitor/registry'),
      ]);
      const ruleData = await readJson(ruleRes);
      const regData = await readJson(regRes);
      setRules(Array.isArray(ruleData.rules) ? ruleData.rules as MonitorRule[] : []);
      setSummary((ruleData.summary as Summary) ?? null);
      if (Array.isArray(regData.entities)) {
        setEntities(regData.entities as RegistryEntity[]);
        setLoading(false);
      }
    } catch { /* browser network */ setLoading(false); }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const toggleEnabled = async (rule: MonitorRule) => {
    await fetch(`/api/monitor/rules/${rule.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled: !rule.enabled }),
    });
    refresh();
  };

  const openAlerts = (code: string) => summary?.openAlerts?.[code] ?? 0;

  return (
    <div className="p-8 max-w-7xl mx-auto font-sans">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Gauge className="w-6 h-6 text-purple-600" /> 监控规则引擎 (Rule Engine)
          </h1>
          <p className="text-gray-500 mt-2">多行规则定义触发条件 + 调度 + 渠道；点击任一行进入二级配置面板，字段树 / 公式 / 日志一体化编排。</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={refresh} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm">
            <RefreshCw className="w-4 h-4" /> 刷新
          </button>
          <button onClick={() => setDrawer({ mode: 'create', rule: null })}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-sm text-sm">
            <Plus className="w-4 h-4" /> 新建规则
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-4">
          <div className="text-xs text-gray-500 flex items-center gap-1 mb-1"><Gauge className="w-3 h-3" /> 规则总数</div>
          <div className="text-2xl font-bold text-gray-900">{loading ? '-' : summary?.total ?? '-'}</div>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-4">
          <div className="text-xs text-gray-500 flex items-center gap-1 mb-1"><Zap className="w-3 h-3" /> 启用中</div>
          <div className="text-2xl font-bold text-emerald-600">{loading ? '-' : summary?.enabled ?? '-'}</div>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-4">
          <div className="text-xs text-gray-500 flex items-center gap-1 mb-1"><History className="w-3 h-3" /> 最近运行</div>
          <div className="text-xl font-bold text-gray-900">{summary?.lastRunAt ? new Date(summary.lastRunAt).toLocaleString('zh-CN').slice(5, 16) : '-'}</div>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-4">
          <div className="text-xs text-gray-500 flex items-center gap-1 mb-1"><BellRing className="w-3 h-3" /> 待处理预警</div>
          <div className="text-2xl font-bold text-orange-600">
            {Object.values(summary?.openAlerts ?? {}).reduce((s, n) => s + n, 0)}
          </div>
        </div>
      </div>

      {/* Rules list */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto min-h-[200px]">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-white border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 font-medium">规则</th>
                <th className="px-6 py-4 font-medium">级别</th>
                <th className="px-6 py-4 font-medium">监控事项</th>
                <th className="px-6 py-4 font-medium">调度</th>
                <th className="px-6 py-4 font-medium">最近运行</th>
                <th className="px-6 py-4 font-medium text-center">待处理</th>
                <th className="px-6 py-4 font-medium text-center">状态</th>
                <th className="px-6 py-4 font-medium text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={8} className="px-6 py-12 text-center text-gray-400">加载中…</td></tr>
              ) : rules.length === 0 ? (
                <tr><td colSpan={8} className="px-6 py-12 text-center text-gray-400 flex flex-col items-center justify-center">
                  <Gauge className="w-5 h-5 mb-2 mx-auto" /> 暂无规则，点击右上角「新建规则」
                </td></tr>
              ) : rules.map((r, idx) => {
                const LevelIcon = LEVEL_ICON[r.level] ?? Info;
                return (
                  <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.03 }}
                    key={r.id}
                    onClick={() => setDrawer({ mode: 'edit', rule: r })}
                    className="hover:bg-purple-50/40 transition-colors cursor-pointer">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{r.name}</div>
                      <div className="text-xs text-gray-400 mt-0.5 font-mono">{r.code}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${LEVEL_STYLE[r.level] || 'text-gray-600 bg-gray-50'}`}>
                        <LevelIcon className="w-3 h-3" /> {LEVEL_LABEL[r.level] ?? r.level}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-600">{TYPE_LABEL[r.target] ?? r.target}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 text-xs text-gray-600">
                        {r.schedule?.kind === 'interval'
                          ? <AlarmClockPlus className="w-3.5 h-3.5 text-gray-400" />
                          : r.schedule?.kind === 'dailyAt'
                            ? <CalendarClock className="w-3.5 h-3.5 text-gray-400" />
                            : <Hand className="w-3.5 h-3.5 text-gray-400" />}
                        {scheduleText(r.schedule)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500">
                      {r.runs?.[0]
                        ? <span className={r.runs[0].status === 'error' ? 'text-red-600' : ''}>{new Date(r.runs[0].ranAt).toLocaleString('zh-CN').slice(5)}</span>
                        : <span className="text-gray-300">未运行</span>}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {openAlerts(r.code) > 0
                        ? <span className="inline-flex items-center justify-center min-w-[24px] px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700 text-xs font-semibold">{openAlerts(r.code)}</span>
                        : <span className="text-gray-200">0</span>}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button onClick={(e) => { e.stopPropagation(); toggleEnabled(r); }}
                        className={`w-10 h-[22px] rounded-full transition-colors relative ${r.enabled ? 'bg-emerald-500' : 'bg-gray-200'}`}>
                        <span className={`absolute top-0.5 w-[18px] h-[18px] rounded-full bg-white shadow transition-all ${r.enabled ? 'left-[20px]' : 'left-0.5'}`} />
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={(e) => { e.stopPropagation(); setDrawer({ mode: 'edit', rule: r }); }}
                        className="inline-flex items-center gap-1 text-xs px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100">
                        <Pencil className="w-3 h-3" /> 编辑
                      </button>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-gray-400 mt-4">
        提示：点击行或「编辑」打开二级配置面板；「运行日志」支持立即运行并查看每次扫描/命中/新增明细。钉钉 / 企业微信告警通道为 Phase C 预留。
      </p>

      {drawer && (
        <RuleDrawer
          mode={drawer.mode}
          initial={drawer.rule}
          entities={entities}
          onClose={(refreshList) => { setDrawer(null); if (refreshList) refresh(); }}
        />
      )}
    </div>
  );
}