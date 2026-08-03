import React from 'react';
import { Sparkles, ArrowRight, Calendar, FileText } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-2xl font-bold mb-1">早上好，管理员 👋</h1>
          <p className="text-[#8E8E93] text-sm">今天有 4 项待办需要你处理，系统已为你扫描潜在风险 1 项。</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <StatCard title="在职人数" value="86" subtitle="本月新入职 3 人" color="blue" />
        <StatCard title="本月待办" value="4" subtitle="其中 2 项紧急" color="purple" />
        <StatCard title="预警提示" value="1" subtitle="合同即将到期" color="red" />
        <StatCard title="知识库" value="128" subtitle="AI 学习文档数" color="green" />
      </div>

      <div className="grid grid-cols-3 gap-6 mt-6">
        <div className="col-span-2 space-y-6">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#E5E5EA]">
            <h2 className="font-semibold mb-4 text-lg">待办与决策 (AI 辅助)</h2>
            <div className="space-y-3">
              <TodoItem
                title="张三的转正申请"
                time="2小时前"
                aiSuggest="基于他近三个月的绩效数据（A-），AI 建议通过该转正申请。"
              />
              <TodoItem
                title="报销单 DF-20260719"
                time="昨天 14:30"
                aiSuggest="报销金额超标10%，但有特殊备注。建议人工复核发票。"
              />
            </div>
          </div>
        </div>

        <div className="col-span-1 space-y-6">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#E5E5EA]">
            <h2 className="font-semibold mb-4 text-lg">快捷工具</h2>
            <div className="grid grid-cols-2 gap-3">
              <ToolCard icon={<Sparkles size={20} />} label="AI 智能填单" />
              <ToolCard icon={<FileText size={20} />} label="起草合同" />
              <ToolCard icon={<Calendar size={20} />} label="会议室预定" />
              <ToolCard icon={<ArrowRight size={20} />} label="更多工具" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, subtitle, color }: {title: string, value: string, subtitle: string, color: string}) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
    red: 'bg-red-50 text-red-600 border-red-100',
    green: 'bg-green-50 text-green-600 border-green-100',
  };
  return (
    <div className={`rounded-2xl p-5 border shadow-sm flex flex-col ${colors[color] || colors.blue}`}>
      <span className="text-sm font-medium mb-2 opacity-80">{title}</span>
      <span className="text-3xl font-bold mb-1">{value}</span>
      <span className="text-xs opacity-70">{subtitle}</span>
    </div>
  );
}

function TodoItem({ title, time, aiSuggest }: {title: string, time: string, aiSuggest: string}) {
  return (
    <div className="flex flex-col p-4 rounded-xl border border-[#E5E5EA] hover:border-purple-300 transition-colors bg-[#F9F9FB] group">
      <div className="flex justify-between items-center mb-2">
        <span className="font-medium">{title}</span>
        <span className="text-xs text-[#8E8E93]">{time}</span>
      </div>
      <div className="flex items-start gap-2 text-sm text-[#5856D6] bg-purple-50 p-2 rounded-lg">
        <Sparkles size={16} className="mt-0.5 flex-shrink-0" />
        <span className="leading-snug">{aiSuggest}</span>
      </div>
      <div className="mt-3 flex gap-2">
        <button className="px-4 py-1.5 bg-[#007AFF] text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors">
          立即处理
        </button>
      </div>
    </div>
  );
}

function ToolCard({ icon, label }: {icon: React.ReactNode, label: string}) {
  return (
    <div className="flex flex-col items-center justify-center p-4 rounded-xl border border-[#E5E5EA] bg-[#F5F5F7] hover:bg-white hover:shadow-sm cursor-pointer transition-all text-[#1C1C1E]">
      <div className="mb-2 text-[#8E8E93]">{icon}</div>
      <span className="text-xs font-medium">{label}</span>
    </div>
  );
}
