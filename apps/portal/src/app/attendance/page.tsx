import React from 'react';
import { Sparkles, Calendar, Clock, AlertTriangle } from 'lucide-react';

export default function AttendancePage() {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-2xl font-bold mb-1">考勤管理</h1>
          <p className="text-[#8E8E93] text-sm">2026年7月考勤情况</p>
        </div>
        <button className="bg-[#007AFF] text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-600 transition-colors">
          导出本月报表
        </button>
      </div>

      <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-100 rounded-2xl p-4 flex items-center gap-4 text-purple-800">
        <Sparkles size={24} className="text-purple-500 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium">AI 异常诊断报告已生成：</p>
          <p className="text-xs mt-1 opacity-80">本月共有 3 人出现多次晚于 10:00 打卡，其中包含研发部 2 人。建议关注研发组近期加班情况，是否因前序项目发版导致作息偏移。</p>
        </div>
        <button className="bg-white border border-purple-200 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-purple-100 transition-colors">
          查看详情
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <StatCard title="应出勤人数" value="86" icon={<Calendar size={20} />} />
        <StatCard title="今日实到" value="82" icon={<Clock size={20} />} />
        <StatCard title="迟到/早退" value="2" icon={<AlertTriangle size={20} className="text-orange-500" />} />
        <StatCard title="请假中" value="2" icon={<Calendar size={20} />} />
      </div>

      {/* Table Placeholder */}
      <div className="bg-white rounded-2xl border border-[#E5E5EA] overflow-hidden mt-6">
        <div className="p-4 border-b border-[#E5E5EA] font-semibold">今日考勤异常明细</div>
        <table className="w-full text-left text-sm">
          <thead className="bg-[#F5F5F7] text-[#8E8E93]">
            <tr>
              <th className="p-3 font-medium">姓名</th>
              <th className="p-3 font-medium">部门</th>
              <th className="p-3 font-medium">异常类型</th>
              <th className="p-3 font-medium">打卡时间</th>
              <th className="p-3 font-medium">AI 建议</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-[#E5E5EA]">
              <td className="p-3">李四</td>
              <td className="p-3">产品部</td>
              <td className="p-3 text-orange-500 font-medium">迟到</td>
              <td className="p-3">10:15</td>
              <td className="p-3 text-[#5856D6] flex items-center gap-1"><Sparkles size={12}/> 已自动发起补卡提示</td>
            </tr>
            <tr>
              <td className="p-3">王五</td>
              <td className="p-3">研发部</td>
              <td className="p-3 text-red-500 font-medium">缺卡</td>
              <td className="p-3">-</td>
              <td className="p-3 text-[#5856D6] flex items-center gap-1"><Sparkles size={12}/> 疑似遗忘打卡，请假系统中无记录</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon }: {title: string, value: string, icon: React.ReactNode}) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-[#E5E5EA] shadow-sm flex flex-col relative">
      <div className="absolute top-4 right-4 text-[#8E8E93]">{icon}</div>
      <span className="text-sm font-medium mb-2 text-[#8E8E93]">{title}</span>
      <span className="text-3xl font-bold">{value}</span>
    </div>
  );
}
