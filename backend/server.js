require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ---------- เชื่อมต่อ MongoDB ----------
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('เชื่อมต่อ MongoDB สำเร็จ'))
  .catch((err) => console.error('เชื่อมต่อ MongoDB ล้มเหลว:', err.message));

// ---------- Schema: กำหนดรูปแบบข้อมูล Task ----------
const taskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  done: { type: Boolean, default: false },
  category: { type: String, default: 'ส่วนตัว' }
}, { timestamps: true });

const Task = mongoose.model('Task', taskSchema);

// ---------- Routes ----------

// GET: ดึงรายการ task ทั้งหมด
app.get('/tasks', async (req, res) => {
  try {
    const tasks = await Task.find().sort({ createdAt: -1 });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: 'ดึงข้อมูลไม่สำเร็จ' });
  }
});

// POST: เพิ่ม task ใหม่
app.post('/tasks', async (req, res) => {
  try {
    const newTask = new Task({
      title: req.body.title,
      category: req.body.category || 'ส่วนตัว'
    });
    const saved = await newTask.save();
    res.json(saved);
  } catch (err) {
    res.status(500).json({ error: 'เพิ่มงานไม่สำเร็จ' });
  }
});

// PUT: แก้ไข task (เช่น เช็คว่าทำเสร็จแล้ว)
app.put('/tasks/:id', async (req, res) => {
  try {
    const updated = await Task.findByIdAndUpdate(
      req.params.id,
      { done: req.body.done },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: 'ไม่พบ task นี้' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'แก้ไขงานไม่สำเร็จ' });
  }
});

// DELETE: ลบ task
app.delete('/tasks/:id', async (req, res) => {
  try {
    await Task.findByIdAndDelete(req.params.id);
    res.json({ message: 'ลบสำเร็จ' });
  } catch (err) {
    res.status(500).json({ error: 'ลบงานไม่สำเร็จ' });
  }
});

app.listen(PORT, () => {
  console.log(`Server กำลังรันที่ http://localhost:${PORT}`);
});