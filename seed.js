const db = require('./db');

const DEFAULT_COURSES = [
  { code: "CS101", name: "Introduction to Programming", credits: 3, faculty: "Dr. John Smith", department: "Computer Science", capacity: 40, enrolled: 0, day: "Monday", time: "09:00-10:30", room: "Room 101", description: "Basic programming concepts using Python" },
  { code: "CS102", name: "Data Structures", credits: 4, faculty: "Dr. Sarah Johnson", department: "Computer Science", capacity: 35, enrolled: 0, day: "Tuesday", time: "10:00-11:30", room: "Room 102", description: "Advanced data structures and algorithms" }
];

setTimeout(() => {
  const stmt = db.prepare("INSERT INTO courses (code, name, credits, faculty, department, capacity, enrolled, day, time, room, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
  DEFAULT_COURSES.forEach(c => {
    stmt.run([c.code, c.name, c.credits, c.faculty, c.department, c.capacity, c.enrolled, c.day, c.time, c.room, c.description], (err) => {
      if (err) console.error(err);
      else console.log('Inserted', c.code);
    });
  });
  stmt.finalize(() => {
    console.log('Seed complete.');
    process.exit(0);
  });
}, 1000);
