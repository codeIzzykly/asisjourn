import React, { useState, useEffect } from 'react';
import { Users, CheckCircle, Percent, Clock, ArrowUpRight } from 'lucide-react';
import { motion } from 'motion/react';
import { io } from 'socket.io-client';

interface Stats {
  totalStudents: number;
  presentToday: number;
  attendanceRate: number;
  sectionStats: {
    section: string;
    total: number;
    present: number;
  }[];
}

interface Activity {
  studentId: number;
  name: string;
  section: string;
  lrn: string;
  timestamp: string;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);

  useEffect(() => {
    fetchStats();
    fetchActivities();

    const socket = io();
    socket.on('attendance_update', (data: Activity) => {
      setActivities(prev => [data, ...prev].slice(0, 10));
      fetchStats(); // Refresh stats on new attendance
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const fetchStats = async () => {
    const res = await fetch('/api/stats');
    const data = await res.json();
    setStats(data);
  };

  const fetchActivities = async () => {
    const res = await fetch('/api/attendance/today');
    const data = await res.json();
    setActivities(data);
  };

  if (!stats) return <div className="flex items-center justify-center h-full">Loading Dashboard...</div>;

  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          title="Total Students" 
          value={stats.totalStudents} 
          icon={Users} 
          color="bg-blue-500"
          description="Registered in system"
        />
        <StatCard 
          title="Present Today" 
          value={stats.presentToday} 
          icon={CheckCircle} 
          color="bg-emerald-500"
          description="Successfully scanned"
        />
        <StatCard 
          title="Attendance Rate" 
          value={`${stats.attendanceRate.toFixed(1)}%`} 
          icon={Percent} 
          color="bg-amber-500"
          description="Overall daily average"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Section Breakdown */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-[#141414]/5 shadow-sm">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              12 STEM Sections
              <span className="text-xs font-normal text-[#141414]/40 bg-[#F5F5F0] px-2 py-1 rounded-full">Live Updates</span>
            </h3>
            <div className="space-y-4">
              {stats.sectionStats.map((section) => (
                <div key={section.section} className="group p-4 rounded-2xl border border-[#141414]/5 hover:border-[#141414]/20 transition-all">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold">{section.section}</span>
                    <span className="text-sm font-medium text-[#141414]/60">
                      {section.present} / {section.total} Students
                    </span>
                  </div>
                  <div className="w-full h-3 bg-[#F5F5F0] rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${section.total > 0 ? (section.present / section.total) * 100 : 0}%` }}
                      className="h-full bg-[#141414] rounded-full"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Live Activity */}
        <div className="bg-white p-6 rounded-3xl border border-[#141414]/5 shadow-sm flex flex-col h-[500px]">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            Live Activity
            <Clock size={16} className="text-[#141414]/40" />
          </h3>
          <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
            {activities.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-[#141414]/30">
                <Clock size={48} strokeWidth={1} />
                <p className="mt-2 text-sm">No activity yet today</p>
              </div>
            ) : (
              activities.map((activity, i) => (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  key={`${activity.studentId}-${activity.timestamp}-${i}`}
                  className="flex items-start gap-4 p-3 rounded-2xl hover:bg-[#F5F5F0] transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#141414] text-white flex items-center justify-center shrink-0 font-bold text-xs">
                    {activity.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">
                      {activity.section} - {activity.name}
                    </p>
                    <p className="text-xs text-[#141414]/50">
                      LRN: {activity.lrn}
                    </p>
                    <p className="text-[10px] text-emerald-600 font-bold mt-1">
                      {new Date(activity.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </p>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color, description }: any) {
  return (
    <div className="bg-white p-6 rounded-3xl border border-[#141414]/5 shadow-sm relative overflow-hidden group">
      <div className={cn("absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform")}>
        <Icon size={80} />
      </div>
      <div className="relative z-10">
        <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center text-white mb-4", color)}>
          <Icon size={24} />
        </div>
        <p className="text-sm font-medium text-[#141414]/50">{title}</p>
        <h4 className="text-3xl font-bold mt-1">{value}</h4>
        <p className="text-xs text-[#141414]/40 mt-2 flex items-center gap-1">
          {description}
        </p>
      </div>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
