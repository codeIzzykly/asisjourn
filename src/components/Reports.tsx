import React, { useState } from 'react';
import { FileDown, Download, Calendar, Users as UsersIcon, Filter } from 'lucide-react';
import { motion } from 'motion/react';
import * as XLSX from 'xlsx';

export default function Reports() {
  const [selectedSection, setSelectedSection] = useState('All');
  const [isDownloading, setIsDownloading] = useState(false);

  const sections = ['All', '12 Venter', '12 Tesla', '12 Hawking'];

  const downloadExcel = async () => {
    setIsDownloading(true);
    try {
      const url = selectedSection === 'All' 
        ? '/api/attendance/report' 
        : `/api/attendance/report?section=${encodeURIComponent(selectedSection)}`;
      
      const res = await fetch(url);
      const data = await res.json();

      if (data.length === 0) {
        alert('No attendance records found for this section.');
        return;
      }

      // Format data for Excel
      const formattedData = data.map((item: any) => ({
        'STUDENT NAME': item.name.toUpperCase(),
        'LRN': item.lrn,
        'SECTION': item.section,
        'DATE': new Date(item.timestamp).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }),
        'TIME': new Date(item.timestamp).toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: true
        }),
        'STATUS': 'PRESENT'
      }));

      // Create worksheet
      const ws = XLSX.utils.json_to_sheet(formattedData);

      // Set column widths to prevent "compressed" look
      const wscols = [
        { wch: 30 }, // Student Name
        { wch: 20 }, // LRN
        { wch: 15 }, // Section
        { wch: 20 }, // Date
        { wch: 15 }, // Time
        { wch: 12 }, // Status
      ];
      ws['!cols'] = wscols;

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Attendance Log');

      // Generate filename
      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `Attendance_Report_${selectedSection.replace(' ', '_')}_${dateStr}.xlsx`;

      // Download
      XLSX.writeFile(wb, filename);
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download report.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="bg-white p-8 rounded-[2.5rem] border border-[#141414]/5 shadow-sm">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-[#141414] text-white flex items-center justify-center">
            <FileDown size={24} />
          </div>
          <div>
            <h3 className="text-2xl font-black">Attendance Reports</h3>
            <p className="text-[#141414]/50">Export attendance data to Excel format</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-[#141414]/40 flex items-center gap-2">
                <Filter size={14} />
                Select Section
              </label>
              <div className="grid grid-cols-2 gap-2">
                {sections.map(section => (
                  <button
                    key={section}
                    onClick={() => setSelectedSection(section)}
                    className={`px-4 py-3 rounded-2xl text-sm font-bold transition-all ${
                      selectedSection === section 
                        ? 'bg-[#141414] text-white shadow-lg' 
                        : 'bg-[#F5F5F0] text-[#141414]/60 hover:bg-[#F5F5F0]/80'
                    }`}
                  >
                    {section}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-6 bg-[#F5F5F0] rounded-3xl space-y-4">
              <div className="flex items-center gap-3 text-sm font-bold">
                <Calendar size={18} className="text-[#141414]/40" />
                <span>Report Period: Today</span>
              </div>
              <div className="flex items-center gap-3 text-sm font-bold">
                <UsersIcon size={18} className="text-[#141414]/40" />
                <span>Format: Microsoft Excel (.xlsx)</span>
              </div>
            </div>

            <button
              onClick={downloadExcel}
              disabled={isDownloading}
              className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-black flex items-center justify-center gap-3 hover:bg-emerald-600 transition-all shadow-lg disabled:opacity-50"
            >
              {isDownloading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download size={20} />
                  Download Excel Report
                </>
              )}
            </button>
          </div>

          <div className="hidden md:flex flex-col items-center justify-center p-8 border-2 border-dashed border-[#141414]/10 rounded-[2rem] text-center">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
              <FileDown size={32} />
            </div>
            <h4 className="font-bold text-lg">Ready to Export</h4>
            <p className="text-sm text-[#141414]/50 mt-2">
              Select a section on the left to generate a detailed attendance report.
            </p>
          </div>
        </div>
      </div>

      {/* Quick Stats Preview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {sections.filter(s => s !== 'All').map(section => (
          <div key={section} className="bg-white p-6 rounded-3xl border border-[#141414]/5 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-[#141414]/40 uppercase">{section}</p>
              <p className="text-lg font-black mt-1">Export Ready</p>
            </div>
            <button 
              onClick={() => {
                setSelectedSection(section);
                downloadExcel();
              }}
              className="p-3 bg-[#F5F5F0] hover:bg-[#141414] hover:text-white rounded-xl transition-all"
            >
              <Download size={18} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
