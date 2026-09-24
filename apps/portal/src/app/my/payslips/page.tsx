"use client";

import React, { useEffect, useState } from 'react';
import { Receipt, AlertCircle } from 'lucide-react';

interface Slip {
  id: string;
  month: string;
  baseSalary: string;
  bonus: string;
  deductions: string;
  netPay: string;
  status: string;
  issuedAt: string | null;
}

export default function MyPayslipsPage() {
  const [slips, setSlips] = useState<Slip[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/salary/slips')
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || '加载失败');
        setSlips(data);
      })
      .catch((e) => setError(e instanceof Error ? e.message : '加载失败'));
  }, []);

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Receipt className="w-6 h-6 text-blue-600" />
          我的工资条
        </h1>
        <p className="text-gray-500 mt-2">仅展示本人的工资记录。</p>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm bg-red-50 text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      <div className="space-y-4">
        {slips.map((s) => (
          <div key={s.id} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <div>
                <span className="font-bold text-gray-900">{s.month}</span>
                <span
                  className={`ml-3 px-2 py-0.5 rounded-full text-xs font-medium ${
                    s.status === 'ISSUED' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {s.status === 'ISSUED' ? '已发布' : '草稿'}
                </span>
              </div>
              {s.issuedAt && <span className="text-xs text-gray-400">发布于 {s.issuedAt.slice(0, 10)}</span>}
            </div>
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-gray-400 text-xs">基础薪资</div>
                <div className="font-semibold text-gray-900">¥{s.baseSalary}</div>
              </div>
              <div>
                <div className="text-gray-400 text-xs">奖金</div>
                <div className="font-semibold text-green-600">+¥{s.bonus ?? '0'}</div>
              </div>
              <div>
                <div className="text-gray-400 text-xs">扣款</div>
                <div className="font-semibold text-red-500">-¥{s.deductions ?? '0'}</div>
              </div>
              <div>
                <div className="text-gray-400 text-xs">实发</div>
                <div className="font-bold text-blue-600 text-lg">¥{s.netPay}</div>
              </div>
            </div>
          </div>
        ))}
        {slips.length === 0 && !error && (
          <div className="bg-white border border-gray-200 rounded-xl p-10 text-center text-gray-400 text-sm">
            暂无工资条记录。
          </div>
        )}
      </div>
    </div>
  );
}