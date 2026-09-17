/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { User, Activity, Briefcase, FileText, ArrowLeft, ArrowRightLeft, PlusCircle } from 'lucide-react';
import Link from 'next/link';

export default function EmployeeLifecyclePage() {
   const params = useParams();
   const [employee, setEmployee] = useState<any>(null);
   const [events, setEvents] = useState<any[]>([]);
   const [contracts, setContracts] = useState<any[]>([]);
   const [loading, setLoading] = useState(true);

   useEffect(() => {
       Promise.all([
           fetch(`/api/employee`).then(r => r.json()),
           fetch(`/api/employee/${params.id}/lifecycle`).then(r => r.json()).catch(() => []),
           fetch(`/api/hr/contracts?employeeId=${params.id}`).then(r => r.json())
       ]).then(([emps, evts, cts]) => {
           const emp = Array.isArray(emps) ? emps.find((e:any) => e.id === params.id) : emps;
           setEmployee(emp);
           if (Array.isArray(evts)) setEvents(evts);
           if (Array.isArray(cts)) setContracts(cts);
           setLoading(false);
       }).catch(e => {
           console.error(e);
           setLoading(false);
       });
   }, [params.id]);

   const handleCreateContract = async () => {
       // Mock UI flow for demonstration of Vertical Slice
       const res = await fetch('/api/hr/contracts', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({
               employeeId: params.id,
               startDate: new Date().toISOString(),
               endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(),
           })
       });
       const contract = await res.json();
       if (contract.id) {
           // Kick off Workflow
           const defRes = await fetch('/api/workflow/definitions');
           const defs = await defRes.json();
           const hrDef = defs.find((d:any) => d.code === 'CONTRACT_APPROVAL');

           if (hrDef) {
               await fetch('/api/workflow/instances', {
                   method: 'POST',
                   headers: { 'Content-Type': 'application/json' },
                   body: JSON.stringify({
                       definitionId: hrDef.id,
                       initiatorId: 'CURRENT_USER', // mock
                       formData: { contractId: contract.id, employeeId: params.id }
                   })
               });
               alert('合同已创建并提交审批流程！');
               window.location.reload();
           } else {
               alert('合同已创建为草稿。未找到审批流程定义，请先通过 /workflow/designer 创建 code 为 CONTRACT_APPROVAL 的流程');
               window.location.reload();
           }
       }
   };

   if (loading) return <div className="p-10 text-center">加载中...</div>;
   if (!employee) return <div className="p-10 text-center text-red-500">员工不存在</div>;

   const activeContract = contracts.find(c => c.status === 'ACTIVE');
   const historicalContracts = contracts.filter(c => c.status !== 'ACTIVE' && c.status !== 'PENDING_SIGN' && c.status !== 'DRAFT');
   const pendingContract = contracts.find(c => c.status === 'PENDING_SIGN' || c.status === 'DRAFT');

   return (
       <div className="p-6 bg-gray-50 min-h-screen">
          <div className="max-w-6xl mx-auto">
             <Link href="/employee" className="inline-flex items-center gap-2 text-gray-500 hover:text-blue-600 mb-6">
                 <ArrowLeft className="w-4 h-4" /> 返回员工列表
             </Link>

             {/* Header */}
             <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex justify-between items-center mb-6">
                 <div className="flex items-center gap-4">
                     <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                         <User className="w-8 h-8" />
                     </div>
                     <div>
                        <h1 className="text-2xl font-bold text-gray-900">{employee.name}</h1>
                        <p className="text-gray-500 mt-1 flex items-center gap-2">
                           <Briefcase className="w-4 h-4"/> 状态: <span className="font-semibold text-gray-700">{employee.status}</span>
                        </p>
                     </div>
                 </div>
                 <div className="flex gap-2">
                     <button className="px-4 py-2 bg-white border rounded hover:bg-gray-50 flex gap-2"><ArrowRightLeft className="w-4 h-4"/>发起人事变动</button>
                     <button onClick={handleCreateContract} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex gap-2"><PlusCircle className="w-4 h-4"/>新建劳动合同并发起审批</button>
                 </div>
             </div>

             <div className="grid grid-cols-3 gap-6">
                 {/* Left: Info & Contracts */}
                 <div className="col-span-1 space-y-6">
                     <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                         <h3 className="font-bold text-gray-800 border-b pb-2 mb-4">基本信息</h3>
                         <div className="space-y-3 text-sm">
                             <div className="flex justify-between"><span className="text-gray-500">工号</span><span className="font-medium">{employee.code}</span></div>
                             <div className="flex justify-between"><span className="text-gray-500">入职日期</span><span className="font-medium">{new Date(employee.hireDate).toLocaleDateString()}</span></div>
                         </div>
                     </div>

                     <div className="bg-white rounded-xl shadow-sm border border-blue-200 p-5 relative overflow-hidden">
                         <div className="absolute top-0 left-0 w-full h-1 bg-blue-500"></div>
                         <h3 className="font-bold text-gray-800 border-b pb-2 mb-4 flex items-center gap-2"><FileText className="w-4 h-4 text-blue-600"/> 当前合同</h3>

                         {activeContract ? (
                             <div className="space-y-2 text-sm">
                                 <div className="flex justify-between"><span className="text-gray-500">合同编号</span><span className="font-medium">{activeContract.code}</span></div>
                                 <div className="flex justify-between"><span className="text-gray-500">状态</span><span className="font-medium text-green-600">{activeContract.status}</span></div>
                                 <div className="flex justify-between"><span className="text-gray-500">开始日期</span><span className="font-medium">{new Date(activeContract.startDate).toLocaleDateString()}</span></div>
                                 <div className="flex justify-between"><span className="text-gray-500">结束日期</span><span className="font-medium text-blue-600">{new Date(activeContract.endDate).toLocaleDateString()}</span></div>
                             </div>
                         ) : pendingContract ? (
                            <div className="space-y-2 text-sm">
                                 <div className="flex justify-between"><span className="text-gray-500">草拟合同</span><span className="font-medium">{pendingContract.code}</span></div>
                                 <div className="flex justify-between"><span className="text-gray-500">状态</span><span className="font-medium text-yellow-600">{pendingContract.status}</span></div>
                                 <div className="flex justify-between"><span className="text-gray-500">操作</span><Link href="/workflow/tasks" className="font-medium text-blue-600 hover:underline">去审批</Link></div>
                            </div>
                         ) : (
                             <div className="text-gray-400 text-sm text-center py-4">暂无生效中的合同</div>
                         )}
                     </div>

                     {historicalContracts.length > 0 && (
                         <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                             <h3 className="font-bold text-gray-800 border-b pb-2 mb-4">历史合同记录</h3>
                             <div className="space-y-3">
                                 {historicalContracts.map(c => (
                                     <div key={c.id} className="text-sm bg-gray-50 p-2 rounded border border-gray-100 flex justify-between items-center">
                                         <div>
                                            <div className="font-medium text-gray-700">{c.code}</div>
                                            <div className="text-xs text-gray-500">{new Date(c.startDate).getFullYear()} - {new Date(c.endDate).getFullYear()}</div>
                                         </div>
                                         <span className="text-xs text-gray-500">{c.status}</span>
                                     </div>
                                 ))}
                             </div>
                         </div>
                     )}
                 </div>

                 {/* Right: Timeline */}
                 <div className="col-span-2">
                     <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-full">
                         <h3 className="font-bold text-gray-800 border-b pb-2 mb-6 flex items-center gap-2">
                            <Activity className="w-5 h-5 text-blue-600" /> 员工全生命周期轨迹
                         </h3>
                         <div className="space-y-6">
                            {events.length === 0 ? <p className="text-gray-400 text-sm">暂无轨迹记录</p> : null}
                            {events.map((e, idx) => (
                                <div key={idx} className="flex gap-4 relative">
                                    <div className="w-px h-full bg-blue-100 absolute left-[15px] top-6"></div>
                                    <div className="w-8 h-8 rounded-full bg-blue-50 border-2 border-blue-500 z-10 flex items-center justify-center">
                                        <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                                    </div>
                                    <div className="bg-gray-50 p-4 rounded-lg flex-1 border border-gray-100">
                                        <div className="flex justify-between items-center mb-1">
                                            <div className="font-medium text-gray-800">{e.type}</div>
                                            <div className="text-xs text-gray-500">{new Date(e.date).toLocaleDateString()}</div>
                                        </div>
                                        <div className="text-sm text-gray-600">{e.description}</div>
                                    </div>
                                </div>
                            ))}
                         </div>
                     </div>
                 </div>

             </div>
          </div>
       </div>
   );
}
