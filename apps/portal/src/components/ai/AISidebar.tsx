"use client";

<<<<<<< HEAD
import React, { useState } from 'react';
=======
import React, { useState, useRef, useEffect } from 'react';
>>>>>>> 5534d140f04909e1c653d9451864ec1d20c3d3e1
import { Sparkles, X, Send } from 'lucide-react';

export default function AISidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{role: 'user' | 'ai', content: string}[]>([
    { role: 'ai', content: '你好，我是你的 AI 业务助手。我可以帮你查阅企业知识库、起草表单，或者分析业务数据。' }
  ]);
  const [input, setInput] = useState('');
<<<<<<< HEAD

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages(prev => [...prev, { role: 'user', content: input }]);
    setInput('');
    // Mock AI Response
    setTimeout(() => {
      setMessages(prev => [...prev, { role: 'ai', content: '收到您的请求。我正在查阅企业数据库，请稍候...' }]);
    }, 600);
=======
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userMessage = input;
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setInput('');
    setIsTyping(true);

    // Add empty AI message to append to
    setMessages(prev => [...prev, { role: 'ai', content: '' }]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: userMessage }),
      });

      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;

        if (value) {
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') {
                setIsTyping(false);
                break;
              }
              try {
                const parsed = JSON.parse(data);
                if (parsed.text) {
                  setMessages(prev => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1].content += parsed.text;
                    return newMessages;
                  });
                }
              } catch {
                // Ignore parse errors from partial chunks
              }
            }
          }
        }
      }
    } catch (error) {
      console.error(error);
      setMessages(prev => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1].content = '抱歉，系统响应出错，请稍后重试。';
        return newMessages;
      });
      setIsTyping(false);
    }
>>>>>>> 5534d140f04909e1c653d9451864ec1d20c3d3e1
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
<<<<<<< HEAD
              <div className={`max-w-[85%] rounded-2xl p-3 text-[14px] ${
=======
              <div className={`max-w-[85%] rounded-2xl p-3 text-[14px] whitespace-pre-wrap ${
>>>>>>> 5534d140f04909e1c653d9451864ec1d20c3d3e1
                msg.role === 'user'
                  ? 'bg-[#007AFF] text-white rounded-tr-sm'
                  : 'bg-white border border-[#E5E5EA] text-[#1C1C1E] rounded-tl-sm shadow-sm'
              }`}>
                {msg.content}
<<<<<<< HEAD
              </div>
            </div>
          ))}
=======
                {msg.role === 'ai' && isTyping && idx === messages.length - 1 && (
                   <span className="inline-block w-1.5 h-3.5 ml-1 bg-purple-500 animate-pulse"></span>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
>>>>>>> 5534d140f04909e1c653d9451864ec1d20c3d3e1
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
<<<<<<< HEAD
            />
            <button
              onClick={handleSend}
              className="absolute right-2 top-2 p-1.5 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
=======
              disabled={isTyping}
            />
            <button
              onClick={handleSend}
              disabled={isTyping}
              className={`absolute right-2 top-2 p-1.5 text-white rounded-lg transition-colors ${isTyping ? 'bg-gray-300' : 'bg-purple-500 hover:bg-purple-600'}`}
>>>>>>> 5534d140f04909e1c653d9451864ec1d20c3d3e1
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
