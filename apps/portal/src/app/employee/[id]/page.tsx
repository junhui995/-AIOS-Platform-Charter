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
           fetch(`/api/employee/${params.id}/lifecycle`).then(r => r.json()),
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

   if (loading) return <div className="p-10 text-center">加载中...</div>;
   if (!employee) return <div className="p-10 text-center text-red-500">员工不存在</div>;

   const activeContract = contracts.find(c => c.status === 'ACTIVE');
   const historicalContracts = contracts.filter(c => c.status !== 'ACTIVE');

   return (
       <div className="p-6 bg-gray-50 min-h-screen">
          <div className="max-w-6xl mx-auto">
             <Link href="/employee/list" className="inline-flex items-center gap-2 text-gray-500 hover:text-blue-600 mb-6">
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
                     <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex gap-2"><PlusCircle className="w-4 h-4"/>新建劳动合同</button>
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
                                 <div className="flex justify-between"><span className="text-gray-500">合同类型</span><span className="font-medium">{activeContract.contractType}</span></div>
                                 <div className="flex justify-between"><span className="text-gray-500">开始日期</span><span className="font-medium">{new Date(activeContract.startDate).toLocaleDateString()}</span></div>
                                 <div className="flex justify-between"><span className="text-gray-500">结束日期</span><span className="font-medium text-blue-600">{new Date(activeContract.endDate).toLocaleDateString()}</span></div>
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
                         <div className="relative border-l-2 border-gray-200 ml-4 space-y-8">
                             {events.length === 0 ? <p className="text-gray-400 pl-6">暂无生命周期记录。</p> : null}
                             {events.map((ev) => (
                                <div key={ev.id} className="relative pl-6">
                                    <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-white bg-blue-500"></div>
                                    <div className="text-sm font-bold text-gray-900 mb-1">{ev.eventType} <span className="text-xs font-normal text-gray-400 ml-2">{new Date(ev.eventDate).toLocaleString()}</span></div>
                                    <div className="bg-gray-50 border border-gray-100 rounded-lg p-3 text-sm text-gray-600">
                                        {ev.remark && <div className="mb-2 italic text-gray-500">备注: {ev.remark}</div>}
                                        {ev.beforeData?.status && <div className="mt-1">状态变更: {ev.beforeData.status} &rarr; {ev.afterData?.status}</div>}
                                    </div>
                                    <div className="text-xs text-gray-400 mt-2">操作人: {ev.operatorId}</div>
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
