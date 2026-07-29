import React from 'react';

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center p-4">
      <div className="bg-white max-w-md w-full rounded-3xl shadow-xl p-8 text-center border border-[#E5E5EA]">
        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-md">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/></svg>
        </div>

        <h1 className="text-2xl font-bold mb-2">AIOS Workspace 2.0</h1>
        <p className="text-[#8E8E93] text-sm mb-8">使用企业微信扫码登录</p>

        <div className="w-48 h-48 bg-gray-100 mx-auto rounded-xl border border-dashed border-gray-300 flex items-center justify-center mb-6">
           <span className="text-xs text-gray-400">二维码占位符</span>
        </div>

        <div className="text-xs text-[#8E8E93] flex flex-col gap-2">
          <p>Mock开发阶段：请在后台配置 NextAuth 的 CredentialsProvider</p>
          <a href="/api/auth/signin" className="text-blue-500 hover:underline">点击这里使用 Mock 登录进入系统</a>
        </div>
      </div>
    </div>
  );
}
