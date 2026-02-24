import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Users, Scan, Bell, Menu, X, FileDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function Layout({ children, activeTab, setActiveTab }: LayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'students', label: 'Students', icon: Users },
    { id: 'scanner', label: 'Scan Attendance', icon: Scan },
    { id: 'reports', label: 'Reports', icon: FileDown },
  ];

  return (
    <div className="flex h-screen bg-[#F5F5F0] text-[#141414] font-sans overflow-hidden">
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: isSidebarOpen ? 280 : 80 }}
        className="bg-white border-r border-[#141414]/10 flex flex-col z-20"
      >
        <div className="p-6 flex items-center justify-between">
          {isSidebarOpen && (
            <motion.h1 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xl font-bold tracking-tight"
            >
              FaceAttend
            </motion.h1>
          )}
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-[#F5F5F0] rounded-lg transition-colors"
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  "w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200",
                  isActive 
                    ? "bg-[#141414] text-white shadow-lg" 
                    : "hover:bg-[#141414]/5 text-[#141414]/60 hover:text-[#141414]"
                )}
              >
                <Icon size={22} />
                {isSidebarOpen && (
                  <span className="font-medium">{item.label}</span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-6 border-t border-[#141414]/10">
          <div className={cn("flex items-center gap-3", !isSidebarOpen && "justify-center")}>
            <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold">
              A
            </div>
            {isSidebarOpen && (
              <div>
                <p className="text-sm font-bold">Admin User</p>
                <p className="text-xs text-[#141414]/50">School Registrar</p>
              </div>
            )}
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-20 bg-white border-bottom border-[#141414]/10 px-8 flex items-center justify-between shrink-0">
          <h2 className="text-lg font-semibold capitalize">{activeTab.replace('-', ' ')}</h2>
          <div className="flex items-center gap-4">
            <button className="p-2 hover:bg-[#F5F5F0] rounded-full relative">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            <div className="h-8 w-px bg-[#141414]/10 mx-2"></div>
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
              <p className="text-xs text-[#141414]/50">Academic Year 2025-2026</p>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
