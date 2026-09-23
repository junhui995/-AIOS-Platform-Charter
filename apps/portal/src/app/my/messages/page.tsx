"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Bell, CheckCheck, Inbox, ShieldAlert, InboxIcon } from "lucide-react";

interface EmployeeOption { id: string; name: string; code: string }
interface Msg {
  id: string; ruleId: string | null; channel: string; alertId: string | null;
  target: string | null; employeeId: string | null; title: string | null; body: string | null;
  readAt: string | null; ok: boolean; error: string | null; sentAt: string;
}

export default function MyMessagesPage() {
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [me, setMe] = useState<string>('');
  const [view, setView] = useState<'all' | 'unread'>('all');
  const [items, setItems] = useState<Msg[]>([]);
  const [unread, setUnread] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const load = useCallback(async () => {
    if (!me) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/messages?employeeId=${me}&view=${view}`);
      const data = await res.json();
      if (res.ok) {
        setItems(Array.isArray(data.items) ? data.items : []);
        setUnread(data.unread ?? 0);
        setTotal(data.total ?? 0);
      }
    } finally { setLoading(false); }
  }, [me, view]);

  useEffect(() => {
    fetch('/api/employee').then(r => r.json()).then(rows => {
      const list: EmployeeOption[] = Array.isArray(rows) ? rows : [];
      setEmployees(list);
      if (list.length) setMe(list[0].id);
    }).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load]);

  const markRead = async (msg: Msg) => {
    if (msg.readAt) return;
    await fetch(`/api/messages/${msg.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employeeId: me }),
    });
    load();
  };

  const markAllRead = async () => {
    setNotice(null);
    try {
      const res = await fetch('/api/messages', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: me }),
      });
      const data = await res.json();
      if (!res.ok) setNotice({ kind: 'err', text: data.error || '操作失败' });
      else { setNotice({ kind: 'ok', text: `已标记 ${data.marked} 条为已读` }); load(); }
    } catch { setNotice({ kind: 'err', text: '网络异常' }); }
  };

  const fmt = (s: string) => new Date(s).toLocaleString('zh-CN', { hour12: false });

  return (
    <div className="p-8 max-w-5xl mx-auto font-sans">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bell className="w-6 h-6 text-blue-600" /> 消息中心 (In-App Notifications)
          </h1>
          <p className="text-gray-500 mt-2">规则引擎产生的站内预警通知统一汇入此收件箱，点按即读。</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-500 flex items-center gap-2">
            以员工身份查看
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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-4">
          <div className="text-xs text-gray-500 mb-2">未读消息</div>
          <div className="text-2xl font-bold text-red-500">{unread}</div>
          <div className="text-xs text-gray-400 mt-1">待查看</div>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-4">
          <div className="text-xs text-gray-500 mb-2">全部消息</div>
          <div className="text-2xl font-bold text-gray-900">{total}</div>
          <div className="text-xs text-gray-400 mt-1">收件箱总数</div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-100 px-4">
          <div className="flex">
            {(['all', 'unread'] as const).map(k => (
              <button key={k} onClick={() => setView(k)}
                className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${view === k ? 'text-blue-600 border-blue-600' : 'text-gray-500 border-transparent hover:text-gray-700'}`}>
                {k === 'all' ? '全部' : `未读 (${unread})`}
              </button>
            ))}
          </div>
          <button onClick={markAllRead} disabled={unread === 0}
            className="text-xs flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-blue-50 hover:text-blue-700 disabled:opacity-40">
            <CheckCheck className="w-3 h-3" /> 全部已读
          </button>
        </div>

        <div className="divide-y divide-gray-100 min-h-[200px]">
          {loading ? (
            <div className="py-20 text-center text-gray-400">加载中...</div>
          ) : items.length === 0 ? (
            <div className="py-20 text-center text-gray-400 flex flex-col items-center gap-2"><InboxIcon className="w-8 h-8 text-gray-300" /> {view === 'unread' ? '没有未读消息' : '暂无消息'}</div>
          ) : (
            items.map((msg, idx) => (
              <motion.div key={msg.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.02 }}
                onClick={() => markRead(msg)}
                className={`px-5 py-4 flex gap-4 cursor-pointer transition-colors hover:bg-blue-50/40 ${msg.readAt ? 'opacity-60' : ''}`}>
                <div className={`mt-1 w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${msg.readAt ? 'bg-gray-100 text-gray-400' : 'bg-red-50 text-red-500'}`}>
                  {msg.alertId ? <ShieldAlert className="w-4 h-4" /> : <Inbox className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {!msg.readAt && <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />}
                    <span className="font-medium text-gray-900 truncate">{msg.title || '规则通知'}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 shrink-0">站内</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1 line-clamp-2">{msg.body || '-'}</div>
                  <div className="text-[11px] text-gray-400 mt-1.5">{fmt(msg.sentAt)}{msg.alertId ? ' · 关联预警' : ''}</div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}