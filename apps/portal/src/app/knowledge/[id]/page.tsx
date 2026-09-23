"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, BookOpen, Eye, Tag, CalendarDays, Clock } from "lucide-react";

const CAT_LABEL: Record<string, string> = {
  POLICY: "制度政策", HR: "人事", FINANCE: "财务", PROCESS: "流程", HOWTO: "操作指南",
};

interface Article {
  id: string; title: string; category: string; summary: string | null;
  content: string; tags: string[]; status: string; authorName: string | null;
  viewCount: number; publishedAt: string | null; createdAt: string; updatedAt: string;
}

export default function KnowledgeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [article, setArticle] = useState<Article | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    params.then(({ id }) => {
      fetch(`/api/knowledge/${id}`)
        .then(r => r.json())
        .then(data => {
          if (cancelled) return;
          if (!data || data.error) {
            setError(data?.error || '文章不存在');
            return;
          }
          setArticle(data);
        })
        .catch(() => !cancelled && setError('加载失败'));
    });
    return () => { cancelled = true; };
  }, [params]);

  if (error) {
    return (
      <div className="p-8 max-w-3xl mx-auto font-sans">
        <Link href="/knowledge" className="text-sm text-blue-600 flex items-center gap-1 mb-6 hover:underline">
          <ArrowLeft className="w-4 h-4" /> 返回知识库
        </Link>
        <div className="py-20 text-center text-gray-400">{error}</div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="p-8 max-w-3xl mx-auto font-sans">
        <Link href="/knowledge" className="text-sm text-blue-600 flex items-center gap-1 mb-6 hover:underline">
          <ArrowLeft className="w-4 h-4" /> 返回知识库
        </Link>
        <div className="py-20 text-center text-gray-400">加载中...</div>
      </div>
    );
  }

  const fmt = (s: string | null) => s ? new Date(s).toLocaleString('zh-CN', { hour12: false }) : '-';

  return (
    <div className="p-8 max-w-3xl mx-auto font-sans">
      <Link href="/knowledge" className="text-sm text-blue-600 flex items-center gap-1 mb-6 hover:underline">
        <ArrowLeft className="w-4 h-4" /> 返回知识库
      </Link>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-8 pt-8 pb-6 border-b border-gray-50">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${article.status === 'PUBLISHED' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
              {article.status === 'PUBLISHED' ? '已发布' : '草稿'}
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">
              {CAT_LABEL[article.category] ?? article.category}
            </span>
            {article.tags.map(t => (
              <span key={t} className="flex items-center gap-1 text-[11px] text-gray-500 bg-gray-50 border border-gray-100 rounded px-2 py-0.5">
                <Tag className="w-2.5 h-2.5" /> {t}
              </span>
            ))}
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mt-4 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-blue-600" /> {article.title}
          </h1>
          {article.summary && <p className="text-sm text-gray-500 mt-2">{article.summary}</p>}
          <div className="flex items-center gap-4 mt-4 text-xs text-gray-400">
            {article.authorName && <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" /> {article.authorName}</span>}
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> 更新 {fmt(article.updatedAt)}</span>
            <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {article.viewCount} 次阅读</span>
            {article.publishedAt && <span>发布于 {fmt(article.publishedAt)}</span>}
          </div>
        </div>
        <div className="px-8 py-8 whitespace-pre-wrap leading-7 text-[15px] text-gray-800 font-mono">
          {article.content}
        </div>
      </div>
    </div>
  );
}