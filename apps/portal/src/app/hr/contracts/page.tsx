"use client";


import { FileText, Plus, FileSignature, AlertCircle, CheckCircle2 } from "lucide-react";

export default function ContractsPage() {
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileSignature className="w-6 h-6 text-blue-600" />
            劳动合同管理 (Labor Contracts)
          </h1>
          <p className="text-gray-500 mt-2">集中管理员工劳动合同，支持模板水印预览及批量续签。</p>
        </div>
        <div className="flex gap-4">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
            <FileText className="w-4 h-4" />
            管理合同模板
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
            <Plus className="w-4 h-4" />
            新建劳动合同
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        {[
          { label: '生效中合同', value: '142', icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
          { label: '30天内到期', value: '5', icon: AlertCircle, color: 'text-orange-600', bg: 'bg-orange-50' },
          { label: '待签署', value: '12', icon: FileSignature, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: '合同模板库', value: '4', icon: FileText, color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map((stat, idx) => (
          <div key={idx} className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
            <div className={`p-3 rounded-lg ${stat.bg}`}>
              <stat.icon className={`w-6 h-6 ${stat.color}`} />
            </div>
            <div>
              <div className="text-sm text-gray-500">{stat.label}</div>
              <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50 flex gap-4">
          <button className="text-sm font-medium text-blue-600 border-b-2 border-blue-600 px-2 pb-1">全部合同</button>
          <button className="text-sm font-medium text-gray-500 hover:text-gray-900 px-2 pb-1">即将到期</button>
          <button className="text-sm font-medium text-gray-500 hover:text-gray-900 px-2 pb-1">待生效</button>
        </div>

        <div className="p-12 text-center text-gray-500">
           <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
           <p className="mb-4">合同列表正在开发中...</p>
           <p className="text-sm text-gray-400">预计支持功能：批量续签、模板水印预览、电子签章对接</p>
        </div>
      </div>
    </div>
  );
}
