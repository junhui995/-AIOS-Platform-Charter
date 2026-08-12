/* eslint-disable */
"use client";

import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle, FileText, Send, User, AlertCircle } from 'lucide-react';

export default function TaskCenterPage() {
  const [activeTab, setActiveTab] = useState<'pending' | 'initiated' | 'completed'>('pending');
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Mock fetching - in real implementation this hits /api/workflow/instances or /api/workflow/tasks
  useEffect(() => {
     setLoading(true);
     // Simulate API delay
     setTimeout(() => {
         setTasks([
            { id: 't1', instanceId: 'inst_1', nodeName: '直接主管审批', workflowName: '请假申请 - 张三', type: 'APPROVAL', status: 'PENDING', createdAt: '2026-10-24 10:00:00', initiator: '张三' },
            { id: 't2', instanceId: 'inst_2', nodeName: '法务合规审核', workflowName: '年度采购合同审批', type: 'APPROVAL', status: 'PENDING', createdAt: '2026-10-24 14:30:00', initiator: '李四' }
         ]);
         setLoading(false);
     }, 600);
  }, []);

  const handleAction = async (taskId: string, action: 'APPROVE' | 'REJECT') => {
      // In a real app, this would open a modal for comments, then call POST /api/workflow/tasks
      const confirmAction = confirm(`确定要 ${action === 'APPROVE' ? '同意' : '驳回'} 该任务吗？`);
      if (confirmAction) {
          alert(`模拟已提交动作: ${action}`);
          // Optimistic update
          setTasks(tasks.filter(t => t.id !== taskId));
      }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-[calc(100vh-64px)]">
       <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
             <Clock className="w-8 h-8 text-blue-600" />
             <div>
                <h1 className="text-2xl font-bold text-gray-900">流程任务中心</h1>
                <p className="text-sm text-gray-500">统一处理您的待办任务、跟踪已发起的审批进度。</p>
             </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
             {/* Tabs */}
             <div className="flex border-b">
                 <button
                   onClick={() => setActiveTab('pending')}
                   className={`flex-1 py-4 text-center font-medium text-sm transition-colors ${activeTab === 'pending' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' : 'text-gray-500 hover:bg-gray-50'}`}
                 >
                    <div className="flex items-center justify-center gap-2">
                       <AlertCircle className="w-4 h-4" /> 我的待办
                       <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full">2</span>
                    </div>
                 </button>
                 <button
                   onClick={() => setActiveTab('initiated')}
                   className={`flex-1 py-4 text-center font-medium text-sm transition-colors ${activeTab === 'initiated' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' : 'text-gray-500 hover:bg-gray-50'}`}
                 >
                    <div className="flex items-center justify-center gap-2">
                       <Send className="w-4 h-4" /> 我发起的
                    </div>
                 </button>
                 <button
                   onClick={() => setActiveTab('completed')}
                   className={`flex-1 py-4 text-center font-medium text-sm transition-colors ${activeTab === 'completed' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' : 'text-gray-500 hover:bg-gray-50'}`}
                 >
                    <div className="flex items-center justify-center gap-2">
                       <CheckCircle className="w-4 h-4" /> 我已处理
                    </div>
                 </button>
             </div>

             {/* Content */}
             <div className="p-0">
                 {loading ? (
                     <div className="py-20 text-center text-gray-400">加载中...</div>
                 ) : (
                     <table className="w-full text-left border-collapse">
                        <thead>
                           <tr className="bg-gray-50 border-b text-xs text-gray-500 uppercase tracking-wider">
                               <th className="p-4 font-medium">任务详情</th>
                               <th className="p-4 font-medium">发起人</th>
                               <th className="p-4 font-medium">当前节点</th>
                               <th className="p-4 font-medium">接收时间</th>
                               <th className="p-4 font-medium text-right">操作</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y">
                           {activeTab === 'pending' && tasks.map(task => (
                               <tr key={task.id} className="hover:bg-gray-50 transition-colors group">
                                   <td className="p-4">
                                      <div className="flex items-center gap-3">
                                          <div className="w-10 h-10 rounded bg-blue-100 flex items-center justify-center text-blue-600">
                                             <FileText className="w-5 h-5" />
                                          </div>
                                          <div>
                                              <div className="font-medium text-gray-900">{task.workflowName}</div>
                                              <div className="text-xs text-gray-500 mt-1">流水号: {task.instanceId}</div>
                                          </div>
                                      </div>
                                   </td>
                                   <td className="p-4">
                                       <div className="flex items-center gap-2 text-sm text-gray-700">
                                          <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center"><User className="w-3 h-3"/></div>
                                          {task.initiator}
                                       </div>
                                   </td>
                                   <td className="p-4">
                                       <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                          {task.nodeName}
                                       </span>
                                   </td>
                                   <td className="p-4 text-sm text-gray-500">{task.createdAt}</td>
                                   <td className="p-4 text-right">
                                       <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                           <button onClick={() => handleAction(task.id, 'REJECT')} className="px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded border border-red-200 transition-colors">驳回</button>
                                           <button onClick={() => handleAction(task.id, 'APPROVE')} className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors shadow-sm">同意</button>
                                       </div>
                                   </td>
                               </tr>
                           ))}
                           {activeTab !== 'pending' && (
                               <tr>
                                   <td colSpan={5} className="py-20 text-center text-gray-400">
                                       暂无记录
                                   </td>
                               </tr>
                           )}
                        </tbody>
                     </table>
                 )}
             </div>
          </div>
       </div>
    </div>
  );
}
