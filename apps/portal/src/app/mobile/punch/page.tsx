"use client";

import { motion } from "framer-motion";
import { MapPin, Clock } from "lucide-react";

export default function MobilePunchPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-lg overflow-hidden flex flex-col items-center p-8">
        <h1 className="text-xl font-bold text-gray-900 mb-2">企业微信考勤打卡</h1>
        <p className="text-sm text-gray-500 flex items-center gap-1 mb-12">
          <MapPin className="w-4 h-4" /> 当前位置: 研发中心 A 座
        </p>

        <motion.button
          whileTap={{ scale: 0.95 }}
          className="w-48 h-48 rounded-full bg-gradient-to-b from-blue-500 to-blue-600 text-white shadow-xl shadow-blue-200 flex flex-col items-center justify-center border-4 border-blue-100"
        >
          <span className="text-3xl font-bold mb-1">08:55</span>
          <span className="text-sm opacity-90">上班打卡</span>
        </motion.button>

        <div className="mt-12 w-full">
           <div className="flex items-start gap-4 text-sm text-gray-600 relative">
             <div className="w-px h-full bg-blue-200 absolute left-[15px] top-6"></div>
             <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center z-10 text-blue-600">
               <Clock className="w-4 h-4" />
             </div>
             <div className="flex-1 pt-1.5">
               <div className="flex justify-between font-medium text-gray-900">
                 <span>上班时间 09:00</span>
                 <span className="text-blue-600">等待打卡</span>
               </div>
             </div>
           </div>
        </div>
      </div>
    </div>
  );
}
