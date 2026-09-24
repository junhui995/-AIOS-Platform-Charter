"use client";

import React, { useEffect, useState } from 'react';
import { HeartHandshake, AlertCircle } from 'lucide-react';

interface Enrollment {
  id: string;
  status: string;
  startMonth: string | null;
  item?: { name?: string; category?: string; periodCost?: string; description?: string | null } | null;
}

const CAT = { INSURANCE: '保险', ALLOWANCE: '补贴', WELFARE: '福利' } as Record<string, string>;

export default function MyBenefitsPage() {
  const [rows, setRows] = useState<Enrollment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = () => {
    fetch('/api/benefits/enrollments')
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || '加载失败');
        setRows(data);
      })
      .catch((e) => setError(e instanceof Error ? e.message : '加载失败'));
  };

  useEffect(load, []);

  const toggle = async (id: string, status: string) => {
    setMsg(null);
    try {
      const res = await fetch(`/api/benefits/enrollments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: status === 'ACTIVE' ? 'OPTED_OUT' : 'ACTIVE' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '操作失败');
      setMsg(status === 'ACTIVE' ? '已退出该项福利' : '已重新启用');
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : '操作失败');
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <HeartHandshake className="w-6 h-6 text-blue-600" />
          我的福利
        </h1>
        <p className="text-gray-500 mt-2">查看本人的福利登记，可自助退出或重新启用。</p>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm bg-red-50 text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}
      {msg && (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm bg-green-50 text-green-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {msg}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {rows.map((r) => (
          <div key={r.id} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <div className="flex justify-between items-start mb-2">
              <div>
                <div className="font-bold text-gray-900">{r.item?.name}</div>
                <div className="text-xs text-gray-400 mt-1">
                  {r.item?.category ? CAT[r.item.category] ?? r.item.category : '-'} · 月成本 ¥{r.item?.periodCost}
                </div>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  r.status === 'ACTIVE' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}
              >
                {r.status === 'ACTIVE' ? '生效中' : '已退出'}
              </span>
            </div>
            {r.item?.description && <p className="text-sm text-gray-500 mb-3">{r.item.description}</p>}
            <div className="text-xs text-gray-400 mb-3">启用月份：{r.startMonth ?? '-'}</div>
            <button
              onClick={toggle.bind(null, r.id, r.status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                r.status === 'ACTIVE'
                  ? 'border border-red-200 text-red-600 hover:bg-red-50'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {r.status === 'ACTIVE' ? '退出该项福利' : '重新启用'}
            </button>
          </div>
        ))}
        {rows.length === 0 && !error && (
          <div className="bg-white border border-gray-200 rounded-xl p-10 text-center text-gray-400 text-sm">
            暂无福利登记。
          </div>
        )}
      </div>
    </div>
  );
}