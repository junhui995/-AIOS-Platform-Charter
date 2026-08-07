/* eslint-disable */
"use client";

import React, { useState, useEffect } from 'react';
import { FileText, Clock, CheckCircle, XCircle } from 'lucide-react';

export default function MyInstancesPage() {
  const [instances, setInstances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/workflow/instances/my?userId=system')
      .then(res => res.json())
      .then(data => {
         if(Array.isArray(data)) setInstances(data);
         setLoading(false);
      })
      .catch(e => {
         console.error(e);
         setLoading(false);
      });
  }, []);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
       <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
             <FileText className="w-6 h-6 text-blue-600" />
             我的申请
          </h1>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
             <table className="w-full text-left">
                <thead className="bg-gray-50 border-b">
                   <tr className="text-xs text-gray-500 uppercase tracking-wider">
                      <th className="p-4 font-medium">标题</th>
                      <th className="p-4 font-medium">业务类型</th>
                      <th className="p-4 font-medium">当前节点</th>
                      <th className="p-4 font-medium">状态</th>
                      <th className="p-4 font-medium">发起时间</th>
                   </tr>
                </thead>
                <tbody className="divide-y">
                   {loading ? (
                       <tr><td colSpan={5} className="p-8 text-center text-gray-400">加载中...</td></tr>
                   ) : instances.length === 0 ? (
                       <tr><td colSpan={5} className="p-8 text-center text-gray-400">暂无申请记录</td></tr>
                   ) : instances.map(inst => (
                       <tr key={inst.id} className="hover:bg-gray-50">
                           <td className="p-4 font-medium text-gray-900">{inst.title}</td>
                           <td className="p-4 text-sm text-gray-600">{inst.businessType}</td>
                           <td className="p-4 text-sm text-gray-600">{inst.currentNodeId || '已结束'}</td>
                           <td className="p-4">
                               {inst.status === 'RUNNING' && <span className="inline-flex items-center gap-1 text-xs text-blue-700 bg-blue-100 px-2 py-1 rounded-full"><Clock className="w-3 h-3"/> 审批中</span>}
                               {inst.status === 'COMPLETED' && <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-100 px-2 py-1 rounded-full"><CheckCircle className="w-3 h-3"/> 已完成</span>}
                               {inst.status === 'REJECTED' && <span className="inline-flex items-center gap-1 text-xs text-red-700 bg-red-100 px-2 py-1 rounded-full"><XCircle className="w-3 h-3"/> 已驳回</span>}
                           </td>
                           <td className="p-4 text-sm text-gray-500">{new Date(inst.startedAt).toLocaleString()}</td>
                       </tr>
                   ))}
                </tbody>
             </table>
          </div>
       </div>
    </div>
  );
}
