"use client";

import React, { useState } from 'react';
import DataGrid from 'react-data-grid';
import 'react-data-grid/lib/styles.css';
import { Calculator, Download } from 'lucide-react';
import { Parser } from 'expr-eval';

const columns = [
  { key: 'id', name: '员工工号', width: 120, resizable: true },
  { key: 'name', name: '姓名', width: 100 },
  { key: 'department', name: '所属部门', width: 150 },
  { key: 'baseSalary', name: '基础薪资 (A)', width: 150, editable: true },
  { key: 'performanceScore', name: '绩效系数 (B)', width: 120, editable: true },
  { key: 'deductions', name: '社保扣款 (C)', width: 120, editable: true },
  { key: 'formula', name: '结算公式 (Formula)', width: 250, editable: true },
  { key: 'netPay', name: '实发薪资 (Net)', width: 150 },
];

const initialRows = [
  { id: 'EMP-001', name: '张三', department: '人力资源部', baseSalary: 12000, performanceScore: 1.1, deductions: 1200, formula: 'A * B - C', netPay: 0 },
  { id: 'EMP-002', name: '李四', department: '工程管理部', baseSalary: 25000, performanceScore: 1.0, deductions: 2500, formula: 'A * B - C', netPay: 0 },
  { id: 'EMP-003', name: '王五', department: '研发中心', baseSalary: 18000, performanceScore: 0.9, deductions: 1800, formula: 'A * B - C', netPay: 0 },
];

export default function SalaryPage() {
  const [rows, setRows] = useState(initialRows);

  const calculateNetPay = () => {
    const parser = new Parser();
    const computedRows = rows.map(r => {
      let net = 0;
      try {
        const expr = parser.parse(r.formula);
        net = expr.evaluate({
          A: Number(r.baseSalary),
          B: Number(r.performanceScore),
          C: Number(r.deductions)
        });
      } catch {
        net = -1; // Error state if formula is malformed
      }
      return { ...r, netPay: net };
    });
    setRows(computedRows);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto h-[calc(100vh-100px)] flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Calculator className="w-6 h-6 text-blue-600" />
            薪资计算引擎
          </h1>
          <p className="text-gray-500 mt-2">支持类 Excel 交互，针对部门或人员设置动态薪资结算公式。</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">
            <Download className="w-4 h-4" /> 导出薪资单
          </button>
          <button onClick={calculateNetPay} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
            <Calculator className="w-4 h-4" /> 执行批量计算
          </button>
        </div>
      </div>

      <div className="flex-1 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm flex flex-col relative">
         <div className="p-3 bg-gray-50 border-b flex items-center gap-4 text-sm text-gray-600">
           <span className="font-mono bg-blue-50 text-blue-700 px-2 py-1 rounded">f(x)</span>
           <span>当前周期: 2026年7月</span>
           <span className="text-xs text-gray-400">双击单元格可直接编辑变量与公式</span>
         </div>
         <div className="flex-1 overflow-hidden min-h-[400px]">
            <DataGrid
              columns={columns}
              rows={rows}
              onRowsChange={setRows}
              className="rdg-light h-full w-full border-none"
            />
         </div>
      </div>
    </div>
  );
}
