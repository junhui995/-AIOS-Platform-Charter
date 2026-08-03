"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Building2, Network, Plus, Settings2, Users } from "lucide-react";

interface Dimension {
  id: string;
  name: string;
}

interface Department {
  id: string;
  name: string;
  code: string;
  parentId: string | null;
  headcountLimit?: number;
  children?: Department[];
}

interface Position {
  id: string;
  name: string;
  level: string;
  employees?: { id: string }[];
}

export default function OrgStructurePage() {
  const [dimensions, setDimensions] = useState<Dimension[]>([]);
  const [activeDimension, setActiveDimension] = useState<string>('');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [activeDepartment, setActiveDepartment] = useState<Department | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);

  useEffect(() => {
    fetch('/api/org/dimensions')
      .then(res => res.json())
      .then(data => {
        setDimensions(data);
        if (data.length > 0) setActiveDimension(data[0].id);
      });
  }, []);

  useEffect(() => {
    if (activeDimension) {
      fetch(`/api/org/departments?dimensionId=${activeDimension}`)
        .then(res => res.json())
        .then(data => {
          setDepartments(data);
          if (data.length > 0) handleSelectDept(data[0]);
        });
    }
  }, [activeDimension]);

  const handleSelectDept = (dept: Department) => {
    setActiveDepartment(dept);
    fetch(`/api/org/positions?departmentId=${dept.id}`)
      .then(res => res.json())
      .then(data => setPositions(data));
  };

  // Build tree logic for departments
  const buildTree = (depts: Department[], parentId: string | null = null): Department[] => {
    return depts.filter(d => d.parentId === parentId).map(d => ({
      ...d,
      children: buildTree(depts, d.id)
    }));
  };

  const deptTree = buildTree(departments);

  const renderTree = (nodes: Department[], depth = 0) => {
    return nodes.map(node => (
      <div key={node.id}>
        <li
          onClick={() => handleSelectDept(node)}
          className={`flex items-center gap-2 text-sm p-2 rounded-lg cursor-pointer transition-colors ${
            activeDepartment?.id === node.id
              ? 'bg-blue-50 text-blue-700 font-medium'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
          style={{ paddingLeft: `${depth * 1.5 + 0.5}rem` }}
        >
          {depth === 0 ? <Building2 className="w-4 h-4 text-blue-600" /> : <div className="w-1 h-1 bg-gray-300 rounded-full" />}
          {node.name}
        </li>
        {node.children && node.children.length > 0 && (
          <ul className="space-y-1 mt-1">
            {renderTree(node.children, depth + 1)}
          </ul>
        )}
      </div>
    ));
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Network className="w-6 h-6 text-blue-600" />
            多维度组织架构
          </h1>
          <p className="text-gray-500 mt-2">管理公司组织架构与业务架构，设定部门及岗位，调整层级关系。</p>
        </div>
        <div className="flex gap-4">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
            <Settings2 className="w-4 h-4" />
            维度设置
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
            <Plus className="w-4 h-4" />
            新建部门
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-6">
        {/* Left Sidebar */}
        <div className="col-span-1 bg-white border border-gray-100 rounded-xl p-4 shadow-sm h-[600px] flex flex-col">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">切换架构维度</label>
            <select
              className="w-full border-gray-200 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500 p-2 border"
              value={activeDimension}
              onChange={(e) => setActiveDimension(e.target.value)}
            >
              {dimensions.map(dim => (
                <option key={dim.id} value={dim.id}>{dim.name}</option>
              ))}
            </select>
          </div>
          <div className="border-t border-gray-100 pt-4 flex-1 overflow-y-auto">
             <ul className="space-y-1">
               {deptTree.length > 0 ? renderTree(deptTree) : <div className="text-sm text-gray-400 p-2">暂无部门</div>}
             </ul>
          </div>
        </div>

        {/* Right Main Area */}
        <div className="col-span-3 bg-white border border-gray-100 rounded-xl p-6 shadow-sm h-[600px] overflow-y-auto">
           {activeDepartment ? (
             <>
               <div className="border-b border-gray-100 pb-4 mb-6 flex justify-between items-start">
                 <div>
                   <h2 className="text-xl font-semibold text-gray-900">{activeDepartment.name}</h2>
                   <p className="text-sm text-gray-500 mt-1">部门编码: {activeDepartment.code}</p>
                 </div>
                 <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">编制上限: {activeDepartment.headcountLimit || '无限制'} 人</div>
                 </div>
               </div>

               <div className="flex justify-between items-center mb-4">
                 <h3 className="text-md font-semibold text-gray-800 flex items-center gap-2">
                   <Users className="w-4 h-4 text-gray-500" />
                   下设岗位 ({positions.length})
                 </h3>
                 <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                   + 添加岗位
                 </button>
               </div>

               <div className="grid grid-cols-2 gap-4">
                 {positions.map((pos, idx) => (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      key={pos.id}
                      className="border border-gray-100 p-4 rounded-lg hover:border-blue-200 hover:shadow-sm transition-all"
                    >
                      <div className="flex justify-between items-start mb-2">
                         <h4 className="font-medium text-gray-900">{pos.name}</h4>
                         <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full font-mono">{pos.level}</span>
                      </div>
                      <div className="flex justify-between items-end mt-4">
                        <span className="text-sm text-gray-500">在岗: {pos.employees?.length || 0}人</span>
                        <div className="space-x-2">
                           <button className="text-xs text-blue-600 hover:underline">配置人员</button>
                           <button className="text-xs text-gray-500 hover:underline">编辑</button>
                        </div>
                      </div>
                    </motion.div>
                 ))}
                 {positions.length === 0 && (
                   <div className="col-span-2 text-center text-gray-400 py-8 text-sm">暂无岗位配置</div>
                 )}
               </div>
             </>
           ) : (
             <div className="flex items-center justify-center h-full text-gray-400">
               请在左侧选择一个部门查看详情
             </div>
           )}
        </div>
      </div>
    </div>
  );
}
