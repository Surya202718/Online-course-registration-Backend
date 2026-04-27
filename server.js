const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

// Auth Routes
app.post('/api/auth/signup', (req, res) => {
  const { username, password, name, email, role } = req.body;
  try {
    const result = db.prepare('INSERT INTO users (username, password, name, email, role) VALUES (?, ?, ?, ?, ?)').run(username, password, name, email, role);
    res.status(201).json({ id: result.lastInsertRowid, username, name, email, role });
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', (req, res) => {
  const { username, password, role } = req.body;
  try {
    const user = db.prepare('SELECT * FROM users WHERE username = ? AND password = ? AND role = ?').get(username, password, role);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    
    // If student, populate enrolledCourses
    if (role === 'student') {
      const courses = db.prepare('SELECT c.* FROM courses c JOIN enrollments e ON c.id = e.course_id WHERE e.user_id = ?').all(user.id);
      user.enrolledCourses = courses || [];
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Courses Routes
app.get('/api/courses', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM courses').all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/courses', (req, res) => {
  const { code, name, credits, faculty, department, capacity, day, time, room, description } = req.body;
  try {
    const result = db.prepare('INSERT INTO courses (code, name, credits, faculty, department, capacity, day, time, room, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(code, name, credits, faculty, department, capacity, day, time, room, description);
    res.status(201).json({ id: result.lastInsertRowid, ...req.body, enrolled: 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/courses/:id', (req, res) => {
  const { code, name, credits, faculty, department, capacity, day, time, room, description } = req.body;
  try {
    const result = db.prepare('UPDATE courses SET code = ?, name = ?, credits = ?, faculty = ?, department = ?, capacity = ?, day = ?, time = ?, room = ?, description = ? WHERE id = ?').run(code, name, credits, faculty, department, capacity, day, time, room, description, req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Course not found' });
    res.json({ id: Number(req.params.id), ...req.body });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/courses/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM enrollments WHERE course_id = ?').run(req.params.id);
    db.prepare('DELETE FROM courses WHERE id = ?').run(req.params.id);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin stats: get all students
app.get('/api/users', (req, res) => {
  try {
    const rows = db.prepare('SELECT id, username, name, email, role FROM users WHERE role = "student"').all();
    rows.forEach(user => {
      const courses = db.prepare('SELECT c.* FROM courses c JOIN enrollments e ON c.id = e.course_id WHERE e.user_id = ?').all(user.id);
      user.enrolledCourses = courses || [];
    });
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Enrollment Routes
app.post('/api/students/:id/enroll', (req, res) => {
  const userId = req.params.id;
  const { courseId } = req.body;

  try {
    const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(courseId);
    if (!course) return res.status(404).json({ error: 'Course not found' });
    if (course.enrolled >= course.capacity) return res.status(400).json({ error: 'Course is full' });

    db.prepare('INSERT INTO enrollments (user_id, course_id) VALUES (?, ?)').run(userId, courseId);
    db.prepare('UPDATE courses SET enrolled = enrolled + 1 WHERE id = ?').run(courseId);
    res.json({ success: true, course });
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      res.status(400).json({ error: 'Already enrolled' });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

app.post('/api/students/:id/drop', (req, res) => {
  const userId = req.params.id;
  const { courseId } = req.body;

  try {
    const result = db.prepare('DELETE FROM enrollments WHERE user_id = ? AND course_id = ?').run(userId, courseId);
    if (result.changes === 0) return res.status(400).json({ error: 'Not enrolled in this course' });
    
    db.prepare('UPDATE courses SET enrolled = enrolled - 1 WHERE id = ? AND enrolled > 0').run(courseId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
