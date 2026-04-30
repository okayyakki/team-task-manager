// ===== CONFIG =====
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5000/api'
  : 'https://team-task-manager-production-207c.up.railway.app/api';

// ===== STATE =====
let currentUser = null;
let currentToken = null;
let currentProjectId = null;
let currentProjectRole = null;
let currentProjectMembers = [];
let allProjectTasks = [];

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');
  if (token && user) {
    currentToken = token;
    currentUser = JSON.parse(user);
    showApp();
  } else {
    showAuth();
  }
});

// ===== API HELPER =====
async function api(endpoint, method = 'GET', body = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  if (currentToken) opts.headers['Authorization'] = `Bearer ${currentToken}`;
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${API_BASE}${endpoint}`, opts);
  const data = await res.json();

  if (!res.ok) {
    const msg = data.errors ? data.errors[0].msg : data.message || 'Something went wrong';
    throw new Error(msg);
  }
  return data;
}

// ===== AUTH FUNCTIONS =====
function showAuth() {
  document.getElementById('auth-section').classList.remove('hidden');
  document.getElementById('app-section').classList.add('hidden');
}

function showApp() {
  document.getElementById('auth-section').classList.add('hidden');
  document.getElementById('app-section').classList.remove('hidden');
  updateSidebarUser();
  showPage('dashboard');
}

function switchTab(tab) {
  document.getElementById('login-form').classList.toggle('hidden', tab !== 'login');
  document.getElementById('signup-form').classList.toggle('hidden', tab !== 'signup');
  document.getElementById('tab-login').classList.toggle('active', tab === 'login');
  document.getElementById('tab-signup').classList.toggle('active', tab === 'signup');
}

async function handleLogin(e) {
  e.preventDefault();
  const btn = document.getElementById('login-btn');
  const errEl = document.getElementById('login-error');
  errEl.classList.add('hidden');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Logging in...';

  try {
    const data = await api('/auth/login', 'POST', {
      email: document.getElementById('login-email').value,
      password: document.getElementById('login-password').value
    });
    currentToken = data.token;
    currentUser = data.user;
    localStorage.setItem('token', currentToken);
    localStorage.setItem('user', JSON.stringify(currentUser));
    showApp();
    showToast('Welcome back, ' + currentUser.name + '!', 'success');
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.remove('hidden');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span>Login</span>';
  }
}

async function handleSignup(e) {
  e.preventDefault();
  const btn = document.getElementById('signup-btn');
  const errEl = document.getElementById('signup-error');
  errEl.classList.add('hidden');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Creating account...';

  try {
    const data = await api('/auth/signup', 'POST', {
      name: document.getElementById('signup-name').value,
      email: document.getElementById('signup-email').value,
      password: document.getElementById('signup-password').value
    });
    currentToken = data.token;
    currentUser = data.user;
    localStorage.setItem('token', currentToken);
    localStorage.setItem('user', JSON.stringify(currentUser));
    showApp();
    showToast('Account created! Welcome, ' + currentUser.name + '!', 'success');
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.remove('hidden');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span>Create Account</span>';
  }
}

function handleLogout() {
  currentToken = null;
  currentUser = null;
  currentProjectId = null;
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  showAuth();
  showToast('Logged out successfully');
}

function updateSidebarUser() {
  if (!currentUser) return;
  document.getElementById('sidebar-name').textContent = currentUser.name;
  document.getElementById('sidebar-email').textContent = currentUser.email;
  document.getElementById('sidebar-avatar').textContent = currentUser.name.charAt(0).toUpperCase();
}

// ===== NAVIGATION =====
function showPage(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  document.getElementById('page-' + page).classList.add('active');
  const navEl = document.getElementById('nav-' + page);
  if (navEl) navEl.classList.add('active');

  const titles = { dashboard: 'Dashboard', projects: 'Projects', tasks: 'My Tasks' };
  document.getElementById('page-title').textContent = titles[page] || page;

  // Set topbar actions
  const actions = document.getElementById('topbar-actions');
  actions.innerHTML = '';
  if (page === 'projects') {
    actions.innerHTML = `<button class="btn btn-primary btn-sm" onclick="openModal('create-project-modal')">+ New Project</button>`;
  }

  // Load data
  if (page === 'dashboard') loadDashboard();
  if (page === 'projects') loadProjects();
  if (page === 'tasks') loadMyTasks();

  // Close sidebar on mobile
  if (window.innerWidth <= 768) {
    document.getElementById('sidebar').classList.remove('open');
  }
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

// ===== DASHBOARD =====
async function loadDashboard() {
  try {
    const data = await api('/dashboard');
    const s = data.stats;

    document.getElementById('stat-projects').textContent = s.totalProjects;
    document.getElementById('stat-total').textContent = s.totalTasks;
    document.getElementById('stat-inprogress').textContent = s.tasksByStatus['In Progress'];
    document.getElementById('stat-overdue').textContent = s.overdueTasks;

    // Status bars
    const total = s.totalTasks || 1;
    document.getElementById('bar-todo').textContent = s.tasksByStatus['To Do'];
    document.getElementById('bar-inprogress').textContent = s.tasksByStatus['In Progress'];
    document.getElementById('bar-done').textContent = s.tasksByStatus['Done'];
    document.getElementById('fill-todo').style.width = (s.tasksByStatus['To Do'] / total * 100) + '%';
    document.getElementById('fill-inprogress').style.width = (s.tasksByStatus['In Progress'] / total * 100) + '%';
    document.getElementById('fill-done').style.width = (s.tasksByStatus['Done'] / total * 100) + '%';

    // Overdue tasks
    const overdueEl = document.getElementById('overdue-list');
    if (s.overdueTasksList && s.overdueTasksList.length > 0) {
      overdueEl.innerHTML = s.overdueTasksList.map(t => `
        <div class="task-mini-item">
          <span class="task-mini-title">${escHtml(t.title)}</span>
          <span class="task-mini-due">${formatDate(t.dueDate)}</span>
          <span class="priority-badge priority-${t.priority.toLowerCase()}">${t.priority}</span>
        </div>
      `).join('');
    } else {
      overdueEl.innerHTML = '<p class="empty-state">No overdue tasks 🎉</p>';
    }

    // Recent tasks
    const recentEl = document.getElementById('recent-tasks-list');
    if (s.recentTasks && s.recentTasks.length > 0) {
      recentEl.innerHTML = s.recentTasks.map(t => `
        <div class="task-mini-item">
          <span class="task-mini-title">${escHtml(t.title)}</span>
          <span class="priority-badge priority-${t.priority.toLowerCase()}">${t.priority}</span>
          <span class="status-badge">${getStatusDot(t.status)}</span>
        </div>
      `).join('');
    } else {
      recentEl.innerHTML = '<p class="empty-state">No tasks yet</p>';
    }

    // Tasks per user
    const userEl = document.getElementById('tasks-per-user');
    if (s.tasksPerUser && s.tasksPerUser.length > 0) {
      userEl.innerHTML = s.tasksPerUser.map(u => `
        <div class="user-task-item">
          <span class="user-task-name">${escHtml(u.name)}</span>
          <span class="user-task-count">${u.count} task${u.count !== 1 ? 's' : ''}</span>
        </div>
      `).join('');
    } else {
      userEl.innerHTML = '<p class="empty-state">No data available</p>';
    }
  } catch (err) {
    showToast('Failed to load dashboard: ' + err.message, 'error');
  }
}

// ===== PROJECTS =====
async function loadProjects() {
  showProjectsList();
  const grid = document.getElementById('projects-grid');
  grid.innerHTML = `
    <div class="project-card new-project-card" onclick="openModal('create-project-modal')">
      <div class="new-project-icon">+</div>
      <div class="new-project-text">New Project</div>
    </div>
    <div class="loading"><div class="spinner"></div> Loading projects...</div>
  `;

  try {
    const data = await api('/projects');
    grid.innerHTML = `
      <div class="project-card new-project-card" onclick="openModal('create-project-modal')">
        <div class="new-project-icon">+</div>
        <div class="new-project-text">New Project</div>
      </div>
    `;

    if (data.projects.length === 0) {
      grid.innerHTML += '<p class="empty-state" style="grid-column:1/-1;padding:40px">No projects yet. Create your first project!</p>';
      return;
    }

    data.projects.forEach(p => {
      const card = document.createElement('div');
      card.className = 'project-card';
      card.onclick = () => openProjectDetail(p._id);
      card.innerHTML = `
        <div class="project-card-name">${escHtml(p.name)}</div>
        <div class="project-card-desc">${escHtml(p.description || 'No description')}</div>
        <div class="project-card-meta">
          <span class="project-card-members">👥 ${p.members.length} member${p.members.length !== 1 ? 's' : ''}</span>
          <span class="role-badge role-${p.myRole.toLowerCase()}">${p.myRole}</span>
        </div>
      `;
      grid.appendChild(card);
    });
  } catch (err) {
    showToast('Failed to load projects: ' + err.message, 'error');
  }
}

function showProjectsList() {
  document.getElementById('projects-list-view').classList.remove('hidden');
  document.getElementById('project-detail-view').classList.add('hidden');
  document.getElementById('page-title').textContent = 'Projects';
  const actions = document.getElementById('topbar-actions');
  actions.innerHTML = `<button class="btn btn-primary btn-sm" onclick="openModal('create-project-modal')">+ New Project</button>`;
}

async function openProjectDetail(projectId) {
  currentProjectId = projectId;
  document.getElementById('projects-list-view').classList.add('hidden');
  document.getElementById('project-detail-view').classList.remove('hidden');

  try {
    const data = await api(`/projects/${projectId}`);
    const p = data.project;
    currentProjectRole = p.myRole;
    currentProjectMembers = p.members;

    document.getElementById('detail-project-name').textContent = p.name;
    document.getElementById('detail-project-desc').textContent = p.description || '';
    document.getElementById('page-title').textContent = p.name;

    // Actions for admin
    const actionsEl = document.getElementById('project-detail-actions');
    if (p.myRole === 'Admin') {
      actionsEl.innerHTML = `
        <button class="btn btn-ghost btn-sm" onclick="openModal('add-member-modal')">+ Add Member</button>
        <button class="btn btn-primary btn-sm" onclick="openCreateTaskModal()">+ Add Task</button>
        <button class="btn btn-danger btn-sm" onclick="deleteProject('${p._id}')">Delete</button>
      `;
    } else {
      actionsEl.innerHTML = '';
    }

    // Update topbar
    document.getElementById('topbar-actions').innerHTML = '';

    // Load tasks and members
    loadProjectTasks();
    renderMembers(p.members, p.myRole);
    switchProjectTab('ptab-tasks');
  } catch (err) {
    showToast('Failed to load project: ' + err.message, 'error');
    showProjectsList();
  }
}

function switchProjectTab(tab) {
  document.querySelectorAll('.ptab-content').forEach(c => c.classList.remove('active'));
  document.querySelectorAll('.ptab').forEach(b => b.classList.remove('active'));
  document.getElementById(tab).classList.add('active');
  document.getElementById(tab + '-btn').classList.add('active');
}

async function loadProjectTasks() {
  const statusFilter = document.getElementById('filter-status').value;
  const priorityFilter = document.getElementById('filter-priority').value;

  let endpoint = `/tasks/project/${currentProjectId}`;
  const params = [];
  if (statusFilter) params.push(`status=${encodeURIComponent(statusFilter)}`);
  if (priorityFilter) params.push(`priority=${encodeURIComponent(priorityFilter)}`);
  if (params.length) endpoint += '?' + params.join('&');

  try {
    const data = await api(endpoint);
    allProjectTasks = data.tasks;
    renderTaskBoard(data.tasks);
  } catch (err) {
    showToast('Failed to load tasks: ' + err.message, 'error');
  }
}

function filterTasks() {
  loadProjectTasks();
}

function renderTaskBoard(tasks) {
  const cols = { 'To Do': [], 'In Progress': [], 'Done': [] };
  tasks.forEach(t => {
    if (cols[t.status]) cols[t.status].push(t);
  });

  const colIds = { 'To Do': 'col-todo', 'In Progress': 'col-inprogress', 'Done': 'col-done' };
  const countIds = { 'To Do': 'col-todo-count', 'In Progress': 'col-inprogress-count', 'Done': 'col-done-count' };

  Object.keys(cols).forEach(status => {
    const el = document.getElementById(colIds[status]);
    const countEl = document.getElementById(countIds[status]);
    countEl.textContent = cols[status].length;

    if (cols[status].length === 0) {
      el.innerHTML = '<p class="empty-state" style="font-size:12px">No tasks</p>';
      return;
    }

    el.innerHTML = cols[status].map(t => renderTaskCard(t)).join('');
  });
}

function renderTaskCard(t) {
  const isOverdue = t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'Done';
  const assigneeName = t.assignedTo ? t.assignedTo.name : 'Unassigned';
  const dueStr = t.dueDate ? `<span class="task-due ${isOverdue ? 'overdue' : ''}">📅 ${formatDate(t.dueDate)}${isOverdue ? ' ⚠' : ''}</span>` : '';

  const canEdit = currentProjectRole === 'Admin' ||
    (t.assignedTo && t.assignedTo._id === currentUser._id);

  return `
    <div class="task-card" onclick="openEditTaskModal('${t._id}')">
      <div class="task-card-title">${escHtml(t.title)}</div>
      ${t.description ? `<div class="task-card-desc">${escHtml(t.description.substring(0, 80))}${t.description.length > 80 ? '...' : ''}</div>` : ''}
      <div class="task-card-meta">
        <span class="priority-badge priority-${t.priority.toLowerCase()}">${t.priority}</span>
        ${dueStr}
        <span class="task-assignee">👤 ${escHtml(assigneeName)}</span>
      </div>
      ${currentProjectRole === 'Admin' ? `
        <div class="task-card-actions" onclick="event.stopPropagation()">
          <button class="btn btn-ghost btn-sm btn-icon" onclick="openEditTaskModal('${t._id}')" title="Edit">✏</button>
          <button class="btn btn-danger btn-sm btn-icon" onclick="deleteTask('${t._id}')" title="Delete">🗑</button>
        </div>
      ` : ''}
    </div>
  `;
}

async function handleCreateProject(e) {
  e.preventDefault();
  const btn = document.getElementById('create-project-btn');
  const errEl = document.getElementById('create-project-error');
  errEl.classList.add('hidden');
  btn.disabled = true;
  btn.textContent = 'Creating...';

  try {
    await api('/projects', 'POST', {
      name: document.getElementById('new-project-name').value,
      description: document.getElementById('new-project-desc').value
    });
    closeModal('create-project-modal');
    document.getElementById('new-project-name').value = '';
    document.getElementById('new-project-desc').value = '';
    showToast('Project created!', 'success');
    loadProjects();
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.remove('hidden');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Create Project';
  }
}

async function deleteProject(projectId) {
  if (!confirm('Delete this project and all its tasks? This cannot be undone.')) return;
  try {
    await api(`/projects/${projectId}`, 'DELETE');
    showToast('Project deleted', 'success');
    showProjectsList();
    loadProjects();
  } catch (err) {
    showToast('Failed to delete: ' + err.message, 'error');
  }
}

// ===== TASKS =====
function openCreateTaskModal() {
  // Populate assign dropdown with project members
  const select = document.getElementById('new-task-assign');
  select.innerHTML = '<option value="">Unassigned</option>';
  currentProjectMembers.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.user._id;
    opt.textContent = m.user.name + (m.user._id === currentUser._id ? ' (You)' : '');
    select.appendChild(opt);
  });
  openModal('create-task-modal');
}

async function handleCreateTask(e) {
  e.preventDefault();
  const btn = document.getElementById('create-task-btn');
  const errEl = document.getElementById('create-task-error');
  errEl.classList.add('hidden');
  btn.disabled = true;
  btn.textContent = 'Creating...';

  const dueVal = document.getElementById('new-task-due').value;
  const assignVal = document.getElementById('new-task-assign').value;

  try {
    await api('/tasks', 'POST', {
      title: document.getElementById('new-task-title').value,
      description: document.getElementById('new-task-desc').value,
      project: currentProjectId,
      priority: document.getElementById('new-task-priority').value,
      status: document.getElementById('new-task-status').value,
      dueDate: dueVal || undefined,
      assignedTo: assignVal || undefined
    });
    closeModal('create-task-modal');
    // Reset form
    ['new-task-title', 'new-task-desc', 'new-task-due'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('new-task-priority').value = 'Medium';
    document.getElementById('new-task-status').value = 'To Do';
    document.getElementById('new-task-assign').value = '';
    showToast('Task created!', 'success');
    loadProjectTasks();
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.remove('hidden');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Create Task';
  }
}

async function openEditTaskModal(taskId) {
  try {
    const data = await api(`/tasks/${taskId}`);
    const t = data.task;
    const role = data.userRole;

    document.getElementById('edit-task-id').value = t._id;
    document.getElementById('edit-task-title').value = t.title;
    document.getElementById('edit-task-desc').value = t.description || '';
    document.getElementById('edit-task-status').value = t.status;
    document.getElementById('edit-task-priority').value = t.priority;
    document.getElementById('edit-task-due').value = t.dueDate ? t.dueDate.split('T')[0] : '';

    // Show/hide admin fields
    const adminRow = document.getElementById('edit-admin-row');
    const titleGroup = document.getElementById('edit-title-group');
    const descGroup = document.getElementById('edit-desc-group');
    const dueGroup = document.getElementById('edit-due-group');

    if (role === 'Admin') {
      adminRow.classList.remove('hidden');
      titleGroup.classList.remove('hidden');
      descGroup.classList.remove('hidden');
      dueGroup.classList.remove('hidden');

      // Populate assign dropdown
      const select = document.getElementById('edit-task-assign');
      select.innerHTML = '<option value="">Unassigned</option>';
      currentProjectMembers.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.user._id;
        opt.textContent = m.user.name;
        if (t.assignedTo && t.assignedTo._id === m.user._id) opt.selected = true;
        select.appendChild(opt);
      });
    } else {
      adminRow.classList.add('hidden');
      titleGroup.classList.add('hidden');
      descGroup.classList.add('hidden');
      dueGroup.classList.add('hidden');
    }

    openModal('edit-task-modal');
  } catch (err) {
    showToast('Failed to load task: ' + err.message, 'error');
  }
}

async function handleEditTask(e) {
  e.preventDefault();
  const taskId = document.getElementById('edit-task-id').value;
  const errEl = document.getElementById('edit-task-error');
  errEl.classList.add('hidden');

  const body = { status: document.getElementById('edit-task-status').value };

  if (currentProjectRole === 'Admin') {
    body.title = document.getElementById('edit-task-title').value;
    body.description = document.getElementById('edit-task-desc').value;
    body.priority = document.getElementById('edit-task-priority').value;
    const due = document.getElementById('edit-task-due').value;
    if (due) body.dueDate = due;
    const assign = document.getElementById('edit-task-assign').value;
    body.assignedTo = assign || null;
  }

  try {
    await api(`/tasks/${taskId}`, 'PUT', body);
    closeModal('edit-task-modal');
    showToast('Task updated!', 'success');
    loadProjectTasks();
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.remove('hidden');
  }
}

async function deleteTask(taskId) {
  if (!confirm('Delete this task?')) return;
  try {
    await api(`/tasks/${taskId}`, 'DELETE');
    showToast('Task deleted', 'success');
    loadProjectTasks();
  } catch (err) {
    showToast('Failed to delete task: ' + err.message, 'error');
  }
}

// ===== MY TASKS =====
async function loadMyTasks() {
  const listEl = document.getElementById('my-tasks-list');
  listEl.innerHTML = '<div class="loading"><div class="spinner"></div> Loading tasks...</div>';

  try {
    // Get all projects user is in
    const projData = await api('/projects');
    const projects = projData.projects;

    if (projects.length === 0) {
      listEl.innerHTML = '<p class="empty-state">You are not in any projects yet.</p>';
      return;
    }

    const statusFilter = document.getElementById('my-task-status').value;
    const priorityFilter = document.getElementById('my-task-priority').value;

    // Collect tasks from all projects assigned to current user
    let allTasks = [];
    for (const p of projects) {
      try {
        let endpoint = `/tasks/project/${p._id}?assignedTo=${currentUser._id}`;
        if (statusFilter) endpoint += `&status=${encodeURIComponent(statusFilter)}`;
        if (priorityFilter) endpoint += `&priority=${encodeURIComponent(priorityFilter)}`;
        const taskData = await api(endpoint);
        taskData.tasks.forEach(t => {
          t._projectName = p.name;
          t._projectId = p._id;
          t._myRole = p.myRole;
        });
        allTasks = allTasks.concat(taskData.tasks);
      } catch (e) { /* skip */ }
    }

    if (allTasks.length === 0) {
      listEl.innerHTML = '<p class="empty-state">No tasks assigned to you.</p>';
      return;
    }

    const now = new Date();
    listEl.innerHTML = allTasks.map(t => {
      const isOverdue = t.dueDate && new Date(t.dueDate) < now && t.status !== 'Done';
      const statusColors = { 'To Do': '#94a3b8', 'In Progress': '#3b82f6', 'Done': '#10b981' };
      return `
        <div class="my-task-item">
          <div class="my-task-status-dot" style="background:${statusColors[t.status]}"></div>
          <div class="my-task-info">
            <div class="my-task-title">${escHtml(t.title)}</div>
            <div class="my-task-meta">
              <span class="my-task-project">📁 ${escHtml(t._projectName)}</span>
              <span class="priority-badge priority-${t.priority.toLowerCase()}">${t.priority}</span>
              ${t.dueDate ? `<span class="task-due ${isOverdue ? 'overdue' : ''}">📅 ${formatDate(t.dueDate)}</span>` : ''}
            </div>
          </div>
          <div class="my-task-actions">
            <select class="filter-select" onchange="quickUpdateStatus('${t._id}', this.value, '${t._projectId}')" title="Update status">
              <option value="To Do" ${t.status === 'To Do' ? 'selected' : ''}>To Do</option>
              <option value="In Progress" ${t.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
              <option value="Done" ${t.status === 'Done' ? 'selected' : ''}>Done</option>
            </select>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    listEl.innerHTML = `<p class="empty-state">Failed to load tasks: ${err.message}</p>`;
  }
}

async function quickUpdateStatus(taskId, status, projectId) {
  try {
    await api(`/tasks/${taskId}`, 'PUT', { status });
    showToast('Status updated!', 'success');
  } catch (err) {
    showToast('Failed to update: ' + err.message, 'error');
    loadMyTasks();
  }
}

// ===== MEMBERS =====
function renderMembers(members, myRole) {
  const el = document.getElementById('members-list');
  if (!members || members.length === 0) {
    el.innerHTML = '<p class="empty-state">No members</p>';
    return;
  }

  el.innerHTML = members.map(m => {
    const isMe = m.user._id === currentUser._id;
    const isCreator = m.role === 'Admin';
    return `
      <div class="member-item">
        <div class="member-avatar">${m.user.name.charAt(0).toUpperCase()}</div>
        <div class="member-info">
          <div class="member-name">${escHtml(m.user.name)} ${isMe ? '<span style="color:var(--text-muted);font-size:11px">(You)</span>' : ''}</div>
          <div class="member-email">${escHtml(m.user.email)}</div>
        </div>
        <div class="member-actions">
          <span class="role-badge role-${m.role.toLowerCase()}">${m.role}</span>
          ${myRole === 'Admin' && !isMe ? `
            <button class="btn btn-ghost btn-sm" onclick="toggleMemberRole('${m.user._id}', '${m.role}')" title="Toggle role">
              ${m.role === 'Admin' ? '→ Member' : '→ Admin'}
            </button>
            <button class="btn btn-danger btn-sm" onclick="removeMember('${m.user._id}')">Remove</button>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');
}

async function handleAddMember(e) {
  e.preventDefault();
  const errEl = document.getElementById('add-member-error');
  errEl.classList.add('hidden');

  try {
    await api(`/projects/${currentProjectId}/members`, 'POST', {
      email: document.getElementById('member-email').value,
      role: document.getElementById('member-role').value
    });
    closeModal('add-member-modal');
    document.getElementById('member-email').value = '';
    showToast('Member added!', 'success');
    // Reload project detail
    openProjectDetail(currentProjectId);
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.remove('hidden');
  }
}

async function removeMember(userId) {
  if (!confirm('Remove this member from the project?')) return;
  try {
    await api(`/projects/${currentProjectId}/members/${userId}`, 'DELETE');
    showToast('Member removed', 'success');
    openProjectDetail(currentProjectId);
  } catch (err) {
    showToast('Failed to remove: ' + err.message, 'error');
  }
}

async function toggleMemberRole(userId, currentRole) {
  const newRole = currentRole === 'Admin' ? 'Member' : 'Admin';
  try {
    await api(`/projects/${currentProjectId}/members/${userId}/role`, 'PUT', { role: newRole });
    showToast(`Role changed to ${newRole}`, 'success');
    openProjectDetail(currentProjectId);
  } catch (err) {
    showToast('Failed to update role: ' + err.message, 'error');
  }
}

// ===== MODALS =====
function openModal(id) {
  document.getElementById(id).classList.remove('hidden');
}

function closeModal(id) {
  document.getElementById(id).classList.add('hidden');
  // Clear errors
  const errEl = document.getElementById(id.replace('-modal', '-error'));
  if (errEl) errEl.classList.add('hidden');
}

function closeModalOutside(e, id) {
  if (e.target === e.currentTarget) closeModal(id);
}

// ===== TOAST =====
let toastTimer = null;
function showToast(msg, type = '') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast' + (type ? ' ' + type : '');
  el.classList.remove('hidden');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), 3000);
}

// ===== HELPERS =====
function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getStatusDot(status) {
  const colors = { 'To Do': '#94a3b8', 'In Progress': '#3b82f6', 'Done': '#10b981' };
  return `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${colors[status] || '#ccc'}"></span>`;
}

// Close sidebar when clicking outside on mobile
document.addEventListener('click', (e) => {
  const sidebar = document.getElementById('sidebar');
  const menuBtn = document.querySelector('.menu-btn');
  if (window.innerWidth <= 768 && sidebar && sidebar.classList.contains('open')) {
    if (!sidebar.contains(e.target) && e.target !== menuBtn) {
      sidebar.classList.remove('open');
    }
  }
});
