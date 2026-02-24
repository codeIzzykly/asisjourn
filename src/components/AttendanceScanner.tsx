import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import * as faceapi from 'face-api.js';
import { loadModels, createFaceMatcher } from '../utils/faceApi';
import { CheckCircle, XCircle, Loader2, User } from 'lucide-react';

export default function AttendanceScanner({ onExit }: { onExit: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<any[]>([]);
  const [matcher, setMatcher] = useState<faceapi.FaceMatcher | null>(null);
  const [lastScan, setLastScan] = useState<{ name: string; lrn: string; status: string } | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isHoveringExit, setIsHoveringExit] = useState(false);

  useEffect(() => {
    const init = async () => {
      await loadModels();
      const res = await fetch('/api/students');
      const data = await res.json();
      setStudents(data);
      if (data.length > 0) {
        setMatcher(createFaceMatcher(data));
      }
      setLoading(false);
      startCamera();
    };
    init();

    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Camera error:', err);
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
  };

  useEffect(() => {
    if (!loading && videoRef.current && canvasRef.current && matcher) {
      const interval = setInterval(async () => {
        if (isScanning) return;
        await scanFace();
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [loading, matcher, isScanning]);

  const scanFace = async () => {
    if (!videoRef.current || !canvasRef.current || !matcher) return;

    const detections = await faceapi
      .detectAllFaces(videoRef.current)
      .withFaceLandmarks()
      .withFaceDescriptors();

    const displaySize = { width: videoRef.current.videoWidth, height: videoRef.current.videoHeight };
    faceapi.matchDimensions(canvasRef.current, displaySize);

    const resizedDetections = faceapi.resizeResults(detections, displaySize);
    const ctx = canvasRef.current.getContext('2d');
    ctx?.clearRect(0, 0, displaySize.width, displaySize.height);

    for (const detection of resizedDetections) {
      const bestMatch = matcher.findBestMatch(detection.descriptor);
      const studentId = bestMatch.label;
      const student = students.find(s => s.id.toString() === studentId);

      // Draw box
      const box = detection.detection.box;
      if (ctx) {
        const isRecognized = student && bestMatch.distance < 0.45;
        ctx.strokeStyle = isRecognized ? '#10b981' : '#ef4444';
        ctx.lineWidth = 4;
        ctx.strokeRect(box.x, box.y, box.width, box.height);
        
        // Draw Label
        ctx.fillStyle = isRecognized ? '#10b981' : '#ef4444';
        ctx.font = 'bold 20px sans-serif';
        const label = isRecognized ? `LRN: ${student.lrn}` : 'UNREGISTERED';
        ctx.fillText(label, box.x, box.y + box.height + 25);

        if (isRecognized) {
          ctx.font = '14px sans-serif';
          ctx.fillText(student.name, box.x, box.y - 10);
        }
      }

      if (student && bestMatch.distance < 0.45 && !isScanning) {
        markAttendance(student);
      }
    }
  };

  const markAttendance = async (student: any) => {
    setIsScanning(true);
    try {
      const res = await fetch('/api/attendance/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: student.id })
      });
      const data = await res.json();
      
      setLastScan({
        name: student.name,
        lrn: student.lrn,
        status: data.status === 'already_present' ? 'Already Present' : 'Present'
      });

      setTimeout(() => {
        setLastScan(null);
        setIsScanning(false);
      }, 3000);
    } catch (err) {
      setIsScanning(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-[#141414] flex flex-col items-center justify-center text-white z-50">
        <Loader2 className="animate-spin mb-4" size={48} />
        <h2 className="text-2xl font-black tracking-tight">Initializing Face Recognition</h2>
        <p className="text-white/50 mt-2">Loading models and student directory...</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black z-40 overflow-hidden">
      {/* Camera View */}
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
      />

      {/* Overlay UI */}
      <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-12">
        <div className="flex justify-between items-start">
          <div className="bg-black/40 backdrop-blur-md p-6 rounded-3xl border border-white/10">
            <h1 className="text-white text-3xl font-black tracking-tighter">ATTENDANCE SCANNER</h1>
            <p className="text-white/60 font-bold mt-1">POINT CAMERA AT FACE</p>
          </div>
          <div className="flex flex-col items-end gap-4 pointer-events-auto">
            <div className="flex items-center gap-3 bg-emerald-500/20 backdrop-blur-md px-6 py-3 rounded-full border border-emerald-500/30">
              <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="text-emerald-500 font-black text-sm uppercase tracking-widest">System Live</span>
            </div>
            
            <div className="relative flex flex-col items-end">
              <AnimatePresence>
                {isHoveringExit && (
                  <motion.div
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="absolute right-full mr-4 top-1/2 -translate-y-1/2 bg-red-500 text-white px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap shadow-xl"
                  >
                    Are you sure about that?
                  </motion.div>
                )}
              </AnimatePresence>
              
              <button
                onClick={onExit}
                onMouseEnter={() => setIsHoveringExit(true)}
                onMouseLeave={() => setIsHoveringExit(false)}
                className="w-14 h-14 bg-white/10 hover:bg-red-500 backdrop-blur-md rounded-2xl flex items-center justify-center text-white transition-all duration-300 border border-white/20 group"
              >
                <XCircle size={28} className="group-hover:rotate-90 transition-transform duration-300" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-center">
          <AnimatePresence>
            {lastScan && (
              <motion.div
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.9 }}
                className="bg-white p-8 rounded-[2.5rem] shadow-2xl flex items-center gap-8 border-4 border-emerald-500"
              >
                <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shrink-0">
                  <CheckCircle size={48} />
                </div>
                <div>
                  <h2 className="text-4xl font-black text-[#141414]">{lastScan.status}</h2>
                  <p className="text-xl font-bold text-[#141414]/60 mt-1">{lastScan.name}</p>
                  <p className="text-sm font-mono text-emerald-600 font-bold mt-1">LRN: {lastScan.lrn}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex justify-between items-end">
          <div className="text-white/40 text-xs font-mono">
            SECURE FACIAL RECOGNITION V2.5<br />
            ENCRYPTED DATA STREAM ACTIVE
          </div>
          <div className="bg-black/40 backdrop-blur-md p-4 rounded-2xl border border-white/10 text-white">
            <p className="text-xs font-bold opacity-50 uppercase tracking-widest">Current Time</p>
            <p className="text-2xl font-black">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
