"use client";

import { motion } from "framer-motion";
import { Building2, Network, Plus, Settings2, Users } from "lucide-react";

export default function OrgStructurePage() {
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Network className="w-6 h-6 text-blue-600" />
            多维度组织架构 (Multi-dimensional Organization)
          </h1>
          <p className="text-gray-500 mt-2">管理公司组织架构与业务架构，设定部门及岗位，调整层级关系。</p>
        </div>
        <div className="flex gap-4">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
            <Settings2 className="w-4 h-4" />
            维度设置
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
            <Plus className="w-4 h-4" />
            新建部门
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-6">
        {/* Left Sidebar: Dimensions & Tree View Skeleton */}
        <div className="col-span-1 bg-white border border-gray-100 rounded-xl p-4 shadow-sm h-[600px] flex flex-col">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">切换架构维度</label>
            <select className="w-full border-gray-200 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500">
              <option>🏢 公司行政架构 (Company Dimension)</option>
              <option>🚀 业务项目架构 (Business Dimension)</option>
            </select>
          </div>
          <div className="border-t border-gray-100 pt-4 flex-1 overflow-y-auto">
             <ul className="space-y-2">
               <li className="flex items-center gap-2 text-sm font-medium text-gray-900 bg-blue-50 p-2 rounded-lg">
                  <Building2 className="w-4 h-4 text-blue-600" /> 总公司
               </li>
               <li className="flex items-center gap-2 text-sm text-gray-600 pl-6 p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                  <div className="w-px h-full bg-gray-200 absolute -left-2 top-0"></div>
                  研发中心
               </li>
               <li className="flex items-center gap-2 text-sm text-gray-600 pl-6 p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                  人力资源部
               </li>
             </ul>
             <div className="mt-8 text-center text-xs text-gray-400 border-t border-dashed border-gray-200 pt-4">
               💡 提示：未来将支持拖拽节点调整架构关系
             </div>
          </div>
        </div>

        {/* Right Main Area: Department Details & Positions */}
        <div className="col-span-3 bg-white border border-gray-100 rounded-xl p-6 shadow-sm h-[600px] overflow-y-auto">
           <div className="border-b border-gray-100 pb-4 mb-6 flex justify-between items-start">
             <div>
               <h2 className="text-xl font-semibold text-gray-900">研发中心</h2>
               <p className="text-sm text-gray-500 mt-1">负责公司核心平台研发 | 部门编码: DPT-RD-01</p>
             </div>
             <div className="text-right">
                <div className="text-sm font-medium text-gray-900">当前编制: 45 / 50 人</div>
                <div className="w-32 h-2 bg-gray-100 rounded-full mt-2 overflow-hidden">
                  <div className="h-full bg-blue-500 w-[90%]"></div>
                </div>
             </div>
           </div>

           <div className="flex justify-between items-center mb-4">
             <h3 className="text-md font-semibold text-gray-800 flex items-center gap-2">
               <Users className="w-4 h-4 text-gray-500" />
               下设岗位 (Positions)
             </h3>
             <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
               + 添加岗位
             </button>
           </div>

           <div className="grid grid-cols-2 gap-4">
             {[
                { name: '前端开发工程师', level: 'P5 - P7', count: 12 },
                { name: '后端开发工程师', level: 'P5 - P8', count: 20 },
                { name: 'UI设计专家', level: 'P6 - P7', count: 3 },
                { name: '产品经理', level: 'P6 - P8', count: 5 },
             ].map((pos, idx) => (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  key={idx}
                  className="border border-gray-100 p-4 rounded-lg hover:border-blue-200 hover:shadow-sm transition-all"
                >
                  <div className="flex justify-between items-start mb-2">
                     <h4 className="font-medium text-gray-900">{pos.name}</h4>
                     <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full font-mono">{pos.level}</span>
                  </div>
                  <div className="flex justify-between items-end mt-4">
                    <span className="text-sm text-gray-500">在岗: {pos.count}人</span>
                    <div className="space-x-2">
                       <button className="text-xs text-blue-600 hover:underline">配置人员</button>
                       <button className="text-xs text-gray-500 hover:underline">编辑</button>
                    </div>
                  </div>
                </motion.div>
             ))}
           </div>
        </div>
      </div>
    </div>
  );
}
