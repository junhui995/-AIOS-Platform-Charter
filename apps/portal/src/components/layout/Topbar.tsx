"use client";

import React, { useState } from 'react';
import { Bell, Sparkles } from 'lucide-react';
import AICopilotOmnibar from '../ai/AICopilotOmnibar';

export default function Topbar() {
  const [omnibarOpen, setOmnibarOpen] = useState(false);

  return (
    <>
      <div className="h-[64px] bg-white/80 backdrop-blur-md border-b border-[#E5E5EA] flex items-center justify-between px-6 sticky top-0 z-40">
        {/* Left: Global Command Prompt trigger */}
        <div
          className="flex-1 max-w-2xl bg-[#F5F5F7] hover:bg-[#ebebeb] transition-colors h-[40px] rounded-full flex items-center px-4 cursor-text border border-transparent hover:border-[#E5E5EA]"
          onClick={() => setOmnibarOpen(true)}
        >
          <Sparkles size={16} className="text-purple-500 mr-2" />
          <span className="text-sm text-[#8E8E93]">输入指令唤起 AI 助手，或搜索内容 (⌘ + K)</span>
          <div className="ml-auto flex items-center gap-1">
            <kbd className="bg-white border border-[#E5E5EA] rounded shadow-sm px-1.5 text-xs text-gray-400">⌘</kbd>
            <kbd className="bg-white border border-[#E5E5EA] rounded shadow-sm px-1.5 text-xs text-gray-400">K</kbd>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-4 ml-4">
          <button className="relative p-2 text-[#1C1C1E] hover:bg-[#F5F5F7] rounded-full transition-colors">
            <Bell size={20} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
          </button>
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-orange-400 to-pink-500 flex items-center justify-center text-white text-xs font-bold shadow-sm cursor-pointer">
            管
          </div>
        </div>
      </div>

      <AICopilotOmnibar isOpen={omnibarOpen} onClose={() => setOmnibarOpen(false)} />
    </>
  );
}
