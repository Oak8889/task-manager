import { useState, useEffect, useRef } from 'react';
import './App.css';
import defaultBg from './assets/bg.jpg';

const API_URL = 'https://task-manager-api-gnps.onrender.com';
const BASE_CATEGORIES = ['งาน', 'ส่วนตัว'];
const MONTH_NAMES = [
  'มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
  'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'
];
const WEEKDAYS = ['อา','จ','อ','พ','พฤ','ศ','ส'];

function dateKey(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function App() {
  // ---------- AUTH ----------
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [authUsername, setAuthUsername] = useState(localStorage.getItem('authUsername') || '');
  const [authMode, setAuthMode] = useState('login'); // 'login' หรือ 'register'
  const [authForm, setAuthForm] = useState({ username: '', password: '' });
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const [tasks, setTasks] = useState([]);
  const [newTitle, setNewTitle] = useState('');

  const [customCategories, setCustomCategories] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('customCategories')) || [];
    } catch {
      return [];
    }
  });
  const allCategories = [...BASE_CATEGORIES, ...customCategories];
  const [newCategory, setNewCategory] = useState(BASE_CATEGORIES[0]);
  const [activeCategory, setActiveCategory] = useState('ทั้งหมด');
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [categoryDraft, setCategoryDraft] = useState('');

  const [editingName, setEditingName] = useState(false);
  const [now, setNow] = useState(new Date());

  const [themeMode, setThemeMode] = useState(
    localStorage.getItem('themeMode') || 'light'
  );
  const [bgImage, setBgImage] = useState(
    localStorage.getItem('customBg') || defaultBg
  );
  const [showSettings, setShowSettings] = useState(false);
  const fileInputRef = useRef(null);

  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());

  const [notes, setNotes] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('calendarNotes')) || {};
    } catch {
      return {};
    }
  });
  const [selectedDate, setSelectedDate] = useState(null);
  const [noteDraft, setNoteDraft] = useState('');

  useEffect(() => {
    if (token) fetchTasks();
  }, [token]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    localStorage.setItem('themeMode', themeMode);
  }, [themeMode]);

  useEffect(() => {
    localStorage.setItem('calendarNotes', JSON.stringify(notes));
  }, [notes]);

  useEffect(() => {
    localStorage.setItem('customCategories', JSON.stringify(customCategories));
  }, [customCategories]);

  // ---------- AUTH FUNCTIONS ----------
  const handleAuthSubmit = () => {
    if (!authForm.username.trim() || !authForm.password.trim()) {
      setAuthError('กรุณากรอกให้ครบ');
      return;
    }
    setAuthError('');
    setAuthLoading(true);
    const endpoint = authMode === 'login' ? '/auth/login' : '/auth/register';

    fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(authForm)
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'เกิดข้อผิดพลาด');
        return data;
      })
      .then((data) => {
        setToken(data.token);
        setAuthUsername(data.username);
        localStorage.setItem('token', data.token);
        localStorage.setItem('authUsername', data.username);
        setAuthForm({ username: '', password: '' });
      })
      .catch((err) => setAuthError(err.message))
      .finally(() => setAuthLoading(false));
  };

  const handleLogout = () => {
    setToken(null);
    setAuthUsername('');
    setTasks([]);
    localStorage.removeItem('token');
    localStorage.removeItem('authUsername');
  };

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  });

  const handleAuthedFetchError = (res) => {
    if (res.status === 401) {
      handleLogout();
      throw new Error('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่');
    }
    return res;
  };

  // ---------- TASK FUNCTIONS ----------
  const fetchTasks = () => {
    fetch(`${API_URL}/tasks`, { headers: authHeaders() })
      .then((res) => {
        handleAuthedFetchError(res);
        return res.json();
      })
      .then((data) => setTasks(Array.isArray(data) ? data : []))
      .catch(() => {});
  };

  const addTask = () => {
    if (!newTitle.trim()) return;
    fetch(`${API_URL}/tasks`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ title: newTitle, category: newCategory })
    })
      .then((res) => {
        handleAuthedFetchError(res);
        return res.json();
      })
      .then(() => {
        setNewTitle('');
        fetchTasks();
      })
      .catch(() => {});
  };

  const toggleDone = (task) => {
    fetch(`${API_URL}/tasks/${task._id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ done: !task.done })
    })
      .then((res) => {
        handleAuthedFetchError(res);
        return fetchTasks();
      })
      .catch(() => {});
  };

  const deleteTask = (id) => {
    fetch(`${API_URL}/tasks/${id}`, {
      method: 'DELETE',
      headers: authHeaders()
    })
      .then((res) => {
        handleAuthedFetchError(res);
        return fetchTasks();
      })
      .catch(() => {});
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setBgImage(reader.result);
      try {
        localStorage.setItem('customBg', reader.result);
      } catch (err) {
        console.warn('รูปใหญ่เกินกว่าจะบันทึกไว้ถาวรได้ แต่ใช้งานได้ในเซสชันนี้');
      }
    };
    reader.readAsDataURL(file);
  };

  const resetBg = () => {
    setBgImage(defaultBg);
    localStorage.removeItem('customBg');
  };

  const addCustomCategory = () => {
    const name = categoryDraft.trim();
    if (!name) return;
    if (allCategories.includes(name)) {
      setCategoryDraft('');
      setShowAddCategory(false);
      return;
    }
    setCustomCategories((prev) => [...prev, name]);
    setCategoryDraft('');
    setShowAddCategory(false);
  };

  const removeCustomCategory = (cat) => {
    setCustomCategories((prev) => prev.filter((c) => c !== cat));
    if (activeCategory === cat) setActiveCategory('ทั้งหมด');
    if (newCategory === cat) setNewCategory(BASE_CATEGORIES[0]);
  };

  const filteredTasks =
    activeCategory === 'ทั้งหมด'
      ? tasks
      : tasks.filter((t) => t.category === activeCategory);

  const doneCount = filteredTasks.filter((t) => t.done).length;
  const pendingCount = filteredTasks.length - doneCount;

  // ---------- ปฏิทิน ----------
  const today = now.getDate();
  const isCurrentMonth =
    viewYear === now.getFullYear() && viewMonth === now.getMonth();
  const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const calendarCells = [];
  for (let i = 0; i < firstDayIndex; i++) calendarCells.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarCells.push(d);

  const goPrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };
  const goNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };
  const goToday = () => {
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
  };

  const openDay = (d) => {
    if (!d) return;
    const key = dateKey(viewYear, viewMonth, d);
    setSelectedDate(key);
    setNoteDraft(notes[key] || '');
  };

  const saveNote = () => {
    setNotes((prev) => {
      const next = { ...prev };
      if (noteDraft.trim()) {
        next[selectedDate] = noteDraft.trim();
      } else {
        delete next[selectedDate];
      }
      return next;
    });
    setSelectedDate(null);
  };

  const closeNoteModal = () => setSelectedDate(null);

  const timeString = now.toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
  const dateString = now.toLocaleDateString('th-TH', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const selectedDateLabel = selectedDate
    ? (() => {
        const [y, m, d] = selectedDate.split('-').map(Number);
        return `${d} ${MONTH_NAMES[m - 1]} ${y + 543}`;
      })()
    : '';

  // ---------- ถ้ายังไม่ Login: แสดงหน้า Login/สมัครสมาชิก ----------
  if (!token) {
    return (
      <div
        className={`page-wrapper theme-${themeMode}`}
        style={{ backgroundImage: `url(${bgImage})` }}
      >
        <div className="auth-card fade-in">
          <p className="eyebrow" style={{ textAlign: 'center' }}>สมุดงานส่วนตัว</p>
          <h1 className="auth-title">
            {authMode === 'login' ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'}
          </h1>
          <p className="hero-sub" style={{ textAlign: 'center', marginBottom: 24 }}>
            OakNote — จัดระเบียบงานของคุณ
          </p>

          <div className="auth-form">
            <input
              type="text"
              className="auth-input"
              placeholder="ชื่อผู้ใช้"
              value={authForm.username}
              onChange={(e) => setAuthForm({ ...authForm, username: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && handleAuthSubmit()}
            />
            <input
              type="password"
              className="auth-input"
              placeholder="รหัสผ่าน"
              value={authForm.password}
              onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && handleAuthSubmit()}
            />

            {authError && <p className="auth-error">{authError}</p>}

            <button
              className="btn-primary auth-submit"
              onClick={handleAuthSubmit}
              disabled={authLoading}
            >
              {authLoading ? 'กำลังดำเนินการ...' : authMode === 'login' ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'}
            </button>

            <p className="auth-switch">
              {authMode === 'login' ? 'ยังไม่มีบัญชี?' : 'มีบัญชีอยู่แล้ว?'}{' '}
              <span
                onClick={() => {
                  setAuthMode(authMode === 'login' ? 'register' : 'login');
                  setAuthError('');
                }}
              >
                {authMode === 'login' ? 'สมัครสมาชิก' : 'เข้าสู่ระบบ'}
              </span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ---------- ถ้า Login แล้ว: แสดงแอปตามปกติ ----------
  return (
    <div
      className={`page-wrapper theme-${themeMode}`}
      style={{ backgroundImage: `url(${bgImage})` }}
    >
      <div className="page-grid">
        {/* SIDEBAR ซ้าย */}
        <aside className="sidebar-left fade-in">
          <div className="user-block">
            <p className="username-display" style={{ cursor: 'default' }}>
              👋 {authUsername}
            </p>
            <button className="logout-btn" onClick={handleLogout}>
              ออกจากระบบ
            </button>
          </div>

          <div className="sidebar-section">
            <p className="sidebar-title">หมวดหมู่</p>
            <ul className="category-list">
              <li
                className={`category-item ${activeCategory === 'ทั้งหมด' ? 'active' : ''}`}
                onClick={() => setActiveCategory('ทั้งหมด')}
              >
                ทั้งหมด
              </li>
              {allCategories.map((cat) => (
                <li
                  key={cat}
                  className={`category-item ${activeCategory === cat ? 'active' : ''}`}
                  onClick={() => setActiveCategory(cat)}
                >
                  <span>{cat}</span>
                  {!BASE_CATEGORIES.includes(cat) && (
                    <span
                      className="category-remove"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeCustomCategory(cat);
                      }}
                    >
                      ×
                    </span>
                  )}
                </li>
              ))}
            </ul>

            {showAddCategory ? (
              <div className="add-category-row">
                <input
                  autoFocus
                  className="add-category-input"
                  value={categoryDraft}
                  onChange={(e) => setCategoryDraft(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addCustomCategory()}
                  placeholder="ชื่อหมวดหมู่ใหม่..."
                />
                <button className="add-category-confirm" onClick={addCustomCategory}>
                  ✓
                </button>
              </div>
            ) : (
              <button
                className="add-category-btn"
                onClick={() => setShowAddCategory(true)}
              >
                + อื่นๆ
              </button>
            )}
          </div>

          <div className="sidebar-section settings-section">
            <button
              className="settings-toggle"
              onClick={() => setShowSettings((v) => !v)}
            >
              ⚙️ ตั้งค่า
            </button>

            {showSettings && (
              <div className="settings-panel">
                <p className="sidebar-title">พื้นหลัง</p>
                <button
                  className="upload-btn"
                  onClick={() => fileInputRef.current.click()}
                >
                  📁 อัปโหลดรูปภาพ
                </button>
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  style={{ display: 'none' }}
                />
                <button className="reset-btn" onClick={resetBg}>
                  รีเซ็ตพื้นหลัง
                </button>

                <p className="sidebar-title" style={{ marginTop: 18 }}>โหมดธีม</p>
                <div className="theme-toggle">
                  <button
                    className={`theme-btn ${themeMode === 'light' ? 'active' : ''}`}
                    onClick={() => setThemeMode('light')}
                  >
                    ☀️ สว่าง
                  </button>
                  <button
                    className={`theme-btn ${themeMode === 'dark' ? 'active' : ''}`}
                    onClick={() => setThemeMode('dark')}
                  >
                    🌙 มืด
                  </button>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* เนื้อหาหลัก */}
        <div className="page">
          <section className="fade-in hero" style={{ animationDelay: '0ms' }}>
            <span className="eyebrow">สมุดงานส่วนตัว</span>
            <h1>
              จัดระเบียบงาน <br />
              <span className="accent">ด้วย OakNote</span>
            </h1>
            <p className="hero-sub">
              บันทึกสิ่งที่ต้องทำ ติ๊กเมื่อเสร็จ แล้วก้าวต่อไป
            </p>
          </section>

          <section className="fade-in stats" style={{ animationDelay: '120ms' }}>
            <div className="stat-card">
              <span className="stat-num">{filteredTasks.length}</span>
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

          <section className="fade-in form-section" style={{ animationDelay: '220ms' }}>
            <div className="input-row">
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addTask()}
                placeholder="เพิ่มงานใหม่..."
              />
              <select
                className="category-select"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
              >
                {allCategories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <button className="btn-primary" onClick={addTask}>
                + เพิ่มงาน
              </button>
            </div>
          </section>

          <section className="fade-in list-section" style={{ animationDelay: '320ms' }}>
            {filteredTasks.length === 0 && (
              <p className="empty-state">ยังไม่มีงานในหมวดนี้เลย</p>
            )}
            <ul className="task-list">
              {filteredTasks.map((task, i) => (
                <li
                  key={task._id}
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
                  <span className="task-tag">{task.category}</span>
                  <button className="btn-delete" onClick={() => deleteTask(task._id)}>
                    ลบ
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* PANEL ขวา */}
        <aside className="sidebar-right fade-in">
          <div className="clock-block">
            <p className="clock-time">{timeString}</p>
            <p className="clock-date">{dateString}</p>
          </div>

          <div className="calendar-block">
            <div className="calendar-header">
              <button className="cal-nav-btn" onClick={goPrevMonth} aria-label="เดือนก่อนหน้า">
                ‹
              </button>
              <p className="calendar-title">
                {MONTH_NAMES[viewMonth]} {viewYear + 543}
              </p>
              <button className="cal-nav-btn" onClick={goNextMonth} aria-label="เดือนถัดไป">
                ›
              </button>
            </div>

            {!isCurrentMonth && (
              <button className="cal-today-btn" onClick={goToday}>
                กลับไปวันนี้
              </button>
            )}

            <div className="calendar-grid">
              {WEEKDAYS.map((d) => (
                <span key={d} className="calendar-weekday">{d}</span>
              ))}
              {calendarCells.map((d, i) => {
                const key = d ? dateKey(viewYear, viewMonth, d) : null;
                const hasNote = key && notes[key];
                const isToday = isCurrentMonth && d === today;
                return (
                  <button
                    key={i}
                    className={`calendar-day ${isToday ? 'today' : ''} ${!d ? 'empty' : ''} ${hasNote ? 'has-note' : ''}`}
                    onClick={() => openDay(d)}
                    disabled={!d}
                  >
                    {d || ''}
                    {hasNote && <span className="note-dot" />}
                  </button>
                );
              })}
            </div>
          </div>
        </aside>
      </div>

      {/* MODAL โน้ตรายวัน */}
      {selectedDate && (
        <div className="note-modal-overlay" onClick={closeNoteModal}>
          <div className="note-modal" onClick={(e) => e.stopPropagation()}>
            <p className="note-modal-title">📝 {selectedDateLabel}</p>
            <textarea
              className="note-textarea"
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              placeholder="เขียนโน้ตกันลืมสำหรับวันนี้..."
              autoFocus
            />
            <div className="note-modal-actions">
              <button className="btn-secondary" onClick={closeNoteModal}>
                ยกเลิก
              </button>
              <button className="btn-primary" onClick={saveNote}>
                บันทึก
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;