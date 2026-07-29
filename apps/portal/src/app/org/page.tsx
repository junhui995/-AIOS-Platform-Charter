"use client";

import React, { useEffect, useState } from 'react';
import { Network, Search, ChevronRight, ChevronDown } from 'lucide-react';

export default function OrgPage() {
  const [orgTree, setOrgTree] = useState<{id: string, name: string, headcountLimit: number, children: []}[]>([]);

  useEffect(() => {
    fetch('/api/org')
      .then(res => res.json())
      .then(data => {
        if (!data.error) setOrgTree(data);
      })
      .catch(console.error);
  }, []);

  const renderTree = (nodes: {id: string, name: string, headcountLimit: number, children: []}[]) => {
    return nodes.map(node => (
      <div key={node.id} className="pl-4 space-y-2 mt-2">
        <div className="flex items-center gap-2 cursor-pointer hover:text-blue-600">
           {node.children && node.children.length > 0 ? <ChevronDown size={14} /> : <ChevronRight size={14} className="opacity-50" />}
           <span>{node.name}</span>
           <span className="text-xs text-[#8E8E93] bg-[#F5F5F7] px-1.5 rounded">{node.headcountLimit} 编制</span>
        </div>
        {node.children && node.children.length > 0 && renderTree(node.children)}
      </div>
    ));
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">组织中心</h1>
          <p className="text-[#8E8E93] text-sm">组织架构树与矩阵项目挂载</p>
        </div>
      </div>

      <div className="flex gap-6 h-[600px]">
        {/* Left: Tree */}
        <div className="w-1/3 bg-white border border-[#E5E5EA] rounded-2xl p-4 overflow-y-auto shadow-sm">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8E8E93]" size={16} />
            <input
              type="text"
              placeholder="搜索部门..."
              className="w-full pl-9 pr-4 py-2 bg-[#F5F5F7] border border-transparent focus:border-blue-500 rounded-xl text-sm outline-none transition-colors"
            />
          </div>

          <div className="text-sm">
            {orgTree.length > 0 ? (
               <div className="space-y-2">
                  <div className="font-medium flex items-center gap-2 cursor-pointer bg-blue-50 text-blue-600 p-2 rounded-lg">
                    <Network size={16} /> 组织架构根节点
                  </div>
                  {renderTree(orgTree)}
               </div>
            ) : (
               <div className="text-center text-[#8E8E93] mt-8">加载中...</div>
            )}
          </div>
        </div>

        {/* Right: Details */}
        <div className="flex-1 bg-white border border-[#E5E5EA] rounded-2xl p-6 shadow-sm">
          <div className="border-b border-[#E5E5EA] pb-4 mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Network size={20} className="text-blue-500" />
              组织详情看板
            </h2>
            <div className="flex gap-4 mt-3 text-sm text-[#8E8E93] bg-[#F9F9FB] p-3 rounded-lg border border-[#E5E5EA]">
              <span className="flex flex-col"><span className="text-xs uppercase tracking-wider mb-1">负责人</span><span className="text-[#1C1C1E] font-medium">王总 (模拟)</span></span>
              <span className="w-px bg-[#E5E5EA]"></span>
              <span className="flex flex-col"><span className="text-xs uppercase tracking-wider mb-1">总编制情况</span><span className="text-[#1C1C1E] font-medium">100 / 实有：86</span></span>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center h-[300px] text-[#8E8E93]">
             <Network size={48} className="opacity-20 mb-4" />
             <p className="text-sm">点击左侧组织架构节点查看详细人员与岗位编制</p>
          </div>
        </div>
      </div>
    </div>
  );
}
