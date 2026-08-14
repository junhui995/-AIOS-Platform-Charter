/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useState } from 'react';
import { FileText, AlertTriangle, Clock, CheckCircle, PlusCircle, XCircle } from 'lucide-react';
import Link from 'next/link';

export default function ContractsDashboard() {
  const [stats, setStats] = useState({ totalActive: 0, within30: 0, within60: 0, within90: 0, expired: 0 });
  const [contracts, setContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
     Promise.all([
         fetch('/api/hr/contracts/stats').then(r => r.json()),
         fetch('/api/hr/contracts').then(r => r.json())
     ]).then(([st, ct]) => {
         if (st && !st.error) setStats(st);
         if (Array.isArray(ct)) setContracts(ct);
         setLoading(false);
     }).catch(e => {
         console.error(e);
         setLoading(false);
     });
  }, []);

  const handleAction = async (id: string, actionType: string) => {
     try {
         const res = await fetch(`/api/hr/contracts/${id}/action`, {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ actionType })
         });
         const data = await res.json();
         if (data.success) {
             alert('操作成功');
             window.location.reload();
         } else {
             alert('操作失败: ' + data.error);
         }
     } catch (e) {
         alert('请求异常');
     }
  };

  return (
     <div className="p-6 bg-gray-50 min-h-[calc(100vh-64px)]">
        <div className="max-w-6xl mx-auto">
           <div className="flex justify-between items-center mb-8">
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <FileText className="w-6 h-6 text-blue-600" />
                  劳动合同管理
              </h1>
              <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm">
                  <PlusCircle className="w-4 h-4"/> 新建合同
              </button>
           </div>

           {/* Stats Dashboard */}
           <div className="grid grid-cols-5 gap-4 mb-8">
               <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                  <div className="text-sm text-gray-500 mb-1">有效合同</div>
                  <div className="text-2xl font-bold text-blue-600">{stats.totalActive}</div>
               </div>
               <div className="bg-white p-4 rounded-xl shadow-sm border border-orange-200 bg-orange-50/30">
                  <div className="text-sm text-orange-600 mb-1">30天内到期</div>
                  <div className="text-2xl font-bold text-orange-600">{stats.within30}</div>
               </div>
               <div className="bg-white p-4 rounded-xl shadow-sm border border-yellow-200 bg-yellow-50/30">
                  <div className="text-sm text-yellow-600 mb-1">60天内到期</div>
                  <div className="text-2xl font-bold text-yellow-600">{stats.within60}</div>
               </div>
               <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                  <div className="text-sm text-gray-500 mb-1">90天内到期</div>
                  <div className="text-2xl font-bold text-gray-700">{stats.within90}</div>
               </div>
               <div className="bg-white p-4 rounded-xl shadow-sm border border-red-200 bg-red-50/30">
                  <div className="text-sm text-red-600 mb-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> 已过期</div>
                  <div className="text-2xl font-bold text-red-600">{stats.expired}</div>
               </div>
           </div>

           {/* List */}
           <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
               <div className="p-4 border-b bg-gray-50 flex gap-4">
                  <select className="border border-gray-300 rounded px-3 py-1.5 text-sm text-gray-600 bg-white">
                      <option>全部状态</option>
                      <option>生效中 (ACTIVE)</option>
                      <option>待签署 (DRAFT)</option>
                      <option>即将到期</option>
                  </select>
               </div>
               <table className="w-full text-left">
                  <thead>
                     <tr className="border-b text-xs text-gray-500 uppercase tracking-wider bg-white">
                        <th className="p-4">员工</th>
                        <th className="p-4">合同编号</th>
                        <th className="p-4">合同类型</th>
                        <th className="p-4">期限</th>
                        <th className="p-4">状态</th>
                        <th className="p-4 text-right">操作</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y text-sm">
                     {loading ? (
                         <tr><td colSpan={6} className="p-8 text-center text-gray-400">加载中...</td></tr>
                     ) : contracts.length === 0 ? (
                         <tr><td colSpan={6} className="p-8 text-center text-gray-400">暂无合同数据</td></tr>
                     ) : contracts.map(c => (
                         <tr key={c.id} className="hover:bg-gray-50">
                            <td className="p-4">
                                <Link href={`/employee/${c.employeeId}`} className="font-medium text-blue-600 hover:underline">
                                    {c.employee?.name || '未知员工'}
                                </Link>
                            </td>
                            <td className="p-4 text-gray-600">{c.code}</td>
                            <td className="p-4 text-gray-600">{c.contractType}</td>
                            <td className="p-4 text-gray-600">
                                {new Date(c.startDate).toLocaleDateString()} 至 {new Date(c.endDate).toLocaleDateString()}
                            </td>
                            <td className="p-4">
                                {c.status === 'ACTIVE' && <span className="text-green-700 bg-green-100 px-2 py-0.5 rounded-full text-xs">生效中</span>}
                                {c.status === 'DRAFT' && <span className="text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full text-xs">待签署</span>}
                                {c.status === 'TERMINATED' && <span className="text-red-700 bg-red-100 px-2 py-0.5 rounded-full text-xs">已终止</span>}
                                {c.status === 'EXPIRED' && <span className="text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full text-xs">已过期</span>}
                            </td>
                            <td className="p-4 text-right">
                                {c.status === 'DRAFT' && <button onClick={() => handleAction(c.id, 'SIGN')} className="text-blue-600 hover:underline mx-2">签署生效</button>}
                                {(c.status === 'ACTIVE' || c.status === 'EXPIRED') && <button onClick={() => handleAction(c.id, 'RENEW')} className="text-blue-600 hover:underline mx-2">续签</button>}
                                {c.status === 'ACTIVE' && <button onClick={() => handleAction(c.id, 'TERMINATE')} className="text-red-600 hover:underline mx-2">终止</button>}
                            </td>
                         </tr>
                     ))}
                  </tbody>
               </table>
           </div>
        </div>
     </div>
  );
}
