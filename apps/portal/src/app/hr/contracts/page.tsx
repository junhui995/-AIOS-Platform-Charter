/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
"use client";

import React, { useEffect, useState } from 'react';
import { FileText, AlertTriangle, PlusCircle, Search, X, Building2 } from 'lucide-react';
import Link from 'next/link';

export default function ContractsDashboard() {
  const [stats, setStats] = useState({ totalActive: 0, within30: 0, within60: 0, within90: 0, expired: 0 });
  const [contracts, setContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [employees, setEmployees] = useState<any[]>([]);

  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
      employeeId: '',
      contractType: 'FIXED_TERM',
      signDate: new Date().toISOString().split('T')[0],
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
      remark: ''
  });

  const loadData = () => {
     setLoading(true);
     let url = '/api/hr/contracts?';
     if (searchTerm) url += `search=${encodeURIComponent(searchTerm)}&`;
     if (filterStatus) url += `status=${encodeURIComponent(filterStatus)}`;

     Promise.all([
         fetch('/api/hr/contracts/stats').then(r => r.json()),
         fetch(url).then(r => r.json()),
         fetch('/api/employee').then(r => r.json())
     ]).then(([st, ct, emps]) => {
         if (st && !st.error) setStats(st);
         if (Array.isArray(ct)) setContracts(ct);
         if (Array.isArray(emps)) setEmployees(emps);
         setLoading(false);
     }).catch(e => {
         console.error(e);
         setLoading(false);
     });
  };

  useEffect(() => {
     loadData();
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
     const timer = setTimeout(() => {
         loadData();
     }, 300);
     return () => clearTimeout(timer);
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, filterStatus]);


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
             loadData();
         } else {
             alert('操作失败: ' + data.error);
         }
     } catch {
         alert('请求异常');
     }
  };

  const handleCreateContract = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
          const res = await fetch('/api/hr/contracts', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(formData)
          });
          const contract = await res.json();
          if (contract.id) {
              // Trigger Workflow
              const defRes = await fetch('/api/workflow/definitions');
              const defs = await defRes.json();
              const hrDef = defs.find((d: any) => d.code === 'CONTRACT_APPROVAL');

              if (hrDef) {
                  await fetch('/api/workflow/instances', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                          definitionId: hrDef.id,
                          initiatorId: formData.employeeId,
                          formData: { contractId: contract.id, employeeId: formData.employeeId }
                      })
                  });
                  alert('合同已创建并提交审批流程！');
              } else {
                  alert('合同已创建为草稿。未找到审批流程定义，请先通过流程设计器创建 code 为 CONTRACT_APPROVAL 的流程。');
              }
              setIsModalOpen(false);
              loadData();
          } else {
              alert('合同创建失败: ' + (contract.details || contract.error));
          }
      } catch (err) {
          alert('请求异常');
      }
  };

  return (
     <div className="p-6 bg-gray-50 min-h-[calc(100vh-64px)]">
        <div className="max-w-7xl mx-auto">
           <div className="flex justify-between items-center mb-8">
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <FileText className="w-6 h-6 text-blue-600" />
                  劳动合同管理
              </h1>
              <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm shadow-sm transition-colors">
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

           {/* Filters */}
           <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 flex gap-4">
              <div className="flex-1 relative">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  <input
                      type="text"
                      placeholder="搜索合同编号、员工姓名..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  />
              </div>
              <select
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                  className="border border-gray-300 rounded-lg px-4 py-2 text-sm text-gray-700 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
              >
                  <option value="">全部状态</option>
                  <option value="ACTIVE">生效中</option>
                  <option value="DRAFT">待签署</option>
                  <option value="EXPIRED">已过期</option>
                  <option value="TERMINATED">已终止</option>
              </select>
           </div>

           {/* List */}
           <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
               <table className="w-full text-left">
                  <thead>
                     <tr className="border-b text-xs text-gray-500 uppercase tracking-wider bg-gray-50">
                        <th className="p-4 font-medium">员工</th>
                        <th className="p-4 font-medium">合同编号</th>
                        <th className="p-4 font-medium">合同类型</th>
                        <th className="p-4 font-medium">期限</th>
                        <th className="p-4 font-medium">状态</th>
                        <th className="p-4 font-medium text-right">操作</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y text-sm">
                     {loading ? (
                         <tr><td colSpan={6} className="p-8 text-center text-gray-400">加载中...</td></tr>
                     ) : contracts.length === 0 ? (
                         <tr><td colSpan={6} className="p-8 text-center text-gray-400">暂无合同数据</td></tr>
                     ) : contracts.map(c => (
                         <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                            <td className="p-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
                                        {c.employee?.name?.charAt(0) || '?'}
                                    </div>
                                    <Link href={`/employee/${c.employeeId}`} className="font-medium text-gray-900 hover:text-blue-600">
                                        {c.employee?.name || '未知员工'}
                                    </Link>
                                </div>
                            </td>
                            <td className="p-4 text-gray-600 font-mono text-xs">{c.code}</td>
                            <td className="p-4 text-gray-600">
                                {c.contractType === 'FIXED_TERM' && '固定期限劳动合同'}
                                {c.contractType === 'OPEN_TERM' && '无固定期限劳动合同'}
                                {c.contractType === 'INTERNSHIP' && '实习协议'}
                                {c.contractType === 'LABOR' && '劳务合同'}
                                {c.contractType === 'OTHER' && '其他'}
                                {!['FIXED_TERM', 'OPEN_TERM', 'INTERNSHIP', 'LABOR', 'OTHER'].includes(c.contractType) && (c.contractType || '固定期限')}
                            </td>
                            <td className="p-4 text-gray-600 text-xs">
                                {new Date(c.startDate).toLocaleDateString()} <br/><span className="text-gray-400">至</span> {new Date(c.endDate).toLocaleDateString()}
                            </td>
                            <td className="p-4">
                                {c.status === 'ACTIVE' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">生效中</span>}
                                {c.status === 'DRAFT' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">待签署</span>}
                                {c.status === 'TERMINATED' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">已终止</span>}
                                {c.status === 'EXPIRED' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">已过期</span>}
                                {c.status === 'PENDING_SIGN' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">审批中</span>}
                            </td>
                            <td className="p-4 text-right">
                                {c.status === 'DRAFT' && <button onClick={() => handleAction(c.id, 'SIGN')} className="text-blue-600 hover:underline mx-2">绕过审批生效</button>}
                                {(c.status === 'ACTIVE' || c.status === 'EXPIRED') && <button onClick={() => handleAction(c.id, 'RENEW')} className="text-blue-600 hover:underline mx-2">续签</button>}
                                {c.status === 'ACTIVE' && <button onClick={() => handleAction(c.id, 'TERMINATE')} className="text-red-600 hover:underline mx-2">终止</button>}
                            </td>
                         </tr>
                     ))}
                  </tbody>
               </table>
           </div>
        </div>

        {/* Create Contract Modal */}
        {isModalOpen && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
               <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col">
                  <div className="flex justify-between items-center p-6 border-b border-gray-100">
                      <h2 className="text-xl font-semibold text-gray-900">新建劳动合同</h2>
                      <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                          <X className="w-5 h-5"/>
                      </button>
                  </div>
                  <div className="p-6">
                      <form id="contract-form" onSubmit={handleCreateContract} className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                              <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">员工 <span className="text-red-500">*</span></label>
                                  <select required value={formData.employeeId} onChange={e => setFormData({...formData, employeeId: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                                      <option value="">请选择员工</option>
                                      {employees.map(emp => (
                                          <option key={emp.id} value={emp.id}>{emp.name} ({emp.code})</option>
                                      ))}
                                  </select>
                              </div>
                              <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">合同类型 <span className="text-red-500">*</span></label>
                                  <select required value={formData.contractType} onChange={e => setFormData({...formData, contractType: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                                      <option value="FIXED_TERM">固定期限劳动合同</option>
                                      <option value="OPEN_TERM">无固定期限劳动合同</option>
                                      <option value="INTERNSHIP">实习协议</option>
                                      <option value="LABOR">劳务合同</option>
                                      <option value="OTHER">其他</option>
                                  </select>
                              </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                              <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">合同开始日期 <span className="text-red-500">*</span></label>
                                  <input required type="date" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                              </div>
                              <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">合同结束日期 <span className="text-red-500">*</span></label>
                                  <input required type="date" value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                              </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                              <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">签订日期</label>
                                  <input type="date" value={formData.signDate} onChange={e => setFormData({...formData, signDate: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                              </div>
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
                              <textarea value={formData.remark} onChange={e => setFormData({...formData, remark: e.target.value})} rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"></textarea>
                          </div>
                      </form>
                  </div>
                  <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                      <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors font-medium">
                          取消
                      </button>
                      <button type="submit" form="contract-form" className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium flex items-center gap-2">
                          创建并提交审批
                      </button>
                  </div>
               </div>
            </div>
        )}
     </div>
  );
}
