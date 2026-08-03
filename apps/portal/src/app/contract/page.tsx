import React from 'react';
import { Sparkles, Download, AlertTriangle } from 'lucide-react';

export default function ContractPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-2xl font-bold mb-1">合同台账</h1>
          <p className="text-[#8E8E93] text-sm">全生命周期合同追踪与预警</p>
        </div>
        <button className="bg-white border border-[#E5E5EA] text-[#1C1C1E] px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-50 flex items-center gap-2">
          <Download size={16} /> 导出台账
        </button>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-2xl p-5 border border-[#E5E5EA] shadow-sm flex flex-col">
          <span className="text-sm font-medium mb-1 text-[#8E8E93]">本年累计合同额</span>
          <span className="text-3xl font-bold">¥ 45,200,000</span>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-[#E5E5EA] shadow-sm flex flex-col">
          <span className="text-sm font-medium mb-1 text-[#8E8E93]">本月新增履约中</span>
          <span className="text-3xl font-bold">12 <span className="text-sm font-normal text-[#8E8E93]">份</span></span>
        </div>
        <div className="bg-red-50 rounded-2xl p-5 border border-red-100 flex flex-col text-red-700">
          <span className="text-sm font-medium mb-1 opacity-80">近期逾期未收款预警</span>
          <span className="text-3xl font-bold">¥ 1,120,800</span>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#E5E5EA] overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#F5F5F7] text-[#8E8E93]">
            <tr>
              <th className="p-4 font-medium">合同编号</th>
              <th className="p-4 font-medium">相对方名称</th>
              <th className="p-4 font-medium">合同金额</th>
              <th className="p-4 font-medium">签订日期</th>
              <th className="p-4 font-medium">状态</th>
              <th className="p-4 font-medium">AI 合规分析</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-[#E5E5EA]">
              <td className="p-4 font-mono text-blue-600">HT-2026-001</td>
              <td className="p-4">腾讯云科技有限公司</td>
              <td className="p-4 font-medium">¥ 120,000.00</td>
              <td className="p-4">2026-07-01</td>
              <td className="p-4"><span className="px-2 py-1 bg-green-100 text-green-700 rounded-md text-xs">履约中</span></td>
              <td className="p-4 text-[#5856D6] flex items-center gap-1"><Sparkles size={14}/> 履约正常，无风险点</td>
            </tr>
            <tr className="border-b border-[#E5E5EA]">
              <td className="p-4 font-mono text-blue-600">HT-2026-002</td>
              <td className="p-4">保利物业</td>
              <td className="p-4 font-medium">¥ 850,000.00</td>
              <td className="p-4">2025-08-15</td>
              <td className="p-4"><span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-md text-xs">即将到期</span></td>
              <td className="p-4 text-orange-600 flex items-center gap-1"><AlertTriangle size={14}/> 距到期不足30天，需续签</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
