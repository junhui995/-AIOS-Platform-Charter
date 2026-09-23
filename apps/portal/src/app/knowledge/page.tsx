"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  BookOpen, Search, Plus, Trash2, CalendarDays, Eye, Tag, Upload, X, PencilLine, FileText
} from "lucide-react";

const CATEGORIES = [
  { key: "", label: "全部" },
  { key: "POLICY", label: "制度政策" },
  { key: "HR", label: "人事" },
  { key: "FINANCE", label: "财务" },
  { key: "PROCESS", label: "流程" },
  { key: "HOWTO", label: "操作指南" },
];
const STATUSES = [
  { key: "", label: "全部" },
  { key: "PUBLISHED", label: "已发布" },
  { key: "DRAFT", label: "草稿" },
];

interface Article {
  id: string; title: string; category: string; summary: string | null;
  content: string; tags: string[]; status: string; authorName: string | null;
  viewCount: number; publishedAt: string | null; createdAt: string; updatedAt: string;
}

const emptyForm = { title: "", category: "HOWTO", summary: "", content: "", tags: "" };

export default function KnowledgePage() {
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [items, setItems] = useState<Article[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [editor, setEditor] = useState<{ open: boolean; editing: Article | null }>({ open: false, editing: null });
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set('q', q.trim());
      if (category) params.set('category', category);
      if (status) params.set('status', status);
      const res = await fetch(`/api/knowledge?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setItems(Array.isArray(data.items) ? data.items : []);
        setTotal(data.total ?? 0);
      }
    } finally { setLoading(false); }
  }, [q, category, status]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setForm(emptyForm);
    setEditor({ open: true, editing: null });
  };
  const openEdit = (a: Article) => {
    setForm({
      title: a.title, category: a.category, summary: a.summary ?? '',
      content: a.content, tags: a.tags.join(','),
    });
    setEditor({ open: true, editing: a });
  };

  const submit = async (publish: boolean) => {
    setNotice(null);
    const body = {
      title: form.title,
      category: form.category,
      summary: form.summary,
      content: form.content,
      tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      status: publish ? 'PUBLISHED' : undefined,
    };
    try {
      const url = editor.editing ? `/api/knowledge/${editor.editing.id}` : `/api/knowledge`;
      const method = editor.editing ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) setNotice({ kind: 'err', text: data.error || '保存失败' });
      else {
        setNotice({ kind: 'ok', text: editor.editing ? '已更新' : (publish ? '已创建并发布' : '已创建草稿') });
        setEditor({ open: false, editing: null });
        load();
      }
    } catch { setNotice({ kind: 'err', text: '网络异常' }); }
  };

  const toggleStatus = async (a: Article) => {
    const next = a.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
    const res = await fetch(`/api/knowledge/${a.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    });
    const data = await res.json();
    if (!res.ok) setNotice({ kind: 'err', text: data.error || '操作失败' }); else load();
  };

  const remove = async (a: Article) => {
    if (!confirm(`确认删除「${a.title}」？`)) return;
    await fetch(`/api/knowledge/${a.id}`, { method: 'DELETE' });
    load();
  };

  const fmt = (s: string | null) => s ? new Date(s).toLocaleString('zh-CN', { hour12: false }) : '-';
  const catLabel = (c: string) => CATEGORIES.find(x => x.key === c)?.label ?? c;

  return (
    <div className="p-8 max-w-6xl mx-auto font-sans">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-blue-600" /> 知识库 (Knowledge Base)
          </h1>
          <p className="text-gray-500 mt-2">制度、流程与操作指南的统一沉淀入口，全平台共享查阅。</p>
        </div>
        <button onClick={openCreate}
          className="bg-blue-600 text-white text-sm px-4 py-2.5 rounded-xl flex items-center gap-2 hover:bg-blue-700 transition-colors">
          <Plus className="w-4 h-4" /> 新建文章
        </button>
      </div>

      {notice && (
        <div className={`mb-4 text-sm px-4 py-2.5 rounded-lg border ${notice.kind === 'ok' ? 'text-green-700 bg-green-50 border-green-200' : 'text-red-600 bg-red-50 border-red-200'}`}>
          {notice.text}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 w-72">
          <Search className="w-4 h-4 text-gray-400" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="搜索标题 / 内容 / 标签"
            className="bg-transparent text-sm focus:outline-none w-full" />
        </div>
        <div className="flex gap-1.5">
          {CATEGORIES.slice(1).map(c => (
            <button key={c.key} onClick={() => setCategory(category === c.key ? '' : c.key)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${category === c.key ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-gray-200 text-gray-600 hover:bg-blue-50'}`}>
              {c.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5 ml-auto">
          {STATUSES.map(s => (
            <button key={s.key} onClick={() => setStatus(s.key)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${status === s.key ? 'bg-gray-800 text-white border-gray-800' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between mb-3 text-sm text-gray-500">
        <span>共 {total} 篇文档{category ? ` · ${catLabel(category)}` : ''}{status ? ` · ${status === 'PUBLISHED' ? '已发布' : '草稿'}` : ''}</span>
        {loading && <span className="text-xs text-gray-400">加载中...</span>}
      </div>

      {items.length === 0 && !loading ? (
        <div className="py-20 text-center text-gray-400 flex flex-col items-center gap-2">
          <FileText className="w-8 h-8 text-gray-300" /> 暂无匹配文档
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map((a, idx) => (
            <motion.div key={a.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.03 }}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col hover:shadow-md hover:border-blue-200 transition-all">
              <div className="flex items-start justify-between gap-2">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusBadge(a.status)}`}>
                  {a.status === 'PUBLISHED' ? '已发布' : '草稿'}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">{catLabel(a.category)}</span>
              </div>
              <a href={`/knowledge/${a.id}`} className="mt-3 text-[15px] font-semibold text-gray-900 hover:text-blue-600 transition-colors line-clamp-1">
                {a.title}
              </a>
              <p className="text-xs text-gray-500 mt-1.5 line-clamp-2 flex-1">{a.summary || a.content.slice(0, 60) + '…'}</p>
              {a.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {a.tags.slice(0, 4).map(t => (
                    <span key={t} className="flex items-center gap-1 text-[10px] text-gray-500 bg-gray-50 border border-gray-100 rounded px-1.5 py-0.5">
                      <Tag className="w-2.5 h-2.5" /> {t}
                    </span>
                  ))}
                </div>
              )}
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-50">
                <div className="flex items-center gap-3 text-[11px] text-gray-400">
                  {(a.authorName || a.updatedAt) && <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" /> {fmt(a.updatedAt)}</span>}
                  <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {a.viewCount}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => toggleStatus(a)} title={a.status === 'PUBLISHED' ? '转为草稿' : '发布'}
                    className="p-1.5 rounded-lg hover:bg-blue-50 hover:text-blue-600 text-gray-400 transition-colors">
                    <Upload className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => openEdit(a)} title="编辑"
                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
                    <PencilLine className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => remove(a)} title="删除"
                    className="p-1.5 rounded-lg hover:bg-red-50 hover:text-red-600 text-gray-400 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {editor.open && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-40 p-6">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[86vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">{editor.editing ? '编辑文章' : '新建文章'}</h2>
              <button onClick={() => setEditor({ open: false, editing: null })} className="text-gray-400 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-600">标题 *</label>
                <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                  placeholder="文章的清晰标题" className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-600">分类</label>
                  <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {CATEGORIES.filter(c => c.key).map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">标签（逗号分隔）</label>
                  <input value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} placeholder="如: 报销, 流程"
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">摘要</label>
                <input value={form.summary} onChange={e => setForm({ ...form, summary: e.target.value })}
                  placeholder="列表卡片上的一句话摘要（可选）" className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">正文 *（不少于 20 字）</label>
                <textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })}
                  rows={8} placeholder="补充：支持纯文本 / Markdown 风格排版（当前版本按纯文本渲染）"
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => submit(false)} disabled={!form.title.trim() || form.content.trim().length < 20}
                  className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-40">
                  {editor.editing ? '仅保存' : '存为草稿'}
                </button>
                <button onClick={() => submit(true)} disabled={!form.title.trim() || form.content.trim().length < 20}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40">
                  {editor.editing ? '保存并发布' : '创建并发布'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function statusBadge(s: string) {
  return s === 'PUBLISHED' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500';
}