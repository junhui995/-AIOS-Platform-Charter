"use client";

import React, { useEffect, useState } from 'react';
import { Sparkles, Calendar, Clock, AlertTriangle, User } from 'lucide-react';

export default function AttendancePage() {
  const [leaves, setLeaves] = useState<{id: string, leaveType: string, startDate: string, endDate: string, status: string, aiAnalysis: string, employee: {name: string}}[]>([]);

  useEffect(() => {
    fetch('/api/leave')
      .then(res => res.json())
      .then(data => {
        if (!data.error) setLeaves(data);
      })
      .catch(console.error);
  }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-2xl font-bold mb-1">考勤与请假管理</h1>
          <p className="text-[#8E8E93] text-sm">2026年7月考勤情况</p>
        </div>
        <button className="bg-[#007AFF] text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-600 transition-colors">
          导出本月报表
        </button>
      </div>

      <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-100 rounded-2xl p-4 flex items-center gap-4 text-purple-800">
        <Sparkles size={24} className="text-purple-500 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium">AI 异常诊断报告已生成：</p>
          <p className="text-xs mt-1 opacity-80">本月共有 3 人出现多次晚于 10:00 打卡，建议关注研发组近期加班情况。另外收到 1 条异常休假请求待审核。</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <StatCard title="应出勤人数" value="86" icon={<Calendar size={20} />} />
        <StatCard title="今日实到" value="82" icon={<Clock size={20} />} />
        <StatCard title="异常考勤" value="2" icon={<AlertTriangle size={20} className="text-orange-500" />} />
        <StatCard title="当前休假中" value={leaves.filter(l => l.status === 'APPROVED').length.toString()} icon={<User size={20} />} />
      </div>

      {/* Leave Requests Table */}
      <div className="bg-white rounded-2xl border border-[#E5E5EA] overflow-hidden mt-6">
        <div className="p-4 border-b border-[#E5E5EA] font-semibold flex justify-between items-center">
          <span>请假记录与 AI 审核建议</span>
          <span className="text-xs text-[#8E8E93] bg-[#F5F5F7] px-2 py-1 rounded">试试在右侧通过 AI 发起请假</span>
        </div>
        {leaves.length === 0 ? (
          <div className="p-8 text-center text-[#8E8E93] text-sm">暂无请假记录。使用侧边栏 AI 帮员工提交一条请假单吧！</div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-[#F5F5F7] text-[#8E8E93]">
              <tr>
                <th className="p-3 font-medium">员工</th>
                <th className="p-3 font-medium">类型</th>
                <th className="p-3 font-medium">开始日期</th>
                <th className="p-3 font-medium">结束日期</th>
                <th className="p-3 font-medium">状态</th>
                <th className="p-3 font-medium">AI 分析</th>
              </tr>
            </thead>
            <tbody>
              {leaves.map((leave, idx) => (
                <tr key={leave.id} className={idx !== leaves.length - 1 ? "border-b border-[#E5E5EA]" : ""}>
                  <td className="p-3 font-medium">{leave.employee?.name || '未知员工'}</td>
                  <td className="p-3">{leave.leaveType}</td>
                  <td className="p-3">{new Date(leave.startDate).toLocaleDateString()}</td>
                  <td className="p-3">{new Date(leave.endDate).toLocaleDateString()}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                      leave.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                      leave.status === 'PENDING' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {leave.status}
                    </span>
                  </td>
                  <td className="p-3 text-[#5856D6] flex items-center gap-1 max-w-[300px] truncate" title={leave.aiAnalysis || '无分析'}>
                    <Sparkles size={12} className="flex-shrink-0" />
                    {leave.aiAnalysis || '已自动校验假期额度。'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function StatCard({ title, value, icon }: {title: string, value: string, icon: React.ReactNode}) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-[#E5E5EA] shadow-sm flex flex-col relative">
      <div className="absolute top-4 right-4 text-[#8E8E93]">{icon}</div>
      <span className="text-sm font-medium mb-2 text-[#8E8E93]">{title}</span>
      <span className="text-3xl font-bold">{value}</span>
    </div>
  );
}
