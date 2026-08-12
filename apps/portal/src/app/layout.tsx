import './globals.css';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import AISidebar from '@/components/ai/AISidebar';

export const metadata = {
  title: 'AIOS Workspace 2.0',
  description: 'AI Native Enterprise Platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="bg-[#F5F5F7] min-h-screen text-[#1C1C1E] flex">
        <Sidebar />
        <div className="flex flex-col flex-1 w-full ml-[240px]">
          <Topbar />
          <main className="flex-1 p-6 overflow-x-hidden">
            {children}
          </main>
        </div>
        <AISidebar />
      </body>
    </html>
  );
}
