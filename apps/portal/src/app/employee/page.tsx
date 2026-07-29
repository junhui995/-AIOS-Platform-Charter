"use client";

import React, { useEffect, useState } from 'react';
import { Search, Plus } from 'lucide-react';

export default function EmployeePage() {
  const [employees, setEmployees] = useState<{id: string, name: string, code: string, department: {name: string}, hireDate: string, status: string}[]>([]);

  useEffect(() => {
    fetch('/api/employee')
      .then(res => res.json())
      .then(data => {
        if (!data.error) setEmployees(data);
      })
      .catch(console.error);
  }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">人员管理</h1>
          <p className="text-[#8E8E93] text-sm">全量员工档案与异动记录</p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8E8E93]" size={16} />
            <input
              type="text"
              placeholder="搜索姓名 / 工号 / 手机号"
              className="pl-9 pr-4 py-2 bg-white border border-[#E5E5EA] rounded-xl text-sm w-64 focus:outline-none focus:border-blue-500"
            />
          </div>
          <button className="bg-[#007AFF] text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-600 transition-colors flex items-center gap-1.5">
            <Plus size={16} /> 办理入职
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#E5E5EA] overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#F5F5F7] text-[#8E8E93]">
            <tr>
              <th className="p-4 font-medium">员工姓名</th>
              <th className="p-4 font-medium">工号</th>
              <th className="p-4 font-medium">部门</th>
              <th className="p-4 font-medium">入职日期</th>
              <th className="p-4 font-medium">状态</th>
              <th className="p-4 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {employees.length > 0 ? employees.map((emp: {id: string, name: string, code: string, department: {name: string}, hireDate: string, status: string}, idx: number) => (
              <tr key={emp.id} className={idx !== employees.length - 1 ? "border-b border-[#E5E5EA]" : ""}>
                <td className="p-4 font-medium flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                    {emp.name.charAt(0)}
                  </div>
                  {emp.name}
                </td>
                <td className="p-4 text-[#8E8E93]">{emp.code}</td>
                <td className="p-4">{emp.department?.name || '-'}</td>
                <td className="p-4">{new Date(emp.hireDate).toLocaleDateString()}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded-md text-xs font-medium ${emp.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                    {emp.status}
                  </span>
                </td>
                <td className="p-4 text-blue-600 hover:underline cursor-pointer">查看档案</td>
              </tr>
            )) : (
              <tr><td colSpan={6} className="p-8 text-center text-[#8E8E93]">加载中或暂无数据...</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
