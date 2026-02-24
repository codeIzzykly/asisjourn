import React, { useState, useEffect, useRef } from 'react';
import { Plus, Search, Camera, X, Check, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getFaceDescriptor, loadModels } from '../utils/faceApi';

interface Student {
  id: number;
  name: string;
  lrn: string;
  section: string;
  created_at: string;
}

export default function Students() {
  const [students, setStudents] = useState<Student[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStudents();
    loadModels();
  }, []);

  const fetchStudents = async () => {
    try {
      const res = await fetch('/api/students');
      const data = await res.json();
      setStudents(data);
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    s.lrn.includes(search)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#141414]/30" size={20} />
          <input
            type="text"
            placeholder="Search by name or LRN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-[#141414]/5 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#141414]/10 transition-all"
          />
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="bg-[#141414] text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-[#141414]/90 transition-all shadow-lg"
        >
          <Plus size={20} />
          Add Student
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-[#141414]/5 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#141414]/5 bg-[#F5F5F0]/50">
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-[#141414]/40">Student Name</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-[#141414]/40">LRN</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-[#141414]/40">Section</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-[#141414]/40">Registered Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#141414]/5">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-[#141414]/40">
                    <Loader2 className="animate-spin mx-auto mb-2" />
                    Loading directory...
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-[#141414]/40">
                    No students found
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-[#F5F5F0]/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#F5F5F0] flex items-center justify-center font-bold text-[#141414]/60">
                          {student.name[0]}
                        </div>
                        <span className="font-bold">{student.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-sm">{student.lrn}</td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 bg-[#F5F5F0] rounded-full text-xs font-bold">
                        {student.section}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-[#141414]/50">
                      {new Date(student.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {isAdding && (
          <AddStudentModal 
            onClose={() => setIsAdding(false)} 
            onSuccess={() => {
              setIsAdding(false);
              fetchStudents();
            }} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function AddStudentModal({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({ name: '', lrn: '', section: '12 Venter' });
  const [isCapturing, setIsCapturing] = useState(false);
  const [descriptor, setDescriptor] = useState<Float32Array | null>(null);
  const [error, setError] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (step === 2) {
      startCamera();
    }
    return () => stopCamera();
  }, [step]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      setError('Could not access camera');
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
  };

  const captureFace = async () => {
    if (!videoRef.current) return;
    setIsProcessing(true);
    setError('');
    
    try {
      const desc = await getFaceDescriptor(videoRef.current);
      if (desc) {
        // Check if face is already registered
        const res = await fetch('/api/students');
        const existingStudents = await res.json();
        
        if (existingStudents.length > 0) {
          const { createFaceMatcher } = await import('../utils/faceApi');
          const matcher = createFaceMatcher(existingStudents);
          const bestMatch = matcher.findBestMatch(desc);
          
          if (bestMatch.label !== 'unknown' && bestMatch.distance < 0.45) {
            const matchedStudent = existingStudents.find((s: any) => s.id.toString() === bestMatch.label);
            setError(`This face is already registered to ${matchedStudent.name} (LRN: ${matchedStudent.lrn})`);
            return;
          }
        }

        setDescriptor(desc);
        setStep(3);
      } else {
        setError('No face detected. Please try again.');
      }
    } catch (err) {
      setError('Error processing face');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmit = async () => {
    if (!descriptor) return;
    setIsProcessing(true);
    
    try {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          faceDescriptor: Array.from(descriptor)
        })
      });
      
      if (res.ok) {
        onSuccess();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to register student');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white w-full max-w-lg rounded-[2rem] overflow-hidden shadow-2xl"
      >
        <div className="p-8">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-2xl font-black">Register Student</h3>
            <button onClick={onClose} className="p-2 hover:bg-[#F5F5F0] rounded-full">
              <X size={24} />
            </button>
          </div>

          {step === 1 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-[#141414]/40">Full Name</label>
                <input
                  type="text"
                  placeholder="Enter Full Name"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 bg-[#F5F5F0] border-none rounded-2xl focus:ring-2 focus:ring-[#141414]/10"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-[#141414]/40">LRN (12 digits)</label>
                <input
                  type="text"
                  placeholder="Enter LRN e.g. 106928327129"
                  value={formData.lrn}
                  onChange={e => setFormData({ ...formData, lrn: e.target.value })}
                  className="w-full px-4 py-3 bg-[#F5F5F0] border-none rounded-2xl focus:ring-2 focus:ring-[#141414]/10"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-[#141414]/40">Section</label>
                <div className="grid grid-cols-3 gap-2">
                  {['12 Venter', '12 Tesla', '12 Hawking'].map(s => (
                    <button
                      key={s}
                      onClick={() => setFormData({ ...formData, section: s })}
                      className={cn(
                        "py-3 rounded-2xl text-sm font-bold transition-all",
                        formData.section === s ? "bg-[#141414] text-white" : "bg-[#F5F5F0] text-[#141414]/60 hover:bg-[#F5F5F0]/80"
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <button
                disabled={!formData.name || formData.lrn.length < 10}
                onClick={() => setStep(2)}
                className="w-full py-4 bg-[#141414] text-white rounded-2xl font-bold disabled:opacity-50 mt-4"
              >
                Continue to Face Scan
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="relative aspect-video bg-[#141414] rounded-3xl overflow-hidden">
                <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
                <div className="absolute inset-0 border-2 border-dashed border-white/30 rounded-3xl m-8 pointer-events-none" />
                {isProcessing && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <Loader2 className="animate-spin text-white" size={48} />
                  </div>
                )}
              </div>
              {error && <p className="text-red-500 text-sm text-center font-bold">{error}</p>}
              <div className="flex gap-4">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 py-4 bg-[#F5F5F0] text-[#141414] rounded-2xl font-bold"
                >
                  Back
                </button>
                <button
                  onClick={captureFace}
                  disabled={isProcessing}
                  className="flex-2 py-4 bg-[#141414] text-white rounded-2xl font-bold flex items-center justify-center gap-2"
                >
                  <Camera size={20} />
                  Capture Face
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="text-center space-y-6">
              <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <Check size={48} />
              </div>
              <div>
                <h4 className="text-xl font-bold">Face Captured Successfully</h4>
                <p className="text-[#141414]/50 mt-2">Ready to register {formData.name}</p>
              </div>
              {error && <p className="text-red-500 text-sm font-bold">{error}</p>}
              <div className="flex gap-4">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 py-4 bg-[#F5F5F0] text-[#141414] rounded-2xl font-bold"
                >
                  Retake
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isProcessing}
                  className="flex-2 py-4 bg-[#141414] text-white rounded-2xl font-bold"
                >
                  {isProcessing ? 'Registering...' : 'Complete Registration'}
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
