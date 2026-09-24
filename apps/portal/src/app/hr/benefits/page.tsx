"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2, Pencil, HeartHandshake, AlertCircle } from 'lucide-react';

interface Item {
  id: string;
  code: string;
  name: string;
  category: string;
  periodCost: string;
  description: string | null;
  _count?: { enrollments?: number };
}

interface Enrollment {
  id: string;
  employeeId: string;
  status: string;
  startMonth: string | null;
  employee?: { code?: string; name?: string; role?: { name?: string } | null } | null;
  item?: { name?: string; code?: string; category?: string; periodCost?: string } | null;
}

const CAT = { INSURANCE: '保险', ALLOWANCE: '补贴', WELFARE: '福利' } as Record<string, string>;

export default function HrBenefitsPage() {
  const [tab, setTab] = useState<'items' | 'enrollments'>('items');
  const [items, setItems] = useState<Item[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [editing, setEditing] = useState<Item | null>(null);
  const [form, setForm] = useState({ code: '', name: '', category: 'INSURANCE', periodCost: '0', description: '' });

  const loadItems = useCallback(async () => {
    const res = await fetch('/api/benefits/items');
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || '加载失败');
    setItems(data);
  }, []);

  const loadEnrollments = useCallback(async () => {
    const res = await fetch('/api/benefits/enrollments');
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || '加载失败');
    setEnrollments(data);
  }, []);

  useEffect(() => {
    loadItems().catch((e) => setMsg({ kind: 'err', text: e.message }));
    loadEnrollments().catch((e) => setMsg({ kind: 'err', text: e.message }));
  }, [loadItems, loadEnrollments]);

  const openNew = () => {
    setEditing({ id: '', code: '', name: '', category: 'INSURANCE', periodCost: '0', description: '' } as Item);
    setForm({ code: '', name: '', category: 'INSURANCE', periodCost: '0', description: '' });
  };

  const save = async () => {
    setMsg(null);
    try {
      const res = await fetch(editing && editing.id ? `/api/benefits/items/${editing.id}` : '/api/benefits/items', {
        method: editing && editing.id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '保存失败');
      setMsg({ kind: 'ok', text: editing && editing.id ? '福利项已更新' : '福利项已创建' });
      setEditing(null);
      loadItems();
    } catch (e) {
      setMsg({ kind: 'err', text: e instanceof Error ? e.message : '保存失败' });
    }
  };

  const remove = async (id: string) => {
    if (!confirm('确认删除该福利项？存在有效登记时将拒绝。')) return;
    setMsg(null);
    try {
      const res = await fetch(`/api/benefits/items/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '删除失败');
      setMsg({ kind: 'ok', text: '已删除' });
      loadItems();
    } catch (e) {
      setMsg({ kind: 'err', text: e instanceof Error ? e.message : '删除失败' });
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <HeartHandshake className="w-6 h-6 text-blue-600" />
            福利管理
          </h1>
          <p className="text-gray-500 mt-2">福利目录维护与员工登记管理。</p>
        </div>
      </div>

      {msg && (
        <div
          className={`mb-4 px-4 py-3 rounded-lg text-sm flex items-center gap-2 ${
            msg.kind === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}
        >
          <AlertCircle className="w-4 h-4" /> {msg.text}
        </div>
      )}

      <div className="flex gap-2 mb-4">
        {[
          { key: 'items', label: '福利目录' },
          { key: 'enrollments', label: '登记表' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as 'items' | 'enrollments')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.key ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'items' && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="flex justify-end p-4 border-b border-gray-100">
            <button
              onClick={openNew}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" /> 新建福利项
            </button>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr>
                {['编码', '名称', '类别', '月成本', '登记数', '说明', '操作'].map((h) => (
                  <th key={h} className="px-4 py-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((it) => (
                <tr key={it.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono">{it.code}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{it.name}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded">{CAT[it.category] ?? it.category}</span>
                  </td>
                  <td className="px-4 py-3">¥{it.periodCost}</td>
                  <td className="px-4 py-3">{it._count?.enrollments ?? 0}</td>
                  <td className="px-4 py-3 text-gray-400 truncate max-w-[200px]">{it.description}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button
                        onClick={() => {
                          setEditing(it);
                          setForm({ code: it.code, name: it.name, category: it.category, periodCost: it.periodCost, description: it.description ?? '' });
                        }}
                        className="p-1.5 rounded hover:bg-blue-50 text-blue-600"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={remove.bind(null, it.id)} className="p-1.5 rounded hover:bg-red-50 text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">暂无福利项</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'enrollments' && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr>
                {['员工', '福利', '类别', '状态', '启用月份'].map((h) => (
                  <th key={h} className="px-4 py-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {enrollments.map((e) => (
                <tr key={e.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className="font-mono text-gray-400 mr-2">{e.employee?.code}</span>
                    {e.employee?.name}
                  </td>
                  <td className="px-4 py-3">{e.item?.name}</td>
                  <td className="px-4 py-3">{e.item?.category ? CAT[e.item.category] ?? e.item.category : '-'}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        e.status === 'ACTIVE' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {e.status === 'ACTIVE' ? '生效中' : '已退出'}
                    </span>
                  </td>
                  <td className="px-4 py-3">{e.startMonth ?? '-'}</td>
                </tr>
              ))}
              {enrollments.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400">暂无登记</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setEditing(null)}>
          <div className="bg-white rounded-xl p-6 w-96 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-gray-900 mb-4">{editing.id ? '编辑福利项' : '新建福利项'}</h3>
            <div className="space-y-3">
              <label className="block">
                <span className="text-xs text-gray-500">编码</span>
                <input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  disabled={Boolean(editing.id)}
                  className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg font-mono text-sm"
                />
              </label>
              <label className="block">
                <span className="text-xs text-gray-500">名称</span>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                />
              </label>
              <label className="block">
                <span className="text-xs text-gray-500">类别</span>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                >
                  {['INSURANCE', 'ALLOWANCE', 'WELFARE'].map((c) => (
                    <option key={c} value={c}>{CAT[c]}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-xs text-gray-500">月成本</span>
                <input
                  type="number"
                  step="0.01"
                  value={form.periodCost}
                  onChange={(e) => setForm({ ...form, periodCost: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                />
              </label>
              <label className="block">
                <span className="text-xs text-gray-500">说明</span>
                <input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                />
              </label>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setEditing(null)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600">
                取消
              </button>
              <button onClick={save} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}