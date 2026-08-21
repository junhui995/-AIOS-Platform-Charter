/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

export default function EmployeeListPage() {
  const [employees, setEmployees] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/employee')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setEmployees(data);
      });
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">员工花名册</h1>
      <div className="bg-white rounded shadow">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-4">姓名</th>
              <th className="p-4">工号</th>
              <th className="p-4">状态</th>
              <th className="p-4">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {employees.map(emp => (
              <tr key={emp.id} className="hover:bg-gray-50">
                <td className="p-4">{emp.name}</td>
                <td className="p-4">{emp.code}</td>
                <td className="p-4">{emp.status}</td>
                <td className="p-4">
                  <Link href={`/employee/${emp.id}`} className="text-blue-600 hover:underline">
                    查看生命周期
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
