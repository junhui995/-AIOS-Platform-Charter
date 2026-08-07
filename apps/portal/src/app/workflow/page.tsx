/* eslint-disable */
"use client";

import React from 'react';
import Link from 'next/link';
import { Network, CheckSquare, Send, FileText, Activity } from 'lucide-react';

export default function WorkflowCenter() {
  return (
    <div className="p-6 bg-gray-50 min-h-[calc(100vh-64px)]">
       <div className="max-w-6xl mx-auto">
          <div className="mb-8">
             <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Network className="w-8 h-8 text-blue-600" />
                Workflow Center (BPM)
             </h1>
             <p className="text-gray-500 mt-2">企业级流程运行与协作中心</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
             {/* Pending Tasks */}
             <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex items-start gap-4 hover:shadow-md transition-shadow">
                 <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600">
                    <CheckSquare className="w-6 h-6" />
                 </div>
                 <div className="flex-1">
                    <div className="text-sm font-medium text-gray-500 mb-1">我的待办任务</div>
                    <div className="text-3xl font-bold text-gray-900 mb-2">12 <span className="text-sm text-gray-400 font-normal">件</span></div>
                    <Link href="/workflow/tasks" className="text-sm text-blue-600 hover:underline">立即处理 &rarr;</Link>
                 </div>
             </div>

             {/* My Instances */}
             <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex items-start gap-4 hover:shadow-md transition-shadow">
                 <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                    <Send className="w-6 h-6" />
                 </div>
                 <div className="flex-1">
                    <div className="text-sm font-medium text-gray-500 mb-1">我发起的申请</div>
                    <div className="text-3xl font-bold text-gray-900 mb-2">5 <span className="text-sm text-gray-400 font-normal">运行中</span></div>
                    <Link href="/workflow/instances/my" className="text-sm text-blue-600 hover:underline">查看进度 &rarr;</Link>
                 </div>
             </div>

             {/* Monitor */}
             <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex items-start gap-4 hover:shadow-md transition-shadow">
                 <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center text-green-600">
                    <Activity className="w-6 h-6" />
                 </div>
                 <div className="flex-1">
                    <div className="text-sm font-medium text-gray-500 mb-1">流程监控看板</div>
                    <div className="text-3xl font-bold text-gray-900 mb-2">356 <span className="text-sm text-gray-400 font-normal">今日总量</span></div>
                    <Link href="/workflow/monitor" className="text-sm text-blue-600 hover:underline">进入控制台 &rarr;</Link>
                 </div>
             </div>
          </div>

          <h2 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">常用流程发起</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <button className="p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow flex flex-col items-center justify-center gap-3 transition-all">
                  <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                      <FileText className="w-5 h-5" />
                  </div>
                  <span className="font-medium text-gray-700">请假申请</span>
              </button>
              <button className="p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow flex flex-col items-center justify-center gap-3 transition-all">
                  <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                      <FileText className="w-5 h-5" />
                  </div>
                  <span className="font-medium text-gray-700">采购申请</span>
              </button>
              <button className="p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow flex flex-col items-center justify-center gap-3 transition-all">
                  <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                      <FileText className="w-5 h-5" />
                  </div>
                  <span className="font-medium text-gray-700">合同审批</span>
              </button>
              <Link href="/workflow/designer" className="p-4 bg-gray-50 border border-dashed border-gray-300 rounded-lg hover:bg-gray-100 flex flex-col items-center justify-center gap-3 transition-all">
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
                      <Network className="w-5 h-5" />
                  </div>
                  <span className="font-medium text-gray-500">管理流程设计</span>
              </Link>
          </div>
       </div>
    </div>
  );
}
