import React from 'react';
import Link from 'next/link';
import { Home, Users, Briefcase, FileText, Settings, PieChart, Sparkles } from 'lucide-react';

export default function Sidebar() {
  return (
    <div className="w-[240px] bg-white border-r border-[#E5E5EA] flex flex-col h-screen fixed left-0 top-0">
      <div className="p-6 font-bold text-lg flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white">
          <Sparkles size={16} />
        </div>
        AIOS Workspace
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-2 flex flex-col gap-1">
        <div className="text-xs text-[#8E8E93] font-semibold mb-2 mt-4 px-3">工作台</div>
        <NavItem href="/" icon={<Home size={18} />} label="个人首页" active />
        <NavItem href="/attendance" icon={<PieChart size={18} />} label="考勤仪表盘" />

        <div className="text-xs text-[#8E8E93] font-semibold mb-2 mt-6 px-3">人事行政</div>
        <NavItem href="/org" icon={<Users size={18} />} label="组织中心" />
        <NavItem href="/employee" icon={<Briefcase size={18} />} label="人员管理" />

        <div className="text-xs text-[#8E8E93] font-semibold mb-2 mt-6 px-3">财务与合同</div>
        <NavItem href="/contract" icon={<FileText size={18} />} label="合同台账" />
      </div>

      <div className="p-4 border-t border-[#E5E5EA]">
        <NavItem href="/settings" icon={<Settings size={18} />} label="系统设置" />
      </div>
    </div>
  );
}

function NavItem({ href, icon, label, active = false }: { href: string, icon: React.ReactNode, label: string, active?: boolean }) {
  return (
    <Link href={href} className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all ${active ? 'bg-[#E5F1FF] text-[#007AFF] font-medium' : 'text-[#1C1C1E] hover:bg-[#F5F5F7]'}`}>
      {icon}
      <span className="text-[14px]">{label}</span>
    </Link>
  );
}
