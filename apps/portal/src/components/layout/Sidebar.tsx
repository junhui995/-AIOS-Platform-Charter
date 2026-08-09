"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home, Users, FileText, Settings,
  PieChart, Sparkles,
  Network, Workflow, BarChart3, Calculator, Smartphone
} from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();

  const isAct = (path: string) => pathname === path;

  return (
    <div className="w-[240px] bg-white border-r border-[#E5E5EA] flex flex-col h-screen fixed left-0 top-0">
      <div className="p-6 font-bold text-lg flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white shadow-sm">
          <Sparkles size={16} />
        </div>
        AIOS Workspace
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-2 flex flex-col gap-1">
        <div className="text-xs text-[#8E8E93] font-semibold mb-2 mt-4 px-3 uppercase tracking-wider">工作台</div>
        <NavItem href="/" icon={<Home size={18} />} label="个人首页" active={isAct('/')} />

        <div className="text-xs text-[#8E8E93] font-semibold mb-2 mt-6 px-3 uppercase tracking-wider">核心人事 (HR)</div>
        <NavItem href="/org/structure" icon={<Network size={18} />} label="组织架构" active={isAct('/org/structure')} />
        <NavItem href="/employee/list" icon={<Users size={18} />} label="花名册管理" active={isAct('/employee/list')} />
        <NavItem href="/hr/contracts" icon={<FileText size={18} />} label="劳动合同" active={isAct('/hr/contracts')} />

        <div className="text-xs text-[#8E8E93] font-semibold mb-2 mt-6 px-3 uppercase tracking-wider">薪酬绩效 (C&B)</div>
        <NavItem href="/hr/attendance" icon={<PieChart size={18} />} label="考勤中心" active={isAct('/hr/attendance')} />
        <NavItem href="/hr/performance" icon={<BarChart3 size={18} />} label="绩效管理" active={isAct('/hr/performance')} />
        <NavItem href="/hr/salary" icon={<Calculator size={18} />} label="薪资计算" active={isAct('/hr/salary')} />

        <div className="text-xs text-[#8E8E93] font-semibold mb-2 mt-6 px-3 uppercase tracking-wider">业务管理 (BPM)</div>
        <NavItem href="/workflow/designer" icon={<Workflow size={18} />} label="流程引擎" active={isAct('/workflow/designer')} />

        <div className="text-xs text-[#8E8E93] font-semibold mb-2 mt-6 px-3 uppercase tracking-wider">移动端 (Mobile)</div>
        <NavItem href="/mobile/punch" icon={<Smartphone size={18} />} label="打卡预览" active={isAct('/mobile/punch')} />

      </div>

      <div className="p-4 border-t border-[#E5E5EA] flex flex-col gap-1">
        <NavItem href="/system/roles" icon={<Settings size={18} />} label="系统权限设置" active={isAct('/system/roles')} />
      </div>
    </div>
  );
}

function NavItem({ href, icon, label, active = false }: { href: string, icon: React.ReactNode, label: string, active?: boolean }) {
  return (
    <Link href={href} className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 ${active ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}>
      {React.cloneElement(icon as React.ReactElement, { className: active ? 'text-blue-600' : 'text-gray-400' })}
      <span className="text-[14px]">{label}</span>
    </Link>
  );
}
