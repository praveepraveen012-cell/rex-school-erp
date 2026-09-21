/**
 * NeverSkip School ERP - Master App Controller & Navigation Router
 */

const App = {
  currentView: 'dashboard',
  currentRole: 'admin',
  currentTheme: 'light',

  init() {
    ERPStorage.init();

    // Initialize all modules
    StudentsModule.init();
    AttendanceModule.init();
    FeesModule.init();
    ExamsModule.init();
    TimetableModule.init();
    CommunicationModule.init();

    // Load saved preferences
    this.currentRole = ERPStorage.getRole() || 'admin';
    const savedTheme = localStorage.getItem(ERPStorage.KEYS.THEME) || 'light';
    this.setTheme(savedTheme);

    this.attachEvents();
    this.applyRole(this.currentRole);
    this.switchView('dashboard');

    console.log("NeverSkip School ERP initialized successfully.");
  },

  attachEvents() {
    // Navigation items
    document.querySelectorAll('.nav-item[data-view]').forEach(item => {
      item.addEventListener('click', (e) => {
        const view = item.getAttribute('data-view');
        if (view) this.switchView(view);
      });
    });

    // Theme Toggle
    const themeBtn = document.getElementById('theme-toggle-btn');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.setTheme(newTheme);
      });
    }

    // Role Switcher Select
    const roleSelect = document.getElementById('role-select-box');
    if (roleSelect) {
      roleSelect.value = this.currentRole;
      roleSelect.addEventListener('change', (e) => {
        this.applyRole(e.target.value);
      });
    }

    // Sidebar Mobile Toggle
    const sidebarToggle = document.getElementById('sidebar-toggle-btn');
    const sidebar = document.querySelector('.sidebar');
    if (sidebarToggle && sidebar) {
      sidebarToggle.addEventListener('click', () => {
        sidebar.classList.toggle('mobile-open');
      });
    }

    // Notification Bell Toggle
    const notifBtn = document.getElementById('notification-bell-btn');
    const notifDrawer = document.getElementById('notification-flyout');
    if (notifBtn && notifDrawer) {
      notifBtn.addEventListener('click', () => {
        notifDrawer.classList.toggle('open');
      });
    }

    // Reset Demo Data
    const resetBtn = document.getElementById('reset-demo-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (confirm("Reset all School ERP data to default demo state?")) {
          ERPStorage.resetAll();
          window.location.reload();
        }
      });
    }

    // Global Search Bar Keyboard Shortcut
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const search = document.getElementById('global-search-input');
        if (search) search.focus();
      }
    });

    // Global Search Input
    const globalSearch = document.getElementById('global-search-input');
    if (globalSearch) {
      globalSearch.addEventListener('input', (e) => {
        const q = e.target.value.toLowerCase().trim();
        if (q.length > 2) {
          // Auto switch to students view if looking up a student
          const students = ERPStorage.getStudents();
          const match = students.some(s => s.name.toLowerCase().includes(q) || s.rollNo.toLowerCase().includes(q));
          if (match && this.currentView !== 'students') {
            this.switchView('students');
            const stuSearch = document.getElementById('student-search-input');
            if (stuSearch) {
              stuSearch.value = q;
              StudentsModule.render();
            }
          }
        }
      });
    }
  },

  setTheme(theme) {
    this.currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(ERPStorage.KEYS.THEME, theme);

    const themeIcon = document.getElementById('theme-icon');
    if (themeIcon) {
      themeIcon.innerHTML = theme === 'dark' ? '☀️' : '🌙';
    }
  },

  applyRole(role) {
    this.currentRole = role;
    ERPStorage.setRole(role);

    const userNameEl = document.getElementById('current-user-name');
    const userRoleEl = document.getElementById('current-user-role');
    const userAvatarEl = document.getElementById('current-user-avatar');

    if (role === 'admin') {
      if (userNameEl) userNameEl.textContent = "Rev. Fr. Principal";
      if (userRoleEl) userRoleEl.textContent = "Principal / Super Admin";
      if (userAvatarEl) userAvatarEl.textContent = "RP";
      this.switchView('dashboard');
    } else if (role === 'teacher') {
      if (userNameEl) userNameEl.textContent = "Mrs. Sunita Rao";
      if (userRoleEl) userRoleEl.textContent = "Grade 10-A Mentor";
      if (userAvatarEl) userAvatarEl.textContent = "SR";
      this.switchView('attendance');
    } else if (role === 'parent') {
      if (userNameEl) userNameEl.textContent = "Rajesh Sharma";
      if (userRoleEl) userRoleEl.textContent = "Parent of Aarav (10-A)";
      if (userAvatarEl) userAvatarEl.textContent = "RS";
      this.switchView('parent-portal');
    }

    this.showToast(`Switched perspective to ${role.toUpperCase()} Mode`, "info");
  },

  switchView(viewId) {
    this.currentView = viewId;

    // Update active nav link
    document.querySelectorAll('.nav-item').forEach(item => {
      if (item.getAttribute('data-view') === viewId) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Close mobile sidebar if open
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) sidebar.classList.remove('mobile-open');

    // Hide all view containers
    document.querySelectorAll('.page-view').forEach(view => {
      view.classList.remove('active-view');
    });

    // Show target view
    const target = document.getElementById(`${viewId}-view`);
    if (target) {
      target.classList.add('active-view');
    }

    // Trigger module renders
    if (viewId === 'dashboard') DashboardModule.render();
    if (viewId === 'students') StudentsModule.render();
    if (viewId === 'attendance') AttendanceModule.render();
    if (viewId === 'fees') FeesModule.render();
    if (viewId === 'exams') ExamsModule.render();
    if (viewId === 'timetable') TimetableModule.render();
    if (viewId === 'communication') CommunicationModule.render();
    if (viewId === 'parent-portal') this.renderParentPortal();

    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  renderParentPortal() {
    const students = ERPStorage.getStudents();
    const aarav = students.find(s => s.id === "STU-1001") || students[0];
    const container = document.getElementById('parent-portal-content');
    if (!container || !aarav) return;

    const due = (aarav.feesTotal || 54000) - (aarav.feesPaid || 0);

    container.innerHTML = `
      <!-- Parent Hero -->
      <div class="parent-portal-hero">
        <div class="parent-student-meta">
          <div class="parent-student-avatar">
            ${aarav.name.charAt(0)}
          </div>
          <div>
            <h2 style="font-size: 1.5rem; font-weight: 800; margin: 0;">Welcome, ${aarav.parentName}</h2>
            <p style="opacity: 0.9; margin: 0.25rem 0 0 0; font-size: 0.9rem;">
              Ward: <b>${aarav.name}</b> • Grade <b>${aarav.grade}-${aarav.section}</b> • Roll No: <b>${aarav.rollNo}</b>
            </p>
            <div style="margin-top: 0.6rem; display: flex; gap: 0.5rem;">
              <span class="badge" style="background: rgba(255,255,255,0.25); color: #fff;">Affiliation: CBSE</span>
              <span class="badge" style="background: rgba(255,255,255,0.25); color: #fff;">Bus: Route 04 (Active)</span>
            </div>
          </div>
        </div>

        <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
          <button class="btn btn-secondary" onclick="ExamsModule.openReportCardModal('${aarav.id}')">
            📄 View Mid-Term Report Card
          </button>
          <button class="btn btn-primary" style="background: #10b981; border-color: #10b981;" onclick="FeesModule.previewReceipt('${aarav.id}')">
            🧾 Download Fee Receipt
          </button>
        </div>
      </div>

      <!-- Quick Metrics for Parent -->
      <div class="dashboard-metrics-grid" style="margin-bottom: 1.75rem;">
        <div class="metric-card metric-success">
          <div class="metric-icon-box">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <div class="metric-info">
            <div class="metric-title">Aarav's Attendance</div>
            <div class="metric-value">${aarav.attendanceRate}%</div>
            <div class="metric-trend trend-up">Present today (Checked in: 07:48 AM)</div>
          </div>
        </div>

        <div class="metric-card metric-primary">
          <div class="metric-icon-box">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <div class="metric-info">
            <div class="metric-title">Fee Clearance</div>
            <div class="metric-value">${due > 0 ? `₹${due.toLocaleString()} Due` : 'All Clear'}</div>
            <div class="metric-trend trend-up">${due === 0 ? 'No pending dues' : 'Pay by 30th Sep'}</div>
          </div>
        </div>

        <div class="metric-card metric-purple">
          <div class="metric-icon-box">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
          </div>
          <div class="metric-info">
            <div class="metric-title">Mid-Term Academic Rank</div>
            <div class="metric-value">Rank #2</div>
            <div class="metric-trend trend-up">Aggregate Score: 92.4% (Grade A1)</div>
          </div>
        </div>
      </div>

      <!-- Live Bus Tracking & Daily Homework Widgets -->
      <div style="display: grid; grid-template-columns: 1.5fr 1fr; gap: 1.5rem; margin-bottom: 1.75rem;">
        <!-- Live School Bus Tracking Card -->
        <div class="card">
          <div class="card-header">
            <div>
              <h4 class="card-title">🚌 Live School Bus GPS Tracker</h4>
              <p class="card-subtitle">Bus No. TN-43-A-2104 • Route 02 (Coonoor - Charing Cross - Rex SSS)</p>
            </div>
            <span class="badge badge-present"><span class="badge-dot"></span> On Transit</span>
          </div>
          <div class="card-body">
            <div style="height: 180px; background: #e2e8f0; border-radius: var(--radius-sm); position: relative; overflow: hidden; display: flex; align-items: center; justify-content: center; background-image: radial-gradient(#cbd5e1 2px, transparent 2px); background-size: 20px 20px;">
              <div style="position: absolute; width: 80%; height: 3px; background: #3b82f6;"></div>
              <!-- Stops -->
              <div style="position: absolute; left: 20%; top: calc(50% - 14px); text-align: center;">
                <div style="width: 28px; height: 28px; border-radius: 50%; background: #10b981; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: bold; margin: auto;">✓</div>
                <div style="font-size: 0.7rem; font-weight: bold; color: var(--text-primary); margin-top: 4px;">Coonoor Stand</div>
              </div>
              <div style="position: absolute; left: 55%; top: calc(50% - 14px); text-align: center;">
                <div style="width: 28px; height: 28px; border-radius: 50%; background: #2563eb; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: bold; margin: auto; animation: pulse 1.5s infinite;">🚌</div>
                <div style="font-size: 0.7rem; font-weight: bold; color: var(--primary); margin-top: 4px;">Near Charing Cross</div>
              </div>
              <div style="position: absolute; left: 85%; top: calc(50% - 14px); text-align: center;">
                <div style="width: 28px; height: 28px; border-radius: 50%; background: #fff; border: 2px solid #2563eb; color: #2563eb; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: bold; margin: auto;">🏫</div>
                <div style="font-size: 0.7rem; font-weight: bold; color: var(--text-primary); margin-top: 4px;">Rex School Gate</div>
              </div>
            </div>
            <div style="display: flex; justify-content: space-between; margin-top: 1rem; font-size: 0.82rem;">
              <span>Driver: <b>Joseph Selvaraj (+91 94432 10045)</b></span>
              <span>Estimated Arrival at Gate: <b>08:15 AM</b></span>
            </div>
          </div>
        </div>

        <!-- Today's Homework / Diary -->
        <div class="card">
          <div class="card-header">
            <h4 class="card-title">📖 Daily Digital Diary</h4>
            <span style="font-size: 0.75rem; color: var(--text-muted);">21 Sep 2026</span>
          </div>
          <div class="card-body" style="display: flex; flex-direction: column; gap: 0.75rem;">
            <div style="padding: 0.75rem; background: var(--bg-subtle); border-radius: var(--radius-sm); border-left: 3px solid #2563eb;">
              <div style="font-weight: 700; font-size: 0.85rem; color: var(--text-primary);">Mathematics</div>
              <p style="font-size: 0.78rem; color: var(--text-secondary); margin: 0.2rem 0 0 0;">Exercise 4.2: Quadratic Equations (Q3 to Q10) in class notebook.</p>
            </div>
            <div style="padding: 0.75rem; background: var(--bg-subtle); border-radius: var(--radius-sm); border-left: 3px solid #10b981;">
              <div style="font-weight: 700; font-size: 0.85rem; color: var(--text-primary);">Science (Physics)</div>
              <p style="font-size: 0.78rem; color: var(--text-secondary); margin: 0.2rem 0 0 0;">Complete refraction ray diagrams for concave lenses.</p>
            </div>
            <div style="padding: 0.75rem; background: var(--bg-subtle); border-radius: var(--radius-sm); border-left: 3px solid #9333ea;">
              <div style="font-weight: 700; font-size: 0.85rem; color: var(--text-primary);">English Language</div>
              <p style="font-size: 0.78rem; color: var(--text-secondary); margin: 0.2rem 0 0 0;">Draft formal letter to the editor regarding rainwater harvesting.</p>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  showToast(message, type = 'info', duration = 3500) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'warning') icon = '⚠️';
    if (type === 'danger') icon = '❌';

    toast.innerHTML = `
      <div class="toast-icon" style="font-size: 1.1rem;">${icon}</div>
      <div class="toast-content">
        <div class="toast-title">${type.toUpperCase()}</div>
        <div class="toast-desc">${message}</div>
      </div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }
};

window.addEventListener('DOMContentLoaded', () => {
  App.init();
});
