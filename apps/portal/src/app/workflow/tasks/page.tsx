"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Clock, CheckCircle, FileText, Send, User, ThumbsUp, ThumbsDown, AlertCircle, Inbox } from "lucide-react";

type TabKey = 'pending' | 'initiated' | 'done';

interface EmployeeOption { id: string; name: string; code: string }
interface TaskRow {
  id: string; nodeId: string; nodeName: string; taskType: string; assigneeId: string | null;
  status: string; createdAt: string; completedAt: string | null;
  instance: {
    formData: Record<string, unknown> | null;
    initiatorId: string | null;
    status?: string;
    version: { definition: { name: string } };
  };
}
interface InstanceRow {
  id: string; status: string; startedAt: string; endedAt: string | null;
  formData: Record<string, unknown> | null;
  initiatorId: string | null;
  version: { definition: { name: string } };
  tasks: { id: string; nodeName: string; status: string; completedAt: string | null }[];
}

const LEAVE_TYPE_LABELS: Record<string, string> = {
  ANNUAL: '年假', SICK: '病假', UNPAID: '事假', MATERNITY: '产假', OTHER: '其他',
};
const EXPENSE_CATEGORY_LABELS: Record<string, string> = {
  TRAVEL: '差旅', TAXI: '打车', MEAL: '餐饮', OFFICE: '办公', OTHER: '其他',
};

function summaryOf(formData: Record<string, unknown> | null): string {
  if (!formData) return '-';
  if (typeof formData.leaveRequestId === 'string') {
    const type = LEAVE_TYPE_LABELS[String(formData.leaveType)] || String(formData.leaveType || '请假');
    const days = formData.days != null ? `${formData.days} 天` : '';
    return `${type}${days}${formData.reason ? ' · ' + formData.reason : ''}`;
  }
  if (typeof formData.expenseId === 'string') {
    const amount = formData.amount != null ? `¥${Number(formData.amount).toFixed(2)}` : '';
    const cat = EXPENSE_CATEGORY_LABELS[String(formData.category)] || '';
    return `报销 ${amount}${cat ? ' · ' + cat : ''}${formData.reason ? ' · ' + formData.reason : ''}`;
  }
  return '流程申请';
}

export default function TaskCenterPage() {
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [me, setMe] = useState<string>('');
  const [activeTab, setActiveTab] = useState<TabKey>('pending');
  const [pending, setPending] = useState<TaskRow[]>([]);
  const [initiated, setInitiated] = useState<InstanceRow[]>([]);
  const [done, setDone] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const nameOf = (id: string | null) => employees.find(e => e.id === id)?.name ?? '未知';
  const codeOf = (id: string | null) => employees.find(e => e.id === id)?.code ?? '';

  const load = useCallback(async (employeeId: string) => {
    if (!employeeId) return;
    setLoading(true);
    try {
      const [p, i, d] = await Promise.all([
        fetch(`/api/workflow/tasks/user?employeeId=${employeeId}&view=pending`).then(r => r.json()),
        fetch(`/api/workflow/tasks/user?employeeId=${employeeId}&view=initiated`).then(r => r.json()),
        fetch(`/api/workflow/tasks/user?employeeId=${employeeId}&view=done`).then(r => r.json()),
      ]);
      setPending(Array.isArray(p.data) ? p.data : []);
      setInitiated(Array.isArray(i.data) ? i.data : []);
      setDone(Array.isArray(d.data) ? d.data : []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetch('/api/employee').then(r => r.json()).then(rows => {
      const list: EmployeeOption[] = Array.isArray(rows) ? rows : [];
      setEmployees(list);
      if (list.length) setMe(list[0].id);
    }).catch(() => {});
  }, []);

  useEffect(() => { load(me); }, [me, load]);

  const decide = async (task: TaskRow, action: 'APPROVE' | 'REJECT') => {
    const confirmText = `确定${action === 'APPROVE' ? '同意' : '驳回'}「${summaryOf(task.instance.formData)}」？`;
    if (!window.confirm(confirmText)) return;
    const comment = window.prompt(action === 'APPROVE' ? '审批意见（可留空）' : '驳回原因（可留空）', '') ?? '';
    setNotice(null);
    try {
      const res = await fetch('/api/workflow/tasks', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: task.id, action, operatorId: me, comment }),
      });
      const data = await res.json();
      if (!res.ok) setNotice({ kind: 'err', text: `操作失败: ${data.error || '未知错误'}` });
      else {
        setNotice({ kind: 'ok', text: `已${action === 'APPROVE' ? '同意' : '驳回'}，单据与流程已同步` });
        load(me);
      }
    } catch {
      setNotice({ kind: 'err', text: '网络异常' });
    }
  };

  const instanceStatus = (s: string) => {
    if (s === 'COMPLETED') return <span className="inline-flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded text-xs font-medium"><CheckCircle className="w-3 h-3" /> 已完成</span>;
    if (s === 'REJECTED') return <span className="inline-flex items-center gap-1 text-red-600 bg-red-50 px-2 py-1 rounded text-xs font-medium"><ThumbsDown className="w-3 h-3" /> 已驳回</span>;
    if (s === 'CANCELLED') return <span className="inline-flex items-center gap-1 text-gray-500 bg-gray-50 px-2 py-1 rounded text-xs font-medium">已撤销</span>;
    return <span className="inline-flex items-center gap-1 text-orange-600 bg-orange-50 px-2 py-1 rounded text-xs font-medium"><AlertCircle className="w-3 h-3" /> 审批中</span>;
  };

  const fmt = (s: string | null) => (s ? new Date(s).toLocaleString('zh-CN', { hour12: false }) : '-');

  return (
    <div className="p-8 max-w-7xl mx-auto font-sans">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-3">
          <Clock className="w-7 h-7 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">流程任务中心</h1>
            <p className="text-sm text-gray-500">统一处理待办审批、跟踪我发起的申请、回溯已办记录。</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-500 flex items-center gap-2">
            以员工身份操作
            <select value={me} onChange={e => setMe(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name} ({emp.code})</option>)}
            </select>
          </label>
          {notice && (
            <span className={`text-sm px-4 py-2 rounded-lg border ${notice.kind === 'ok' ? 'text-green-700 bg-green-50 border-green-200' : 'text-red-600 bg-red-50 border-red-200'}`}>{notice.text}</span>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="flex border-b">
          {([
            ['pending', pending.length, AlertCircle],
            ['initiated', initiated.length, Send],
            ['done', done.length, CheckCircle],
          ] as [TabKey, number, typeof AlertCircle][]).map(([key, count, Icon]) => (
            <button key={key}
              onClick={() => setActiveTab(key)}
              className={`flex-1 py-4 text-center font-medium text-sm transition-colors ${activeTab === key ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' : 'text-gray-500 hover:bg-gray-50'}`}>
              <div className="flex items-center justify-center gap-2">
                <Icon className="w-4 h-4" /> {key === 'pending' ? '我的待办' : key === 'initiated' ? '我发起的' : '我已处理'}
                <span className={`${key === 'pending' ? 'bg-red-500' : 'bg-gray-200 text-gray-600'} text-white text-[10px] px-2 py-0.5 rounded-full font-semibold`}>{count}</span>
              </div>
            </button>
          ))}
        </div>

        <div className="overflow-x-auto min-h-[240px]">
          {loading ? (
            <div className="py-20 text-center text-gray-400">加载中...</div>
          ) : activeTab === 'pending' ? (
            pending.length === 0 ? (
              <div className="py-20 text-center text-gray-400 flex flex-col items-center gap-2"><Inbox className="w-8 h-8 text-gray-300" /> 暂无待办，工作台清爽</div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="p-4 font-medium">任务详情</th>
                    <th className="p-4 font-medium">发起人</th>
                    <th className="p-4 font-medium">当前节点</th>
                    <th className="p-4 font-medium">接收时间</th>
                    <th className="p-4 font-medium text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pending.map((task, idx) => (
                    <motion.tr key={task.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.03 }} className="hover:bg-gray-50/80 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded bg-blue-100 flex items-center justify-center text-blue-600 shrink-0"><FileText className="w-5 h-5" /></div>
                          <div>
                            <div className="font-medium text-gray-900">{summaryOf(task.instance.formData)}</div>
                            <div className="text-xs text-gray-500 mt-1">{task.instance.version.definition.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2 text-gray-700">
                          <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center"><User className="w-3 h-3" /></div>
                          {nameOf(task.instance.initiatorId)} <span className="text-xs text-gray-400">({codeOf(task.instance.initiatorId)})</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">{task.nodeName}</span>
                      </td>
                      <td className="p-4 text-xs text-gray-500">{fmt(task.createdAt)}</td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => decide(task, 'REJECT')}
                            className="px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded border border-red-200 transition-colors flex items-center gap-1"><ThumbsDown className="w-3 h-3" /> 驳回</button>
                          <button onClick={() => decide(task, 'APPROVE')}
                            className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors shadow-sm flex items-center gap-1"><ThumbsUp className="w-3 h-3" /> 同意</button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            )
          ) : activeTab === 'initiated' ? (
            initiated.length === 0 ? (
              <div className="py-20 text-center text-gray-400 flex flex-col items-center gap-2"><Send className="w-8 h-8 text-gray-300" /> 暂无发起的申请</div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="p-4 font-medium">申请</th>
                    <th className="p-4 font-medium">流程</th>
                    <th className="p-4 font-medium">当前进度</th>
                    <th className="p-4 font-medium">提交时间</th>
                    <th className="p-4 font-medium">状态</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {initiated.map((inst, idx) => {
                    const latest = inst.tasks[inst.tasks.length - 1];
                    return (
                      <motion.tr key={inst.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.03 }} className="hover:bg-gray-50/80 transition-colors">
                        <td className="p-4">
                          <div className="font-medium text-gray-900">{summaryOf(inst.formData)}</div>
                          <div className="text-xs text-gray-500 mt-1 font-mono">{inst.id.slice(0, 8)}</div>
                        </td>
                        <td className="p-4 text-gray-600">{inst.version.definition.name}</td>
                        <td className="p-4 text-xs text-gray-500">{latest ? latest.nodeName : '-'}</td>
                        <td className="p-4 text-xs text-gray-500">{fmt(inst.startedAt)}</td>
                        <td className="p-4">{instanceStatus(inst.status)}</td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            )
          ) : (
            done.length === 0 ? (
              <div className="py-20 text-center text-gray-400 flex flex-col items-center gap-2"><CheckCircle className="w-8 h-8 text-gray-300" /> 暂无已处理记录</div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="p-4 font-medium">任务详情</th>
                    <th className="p-4 font-medium">发起人</th>
                    <th className="p-4 font-medium">我的处理</th>
                    <th className="p-4 font-medium">处理时间</th>
                    <th className="p-4 font-medium">流程状态</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {done.map((task, idx) => (
                    <motion.tr key={task.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.03 }} className="hover:bg-gray-50/80 transition-colors">
                      <td className="p-4">
                        <div className="font-medium text-gray-900">{summaryOf(task.instance.formData)}</div>
                        <div className="text-xs text-gray-500 mt-1">{task.instance.version.definition.name}</div>
                      </td>
                      <td className="p-4 text-sm text-gray-700">{nameOf(task.instance.initiatorId)}</td>
                      <td className="p-4">
                        {task.status === 'COMPLETED'
                          ? <span className="inline-flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded text-xs font-medium"><ThumbsUp className="w-3 h-3" /> 同意</span>
                          : <span className="inline-flex items-center gap-1 text-red-600 bg-red-50 px-2 py-1 rounded text-xs font-medium"><ThumbsDown className="w-3 h-3" /> 驳回</span>}
                      </td>
                      <td className="p-4 text-xs text-gray-500">{fmt(task.completedAt)}</td>
                      <td className="p-4">{instanceStatus(task.instance.status || 'RUNNING')}</td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            )
          )}
        </div>
      </div>
    </div>
  );
}