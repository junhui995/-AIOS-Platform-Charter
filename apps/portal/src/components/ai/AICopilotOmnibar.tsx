"use client";

import React, { useEffect, useState } from 'react';
import { Sparkles, ArrowRight, FileText, Calendar, DollarSign } from 'lucide-react';

export default function AICopilotOmnibar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('');

  // Handle ESC and CMD+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onClose(); // Toggle logic should be handled by parent ideally, but for now we'll just handle open/close if needed via a state manager.
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/20 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-[#E5E5EA] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Input area */}
        <div className="p-4 flex items-center border-b border-[#E5E5EA]">
          <Sparkles className="text-purple-500 mr-3" size={24} />
          <input
            type="text"
            autoFocus
            className="flex-1 text-lg outline-none bg-transparent placeholder-[#8E8E93] text-[#1C1C1E]"
            placeholder="告诉 AI 你想做什么... (如：帮我报销昨天的打车费)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className="p-2 bg-[#F5F5F7] rounded-lg text-[#1C1C1E] hover:bg-[#E5E5EA] transition-colors">
            <ArrowRight size={18} />
          </button>
        </div>

        {/* Suggestions */}
        {!query && (
          <div className="bg-[#F9F9FB] p-4 text-sm text-[#8E8E93]">
            <div className="mb-3 font-medium text-xs uppercase tracking-wider">建议指令</div>
            <div className="grid grid-cols-1 gap-2">
              <SuggestionItem icon={<DollarSign size={16} className="text-green-500" />} text="帮我报销上周出差的高铁票" />
              <SuggestionItem icon={<Calendar size={16} className="text-blue-500" />} text="查询我本月的剩余年假" />
              <SuggestionItem icon={<FileText size={16} className="text-orange-500" />} text="起草一份与腾讯的保密协议(NDA)" />
            </div>
          </div>
        )}

        {/* Results / Reasoning Area Placeholder */}
        {query && (
          <div className="p-6 flex flex-col items-center justify-center text-[#8E8E93] min-h-[150px]">
             <div className="animate-pulse flex items-center gap-2">
                <Sparkles size={16} className="text-purple-500" />
                <span>AI 正在思考如何执行...</span>
             </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-4 py-2 bg-white border-t border-[#E5E5EA] text-xs text-[#8E8E93] flex justify-between items-center">
          <span>AIOS Copilot v1.0</span>
          <div className="flex items-center gap-2">
            <span>按 <kbd className="bg-[#F5F5F7] border border-[#E5E5EA] rounded px-1">ESC</kbd> 关闭</span>
            <span>按 <kbd className="bg-[#F5F5F7] border border-[#E5E5EA] rounded px-1">↵</kbd> 执行</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function SuggestionItem({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-white border border-[#E5E5EA] hover:border-purple-300 hover:shadow-sm cursor-pointer transition-all">
      {icon}
      <span className="text-[#1C1C1E]">{text}</span>
      <ArrowRight size={14} className="ml-auto text-[#8E8E93]" />
    </div>
  );
}
