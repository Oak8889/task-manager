import { useState, useEffect } from 'react';
import './App.css';
import bgImage from './assets/bg.jpg';

function App() {
  const [tasks, setTasks] = useState([]);
  const [newTitle, setNewTitle] = useState('');

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = () => {
    fetch('http://localhost:3000/tasks')
      .then((res) => res.json())
      .then((data) => setTasks(data));
  };

  const addTask = () => {
    if (!newTitle.trim()) return;
    fetch('http://localhost:3000/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle })
    })
      .then((res) => res.json())
      .then(() => {
        setNewTitle('');
        fetchTasks();
      });
  };

  const toggleDone = (task) => {
    fetch(`http://localhost:3000/tasks/${task.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ done: !task.done })
    }).then(() => fetchTasks());
  };

  const deleteTask = (id) => {
    fetch(`http://localhost:3000/tasks/${id}`, {
      method: 'DELETE'
    }).then(() => fetchTasks());
  };

  const doneCount = tasks.filter((t) => t.done).length;
  const pendingCount = tasks.length - doneCount;

  return (
    <div className="page-wrapper" style={{ backgroundImage: `url(${bgImage})` }}>
      <div className="page">
        {/* HERO */}
        <section className="fade-in hero" style={{ animationDelay: '0ms' }}>
          <span className="eyebrow">สมุดงานส่วนตัว</span>
          <h1>
            จัดระเบียบวันนี้ <br />
            <span className="accent">ทีละงาน</span>
          </h1>
          <p className="hero-sub">
            บันทึกสิ่งที่ต้องทำ ติ๊กเมื่อเสร็จ แล้วก้าวต่อไป
          </p>
        </section>

        {/* STATS */}
        <section className="fade-in stats" style={{ animationDelay: '120ms' }}>
          <div className="stat-card">
            <span className="stat-num">{tasks.length}</span>
            <span className="stat-label">ทั้งหมด</span>
          </div>
          <div className="stat-card">
            <span className="stat-num stat-pending">{pendingCount}</span>
            <span className="stat-label">ยังไม่เสร็จ</span>
          </div>
          <div className="stat-card">
            <span className="stat-num stat-done">{doneCount}</span>
            <span className="stat-label">เสร็จแล้ว</span>
          </div>
        </section>

        {/* FORM */}
        <section className="fade-in form-section" style={{ animationDelay: '220ms' }}>
          <div className="input-row">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTask()}
              placeholder="เพิ่มงานใหม่..."
            />
            <button className="btn-primary" onClick={addTask}>
              + เพิ่มงาน
            </button>
          </div>
        </section>

        {/* LIST */}
        <section className="fade-in list-section" style={{ animationDelay: '320ms' }}>
          {tasks.length === 0 && (
            <p className="empty-state">ยังไม่มีงานเลย ลองเพิ่มดูสิ</p>
          )}
          <ul className="task-list">
            {tasks.map((task, i) => (
              <li
                key={task.id}
                className={`task-card ${task.done ? 'done' : ''}`}
                style={{ animationDelay: `${400 + i * 60}ms` }}
              >
                <button
                  className="stamp"
                  onClick={() => toggleDone(task)}
                  aria-label="toggle done"
                >
                  {task.done && <span className="check">✓</span>}
                </button>
                <span className="task-title">{task.title}</span>
                <button className="btn-delete" onClick={() => deleteTask(task.id)}>
                  ลบ
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

export default App;