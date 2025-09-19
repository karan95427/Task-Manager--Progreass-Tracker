// Task Manager with LocalStorage
const LS_KEY = 'tasks_v1';
let tasks = JSON.parse(localStorage.getItem(LS_KEY) || '[]');
let editingId = null;

// DOM refs
const taskList = document.getElementById('taskList');
const addBtn = document.getElementById('addBtn');
const clearBtn = document.getElementById('clearBtn');
const titleIn = document.getElementById('title');
const descIn = document.getElementById('desc');
const dueIn = document.getElementById('due');
const priorityIn = document.getElementById('priority');
const progressIn = document.getElementById('progress');
const progressVal = document.getElementById('progressVal');
const filters = document.querySelectorAll('.filter');
const searchIn = document.getElementById('search');

const overallPercent = document.getElementById('overallPercent');
const progressArc = document.getElementById('progressArc');
const svgText = document.getElementById('svgText');
const totalTasks = document.getElementById('totalTasks');
const completedTasks = document.getElementById('completedTasks');
const upcomingDue = document.getElementById('upcomingDue');
const overdue = document.getElementById('overdue');

const modal = document.getElementById('modal');
const e_title = document.getElementById('e_title');
const e_desc = document.getElementById('e_desc');
const e_due = document.getElementById('e_due');
const e_priority = document.getElementById('e_priority');
const e_progress = document.getElementById('e_progress');
const e_progressVal = document.getElementById('e_progressVal');
const saveEdit = document.getElementById('saveEdit');
const cancelEdit = document.getElementById('cancelEdit');

// helpers
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
function persist() { localStorage.setItem(LS_KEY, JSON.stringify(tasks)); }
function formatDate(d) { if (!d) return '—'; const dt = new Date(d); if (isNaN(dt)) return '—'; return dt.toLocaleDateString(); }
function calcOverall() { if (tasks.length === 0) return 0; const sum = tasks.reduce((s, t) => s + (t.progress || 0), 0); return Math.round(sum / tasks.length); }

function updateDashboard() {
  const total = tasks.length;
  const doneCount = tasks.filter(t => t.progress >= 100 || t.completed).length;
  const overall = calcOverall();
  overallPercent.textContent = overall + '%';
  svgText.textContent = overall + '%';
  totalTasks.textContent = total;
  completedTasks.textContent = doneCount;
  progressArc.setAttribute('stroke-dasharray', overall + ', 100');

  const today = new Date();
  const upcoming = tasks.filter(t => t.due && !t.completed).sort((a, b) => new Date(a.due) - new Date(b.due))[0];
  upcomingDue.textContent = upcoming ? formatDate(upcoming.due) : '—';
  const over = tasks.filter(t => t.due && !t.completed && new Date(t.due) < new Date(today.getFullYear(), today.getMonth(), today.getDate())).length;
  overdue.textContent = over;
}

function renderTasks() {
  taskList.innerHTML = '';
  const filter = document.querySelector('.filter.active')?.dataset.filter || 'all';
  const q = searchIn.value.trim().toLowerCase();
  const shown = tasks.filter(t => {
    if (filter === 'active' && (t.completed || t.progress >= 100)) return false;
    if (filter === 'done' && !(t.completed || t.progress >= 100)) return false;
    if (q && !(t.title.toLowerCase().includes(q) || (t.desc || '').toLowerCase().includes(q))) return false;
    return true;
  }).sort((a, b) => (b.priority === 'high') - (a.priority === 'high') || new Date(a.created) - new Date(b.created));

  if (shown.length === 0) {
    taskList.innerHTML = '<div style="color:var(--muted);padding:18px;text-align:center">No tasks yet — add one above.</div>';
  }

  shown.forEach(t => {
    const el = document.createElement('div'); el.className = 'task';
    el.innerHTML = `
      <div class="meta">
        <h3>${escapeHtml(t.title)} ${t.completed || t.progress >= 100 ? '<span style="color:var(--success);font-size:12px">✔</span>' : ''}</h3>
        <p>${escapeHtml(t.desc || '')}</p>
        <div class="badges">
          <div class="badge">Due: ${formatDate(t.due)}</div>
          <div class="badge">Priority: ${t.priority}</div>
          <div class="badge">Progress: ${t.progress || 0}%</div>
        </div>
        <div class="progressbar"><i style="width:${(t.progress || 0)}%"></i></div>
      </div>
      <div class="actions">
        <button data-id="${t.id}" class="complete">${t.completed || t.progress >= 100 ? 'Uncomplete' : 'Complete'}</button>
        <button data-id="${t.id}" class="edit ghost">Edit</button>
        <button data-id="${t.id}" class="delete" style="background:var(--danger)">Delete</button>
      </div>
    `;
    taskList.appendChild(el);
  });

  document.querySelectorAll('.task .complete').forEach(b => b.onclick = () => { toggleComplete(b.dataset.id); });
  document.querySelectorAll('.task .edit').forEach(b => b.onclick = () => { openEdit(b.dataset.id); });
  document.querySelectorAll('.task .delete').forEach(b => b.onclick = () => { if (confirm('Delete this task?')) deleteTask(b.dataset.id); });

  updateDashboard();
}

function escapeHtml(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

function addTask() {
  const title = titleIn.value.trim();
  if (!title) { alert('Please enter a title'); return; }
  const task = { id: uid(), title, desc: descIn.value.trim(), due: dueIn.value || null, priority: priorityIn.value, progress: Number(progressIn.value || 0), created: new Date().toISOString(), completed: false };
  if (task.progress >= 100) task.completed = true;
  tasks.unshift(task); persist(); renderTasks();
  titleIn.value = ''; descIn.value = ''; dueIn.value = ''; priorityIn.value = 'medium'; progressIn.value = 0; progressVal.textContent = '0%';
}

function toggleComplete(id) {
  const t = tasks.find(x => x.id === id); if (!t) return;
  t.completed = !t.completed;
  if (t.completed) t.progress = 100; else if (t.progress >= 100) t.progress = 99;
  persist(); renderTasks();
}

function deleteTask(id) { tasks = tasks.filter(x => x.id !== id); persist(); renderTasks(); }

function openEdit(id) {
  const t = tasks.find(x => x.id === id); if (!t) return;
  editingId = id;
  e_title.value = t.title;
  e_desc.value = t.desc || '';
  e_due.value = t.due || '';
  e_priority.value = t.priority || 'medium';
  e_progress.value = t.progress || 0;
  e_progressVal.textContent = (t.progress || 0) + '%';
  modal.classList.add('show');
}

function saveEditTask() {
  if (!editingId) return;
  const t = tasks.find(x => x.id === editingId); if (!t) return;
  t.title = e_title.value.trim();
  t.desc = e_desc.value.trim();
  t.due = e_due.value || null;
  t.priority = e_priority.value;
  t.progress = Number(e_progress.value || 0);
  t.completed = t.progress >= 100;
  persist(); editingId = null; modal.classList.remove('show'); renderTasks();
}

function clearAll() {
  if (!confirm('Clear ALL tasks? This cannot be undone.')) return;
  tasks = []; persist(); renderTasks();
}

// Events
addBtn.addEventListener('click', addTask);
clearBtn.addEventListener('click', clearAll);
progressIn.addEventListener('input', () => progressVal.textContent = progressIn.value + '%');
e_progress.addEventListener('input', () => e_progressVal.textContent = e_progress.value + '%');
cancelEdit.addEventListener('click', () => { editingId = null; modal.classList.remove('show'); });
saveEdit.addEventListener('click', saveEditTask);
filters.forEach(f => f.addEventListener('click', () => { filters.forEach(x => x.classList.remove('active')); f.classList.add('active'); renderTasks(); }));
searchIn.addEventListener('input', () => renderTasks());

progressArc.setAttribute('stroke-dasharray', '0,100');
renderTasks();

if (tasks.length === 0) {
  tasks.push({ id: uid(), title: 'Welcome — try this demo task', desc: 'Edit me, set progress, mark complete or delete.', due: null, priority: 'medium', progress: 20, created: new Date().toISOString(), completed: false });
  persist(); renderTasks();
}

window.addEventListener('keydown', (e) => { if (e.key === 'Escape') modal.classList.remove('show'); });
