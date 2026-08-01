"use client";

import { useState } from "react";
import { Settings, Shield, Plus, Database, Users } from "lucide-react";
import { motion } from "framer-motion";

export default function RolesPage() {
  const [activeTab, setActiveTab] = useState<'roles' | 'permissions'>('roles');

  const roles = [
    { id: '1', name: '系统管理员', count: 1, type: '内置' },
    { id: '2', name: 'HRBP', count: 5, type: '自定义' },
    { id: '3', name: '部门主管', count: 12, type: '内置' },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto h-[calc(100vh-100px)] flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Settings className="w-6 h-6 text-blue-600" />
            系统权限与角色设置
          </h1>
          <p className="text-gray-500 mt-2">配置双维权限矩阵：功能菜单权限 + 组织数据维度权限。</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm">
          <Plus className="w-4 h-4" /> 新建角色
        </button>
      </div>

      <div className="flex-1 bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col overflow-hidden">
        <div className="flex border-b border-gray-100 bg-gray-50 px-4">
          <button
            className={`py-3 px-4 text-sm font-medium border-b-2 ${activeTab === 'roles' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('roles')}
          >
            角色列表
          </button>
          <button
            className={`py-3 px-4 text-sm font-medium border-b-2 ${activeTab === 'permissions' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('permissions')}
          >
            双维权限矩阵配置
          </button>
        </div>

        <div className="flex-1 p-6 overflow-y-auto">
          {activeTab === 'roles' && (
            <div className="grid grid-cols-3 gap-6">
              {roles.map((role, idx) => (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.1 }}
                  key={role.id}
                  className="border border-gray-100 rounded-xl p-6 hover:shadow-md transition-shadow relative"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2">
                      <Shield className={`w-5 h-5 ${role.type === '内置' ? 'text-blue-500' : 'text-purple-500'}`} />
                      <h3 className="font-bold text-gray-900">{role.name}</h3>
                    </div>
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-500">{role.type}</span>
                  </div>
                  <div className="text-sm text-gray-500 mb-6">负责相关领域的管理与数据维护。</div>
                  <div className="flex justify-between items-center border-t border-gray-50 pt-4">
                    <div className="flex items-center gap-1 text-sm text-gray-600 font-medium">
                      <Users className="w-4 h-4" /> {role.count} 人
                    </div>
                    <button className="text-blue-600 text-sm hover:underline">编辑权限</button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {activeTab === 'permissions' && (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
                  <tr>
                    <th className="p-3 border-r">功能模块 (Function)</th>
                    <th className="p-3 border-r">HRBP</th>
                    <th className="p-3">部门主管</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr>
                    <td className="p-3 border-r font-medium text-gray-900">组织架构管理</td>
                    <td className="p-3 border-r">
                      <div className="flex flex-col gap-1">
                        <label className="flex items-center gap-1"><input type="checkbox" checked readOnly /> 读取</label>
                        <label className="flex items-center gap-1"><input type="checkbox" checked readOnly /> 写入</label>
                        <span className="text-xs text-blue-600 flex items-center gap-1 mt-1"><Database className="w-3 h-3"/> 维度: 全公司</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex flex-col gap-1">
                        <label className="flex items-center gap-1"><input type="checkbox" checked readOnly /> 读取</label>
                        <label className="flex items-center gap-1"><input type="checkbox" readOnly /> 写入</label>
                        <span className="text-xs text-blue-600 flex items-center gap-1 mt-1"><Database className="w-3 h-3"/> 维度: 仅本部门</span>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td className="p-3 border-r font-medium text-gray-900">薪资计算引擎</td>
                    <td className="p-3 border-r">
                      <div className="flex flex-col gap-1">
                        <label className="flex items-center gap-1"><input type="checkbox" checked readOnly /> 读取</label>
                        <label className="flex items-center gap-1"><input type="checkbox" checked readOnly /> 写入</label>
                        <span className="text-xs text-blue-600 flex items-center gap-1 mt-1"><Database className="w-3 h-3"/> 维度: 全公司</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex flex-col gap-1">
                        <label className="flex items-center gap-1"><input type="checkbox" readOnly /> 读取</label>
                        <label className="flex items-center gap-1"><input type="checkbox" readOnly /> 写入</label>
                        <span className="text-xs text-gray-400 mt-1">无数据权限</span>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
