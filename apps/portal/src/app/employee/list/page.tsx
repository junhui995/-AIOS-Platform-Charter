"use client";

import { motion } from "framer-motion";
import { Search, Filter, UserPlus, Shield, Briefcase, MoreHorizontal } from "lucide-react";

export default function EmployeeListPage() {
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            花名册管理 (Employee Roster)
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
              className="w-full pl-9 pr-4 py-2 rounded-lg border-gray-200 text-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-700 text-sm hover:bg-gray-50 transition-colors">
            <Filter className="w-4 h-4" />
            筛选状态 (Active)
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-700 text-sm hover:bg-gray-50 transition-colors ml-auto">
            批量操作
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 font-medium">基本信息</th>
                <th className="px-6 py-4 font-medium">部门与岗位</th>
                <th className="px-6 py-4 font-medium">个人职级 (Level)</th>
                <th className="px-6 py-4 font-medium">系统角色 (Role)</th>
                <th className="px-6 py-4 font-medium">状态</th>
                <th className="px-6 py-4 font-medium text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {[
                { name: '张三', empId: 'EMP-001', dept: '研发中心', title: '前端开发', level: 'L3 (P6)', role: '普通员工', status: 'ACTIVE', phone: '13800000001' },
                { name: '李四', empId: 'EMP-002', dept: '研发中心', title: '研发总监', level: 'L5 (M2)', role: '部门管理员', status: 'ACTIVE', phone: '13800000002' },
                { name: '王五', empId: 'EMP-003', dept: '人力资源部', title: 'HRBP', level: 'L3 (P6)', role: 'HR 管理员', status: 'PROBATION', phone: '13800000003' },
                { name: '赵六', empId: 'EMP-004', dept: '销售部', title: '大客户销售', level: 'L2 (P5)', role: '普通员工', status: 'DISABLED', phone: '13800000004' },
              ].map((emp, idx) => (
                <motion.tr
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  key={emp.empId}
                  className="hover:bg-blue-50/50 transition-colors group"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                        {emp.name[0]}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{emp.name}</div>
                        <div className="text-xs text-gray-500 font-mono mt-0.5">{emp.empId}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-gray-900">{emp.dept}</span>
                      <span className="text-gray-500 text-xs flex items-center gap-1"><Briefcase className="w-3 h-3"/> {emp.title}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2 py-1 rounded-md bg-purple-50 text-purple-700 text-xs font-medium font-mono">
                      {emp.level}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-gray-600">
                      <Shield className={`w-4 h-4 ${emp.role.includes('管理员') ? 'text-orange-500' : 'text-gray-400'}`} />
                      {emp.role}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      emp.status === 'ACTIVE' ? 'bg-green-50 text-green-700' :
                      emp.status === 'PROBATION' ? 'bg-blue-50 text-blue-700' :
                      'bg-red-50 text-red-700'
                    }`}>
                      {emp.status === 'ACTIVE' ? '正式' : emp.status === 'PROBATION' ? '试用期' : '已禁用'}
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
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Skeleton */}
        <div className="p-4 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
          <div>共 4 名员工</div>
          <div className="flex gap-2">
            <button className="px-3 py-1 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50">上一页</button>
            <button className="px-3 py-1 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50">下一页</button>
          </div>
        </div>
      </div>
    </div>
  );
}
