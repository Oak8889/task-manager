const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// เก็บข้อมูล task ไว้ใน memory ก่อน (array ธรรมดา)
let tasks = [
  { id: 1, title: 'เรียน React', done: false },
  { id: 2, title: 'เตรียมสัมภาษณ์', done: false }
];

// GET: ดึงรายการ task ทั้งหมด
app.get('/tasks', (req, res) => {
  res.json(tasks);
});

// POST: เพิ่ม task ใหม่
app.post('/tasks', (req, res) => {
  const newTask = {
    id: Date.now(),
    title: req.body.title,
    done: false
  };
  tasks.push(newTask);
  res.json(newTask);
});

// PUT: แก้ไข task (เช่น เช็คว่าทำเสร็จแล้ว)
app.put('/tasks/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const task = tasks.find(t => t.id === id);
  if (!task) return res.status(404).json({ error: 'ไม่พบ task นี้' });

  task.done = req.body.done;
  res.json(task);
});

// DELETE: ลบ task
app.delete('/tasks/:id', (req, res) => {
  const id = parseInt(req.params.id);
  tasks = tasks.filter(t => t.id !== id);
  res.json({ message: 'ลบสำเร็จ' });
});

app.listen(PORT, () => {
  console.log(`Server กำลังรันที่ http://localhost:${PORT}`);
});