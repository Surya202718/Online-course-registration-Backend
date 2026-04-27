const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new Database(dbPath);

console.log('Connected to SQLite database.');

const DEFAULT_COURSES = [
  { code: "CS101", name: "Introduction to Programming", credits: 3, faculty: "Dr. John Smith", department: "Computer Science", capacity: 40, enrolled: 0, day: "Monday", time: "09:00-10:30", room: "Room 101", description: "Basic programming concepts using Python" },
  { code: "CS102", name: "Data Structures", credits: 4, faculty: "Dr. Sarah Johnson", department: "Computer Science", capacity: 35, enrolled: 0, day: "Tuesday", time: "10:00-11:30", room: "Room 102", description: "Advanced data structures and algorithms" }
];

// Create tables
db.exec(`CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE,
  password TEXT,
  name TEXT,
  email TEXT,
  role TEXT
)`);

db.exec(`CREATE TABLE IF NOT EXISTS courses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE,
  name TEXT,
  credits INTEGER,
  faculty TEXT,
  department TEXT,
  capacity INTEGER,
  enrolled INTEGER DEFAULT 0,
  day TEXT,
  time TEXT,
  room TEXT,
  description TEXT
)`);

db.exec(`CREATE TABLE IF NOT EXISTS enrollments (
  user_id INTEGER,
  course_id INTEGER,
  PRIMARY KEY (user_id, course_id),
  FOREIGN KEY(user_id) REFERENCES users(id),
  FOREIGN KEY(course_id) REFERENCES courses(id)
)`);

// Insert default admin
const adminCheck = db.prepare("SELECT * FROM users WHERE username = ?").get("admin");
if (!adminCheck) {
  db.prepare("INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)").run("admin", "admin123", "Admin User", "admin");
}

// Seed courses
const courseCount = db.prepare("SELECT COUNT(*) as count FROM courses").get().count;
if (courseCount === 0) {
  const insertCourse = db.prepare("INSERT INTO courses (code, name, credits, faculty, department, capacity, enrolled, day, time, room, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
  DEFAULT_COURSES.forEach(c => {
    insertCourse.run(c.code, c.name, c.credits, c.faculty, c.department, c.capacity, c.enrolled, c.day, c.time, c.room, c.description);
  });
}

module.exports = db;
