import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
  },
});

const db = new Database("attendance.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    lrn TEXT UNIQUE NOT NULL,
    section TEXT NOT NULL,
    face_descriptor TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id)
  );
`);

app.use(express.json({ limit: '50mb' }));

// API Routes
app.get("/api/students", (req, res) => {
  const students = db.prepare("SELECT * FROM students").all();
  res.json(students);
});

app.post("/api/students", (req, res) => {
  const { name, lrn, section, faceDescriptor } = req.body;
  try {
    const info = db.prepare(
      "INSERT INTO students (name, lrn, section, face_descriptor) VALUES (?, ?, ?, ?)"
    ).run(name, lrn, section, JSON.stringify(faceDescriptor));
    res.json({ id: info.lastInsertRowid });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/api/attendance/today", (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const attendance = db.prepare(`
    SELECT a.*, s.name, s.section, s.lrn 
    FROM attendance a 
    JOIN students s ON a.student_id = s.id 
    WHERE date(a.timestamp) = date(?)
    ORDER BY a.timestamp DESC
  `).all(today);
  res.json(attendance);
});

app.post("/api/attendance/scan", (req, res) => {
  const { studentId } = req.body;
  const today = new Date().toISOString().split('T')[0];
  
  // Check if already scanned today
  const existing = db.prepare(`
    SELECT id FROM attendance 
    WHERE student_id = ? AND date(timestamp) = date(?)
  `).get(studentId, today);

  if (existing) {
    return res.json({ status: "already_present" });
  }

  const info = db.prepare(
    "INSERT INTO attendance (student_id) VALUES (?)"
  ).run(studentId);

  const student = db.prepare("SELECT * FROM students WHERE id = ?").get(studentId);
  
  // Broadcast to all clients
  io.emit("attendance_update", {
    studentId,
    name: student.name,
    section: student.section,
    lrn: student.lrn,
    timestamp: new Date().toISOString()
  });

  res.json({ status: "success", student });
});

app.get("/api/stats", (req, res) => {
  const totalStudents = db.prepare("SELECT COUNT(*) as count FROM students").get().count;
  const today = new Date().toISOString().split('T')[0];
  const presentToday = db.prepare("SELECT COUNT(DISTINCT student_id) as count FROM attendance WHERE date(timestamp) = date(?)").get(today).count;
  
  const sections = ["12 Venter", "12 Tesla", "12 Hawking"];
  const sectionStats = sections.map(section => {
    const total = db.prepare("SELECT COUNT(*) as count FROM students WHERE section = ?").get(section).count;
    const present = db.prepare(`
      SELECT COUNT(DISTINCT a.student_id) as count 
      FROM attendance a 
      JOIN students s ON a.student_id = s.id 
      WHERE s.section = ? AND date(a.timestamp) = date(?)
    `).get(section, today).count;
    return { section, total, present };
  });

  res.json({
    totalStudents,
    presentToday,
    attendanceRate: totalStudents > 0 ? (presentToday / totalStudents) * 100 : 0,
    sectionStats
  });
});

app.get("/api/attendance/report", (req, res) => {
  const { section } = req.query;
  let query = `
    SELECT s.name, s.lrn, s.section, a.timestamp 
    FROM attendance a 
    JOIN students s ON a.student_id = s.id
  `;
  const params: any[] = [];

  if (section) {
    query += " WHERE s.section = ?";
    params.push(section);
  }

  query += " ORDER BY a.timestamp DESC";

  const data = db.prepare(query).all(...params);
  res.json(data);
});

// Vite middleware for development
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  const PORT = 3000;
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
