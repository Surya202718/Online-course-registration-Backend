const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

// Auth Routes
app.post('/api/auth/signup', (req, res) => {
  const { username, password, name, email, role } = req.body;
  db.run('INSERT INTO users (username, password, name, email, role) VALUES (?, ?, ?, ?, ?)', 
    [username, password, name, email, role], 
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ error: 'Username already exists' });
        }
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json({ id: this.lastID, username, name, email, role });
  });
});

app.post('/api/auth/login', (req, res) => {
  const { username, password, role } = req.body;
  db.get('SELECT * FROM users WHERE username = ? AND password = ? AND role = ?', [username, password, role], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    
    // If student, populate enrolledCourses
    if (role === 'student') {
      db.all('SELECT c.* FROM courses c JOIN enrollments e ON c.id = e.course_id WHERE e.user_id = ?', [user.id], (err, courses) => {
        user.enrolledCourses = courses || [];
        res.json(user);
      });
    } else {
      res.json(user);
    }
  });
});

// Courses Routes
app.get('/api/courses', (req, res) => {
  db.all('SELECT * FROM courses', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/courses', (req, res) => {
  const { code, name, credits, faculty, department, capacity, day, time, room, description } = req.body;
  db.run(`INSERT INTO courses (code, name, credits, faculty, department, capacity, day, time, room, description) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
    [code, name, credits, faculty, department, capacity, day, time, room, description],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ id: this.lastID, ...req.body, enrolled: 0 });
    }
  );
});

app.put('/api/courses/:id', (req, res) => {
  const { code, name, credits, faculty, department, capacity, day, time, room, description } = req.body;
  db.run(`UPDATE courses 
          SET code = ?, name = ?, credits = ?, faculty = ?, department = ?, capacity = ?, day = ?, time = ?, room = ?, description = ?
          WHERE id = ?`,
    [code, name, credits, faculty, department, capacity, day, time, room, description, req.params.id],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Course not found' });
      res.json({ id: Number(req.params.id), ...req.body });
    }
  );
});

app.delete('/api/courses/:id', (req, res) => {
  db.run('DELETE FROM courses WHERE id = ?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    // Cleanup enrollments
    db.run('DELETE FROM enrollments WHERE course_id = ?', [req.params.id]);
    res.status(204).send();
  });
});

// Admin stats: get all students
app.get('/api/users', (req, res) => {
  db.all('SELECT id, username, name, email, role FROM users WHERE role = "student"', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    
    // We optionally could populate enrolledCourses for all students if needed
    let completed = 0;
    if (rows.length === 0) return res.json([]);
    
    rows.forEach(user => {
      db.all('SELECT c.* FROM courses c JOIN enrollments e ON c.id = e.course_id WHERE e.user_id = ?', [user.id], (err, courses) => {
        user.enrolledCourses = courses || [];
        completed++;
        if (completed === rows.length) {
          res.json(rows);
        }
      });
    });
  });
});

// Enrollment Routes
app.post('/api/students/:id/enroll', (req, res) => {
  const userId = req.params.id;
  const { courseId } = req.body;

  db.get('SELECT * FROM courses WHERE id = ?', [courseId], (err, course) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!course) return res.status(404).json({ error: 'Course not found' });
    if (course.enrolled >= course.capacity) return res.status(400).json({ error: 'Course is full' });

    db.run('INSERT INTO enrollments (user_id, course_id) VALUES (?, ?)', [userId, courseId], function(err) {
      if (err) return res.status(400).json({ error: 'Already enrolled' });
      
      db.run('UPDATE courses SET enrolled = enrolled + 1 WHERE id = ?', [courseId], (err) => {
        res.json({ success: true, course });
      });
    });
  });
});

app.post('/api/students/:id/drop', (req, res) => {
  const userId = req.params.id;
  const { courseId } = req.body;

  db.run('DELETE FROM enrollments WHERE user_id = ? AND course_id = ?', [userId, courseId], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(400).json({ error: 'Not enrolled in this course' });
    
    db.run('UPDATE courses SET enrolled = enrolled - 1 WHERE id = ? AND enrolled > 0', [courseId], (err) => {
      res.json({ success: true });
    });
  });
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
