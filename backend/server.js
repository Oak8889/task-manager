require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ---------- เชื่อมต่อ MongoDB ----------
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('เชื่อมต่อ MongoDB สำเร็จ'))
  .catch((err) => console.error('เชื่อมต่อ MongoDB ล้มเหลว:', err.message));

// ---------- Schema: User ----------
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

// ---------- Schema: Task (เพิ่ม userId ผูกกับเจ้าของงาน) ----------
const taskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  done: { type: Boolean, default: false },
  category: { type: String, default: 'ส่วนตัว' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

const Task = mongoose.model('Task', taskSchema);

// ---------- Middleware: ตรวจสอบ Token ก่อนเข้าถึง route ----------
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'กรุณาเข้าสู่ระบบก่อน' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token ไม่ถูกต้องหรือหมดอายุ' });
  }
}

// ---------- Routes: Authentication ----------

// สมัครสมาชิก
app.post('/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน' });
    }
    const existing = await User.findOne({ username });
    if (existing) {
      return res.status(400).json({ error: 'ชื่อผู้ใช้นี้มีคนใช้แล้ว' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, password: hashedPassword });
    await newUser.save();

    const token = jwt.sign({ userId: newUser._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, username: newUser.username });
  } catch (err) {
    res.status(500).json({ error: 'สมัครสมาชิกไม่สำเร็จ' });
  }
});

// เข้าสู่ระบบ
app.post('/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ error: 'ไม่พบชื่อผู้ใช้นี้' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'รหัสผ่านไม่ถูกต้อง' });
    }
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, username: user.username });
  } catch (err) {
    res.status(500).json({ error: 'เข้าสู่ระบบไม่สำเร็จ' });
  }
});

// ---------- Routes: Tasks (ต้อง login ก่อนถึงจะใช้ได้ทุก route) ----------

// GET: ดึงรายการ task เฉพาะของ user ที่ login อยู่
app.get('/tasks', authMiddleware, async (req, res) => {
  try {
    const tasks = await Task.find({ userId: req.userId }).sort({ createdAt: -1 });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: 'ดึงข้อมูลไม่สำเร็จ' });
  }
});

// POST: เพิ่ม task ใหม่ ผูกกับ user ที่ login อยู่
app.post('/tasks', authMiddleware, async (req, res) => {
  try {
    const newTask = new Task({
      title: req.body.title,
      category: req.body.category || 'ส่วนตัว',
      userId: req.userId
    });
    const saved = await newTask.save();
    res.json(saved);
  } catch (err) {
    res.status(500).json({ error: 'เพิ่มงานไม่สำเร็จ' });
  }
});

// PUT: แก้ไข task (เช็คด้วยว่าเป็นเจ้าของงานจริง)
app.put('/tasks/:id', authMiddleware, async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, userId: req.userId });
    if (!task) return res.status(404).json({ error: 'ไม่พบ task นี้' });

    task.done = req.body.done;
    await task.save();
    res.json(task);
  } catch (err) {
    res.status(500).json({ error: 'แก้ไขงานไม่สำเร็จ' });
  }
});

// DELETE: ลบ task (เช็คด้วยว่าเป็นเจ้าของงานจริง)
app.delete('/tasks/:id', authMiddleware, async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!task) return res.status(404).json({ error: 'ไม่พบ task นี้' });
    res.json({ message: 'ลบสำเร็จ' });
  } catch (err) {
    res.status(500).json({ error: 'ลบงานไม่สำเร็จ' });
  }
});

app.listen(PORT, () => {
  console.log(`Server กำลังรันที่ http://localhost:${PORT}`);
});