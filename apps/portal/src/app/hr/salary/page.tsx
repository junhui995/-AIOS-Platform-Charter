"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { Calculator, Download, Play, Send, Plus, Pencil, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react';

interface Slip {
  id: string;
  employeeId: string;
  month: string;
  baseSalary: string;
  bonus: string;
  deductions: string;
  netPay: string;
  status: string;
  issuedAt: string | null;
  employee?: {
    code: string;
    name: string;
    role?: { name?: string } | null;
    positions?: Array<{ position?: { name?: string; department?: { name?: string } | null } | null }>;
  } | null;
}

interface Formula {
  id: string;
  targetType: string;
  targetId: string | null;
  expression: string;
  description: string | null;
}

const FIELD_LABELS: Record<string, string> = {
  baseSalary: '基础薪资',
  bonus: '奖金',
  deductions: '扣款',
  performanceScore: '绩效系数',
};

export default function SalaryPage() {
  const [month, setMonth] = useState('2026-07');
  const [slips, setSlips] = useState<Slip[]>([]);
  const [formulas, setFormulas] = useState<Formula[]>([]);
  const [tab, setTab] = useState<'slips' | 'formulas'>('slips');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [editing, setEditing] = useState<Slip | null>(null);
  const [editForm, setEditForm] = useState({ baseSalary: '0', bonus: '0', deductions: '0' });
  const [showFormula, setShowFormula] = useState(false);
  const [fForm, setFForm] = useState({ targetType: 'COMPANY', expression: '', description: '' });
  const [fValidate, setFValidate] = useState<{ ok: boolean | null; error?: string }>({ ok: null });

  const loadSlips = useCallback(async () => {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/salary/slips?month=${month}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '加载失败');
      setSlips(data);
    } catch (e) {
      setMsg({ kind: 'err', text: e instanceof Error ? e.message : '加载失败' });
    } finally {
      setLoading(false);
    }
  }, [month]);

  const loadFormulas = useCallback(async () => {
    try {
      const res = await fetch('/api/salary/formulas');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '加载失败');
      setFormulas(data);
    } catch (e) {
      setMsg({ kind: 'err', text: e instanceof Error ? e.message : '公式加载失败' });
    }
  }, []);

  useEffect(() => {
    loadSlips();
    loadFormulas();
  }, [loadSlips, loadFormulas]);

  const runPayroll = async () => {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch('/api/salary/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '批量计算失败');
      setMsg({ kind: 'ok', text: `已生成 ${data.created} 条、跳过 ${data.skipped} 条（在职 ${data.employees} 人）` });
      loadSlips();
    } catch (e) {
      setMsg({ kind: 'err', text: e instanceof Error ? e.message : '批量计算失败' });
    } finally {
      setLoading(false);
    }
  };

  const issueSlip = async (id: string) => {
    setMsg(null);
    try {
      const res = await fetch(`/api/salary/slips/${id}/issue`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '发布失败');
      setMsg({ kind: 'ok', text: '工资单已发布' });
      loadSlips();
    } catch (e) {
      setMsg({ kind: 'err', text: e instanceof Error ? e.message : '发布失败' });
    }
  };

  const deleteSlip = async (id: string) => {
    if (!confirm('确认删除该工资单（仅草稿可删）？')) return;
    setMsg(null);
    try {
      const res = await fetch(`/api/salary/slips/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '删除失败');
      setMsg({ kind: 'ok', text: '已删除' });
      loadSlips();
    } catch (e) {
      setMsg({ kind: 'err', text: e instanceof Error ? e.message : '删除失败' });
    }
  };

  const openEdit = (s: Slip) => {
    setEditing(s);
    setEditForm({
      baseSalary: s.baseSalary ?? '0',
      bonus: s.bonus ?? '0',
      deductions: s.deductions ?? '0',
    });
  };

  const saveEdit = async () => {
    if (!editing) return;
    setMsg(null);
    try {
      const res = await fetch(`/api/salary/slips/${editing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '保存失败');
      setMsg({ kind: 'ok', text: '已保存（实发自动重算）' });
      setEditing(null);
      loadSlips();
    } catch (e) {
      setMsg({ kind: 'err', text: e instanceof Error ? e.message : '保存失败' });
    }
  };

  const validateF = async () => {
    try {
      const res = await fetch('/api/salary/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expression: fForm.expression }),
      });
      const data = await res.json();
      setFValidate({ ok: data.ok, error: data.error });
    } catch {
      setFValidate({ ok: false, error: '校验请求失败' });
    }
  };

  const saveFormula = async () => {
    setMsg(null);
    try {
      const res = await fetch('/api/salary/formulas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '保存失败');
      setMsg({ kind: 'ok', text: '公式已保存' });
      setShowFormula(false);
      setFForm({ targetType: 'COMPANY', expression: '', description: '' });
      setFValidate({ ok: null });
      loadFormulas();
    } catch (e) {
      setMsg({ kind: 'err', text: e instanceof Error ? e.message : '保存失败' });
    }
  };

  const deleteFormula = async (id: string) => {
    if (!confirm('确认删除该公式？')) return;
    setMsg(null);
    try {
      const res = await fetch(`/api/salary/formulas/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '删除失败');
      setMsg({ kind: 'ok', text: '公式已删除' });
      loadFormulas();
    } catch (e) {
      setMsg({ kind: 'err', text: e instanceof Error ? e.message : '删除失败' });
    }
  };

  const exportCsv = () => {
    const header = '工号,姓名,部门,基础薪资,奖金,扣款,实发,状态\n';
    const rows = slips
      .map((s) =>
        [
          s.employee?.code ?? '',
          s.employee?.name ?? '',
          s.employee?.positions?.[0]?.position?.department?.name ?? '',
          s.baseSalary,
          s.bonus,
          s.deductions,
          s.netPay,
          s.status,
        ].join(','),
      )
      .join('\n');
    const blob = new Blob(['\ufeff' + header + rows], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `salary-${month}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Calculator className="w-6 h-6 text-blue-600" />
            薪资计算
          </h1>
          <p className="text-gray-500 mt-2">按岗位基准工资批量生成月度工资单，公式支持 @ 字段算术表达式。</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700"
          />
          <button
            onClick={exportCsv}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" /> 导出薪资单
          </button>
          <button
            onClick={runPayroll}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-60"
          >
            <Play className="w-4 h-4" /> 执行批量计算
          </button>
        </div>
      </div>

      {msg && (
        <div
          className={`mb-4 px-4 py-3 rounded-lg text-sm flex items-center gap-2 ${
            msg.kind === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}
        >
          {msg.kind === 'ok' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {msg.text}
        </div>
      )}

      <div className="flex gap-2 mb-4">
        {[
          { key: 'slips', label: '工资单' },
          { key: 'formulas', label: '结算公式' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as 'slips' | 'formulas')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.key ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'slips' && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          {slips.length === 0 ? (
            <div className="p-10 text-center text-gray-400 text-sm">
              {month} 暂无工资单，点击「执行批量计算」生成。
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-500">
                <tr>
                  {['工号', '姓名', '部门', '基础薪资', '奖金', '扣款', '实发', '状态', '操作'].map((h) => (
                    <th key={h} className="px-4 py-3 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {slips.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono">{s.employee?.code ?? '-'}</td>
                    <td className="px-4 py-3">{s.employee?.name ?? '-'}</td>
                    <td className="px-4 py-3">{s.employee?.positions?.[0]?.position?.department?.name ?? '-'}</td>
                    <td className="px-4 py-3">{s.baseSalary}</td>
                    <td className="px-4 py-3">{s.bonus ?? '0'}</td>
                    <td className="px-4 py-3">{s.deductions ?? '0'}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{s.netPay}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          s.status === 'ISSUED' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {s.status === 'ISSUED' ? '已发布' : '草稿'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {s.status === 'DRAFT' ? (
                        <div className="flex gap-1">
                          <button onClick={openEdit.bind(null, s)} className="p-1.5 rounded hover:bg-blue-50 text-blue-600" title="编辑">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={issueSlip.bind(null, s.id)} className="p-1.5 rounded hover:bg-green-50 text-green-600" title="发布">
                            <Send className="w-4 h-4" />
                          </button>
                          <button onClick={deleteSlip.bind(null, s.id)} className="p-1.5 rounded hover:bg-red-50 text-red-600" title="删除">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-300">不可操作</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'formulas' && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="font-semibold text-gray-900">结算公式</h2>
              <p className="text-xs text-gray-400 mt-1">
                可用字段：{Object.entries(FIELD_LABELS).map(([k, v]) => `@${k}(${v})`).join(' ')}，如：
                baseSalary * performanceScore - deductions
              </p>
            </div>
            <button
              onClick={() => setShowFormula(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" /> 新建公式
            </button>
          </div>
          <div className="flex flex-wrap gap-3">
            {formulas.map((f) => (
              <div key={f.id} className="border border-gray-200 rounded-lg p-4 w-72">
                <div className="flex justify-between items-center mb-2">
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded font-medium">{f.targetType}</span>
                  <button onClick={deleteFormula.bind(null, f.id)} className="text-gray-300 hover:text-red-500">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="font-mono text-sm text-gray-800 mb-1">{f.expression}</div>
                <div className="text-xs text-gray-400 truncate">{f.description || f.targetId || '适用范围：全公司'}</div>
              </div>
            ))}
            {formulas.length === 0 && <div className="text-gray-400 text-sm py-6">暂无公式，新建以在线校验算术表达式。</div>}
          </div>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setEditing(null)}>
          <div className="bg-white rounded-xl p-6 w-96 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-gray-900 mb-4">编辑工资单</h3>
            <div className="space-y-3">
              {(['baseSalary', 'bonus', 'deductions'] as const).map((k) => (
                <label key={k} className="block">
                  <span className="text-xs text-gray-500">{FIELD_LABELS[k]}</span>
                  <input
                    type="number"
                    step="0.01"
                    value={editForm[k]}
                    onChange={(e) => setEditForm({ ...editForm, [k]: e.target.value })}
                    className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setEditing(null)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600">
                取消
              </button>
              <button onClick={saveEdit} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">
                保存并重算实发
              </button>
            </div>
          </div>
        </div>
      )}

      {showFormula && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setShowFormula(false)}>
          <div className="bg-white rounded-xl p-6 w-[480px] shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-gray-900 mb-4">新建结算公式</h3>
            <div className="space-y-3">
              <label className="block">
                <span className="text-xs text-gray-500">适用范围</span>
                <select
                  value={fForm.targetType}
                  onChange={(e) => setFForm({ ...fForm, targetType: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                >
                  {['COMPANY', 'DEPARTMENT', 'POSITION', 'EMPLOYEE'].map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-xs text-gray-500">表达式</span>
                <input
                  value={fForm.expression}
                  onChange={(e) => setFForm({ ...fForm, expression: e.target.value })}
                  placeholder="baseSalary * performanceScore - deductions"
                  className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg font-mono text-sm"
                />
              </label>
              {fValidate.ok !== null && (
                <div
                  className={`text-xs px-3 py-2 rounded-lg ${
                    fValidate.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                  }`}
                >
                  {fValidate.ok ? '表达式校验通过' : fValidate.error}
                </div>
              )}
              <label className="block">
                <span className="text-xs text-gray-500">说明</span>
                <input
                  value={fForm.description}
                  onChange={(e) => setFForm({ ...fForm, description: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                />
              </label>
            </div>
            <div className="flex justify-between gap-2 mt-5">
              <button onClick={validateF} className="px-4 py-2 border border-blue-200 text-blue-600 rounded-lg text-sm">
                校验表达式
              </button>
              <div className="flex gap-2">
                <button onClick={() => setShowFormula(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600">
                  取消
                </button>
                <button onClick={saveFormula} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}