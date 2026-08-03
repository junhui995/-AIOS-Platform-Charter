"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, Filter, UserPlus, Shield, Briefcase, MoreHorizontal } from "lucide-react";

interface Employee {
  id: string;
  name: string;
  code: string;
  personalLevel?: string;
  roleId?: string;
  status: string;
  positions?: {
    isPrimary: boolean;
    position: {
      name: string;
      department: {
        name: string;
      }
    }
  }[];
}

export default function EmployeeListPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/employee')
      .then(res => res.json())
      .then(data => {
        setEmployees(data);
        setLoading(false);
      });
  }, []);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            花名册管理
          </h1>
          <p className="text-gray-500 mt-2">统一管理全公司人员、个人职级、系统角色分配及在岗状态。</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
          <UserPlus className="w-4 h-4" />
          新员工入职
        </button>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-100 flex gap-4 bg-gray-50">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="搜索姓名、工号、手机号..."
              className="w-full pl-9 pr-4 py-2 rounded-lg border-gray-200 text-sm focus:ring-blue-500 focus:border-blue-500 border"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-700 text-sm hover:bg-gray-50 transition-colors">
            <Filter className="w-4 h-4" />
            筛选状态 (Active)
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto min-h-[400px]">
          {loading ? (
            <div className="flex items-center justify-center h-64 text-gray-400">加载中...</div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 font-medium">基本信息</th>
                  <th className="px-6 py-4 font-medium">部门与岗位</th>
                  <th className="px-6 py-4 font-medium">个人职级</th>
                  <th className="px-6 py-4 font-medium">系统角色</th>
                  <th className="px-6 py-4 font-medium">状态</th>
                  <th className="px-6 py-4 font-medium text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {employees.map((emp, idx) => {
                  const primaryPos = emp.positions?.find(p => p.isPrimary)?.position;
                  return (
                    <motion.tr
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.05 }}
                      key={emp.id}
                      className="hover:bg-blue-50/50 transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                            {emp.name[0]}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{emp.name}</div>
                            <div className="text-xs text-gray-500 font-mono mt-0.5">{emp.code}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <span className="text-gray-900">{primaryPos?.department?.name || '-'}</span>
                          <span className="text-gray-500 text-xs flex items-center gap-1">
                            <Briefcase className="w-3 h-3"/> {primaryPos?.name || '未分配岗位'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2 py-1 rounded-md bg-purple-50 text-purple-700 text-xs font-medium font-mono">
                          {emp.personalLevel || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-gray-600">
                          <Shield className="w-4 h-4 text-gray-400" />
                          {emp.roleId ? '已绑定' : '普通员工'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          emp.status === 'ACTIVE' ? 'bg-green-50 text-green-700' :
                          emp.status === 'PROBATION' ? 'bg-blue-50 text-blue-700' :
                          'bg-red-50 text-red-700'
                        }`}>
                          {emp.status === 'ACTIVE' ? '正式' : emp.status === 'PROBATION' ? '试用期' : '已离职/禁用'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded" title="编辑信息">
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
