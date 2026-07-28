"use client";

import React, { useState } from 'react';
import { Sparkles, X, Send } from 'lucide-react';

export default function AISidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{role: 'user' | 'ai', content: string}[]>([
    { role: 'ai', content: '你好，我是你的 AI 业务助手。我可以帮你查阅企业知识库、起草表单，或者分析业务数据。' }
  ]);
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages(prev => [...prev, { role: 'user', content: input }]);
    setInput('');
    // Mock AI Response
    setTimeout(() => {
      setMessages(prev => [...prev, { role: 'ai', content: '收到您的请求。我正在查阅企业数据库，请稍候...' }]);
    }, 600);
  };

  return (
    <>
      {/* Floating Action Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-br from-purple-600 to-blue-500 rounded-full shadow-lg flex items-center justify-center text-white hover:scale-105 transition-transform z-50"
        >
          <Sparkles size={24} />
        </button>
      )}

      {/* Sidebar Panel */}
      <div className={`fixed top-0 right-0 h-screen w-[360px] bg-white shadow-2xl border-l border-[#E5E5EA] transition-transform duration-300 ease-in-out z-50 flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>

        {/* Header */}
        <div className="h-[64px] border-b border-[#E5E5EA] flex items-center justify-between px-4 bg-[#F9F9FB]">
          <div className="flex items-center gap-2 font-medium">
            <div className="w-6 h-6 rounded bg-purple-100 flex items-center justify-center text-purple-600">
              <Sparkles size={14} />
            </div>
            AIOS Copilot
          </div>
          <button onClick={() => setIsOpen(false)} className="p-1.5 hover:bg-[#E5E5EA] rounded-md text-[#8E8E93]">
            <X size={18} />
          </button>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#F5F5F7]">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl p-3 text-[14px] ${
                msg.role === 'user'
                  ? 'bg-[#007AFF] text-white rounded-tr-sm'
                  : 'bg-white border border-[#E5E5EA] text-[#1C1C1E] rounded-tl-sm shadow-sm'
              }`}>
                {msg.content}
              </div>
            </div>
          ))}
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-[#E5E5EA]">
          <div className="relative">
            <input
              type="text"
              className="w-full bg-[#F5F5F7] border border-transparent focus:border-purple-300 rounded-xl px-4 py-3 pr-12 text-[14px] outline-none transition-colors"
              placeholder="输入你的问题..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
            />
            <button
              onClick={handleSend}
              className="absolute right-2 top-2 p-1.5 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
            >
              <Send size={16} />
            </button>
          </div>
          <div className="text-[11px] text-center text-[#8E8E93] mt-2">
            AIOS Copilot 可能会生成不准确的信息，请核实。
          </div>
        </div>
      </div>
    </>
  );
}
