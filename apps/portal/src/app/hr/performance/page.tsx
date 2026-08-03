"use client";

import { } from "react";
import { motion } from "framer-motion";
import { BarChart3, Plus, Settings2, ShieldCheck } from "lucide-react";

export default function PerformancePage() {
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-blue-600" />
            绩效管理
          </h1>
          <p className="text-gray-500 mt-2">定义多维度绩效考核模板（OKR/KPI），下发给部门或个人。</p>
        </div>
        <div className="flex gap-4">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
            <Settings2 className="w-4 h-4" />
            考核周期设置
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
            <Plus className="w-4 h-4" />
            新建绩效模板
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {[
          { name: '研发中心技术考核 (OKR)', type: '部门级', count: 45, status: '生效中', color: 'blue' },
          { name: '销售团队业绩考核 (KPI)', type: '岗位级', count: 12, status: '生效中', color: 'green' },
          { name: '管理层 360 度环评', type: '公司级', count: 8, status: '草稿', color: 'gray' },
        ].map((tpl, idx) => (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            key={idx}
            className="bg-white border border-gray-100 p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
          >
            <div className={`absolute top-0 left-0 w-1 h-full bg-${tpl.color}-500`} />
            <div className="flex justify-between items-start mb-4">
              <span className={`px-2 py-1 bg-${tpl.color}-50 text-${tpl.color}-700 text-xs rounded font-medium`}>{tpl.type}</span>
              <span className="text-xs text-gray-400">{tpl.status}</span>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">{tpl.name}</h3>
            <p className="text-sm text-gray-500 mb-6">包含 4 项核心考核指标，按权重计算最终得分。</p>
            <div className="flex justify-between items-center border-t border-gray-100 pt-4">
              <div className="text-sm font-medium text-gray-900 flex items-center gap-1">
                <ShieldCheck className="w-4 h-4 text-green-500" />
                已绑定 {tpl.count} 人
              </div>
              <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">配置详情</button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
