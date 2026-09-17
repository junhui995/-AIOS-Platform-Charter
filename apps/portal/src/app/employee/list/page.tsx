/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Search, X, Users, Building2 } from 'lucide-react';

export default function EmployeeListPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);

  // Search and Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
      name: '',
      code: '',
      gender: '',
      phoneNumber: '',
      email: '',
      idNumber: '',
      birthDate: '',
      address: '',
      hireDate: new Date().toISOString().split('T')[0],
      probationDate: '',
      status: 'ACTIVE',
      personalLevel: '',
      positionId: '', // For future use if positions are loaded
      emergencyContactName: '',
      emergencyContactPhone: '',
      remark: ''
  });

  const loadData = () => {
    // Fetch departments for filter
    fetch('/api/org/departments')
      .then(res => res.json())
      .then(data => {
         if (Array.isArray(data)) setDepartments(data);
      }).catch(e => console.error(e));

    loadEmployees();
  };

  const loadEmployees = () => {
    setLoading(true);
    let url = '/api/employee?';
    if (searchTerm) url += `search=${encodeURIComponent(searchTerm)}&`;
    if (filterDept) url += `departmentId=${encodeURIComponent(filterDept)}&`;
    if (filterStatus) url += `status=${encodeURIComponent(filterStatus)}`;

    fetch(url)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setEmployees(data);
        setLoading(false);
      }).catch(e => {
        console.error(e);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced search effect
  useEffect(() => {
     const timer = setTimeout(() => {
         loadEmployees();
     }, 300);
     return () => clearTimeout(timer);
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, filterDept, filterStatus]);


  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
        const res = await fetch('/api/employee', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        if (res.ok) {
          setIsModalOpen(false);
          setFormData({
              name: '',
              code: '',
              gender: '',
              phoneNumber: '',
              email: '',
              idNumber: '',
              birthDate: '',
              address: '',
              hireDate: new Date().toISOString().split('T')[0],
              probationDate: '',
              status: 'ACTIVE',
              personalLevel: '',
              positionId: '',
              emergencyContactName: '',
              emergencyContactPhone: '',
              remark: ''
          });
          loadEmployees();
        } else {
          const err = await res.json();
          alert('创建失败: ' + (err.details || err.error));
        }
    } catch (error) {
        alert('请求异常');
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-[calc(100vh-64px)]">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-6 h-6 text-blue-600" />
              人员档案管理
          </h1>
          <button
             onClick={() => setIsModalOpen(true)}
             className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4"/> 新增员工
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 flex gap-4">
           <div className="flex-1 relative">
               <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
               <input
                  type="text"
                  placeholder="搜索姓名、工号或手机号..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
               />
           </div>
           <select
               value={filterDept}
               onChange={e => setFilterDept(e.target.value)}
               className="border border-gray-300 rounded-lg px-4 py-2 text-sm text-gray-700 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
           >
               <option value="">全部部门</option>
               {departments.map(d => (
                   <option key={d.id} value={d.id}>{d.name}</option>
               ))}
           </select>
           <select
               value={filterStatus}
               onChange={e => setFilterStatus(e.target.value)}
               className="border border-gray-300 rounded-lg px-4 py-2 text-sm text-gray-700 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
           >
               <option value="">全部状态</option>
               <option value="ACTIVE">正式在职</option>
               <option value="PROBATION">试用期</option>
               <option value="INACTIVE">离职</option>
               <option value="SUSPENDED">停职</option>
           </select>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b text-xs text-gray-500 uppercase tracking-wider">
              <tr>
                <th className="p-4 font-medium">基本信息</th>
                <th className="p-4 font-medium">任职信息</th>
                <th className="p-4 font-medium">联系方式</th>
                <th className="p-4 font-medium">状态</th>
                <th className="p-4 font-medium text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y text-sm">
              {loading ? (
                  <tr>
                      <td colSpan={5} className="p-8 text-center text-gray-400">加载中...</td>
                  </tr>
              ) : employees.length === 0 ? (
                  <tr>
                      <td colSpan={5} className="p-8 text-center text-gray-400">未找到员工数据</td>
                  </tr>
              ) : employees.map(emp => (
                <tr key={emp.id} className="hover:bg-gray-50 transition-colors group">
                  <td className="p-4">
                      <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                              {emp.name.charAt(0)}
                          </div>
                          <div>
                              <div className="font-medium text-gray-900">{emp.name} {emp.gender === 'MALE' ? '♂' : emp.gender === 'FEMALE' ? '♀' : ''}</div>
                              <div className="text-xs text-gray-500 font-mono mt-0.5">{emp.code}</div>
                          </div>
                      </div>
                  </td>
                  <td className="p-4 text-gray-600">
                      <div className="flex items-center gap-1 mb-1">
                          <Building2 className="w-3 h-3 text-gray-400" />
                          {emp.positions?.[0]?.position?.department?.name || '未定部门'}
                      </div>
                      <div className="text-xs text-gray-500">
                         {emp.positions?.[0]?.position?.name || '未定职位'} {emp.personalLevel ? `(${emp.personalLevel})` : ''}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">入职: {new Date(emp.hireDate).toLocaleDateString()}</div>
                  </td>
                  <td className="p-4 text-gray-600">
                      <div>{emp.phoneNumber || '-'}</div>
                      <div className="text-xs text-gray-500">{emp.email || '-'}</div>
                  </td>
                  <td className="p-4">
                     {emp.status === 'ACTIVE' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">正式</span>}
                     {emp.status === 'INACTIVE' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">离职</span>}
                     {emp.status === 'PROBATION' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">试用期</span>}
                     {emp.status === 'SUSPENDED' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">停职</span>}
                  </td>
                  <td className="p-4 text-right">
                    <Link href={`/employee/${emp.id}`} className="text-blue-600 hover:underline text-sm font-medium">
                      查看详情
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
             <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-6 border-b border-gray-100">
                    <h2 className="text-xl font-semibold text-gray-900">新增员工档案</h2>
                    <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                        <X className="w-5 h-5"/>
                    </button>
                </div>
                <div className="p-6 overflow-y-auto flex-1">
                    <form id="employee-form" onSubmit={handleCreateEmployee} className="space-y-8">
                        {/* 基础信息 */}
                        <section>
                            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2"><span className="w-1 h-4 bg-blue-600 rounded"></span> 基础信息</h3>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">姓名 <span className="text-red-500">*</span></label>
                                    <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">工号 (可选)</label>
                                    <input type="text" placeholder="留空自动生成" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">性别</label>
                                    <select value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                                        <option value="">未指定</option>
                                        <option value="MALE">男</option>
                                        <option value="FEMALE">女</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">手机号 <span className="text-red-500">*</span></label>
                                    <input required type="text" value={formData.phoneNumber} onChange={e => setFormData({...formData, phoneNumber: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">邮箱 <span className="text-red-500">*</span></label>
                                    <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">身份证号</label>
                                    <input type="text" value={formData.idNumber} onChange={e => setFormData({...formData, idNumber: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                                </div>
                                <div className="col-span-3">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">联系地址</label>
                                    <input type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                                </div>
                            </div>
                        </section>

                        {/* 任职信息 */}
                        <section>
                            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2"><span className="w-1 h-4 bg-blue-600 rounded"></span> 任职信息</h3>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">入职日期 <span className="text-red-500">*</span></label>
                                    <input required type="date" value={formData.hireDate} onChange={e => setFormData({...formData, hireDate: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">预计转正日期</label>
                                    <input type="date" value={formData.probationDate} onChange={e => setFormData({...formData, probationDate: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">员工状态</label>
                                    <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                                        <option value="ACTIVE">正式在职</option>
                                        <option value="PROBATION">试用期</option>
                                        <option value="INACTIVE">离职</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">职级</label>
                                    <input type="text" placeholder="如 P6" value={formData.personalLevel} onChange={e => setFormData({...formData, personalLevel: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                                </div>
                            </div>
                        </section>

                        {/* 其他信息 */}
                        <section>
                            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2"><span className="w-1 h-4 bg-blue-600 rounded"></span> 其他信息</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">紧急联系人</label>
                                    <input type="text" value={formData.emergencyContactName} onChange={e => setFormData({...formData, emergencyContactName: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">紧急联系人电话</label>
                                    <input type="text" value={formData.emergencyContactPhone} onChange={e => setFormData({...formData, emergencyContactPhone: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
                                    <textarea value={formData.remark} onChange={e => setFormData({...formData, remark: e.target.value})} rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"></textarea>
                                </div>
                            </div>
                        </section>
                    </form>
                </div>
                <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors font-medium">
                        取消
                    </button>
                    <button type="submit" form="employee-form" disabled={loading} className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium disabled:opacity-50 flex items-center gap-2">
                        {loading ? '保存中...' : '保存员工档案'}
                    </button>
                </div>
             </div>
          </div>
      )}
    </div>
  );
}
