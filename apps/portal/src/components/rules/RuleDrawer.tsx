"use client";

import { useState } from 'react';
import { X, Save, Trash2, Play, CheckCircle2, AlertTriangle, ChevronDown, Loader2, TerminalSquare } from 'lucide-react';

export interface RegistryField {
  name: string;
  label: string;
  type: string;
  derived?: boolean;
}
export interface RegistryEntity {
  key: string;
  label: string;
  description?: string;
  fields: RegistryField[];
}
export interface RuleAction {
  id?: string;
  channel: string;
  template: string;
  throttleSec?: number;
  enabled?: boolean;
}
export interface MonitorRule {
  id: string;
  code: string;
  name: string;
  module: string;
  level: string;
  enabled: boolean;
  target: string;
  scopeFilter: unknown | null;
  conditionExpr: string;
  schedule: { kind: string; minutes?: number | null; at?: string | null } | null;
  version: number;
  lastRunAt: string | null;
  createdAt: string;
  actions: RuleAction[];
  runs?: { id: string; ranAt: string; status: string }[];
}
export interface RunLog {
  id: string;
  ranAt: string;
  scanned: number;
  hit: number;
  raised: number;
  skipped: number;
  durationMs: number;
  status: string;
  error: string | null;
}
export interface RunSummary {
  ruleId: string;
  code: string;
  ranAt: string;
  scanned: number;
  hit: number;
  raised: number;
  skipped: number;
  durationMs: number;
  status: string;
}

const CHANNELS = [
  { key: 'inapp', label: '站内通知' },
  { key: 'dingtalk', label: '钉钉' },
  { key: 'wecom', label: '企业微信' },
];

const MODULES = ['hr', 'finance', 'ops', 'admin'];
const LEVELS = [
  { key: 'high', label: '高', cls: 'text-red-600 bg-red-50 border-red-200' },
  { key: 'medium', label: '中', cls: 'text-orange-600 bg-orange-50 border-orange-200' },
  { key: 'low', label: '低', cls: 'text-blue-600 bg-blue-50 border-blue-200' },
];

async function readJson(res: Response): Promise<{ ok: boolean; data: Record<string, unknown>; raw: string }> {
  const raw = await res.text();
  let data: Record<string, unknown> = {};
  try { data = raw ? JSON.parse(raw) : {}; } catch { /* non-json */ }
  return { ok: res.ok, data, raw };
}

const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 bg-white';
const labelCls = 'block text-xs font-medium text-gray-500 mb-1.5';
const sectionTitle = 'text-xs font-semibold text-gray-800 uppercase tracking-wider mb-3 flex items-center gap-1.5';

interface Props {
  mode: 'create' | 'edit';
  initial: MonitorRule | null;
  entities: RegistryEntity[];
  onClose: (refresh: boolean) => void;
}

export default function RuleDrawer({ mode, initial, entities, onClose }: Props) {
  const [tab, setTab] = useState<'config' | 'logs'>('config');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [code, setCode] = useState(initial?.code ?? '');
  const [name, setName] = useState(initial?.name ?? '');
  const [module, setModule] = useState(initial?.module ?? 'hr');
  const [level, setLevel] = useState(initial?.level ?? 'medium');
  const [enabled, setEnabled] = useState(initial?.enabled ?? true);
  const [target, setTarget] = useState(initial?.target ?? entities[0]?.key ?? 'laborContract');
  const [conditionExpr, setConditionExpr] = useState(initial?.conditionExpr ?? '');
  const [scopeJson, setScopeJson] = useState(initial && initial.scopeFilter ? JSON.stringify(initial.scopeFilter, null, 2) : '');
  const [exprCheck, setExprCheck] = useState<{ ok: boolean; error?: string } | null>(null);

  const sched = initial?.schedule;
  const [schedKind, setSchedKind] = useState<'interval' | 'dailyAt' | 'manual'>(sched?.kind === 'interval' ? 'interval' : sched?.kind === 'manual' ? 'manual' : 'dailyAt');
  const [schedMinutes, setSchedMinutes] = useState(sched?.kind === 'interval' && sched.minutes ? String(sched.minutes) : '60');
  const [schedAt, setSchedAt] = useState(sched?.kind === 'dailyAt' && sched.at ? sched.at : '09:00');

  const firstTemplate = initial?.actions.find(a => a.channel === 'inapp')?.template ?? '';
  const [channels, setChannels] = useState<string[]>(
    initial?.actions?.length ? Array.from(new Set(initial.actions.map(a => a.channel))) : ['inapp']
  );
  const [template, setTemplate] = useState(firstTemplate === '' && initial ? (initial.actions[0]?.template ?? '') : firstTemplate);

  const [running, setRunning] = useState(false);
  const [lastSummary, setLastSummary] = useState<RunSummary | null>(null);
  const [logs, setLogs] = useState<RunLog[]>([]);
  const [logsLoaded, setLogsLoaded] = useState(false);

  const entity = entities.find(e => e.key === target);

  const toggleChannel = (ch: string) => {
    setChannels(prev => prev.includes(ch) ? prev.filter(c => c !== ch) : [...prev, ch]);
  };

  const openLogs = async () => {
    setTab('logs');
    setLogsLoaded(Boolean(logs.length));
    try {
      const res = await fetch(`/api/monitor/rules/${initial?.id}/logs?take=20`);
      const { data } = await readJson(res);
      setLogs(Array.isArray(data.logs) ? data.logs as RunLog[] : []);
      setLogsLoaded(true);
    } catch { setLogsLoaded(true); }
  };

  const runNow = async () => {
    if (!initial) return;
    setRunning(true);
    setError(null);
    try {
      const res = await fetch(`/api/monitor/rules/${initial.id}/run`, { method: 'POST' });
      const { data } = await readJson(res);
      if (!res.ok) { setError((data.error as string) ?? '运行失败'); return; }
      setLastSummary((data.summary as RunSummary) ?? null);
      await openLogs();
    } catch (err) { setError(err instanceof Error ? err.message : '运行失败'); }
    finally { setRunning(false); }
  };

  const checkExpr = async () => {
    setExprCheck(null);
    const res = await fetch('/api/monitor/validate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ conditionExpr }),
    });
    const { data } = await readJson(res);
    setExprCheck({ ok: Boolean(data.ok), error: (data.error as string | undefined) });
  };

  const insertField = (field: string, into: 'expr' | 'template') => {
    if (into === 'expr') setConditionExpr(prev => prev ? `${prev} ${field}` : field);
    else setTemplate(prev => prev ? `${prev}${field}` : field);
  };

  const buildPayload = () => {
    let scopeFilter: unknown = undefined;
    if (scopeJson.trim()) {
      scopeFilter = JSON.parse(scopeJson); // validated before save
    } else if (mode === 'edit') {
      scopeFilter = null; // explicit clear
    }
    const schedule = schedKind === 'interval'
      ? { kind: 'interval' as const, minutes: Math.max(1, Number(schedMinutes) || 60) }
      : schedKind === 'dailyAt'
        ? { kind: 'dailyAt' as const, at: schedAt }
        : { kind: 'manual' as const };
    return {
      ...(mode === 'create' ? { code } : { code }),
      name,
      module,
      level,
      enabled,
      target,
      scopeFilter,
      conditionExpr,
      schedule,
      actions: channels.map(ch => ({ channel: ch, template: template || `{{ruleName}}: 命中 {{targetLabel}} 记录 ({{objectId}})` })),
    };
  };

  const save = async () => {
    setBusy(true);
    setError(null);
    setSaved(false);
    const payload = buildPayload();
    try {
      const res = await fetch(mode === 'create' ? '/api/monitor/rules' : `/api/monitor/rules/${initial?.id}`, {
        method: mode === 'create' ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const { data } = await readJson(res);
      if (!res.ok) { setError((data.error as string) ?? '保存失败'); return; }
      setSaved(true);
      setTimeout(() => onClose(true), 600);
    } catch (err) { setError(err instanceof Error ? err.message : '保存失败'); }
    finally { setBusy(false); }
  };

  const remove = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/monitor/rules/${initial?.id}`, { method: 'DELETE' });
      const { data } = await readJson(res);
      if (!res.ok) { setError((data.error as string) ?? '删除失败'); setBusy(false); return; }
      onClose(true);
    } catch (err) { setError(err instanceof Error ? err.message : '删除失败'); setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30" onClick={() => !busy && onClose(false)} />
      <div className="absolute right-0 top-0 h-full w-[720px] max-w-[92vw] bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{mode === 'create' ? '新建规则' : '编辑规则'}</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {mode === 'edit' && initial ? `${initial.name} · ${initial.code}` : '配置规则触发条件、调度与报警渠道'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {saved && <span className="flex items-center gap-1 text-xs text-emerald-600"><CheckCircle2 className="w-3.5 h-3.5" /> 已保存</span>}
            <button onClick={() => !busy && onClose(false)} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-50 rounded-lg"><X className="w-4 h-4" /></button>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-4 flex gap-1 border-b border-gray-100">
          {(['config', 'logs'] as const).map(t => (
            <button key={t} onClick={() => t === 'logs' ? openLogs() : setTab(t)}
              className={`px-4 py-2 text-sm rounded-t-lg border-b-2 transition-colors ${tab === t ? 'border-blue-600 text-blue-600 font-medium' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
              {t === 'config' ? '规则配置' : '运行日志'}
            </button>
          ))}
        </div>

        {/* Body */}
        {tab === 'config' ? (
          <>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              {error && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /> <span>{error}</span>
                </div>
              )}

              {/* 基本信息 */}
              <section>
                <div className={sectionTitle}>基本信息</div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>规则编码 code</label>
                    <input value={code} onChange={e => setCode(e.target.value)} placeholder="RULE-XXX" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>规则名称</label>
                    <input value={name} onChange={e => setName(e.target.value)} placeholder="例如：合同即将到期" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>模块</label>
                    <select value={module} onChange={e => setModule(e.target.value)} className={inputCls}>
                      {MODULES.map(m => <option key={m} value={m}>{m.toUpperCase()}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>启用状态</label>
                    <div className="flex items-center gap-2 h-[38px]">
                      <button onClick={() => setEnabled(!enabled)}
                        className={`w-10 h-[22px] rounded-full transition-colors relative ${enabled ? 'bg-blue-600' : 'bg-gray-200'}`}>
                        <span className={`absolute top-0.5 w-[18px] h-[18px] rounded-full bg-white shadow transition-all ${enabled ? 'left-[20px]' : 'left-0.5'}`} />
                      </button>
                      <span className="text-sm text-gray-600">{enabled ? '已启用' : '已停用'}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-4">
                  <label className={labelCls}>预警级别</label>
                  <div className="flex gap-3">
                    {LEVELS.map(lv => (
                      <button key={lv.key} onClick={() => setLevel(lv.key)}
                        className={`px-4 py-1.5 rounded-lg border text-sm transition-colors ${level === lv.key ? lv.cls + ' font-medium' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                        {lv.label}
                      </button>
                    ))}
                  </div>
                </div>
              </section>

              {/* 监控事项 */}
              <section>
                <div className={sectionTitle}>监控事项（目标实体）</div>
                <select value={target} onChange={e => setTarget(e.target.value)} className={inputCls}>
                  {entities.map(ent => <option key={ent.key} value={ent.key}>{ent.label}（{ent.key}）</option>)}
                </select>
                {entity?.description && <p className="text-xs text-gray-400 mt-1.5">{entity.description}</p>}
              </section>

              {/* 触发条件 */}
              <section>
                <div className={sectionTitle}>公式触发条件</div>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {entity?.fields.map(f => (
                    <button key={f.name} onClick={() => insertField(`@${f.name}`, 'expr')}
                      title={f.derived ? '派生字段（运行时计算）' : f.type}
                      className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 font-mono">
                      @{f.name}
                      {f.derived && <span className="text-blue-400 ml-0.5">✦</span>}
                    </button>
                  ))}
                </div>
                <textarea value={conditionExpr} onChange={e => setConditionExpr(e.target.value)} rows={4}
                  placeholder={"例如：@daysRemaining <= 60 && @daysRemaining > 0"}
                  className={`${inputCls} font-mono text-[13px] resize-y`} />
                <div className="mt-2 flex items-center gap-3">
                  <button onClick={checkExpr}
                    className="text-xs px-3 py-1.5 bg-gray-800 text-white rounded-lg hover:bg-gray-700 flex items-center gap-1.5">
                    <TerminalSquare className="w-3.5 h-3.5" /> 检查语法
                  </button>
                  {exprCheck && (exprCheck.ok
                    ? <span className="flex items-center gap-1 text-xs text-emerald-600"><CheckCircle2 className="w-3.5 h-3.5" /> 表达式合法</span>
                    : <span className="flex items-center gap-1 text-xs text-red-600"><AlertTriangle className="w-3.5 h-3.5" /> {exprCheck.error}</span>)}
                </div>
              </section>

              {/* 调度 */}
              <section>
                <div className={sectionTitle}>调度</div>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {(['dailyAt', 'interval', 'manual'] as const).map(kind => (
                    <button key={kind} onClick={() => setSchedKind(kind)}
                      className={`px-3 py-2 rounded-lg border text-sm transition-colors ${schedKind === kind ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-600 hover:border-blue-300'}`}>
                      {kind === 'dailyAt' ? '每日定时' : kind === 'interval' ? '每隔多久' : '仅手动'}
                    </button>
                  ))}
                </div>
                {schedKind === 'interval' && (
                  <div className="flex items-center gap-3">
                    <label className={labelCls}>间隔（分钟）</label>
                    <input type="number" min={1} value={schedMinutes} onChange={e => setSchedMinutes(e.target.value)} className={`${inputCls} w-32`} />
                  </div>
                )}
                {schedKind === 'dailyAt' && (
                  <div className="flex items-center gap-3">
                    <label className={labelCls}>每日执行时间</label>
                    <input type="time" value={schedAt} onChange={e => setSchedAt(e.target.value)} className={`${inputCls} w-32`} />
                  </div>
                )}
                {(schedKind === 'manual' || schedKind === 'interval') && (
                  <p className="text-xs text-gray-400 mt-2">由调度器按 `runDueRules` 节拍触发；也可在「运行日志」手动立即运行。</p>
                )}
              </section>

              {/* 高级：数据范围 */}
              <section>
                <button onClick={() => setShowAdvanced(!showAdvanced)} className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-3 hover:text-gray-800">
                  <ChevronDown className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} /> 数据范围（高级 · scopeFilter JSON）
                </button>
                {showAdvanced && (
                  <>
                    <textarea value={scopeJson} onChange={e => setScopeJson(e.target.value)} rows={3}
                      placeholder={'可选，例如：{"status": "ACTIVE"}；留空表示扫描全部记录，编辑时留空会清空该过滤。'}
                      className={`${inputCls} font-mono text-[13px] resize-y`} />
                    <p className="text-xs text-gray-400 mt-1.5">以 Prisma where 语法过滤目标实体记录。</p>
                  </>
                )}
              </section>

              {/* 报警渠道 */}
              <section>
                <div className={sectionTitle}>报警渠道与内容</div>
                <div className="flex flex-wrap gap-2 mb-3">
                  {CHANNELS.map(ch => (
                    <button key={ch.key} onClick={() => toggleChannel(ch.key)}
                      className={`px-3 py-1.5 rounded-full border text-sm transition-colors ${channels.includes(ch.key) ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-600 hover:border-blue-300'}`}>
                      {ch.label}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {entity?.fields.map(f => (
                    <button key={f.name} onClick={() => insertField(`{{${f.name}}}`, 'template')}
                      className="text-xs px-2 py-1 bg-emerald-50 text-emerald-700 rounded-md hover:bg-emerald-100 font-mono">
                      {'{{'}{f.name}{'}}'}
                    </button>
                  ))}
                </div>
                <textarea value={template} onChange={e => setTemplate(e.target.value)} rows={3}
                  placeholder={"例如：{{employeeName}}（{{employeeCode}}）合同 {{code}} 剩余 {{daysRemaining}} 天到期。"}
                  className={`${inputCls} text-[13px] resize-y`} />
                <p className="text-xs text-gray-400 mt-1.5">模板内可用 {'{{字段名}}'} 引用命中记录；钉钉 / 企业微信接入见 Phase C（当前仅记录）。</p>
              </section>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
              {mode === 'edit' && initial ? (
                confirmDelete ? (
                  <div className="flex items-center gap-2 text-sm text-red-600">
                    确认删除？
                    <button onClick={remove} disabled={busy} className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs hover:bg-red-700 disabled:opacity-50">是</button>
                    <button onClick={() => setConfirmDelete(false)} className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs">取消</button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmDelete(true)} disabled={busy}
                    className="flex items-center gap-1.5 px-3 py-2 text-red-600 border border-red-200 rounded-lg text-xs hover:bg-red-50 disabled:opacity-50">
                    <Trash2 className="w-3.5 h-3.5" /> 删除规则
                  </button>
                )
              ) : <div />}
              <div className="flex items-center gap-2">
                <button onClick={() => onClose(false)} className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">取消</button>
                <button onClick={save} disabled={busy}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} 保存
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {error && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /> <span>{error}</span>
                </div>
              )}
              <div className="flex flex-wrap items-center gap-4">
                <button onClick={runNow} disabled={running || !initial}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm disabled:opacity-50">
                  {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  {running ? '运行中…' : '立即运行本规则'}
                </button>
                {initial?.lastRunAt && (
                  <span className="text-xs text-gray-400">上次调度运行：{new Date(initial.lastRunAt).toLocaleString('zh-CN')}</span>
                )}
                <div className="flex-1" />
                {initial?.runs?.[0] && (
                  <span className="text-xs text-gray-400">最近状态：{initial.runs[0].status}</span>
                )}
              </div>

              {lastSummary && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-emerald-700 mb-3">
                    <CheckCircle2 className="w-4 h-4" /> 运行完成 · {new Date(lastSummary.ranAt).toLocaleString('zh-CN')}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    <div><div className="text-xs text-emerald-600">扫描</div><div className="text-xl font-bold text-emerald-800">{lastSummary.scanned}</div></div>
                    <div><div className="text-xs text-emerald-600">命中</div><div className="text-xl font-bold text-emerald-800">{lastSummary.hit}</div></div>
                    <div><div className="text-xs text-emerald-600">新增预警</div><div className="text-xl font-bold text-emerald-800">{lastSummary.raised}</div></div>
                    <div><div className="text-xs text-emerald-600">幂等跳过</div><div className="text-xl font-bold text-emerald-800">{lastSummary.skipped}</div></div>
                  </div>
                </div>
              )}

              <div>
                <div className={sectionTitle}>运行记录</div>
                <div className="bg-white border border-gray-100 rounded-xl overflow-hidden text-sm">
                  {!logsLoaded ? (
                    <div className="px-6 py-8 text-center text-gray-400 text-xs">加载中…</div>
                  ) : logs.length === 0 ? (
                    <div className="px-6 py-8 text-center text-gray-400 text-xs">暂无运行记录，点击上方「立即运行」</div>
                  ) : (
                    <table className="w-full text-left">
                      <thead className="text-xs text-gray-500 bg-gray-50 border-b border-gray-100">
                        <tr>
                          <th className="px-4 py-3 font-medium">运行时间</th>
                          <th className="px-4 py-3 font-medium">扫描</th>
                          <th className="px-4 py-3 font-medium">命中</th>
                          <th className="px-4 py-3 font-medium">新增</th>
                          <th className="px-4 py-3 font-medium">跳过</th>
                          <th className="px-4 py-3 font-medium">状态</th>
                          <th className="px-4 py-3 font-medium">耗时</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {logs.map(l => (
                          <tr key={l.id} className="hover:bg-gray-50/70">
                            <td className="px-4 py-3 text-xs text-gray-500">{new Date(l.ranAt).toLocaleString('zh-CN')}</td>
                            <td className="px-4 py-3">{l.scanned}</td>
                            <td className="px-4 py-3">{l.hit}</td>
                            <td className={`px-4 py-3 ${l.raised > 0 ? 'text-emerald-600 font-semibold' : ''}`}>{l.raised}</td>
                            <td className="px-4 py-3 text-gray-500">{l.skipped}</td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${l.status === 'ok' ? 'text-emerald-600 bg-emerald-50' : l.status === 'error' ? 'text-red-600 bg-red-50' : 'text-gray-500 bg-gray-50'}`}>
                                {l.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-400">{l.durationMs}ms</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
                {logs.find(l => l.status === 'error') && (
                  <div className="mt-2 text-xs text-red-600">
                    {logs.filter(l => l.error).map(l => <div key={l.id}>· {l.error}</div>)}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}