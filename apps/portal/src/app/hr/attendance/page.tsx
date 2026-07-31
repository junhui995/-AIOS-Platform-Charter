"use client";

export default function AttendancePage() {
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">考勤管理台 (Attendance Admin)</h1>
      <div className="bg-white p-6 rounded-xl border border-gray-100">
        <p className="text-gray-500 mb-4">支持排班方案管理、打卡记录校验以及一键异常识别（联动补卡与请假申请）。</p>
        <button className="px-4 py-2 bg-blue-600 text-white rounded shadow-sm text-sm">
          运行考勤异常校验引擎
        </button>
      </div>
    </div>
  );
}
