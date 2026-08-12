/* eslint-disable */
"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { User, Activity, Clock, Briefcase, FileText, Settings, ArrowLeft, ArrowRightLeft, UserX, UserCheck } from 'lucide-react';
import Link from 'next/link';

export default function EmployeeLifecyclePage() {
   const params = useParams();
   const router = useRouter();
   const [employee, setEmployee] = useState<any>(null);
   const [events, setEvents] = useState<any[]>([]);
   const [positions, setPositions] = useState<any[]>([]);
   const [loading, setLoading] = useState(true);

   // Form for actions
   const [actionModal, setActionModal] = useState<string | null>(null);
   const [actionForm, setActionForm] = useState({ positionId: '', remark: '' });

   useEffect(() => {
       Promise.all([
           fetch(`/api/employee`).then(r => r.json()), // Assuming standard endpoint list or specific ID if refactored
           fetch(`/api/employee/${params.id}/lifecycle`).then(r => r.json()),
           fetch('/api/org/positions').then(r => r.json()) // Generic fetch available roles if exist
       ]).then(([emps, evts, pos]) => {
           const emp = Array.isArray(emps) ? emps.find((e:any) => e.id === params.id) : emps;
           setEmployee(emp);
           if (Array.isArray(evts)) setEvents(evts);
           if (Array.isArray(pos)) setPositions(pos);
           setLoading(false);
       }).catch(e => {
           console.error(e);
           setLoading(false);
       });
   }, [params.id]);

   const handleAction = async (type: string) => {
       try {
          const res = await fetch(`/api/employee/${params.id}/lifecycle`, {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({
                 eventType: type,
                 positionId: actionForm.positionId,
                 remark: actionForm.remark
             })
          });
          const data = await res.json();
          if (data.success) {
              alert("生命周期记录成功");
              window.location.reload();
          } else {
              alert("操作失败: " + data.error);
          }
       } catch (error) {
          alert("操作异常");
       }
   };

   if (loading) return <div className="p-10 text-center">加载中...</div>;
   if (!employee) return <div className="p-10 text-center text-red-500">员工不存在</div>;

   return (
       <div className="p-6 bg-gray-50 min-h-screen">
          <div className="max-w-5xl mx-auto">
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
                     {employee.status === 'PENDING' && (
                         <button onClick={() => { setActionModal('ONBOARD'); setActionForm({ positionId: '', remark: ''}); }} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex gap-2"><UserCheck className="w-4 h-4"/>办理入职</button>
                     )}
                     {employee.status === 'PROBATION' && (
                         <button onClick={() => { setActionModal('PROBATION'); setActionForm({ positionId: '', remark: ''}); }} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex gap-2"><CheckCircle className="w-4 h-4"/>办理转正</button>
                     )}
                     {employee.status === 'ACTIVE' && (
                         <>
                             <button onClick={() => { setActionModal('TRANSFER'); setActionForm({ positionId: '', remark: ''}); }} className="px-4 py-2 bg-blue-50 text-blue-600 border border-blue-200 rounded hover:bg-blue-100 flex gap-2"><ArrowRightLeft className="w-4 h-4"/>调岗/调部门</button>
                             <button onClick={() => { setActionModal('OFFBOARD'); setActionForm({ positionId: '', remark: ''}); }} className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded hover:bg-red-100 flex gap-2"><UserX className="w-4 h-4"/>办理离职</button>
                         </>
                     )}
                 </div>
             </div>

             <div className="grid grid-cols-3 gap-6">
                 {/* Left: Info */}
                 <div className="col-span-1 space-y-6">
                     <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                         <h3 className="font-bold text-gray-800 border-b pb-2 mb-4">基本信息</h3>
                         <div className="space-y-3 text-sm">
                             <div className="flex justify-between"><span className="text-gray-500">工号</span><span className="font-medium">{employee.code}</span></div>
                             <div className="flex justify-between"><span className="text-gray-500">手机号</span><span className="font-medium">{employee.phoneNumber}</span></div>
                             <div className="flex justify-between"><span className="text-gray-500">邮箱</span><span className="font-medium text-blue-600">{employee.email}</span></div>
                             <div className="flex justify-between"><span className="text-gray-500">入职日期</span><span className="font-medium">{new Date(employee.hireDate).toLocaleDateString()}</span></div>
                         </div>
                     </div>
                 </div>

                 {/* Right: Timeline */}
                 <div className="col-span-2">
                     <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-full">
                         <h3 className="font-bold text-gray-800 border-b pb-2 mb-6 flex items-center gap-2">
                            <Activity className="w-5 h-5 text-blue-600" /> 全生命周期轨迹
                         </h3>
                         <div className="relative border-l-2 border-gray-200 ml-4 space-y-8">
                             {events.length === 0 ? <p className="text-gray-400 pl-6">暂无生命周期记录，请执行业务操作。</p> : null}
                             {events.map((ev, i) => (
                                <div key={ev.id} className="relative pl-6">
                                    <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-white bg-blue-500"></div>
                                    <div className="text-sm font-bold text-gray-900 mb-1">{ev.eventType} <span className="text-xs font-normal text-gray-400 ml-2">{new Date(ev.eventDate).toLocaleString()}</span></div>
                                    <div className="bg-gray-50 border border-gray-100 rounded-lg p-3 text-sm text-gray-600">
                                        {ev.remark && <div className="mb-2 italic text-gray-500">备注: {ev.remark}</div>}
                                        {ev.beforeData?.status && <div className="mt-1">状态变更: {ev.beforeData.status} &rarr; {ev.afterData?.status}</div>}
                                        {ev.afterData?.positionId && <div className="mt-1 text-blue-600 font-medium">新岗位绑定成功</div>}
                                    </div>
                                    <div className="text-xs text-gray-400 mt-2">操作人: {ev.operatorId}</div>
                                </div>
                             ))}
                         </div>
                     </div>
                 </div>
             </div>
          </div>

          {/* Action Modal */}
          {actionModal && (
             <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                 <div className="bg-white rounded-xl shadow-xl w-[400px] overflow-hidden">
                     <div className="p-4 border-b bg-gray-50 flex justify-between">
                         <h3 className="font-bold">办理: {actionModal}</h3>
                         <button onClick={() => setActionModal(null)} className="text-gray-400 hover:text-gray-800">✕</button>
                     </div>
                     <div className="p-6 space-y-4">
                         {['ONBOARD', 'TRANSFER'].includes(actionModal) && (
                             <div>
                                 <label className="block text-sm font-medium mb-1">选择分配岗位</label>
                                 <select
                                   className="w-full border rounded p-2 text-sm"
                                   value={actionForm.positionId}
                                   onChange={e => setActionForm({...actionForm, positionId: e.target.value})}
                                 >
                                    <option value="">-- 请选择 --</option>
                                    <option value="test_pos_1">销售经理 (仅测试用途)</option>
                                    <option value="test_pos_2">项目主管 (仅测试用途)</option>
                                    {positions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                 </select>
                             </div>
                         )}
                         <div>
                             <label className="block text-sm font-medium mb-1">操作备注/原因</label>
                             <textarea
                               rows={3}
                               className="w-full border rounded p-2 text-sm"
                               value={actionForm.remark}
                               onChange={e => setActionForm({...actionForm, remark: e.target.value})}
                               placeholder="记录调整原因..."
                             />
                         </div>
                     </div>
                     <div className="p-4 bg-gray-50 border-t flex justify-end gap-3">
                         <button onClick={() => setActionModal(null)} className="px-4 py-2 border rounded hover:bg-gray-100">取消</button>
                         <button onClick={() => handleAction(actionModal)} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">确认提交</button>
                     </div>
                 </div>
             </div>
          )}
       </div>
   );
}
