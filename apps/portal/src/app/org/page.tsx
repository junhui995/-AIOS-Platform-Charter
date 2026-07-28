import React from 'react';
import { Network, Search } from 'lucide-react';

export default function OrgPage() {
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
        <div className="w-1/3 bg-white border border-[#E5E5EA] rounded-2xl p-4 overflow-y-auto">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8E8E93]" size={16} />
            <input
              type="text"
              placeholder="搜索部门..."
              className="w-full pl-9 pr-4 py-2 bg-[#F5F5F7] border border-transparent focus:border-blue-500 rounded-xl text-sm outline-none"
            />
          </div>
          <div className="space-y-2">
            <div className="font-medium flex items-center gap-2 cursor-pointer bg-blue-50 text-blue-600 p-2 rounded-lg">
              <Network size={16} /> 华复保利集团
            </div>
            <div className="pl-6 space-y-2 text-sm">
              <div className="cursor-pointer hover:text-blue-600">总办 (5人)</div>
              <div className="cursor-pointer hover:text-blue-600">人力资源部 (12人)</div>
              <div className="cursor-pointer hover:text-blue-600">财务部 (8人)</div>
              <div className="cursor-pointer hover:text-blue-600">工程管理部 (45人)</div>
            </div>
          </div>
        </div>

        {/* Right: Details */}
        <div className="flex-1 bg-white border border-[#E5E5EA] rounded-2xl p-6">
          <div className="border-b border-[#E5E5EA] pb-4 mb-4">
            <h2 className="text-xl font-bold">华复保利集团</h2>
            <div className="flex gap-4 mt-2 text-sm text-[#8E8E93]">
              <span>负责人：王总</span>
              <span>编制：100 / 实有：86</span>
            </div>
          </div>

          <p className="text-[#8E8E93] text-sm text-center mt-20">点击左侧组织架构节点查看详细人员与岗位编制...</p>
        </div>
      </div>
    </div>
  );
}
