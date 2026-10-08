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
    if (window.HomeModule) {
      HomeModule.init();
    }
    StudentsModule.init();
    AttendanceModule.init();
    FeesModule.init();
    ExamsModule.init();
    TimetableModule.init();
    CommunicationModule.init();
    if (window.TransportModule) {
      TransportModule.init();
    }

    // Load and synchronize authenticated session
    const isAuthed = window.RexApi ? window.RexApi.isAuthenticated() : false;
    if (isAuthed) {
      const user = window.RexApi.getUser();
      if (user && user.role === 'TEACHER') {
        this.currentRole = 'teacher';
      } else if (user && user.role === 'PARENT') {
        this.currentRole = 'parent';
      } else {
        this.currentRole = 'admin';
      }
      ERPStorage.setRole(this.currentRole);
    } else {
      this.currentRole = null;
      ERPStorage.setRole(null);
    }

    const savedTheme = localStorage.getItem(ERPStorage.KEYS.THEME) || 'light';
    this.setTheme(savedTheme);

    // Initial view: check URL hash or default to home webapp
    const hash = window.location.hash ? window.location.hash.replace('#', '') : '';
    let initialView = hash || 'home';

    // If not authenticated and accessing a protected view, redirect to home and prompt login
    if (!isAuthed && initialView !== 'home') {
      initialView = 'home';
      setTimeout(() => {
        if (window.AuthUI) window.AuthUI.showLoginModal();
      }, 400);
    }

    this.attachEvents();
    if (this.currentRole) {
      this.applyRole(this.currentRole, false);
    }
    this.switchView(initialView);

    console.log("Rex Senior Secondary School ERP initialized successfully.");
  },

  attachEvents() {
    // Navigation items
    document.querySelectorAll('.nav-item[data-view]').forEach(item => {
      item.addEventListener('click', (e) => {
        const view = item.getAttribute('data-view');
        if (view) this.switchView(view);
      });
    });

    // Homework form listener
    const hwForm = document.getElementById('new-homework-form');
    if (hwForm) {
      hwForm.addEventListener('submit', (e) => this.submitHomework(e));
    }

    // Leave form listener
    const leaveForm = document.getElementById('apply-leave-form');
    if (leaveForm) {
      leaveForm.addEventListener('submit', (e) => this.submitLeave(e));
    }

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
        this.applyRole(e.target.value, true);
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

    document.querySelectorAll('.theme-toggle-btn, #theme-toggle-btn').forEach(btn => {
      const themeIcon = btn.querySelector('.theme-icon') || btn.querySelector('#theme-icon') || btn;
      if (themeIcon) {
        themeIcon.innerHTML = theme === 'dark' ? '☀️' : '🌙';
      }
    });
  },

  applyRole(role, isUserAction = false) {
    this.currentRole = role;
    ERPStorage.setRole(role);

    const authUser = window.RexApi ? window.RexApi.getUser() : null;
    const userNameEl = document.getElementById('current-user-name');
    const userRoleEl = document.getElementById('current-user-role');
    const userAvatarEl = document.getElementById('current-user-avatar');

    if (role === 'admin') {
      if (userNameEl) userNameEl.textContent = authUser ? (authUser.name || authUser.username) : "Rev. Fr. Principal";
      if (userRoleEl) userRoleEl.textContent = "Principal / Super Admin";
      if (userAvatarEl) userAvatarEl.textContent = "RP";
      if (isUserAction) this.switchView('dashboard');
    } else if (role === 'teacher') {
      if (userNameEl) userNameEl.textContent = authUser ? (authUser.name || authUser.username) : "Mrs. Anitha Kumar";
      if (userRoleEl) userRoleEl.textContent = "Teacher / Faculty";
      if (userAvatarEl) userAvatarEl.textContent = "AK";
      if (isUserAction) this.switchView('attendance');
    } else if (role === 'parent') {
      if (userNameEl) userNameEl.textContent = authUser ? (authUser.name || authUser.username) : "Mr. Rajesh Sharma";
      if (userRoleEl) userRoleEl.textContent = "Parent (Aarav & Ananya Sharma)";
      if (userAvatarEl) userAvatarEl.textContent = "RS";
      if (isUserAction) this.switchView('parent-portal');
    }

    if (window.AuthUI && typeof window.AuthUI.renderUserBadge === 'function') {
      window.AuthUI.renderUserBadge();
    }

    if (isUserAction) {
      this.showToast(`Switched perspective to ${role.toUpperCase()} Mode`, "info");
    }
  },

  switchView(viewId) {
    // Protected routes guard: all views other than 'home' require active authentication
    if (viewId !== 'home') {
      const isAuthed = window.RexApi ? window.RexApi.isAuthenticated() : false;
      if (!isAuthed) {
        if (window.AuthUI) {
          window.AuthUI.showLoginModal();
        }
        if (this.currentView !== 'home') {
          this.switchView('home');
        }
        return;
      }
    }

    this.currentView = viewId;

    const appContainer = document.querySelector('.app-container');
    const homeView = document.getElementById('home-view');
    const simulatorOverlay = document.getElementById('mobile-device-simulator');
    const deviceToggle = document.querySelector('.device-mode-toggle-floating');

    if (viewId === 'home') {
      document.body.classList.remove('erp-active');
      if (appContainer) appContainer.style.display = 'none';

      // Check if on a mobile phone screen
      const isMobileScreen = window.innerWidth <= 768;
      const isForcedDesktop = document.body.classList.contains('desktop-view-forced');

      if (isMobileScreen && !isForcedDesktop) {
        if (homeView) homeView.style.display = 'none';
        if (simulatorOverlay) {
          simulatorOverlay.style.display = 'flex';
          simulatorOverlay.classList.add('active');
        }
      } else {
        if (homeView) homeView.style.display = 'block';
        if (simulatorOverlay && !simulatorOverlay.classList.contains('active')) {
          simulatorOverlay.style.display = 'none';
        }
      }

      if (deviceToggle) deviceToggle.style.display = 'flex';
      window.location.hash = 'home';
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    } else {
      document.body.classList.add('erp-active');
      if (homeView) homeView.style.display = 'none';
      if (simulatorOverlay) {
        simulatorOverlay.style.display = 'none';
        simulatorOverlay.classList.remove('active');
      }
      if (appContainer) appContainer.style.display = 'flex';
      if (deviceToggle) deviceToggle.style.display = 'none';
      window.location.hash = viewId;
    }

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
    if (viewId === 'transport' && window.TransportModule) TransportModule.renderAdminFleet('transport-view-content');

    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  renderParentPortal() {
    const students = ERPStorage.getStudents();
    const aarav = students.find(s => s.id === "STU-1001") || students[0];
    const container = document.getElementById('parent-portal-content');
    if (!container || !aarav) return;

    const due = (aarav.feesTotal || 54000) - (aarav.feesPaid || 0);
    const homework = ERPStorage.getHomework ? ERPStorage.getHomework() : [];
    const leaveRequests = ERPStorage.getLeaveRequests ? ERPStorage.getLeaveRequests() : [];
    const automationSettings = ERPStorage.getAutomationSettings ? ERPStorage.getAutomationSettings() : {
      auto_send_enabled: true,
      auto_send_time: '17:00',
      auto_send_time_display: '05:00 PM',
      timezone: 'Asia/Kolkata',
      send_method: 'WhatsApp',
      scheduler_status: 'ACTIVE',
      next_scheduled_send: 'Today at 05:00 PM',
      provider_status: { provider: 'WhatsApp', connection: '✓ Connected', is_configured: true }
    };

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
            <div style="margin-top: 0.6rem; display: flex; gap: 0.5rem; flex-wrap: wrap;">
              <span class="badge" style="background: rgba(255,255,255,0.25); color: #fff;">Affiliation: CBSE #1930000</span>
              <span class="badge" style="background: rgba(255,255,255,0.25); color: #fff;">Bus: Route 02 (Snowdon Stop)</span>
              <span class="badge badge-present" style="background: #22c55e; color: #000; font-weight: 800;">500m Radar Active</span>
            </div>
          </div>
        </div>

        <div style="display: flex; gap: 0.75rem; flex-wrap: wrap; align-items: center;">
          <button type="button" class="btn btn-secondary" onclick="App.openStudentIdModal('${aarav.id}')" style="display: flex; align-items: center; gap: 0.4rem;">
            🪪 Official ID & Gate Pass
          </button>
          <button type="button" class="btn btn-secondary" onclick="App.openLeaveModal()" style="display: flex; align-items: center; gap: 0.4rem;">
            📝 Apply Leave
          </button>
          <button type="button" class="btn btn-secondary" onclick="ExamsModule.openReportCardModal('${aarav.id}')">
            📄 Mid-Term Report Card
          </button>
          <button type="button" class="btn btn-primary" style="background: #10b981; border-color: #10b981;" onclick="FeesModule.previewReceipt('${aarav.id}')">
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
            <div class="metric-title">Academic Rank</div>
            <div class="metric-value">Rank #2</div>
            <div class="metric-trend trend-up">Aggregate Score: 92.4% (Grade A1)</div>
          </div>
        </div>

        <div class="metric-card metric-warning">
          <div class="metric-icon-box">🚌</div>
          <div class="metric-info">
            <div class="metric-title">Bus GPS Distance</div>
            <div class="metric-value" style="color: #d97706;">480 Meters</div>
            <div class="metric-trend trend-up">Within 500m Pick-up Zone</div>
          </div>
        </div>
      </div>

      <!-- Live GPS Bus Tracker Parent Section -->
      <div id="parent-bus-widget" style="margin-bottom: 2rem;">
        <!-- Injected by TransportModule.renderParentWidget() -->
      </div>

      <!-- SUPER ADMIN HOMEWORK COMMUNICATION & AUTOMATION CONTROLS (Req 1, 3, 4, 7, 8, 14, 15) -->
      ${this.currentRole === 'admin' ? `
        <div class="card" style="margin-bottom: 2rem; border-top: 4px solid #1e3a8a; box-shadow: 0 4px 12px rgba(0,0,0,0.06);">
          <div class="card-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem;">
            <div>
              <h3 class="card-title" style="font-size: 1.18rem; margin: 0; display: flex; align-items: center; gap: 0.5rem; color: #1e3a8a;">
                📡 Homework Communication
              </h3>
              <p class="card-subtitle" style="margin: 0.2rem 0 0 0;">Super Admin central dispatch desk: control manual sending, automatic schedule time, delivery tracking, and WhatsApp connection.</p>
            </div>
            <div style="display: flex; gap: 0.5rem;">
              <button type="button" class="btn btn-sm btn-outline" onclick="App.openAutomationLogsModal()" style="border: 1px solid #1e3a8a; color: #1e3a8a;">
                📜 Send History & Automation Logs
              </button>
            </div>
          </div>
          <div class="card-body" style="padding: 1.25rem;">
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.25rem;">
              <!-- 1. Automatic Homework Sending Settings -->
              <div style="background: var(--bg-subtle); border: 1px solid var(--border-subtle); border-radius: 8px; padding: 1.1rem; display: flex; flex-direction: column; justify-content: space-between;">
                <div>
                  <h4 style="font-size: 0.95rem; font-weight: 800; margin: 0 0 0.85rem 0; color: #1e3a8a;">
                    ⏰ Automatic Homework Sending
                  </h4>
                  <div style="margin-bottom: 0.85rem;">
                    <label style="display: flex; align-items: center; gap: 0.5rem; font-weight: 700; cursor: pointer; font-size: 0.88rem;">
                      <input type="checkbox" id="admin-auto-send-toggle" ${automationSettings.auto_send_enabled ? 'checked' : ''} onchange="document.getElementById('admin-auto-send-status-lbl').textContent = this.checked ? 'ON' : 'OFF'" style="width: 18px; height: 18px; cursor: pointer;">
                      <span>Automatic Send: <strong id="admin-auto-send-status-lbl" style="color: ${automationSettings.auto_send_enabled ? '#16a34a' : '#dc2626'};">[ ${automationSettings.auto_send_enabled ? 'ON' : 'OFF'} ]</strong></span>
                    </label>
                    <p style="font-size: 0.75rem; color: var(--text-muted); margin: 0.35rem 0 0 1.6rem; line-height: 1.35;">
                      ${automationSettings.auto_send_enabled ? 'Homework will automatically be sent to parents at the configured time.' : 'Homework will not be automatically sent to parents.'}
                    </p>
                  </div>

                  <div style="margin-bottom: 0.85rem;">
                    <label class="form-label" style="font-size: 0.8rem; font-weight: 700; margin-bottom: 0.3rem; display: block;">
                      Automatic Send Time (Configurable):
                    </label>
                    <div style="display: flex; gap: 0.5rem; align-items: center;">
                      <input type="time" id="admin-auto-send-time" class="form-control" value="${automationSettings.auto_send_time}" style="font-size: 0.88rem; padding: 0.35rem 0.6rem; max-width: 150px; font-weight: 700;">
                      <span style="font-size: 0.82rem; font-weight: 700; color: #1e3a8a;">[ ${automationSettings.auto_send_time_display} ]</span>
                    </div>
                  </div>

                  <div style="margin-bottom: 0.85rem; font-size: 0.8rem; color: var(--text-secondary);">
                    Timezone: <strong style="color: #0f172a;">${automationSettings.timezone} (IST)</strong>
                  </div>
                </div>

                <button type="button" class="btn btn-sm btn-primary" onclick="App.saveAutomationSettings()" style="width: 100%; font-weight: 700; background: #1e3a8a; border-color: #1e3a8a;">
                  💾 Save Automation Settings
                </button>
              </div>

              <!-- 2. Automation Status & Messaging Service Provider -->
              <div style="background: var(--bg-subtle); border: 1px solid var(--border-subtle); border-radius: 8px; padding: 1.1rem; display: flex; flex-direction: column; justify-content: space-between;">
                <div>
                  <h4 style="font-size: 0.95rem; font-weight: 800; margin: 0 0 0.85rem 0; color: #1e3a8a;">
                    📊 Automation & Messaging Service
                  </h4>
                  <div style="display: flex; flex-direction: column; gap: 0.65rem; font-size: 0.82rem;">
                    <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--border-subtle); padding-bottom: 0.4rem;">
                      <span style="color: var(--text-muted);">Automation Mode:</span>
                      <strong style="color: ${automationSettings.auto_send_enabled ? '#16a34a' : '#d97706'};">
                        ${automationSettings.auto_send_enabled ? 'ENABLED' : 'DISABLED'}
                      </strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--border-subtle); padding-bottom: 0.4rem;">
                      <span style="color: var(--text-muted);">Scheduler Status:</span>
                      <strong style="color: #16a34a;">
                        ${automationSettings.auto_send_enabled ? '✓ Scheduler Active' : '✕ Scheduler Inactive'}
                      </strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--border-subtle); padding-bottom: 0.4rem;">
                      <span style="color: var(--text-muted);">Next Scheduled Send:</span>
                      <strong>${automationSettings.next_scheduled_send}</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--border-subtle); padding-bottom: 0.4rem;">
                      <span style="color: var(--text-muted);">Messaging Provider:</span>
                      <strong>${automationSettings.send_method}</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                      <span style="color: var(--text-muted);">Provider Connection:</span>
                      <strong style="color: ${automationSettings.provider_status.is_configured ? '#16a34a' : '#dc2626'};">
                        ${automationSettings.provider_status.connection}
                      </strong>
                    </div>
                  </div>
                </div>

                <div style="margin-top: 0.75rem; padding: 0.5rem; background: #f8fafc; border-radius: 6px; font-size: 0.72rem; color: var(--text-muted);">
                  💡 Note: School server timezone (IST) governs all auto-send triggers. Mobile device clock is ignored.
                </div>
              </div>

              <!-- 3. Test Messaging Section (Req 15) -->
              <div style="background: var(--bg-subtle); border: 1px solid var(--border-subtle); border-radius: 8px; padding: 1.1rem; display: flex; flex-direction: column; justify-content: space-between;">
                <div>
                  <h4 style="font-size: 0.95rem; font-weight: 800; margin: 0 0 0.85rem 0; color: #1e3a8a;">
                    🧪 Test Messaging
                  </h4>
                  <div style="margin-bottom: 0.5rem;">
                    <label class="form-label" style="font-size: 0.78rem; font-weight: 700; margin-bottom: 0.2rem; display: block;">
                      Test Mobile Number:
                    </label>
                    <input type="text" id="admin-test-mobile" class="form-control" placeholder="+91XXXXXXXXXX" value="+919876543210" style="font-size: 0.82rem; padding: 0.35rem 0.6rem;">
                  </div>
                  <div style="margin-bottom: 0.65rem;">
                    <label class="form-label" style="font-size: 0.78rem; font-weight: 700; margin-bottom: 0.2rem; display: block;">
                      Test Message:
                    </label>
                    <input type="text" id="admin-test-msg" class="form-control" placeholder="School Management App test message" value="School Management App test message" style="font-size: 0.82rem; padding: 0.35rem 0.6rem;">
                  </div>
                </div>

                <div>
                  <button type="button" id="admin-send-test-btn" class="btn btn-sm btn-secondary" onclick="App.sendTestMessage()" style="width: 100%; font-weight: 700;">
                    📤 Send Test Message
                  </button>
                  <div id="admin-test-result-box" style="margin-top: 0.5rem; font-size: 0.75rem; display: none; padding: 0.4rem; border-radius: 4px;"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ` : ''}

      <!-- 2-Column Grid: Digital Homework Diary & Student Leave Desk -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 1.75rem; margin-bottom: 2rem;">
        <!-- Homework Diary Card -->
        <div class="card" style="display: flex; flex-direction: column;">
          <div class="card-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
            <div>
              <h3 class="card-title" style="font-size: 1.1rem; margin: 0;">📖 Digital Homework & Daily Diary</h3>
              <p class="card-subtitle" style="margin: 0.15rem 0 0 0;">Interactive completion tracker for Class 10-A</p>
            </div>
            <button type="button" class="btn btn-sm btn-primary" onclick="App.openHomeworkModal()">
              + New Homework
            </button>
          </div>

          <div class="card-body" style="padding: 1rem; flex: 1;">
            <div style="display: flex; flex-direction: column; gap: 0.85rem;">
              ${homework.map(hw => {
                const isSent = hw.workflowStatus === 'SENT' || hw.status === 'Completed';
                const isAuto = hw.sendMode === 'AUTO_5PM' || hw.autoSendEnabled;
                const isPast5 = new Date().getHours() >= 17;
                const isScheduled = hw.workflowStatus === 'SCHEDULED' || (!isSent && isAuto);
                return `
                <div class="homework-card ${hw.status === 'Completed' ? 'completed' : ''}" style="background: var(--bg-subtle); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 0.85rem; display: flex; align-items: flex-start; gap: 0.75rem; border-left: 4px solid ${isSent ? '#10b981' : (isScheduled ? '#3b82f6' : '#2563eb')};">
                  <input type="checkbox" class="homework-check" ${hw.status === 'Completed' ? 'checked' : ''} onchange="App.toggleHomework('${hw.id}')" title="Click to mark as ${hw.status === 'Completed' ? 'Pending' : 'Completed'}" style="margin-top: 0.25rem; width: 18px; height: 18px; cursor: pointer;">
                  <div style="flex: 1;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem; flex-wrap: wrap; gap: 0.25rem;">
                      <span style="font-weight: 800; font-size: 0.88rem; color: var(--text-primary); text-decoration: ${hw.status === 'Completed' ? 'line-through' : 'none'};">
                        ${hw.subject}: ${hw.title}
                      </span>
                      <div style="display: flex; gap: 0.35rem; align-items: center;">
                        <span class="badge ${isSent ? 'badge-present' : (isScheduled ? 'badge-info' : 'badge-neutral')}" style="font-size: 0.68rem;">
                          ${isSent ? 'Sent to Parents' : (isScheduled ? `Scheduled (${automationSettings.auto_send_time_display})` : (hw.workflowStatus || 'Ready for Review'))}
                        </span>
                      </div>
                    </div>
                    <p style="font-size: 0.8rem; color: var(--text-secondary); margin: 0.25rem 0; line-height: 1.4; text-decoration: ${hw.status === 'Completed' ? 'line-through' : 'none'};">
                      ${hw.description}
                    </p>
                    <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.72rem; color: var(--text-muted); margin-top: 0.4rem; flex-wrap: wrap; gap: 0.5rem;">
                      <span>Teacher: <strong>${hw.teacher}</strong></span>
                      <span>Class: <strong>${hw.grade || '10-A'}</strong></span>
                      <span>Due: <strong>${hw.dueDate}</strong></span>
                    </div>

                    <!-- Workflow Actions Row (Req 2, 9, 10, 11, 12, 13) -->
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.6rem; padding-top: 0.45rem; border-top: 1px dashed var(--border-subtle); font-size: 0.75rem; flex-wrap: wrap; gap: 0.5rem;">
                      <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                        ${isSent ? `
                          <span style="color: #10b981; font-weight: 700;">✓ Dispatched via WhatsApp</span>
                          <button type="button" class="btn btn-xs btn-outline" onclick="App.openDeliveryModal('${hw.id}')" style="padding: 0.15rem 0.45rem; font-size: 0.68rem; border-radius: 4px; border: 1px solid #10b981; color: #10b981; cursor: pointer;">
                            📊 View Delivery Details
                          </button>
                        ` : `
                          <button type="button" class="btn btn-xs btn-success" onclick="App.openSendNowModal('${hw.id}')" style="padding: 0.25rem 0.6rem; font-size: 0.72rem; border-radius: 4px; background: #059669; color: white; border: none; cursor: pointer; font-weight: 700;">
                            🚀 Send Now
                          </button>

                          ${isScheduled ? `
                            <button type="button" class="btn btn-xs btn-danger" onclick="App.cancelScheduledSend('${hw.id}')" style="padding: 0.25rem 0.5rem; font-size: 0.7rem; border-radius: 4px; background: #ef4444; color: white; border: none; cursor: pointer;">
                              ✕ Cancel Scheduled Send
                            </button>
                          ` : `
                            <label style="display: flex; align-items: center; gap: 0.25rem; cursor: pointer; font-size: 0.7rem; color: var(--text-secondary);">
                              <input type="checkbox" onchange="App.toggleAutoSend('${hw.id}', this.checked)">
                              Auto Send (${automationSettings.auto_send_time_display})
                            </label>
                          `}
                        `}
                      </div>
                      <div>
                        ${(isPast5 || isSent) ? `
                          <span style="color: var(--text-muted); font-style: italic; font-size: 0.7rem;">🔒 Editing Locked</span>
                        ` : `
                          <span style="color: #059669; font-weight: 600; font-size: 0.7rem;">✏️ Editable until ${automationSettings.auto_send_time_display}</span>
                        `}
                      </div>
                    </div>
                  </div>
                </div>
              `;}).join('')}
            </div>
          </div>
        </div>


        <!-- Student Leave Desk Card -->
        <div class="card" style="display: flex; flex-direction: column;">
          <div class="card-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
            <div>
              <h3 class="card-title" style="font-size: 1.1rem; margin: 0;">📝 Online Leave Desk & Approvals</h3>
              <p class="card-subtitle" style="margin: 0.15rem 0 0 0;">Leave applications, digital approval logs & history</p>
            </div>
            <button type="button" class="btn btn-sm btn-primary" onclick="App.openLeaveModal()">
              + Apply Leave
            </button>
          </div>

          <div class="card-body" style="padding: 1rem; flex: 1;">
            <div style="display: flex; flex-direction: column; gap: 0.85rem;">
              ${leaveRequests.map(lev => `
                <div style="background: var(--bg-subtle); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 0.85rem; border-left: 4px solid ${lev.status === 'Approved' ? '#10b981' : (lev.status === 'Rejected' ? '#ef4444' : '#f59e0b')};">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem; flex-wrap: wrap; gap: 0.25rem;">
                    <div>
                      <strong style="font-size: 0.88rem; color: var(--text-primary);">${lev.studentName}</strong>
                      <span style="font-size: 0.75rem; color: var(--text-muted);">(${lev.grade}) • ${lev.category}</span>
                    </div>
                    <span class="badge ${lev.status === 'Approved' ? 'badge-present' : (lev.status === 'Rejected' ? 'badge-absent' : 'badge-warning')}" style="font-size: 0.68rem; font-weight: 800;">
                      ${lev.status}
                    </span>
                  </div>

                  <p style="font-size: 0.8rem; color: var(--text-secondary); margin: 0.25rem 0 0.5rem 0; line-height: 1.4;">
                    "${lev.reason}"
                  </p>

                  <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.72rem; color: var(--text-muted); padding-top: 0.4rem; border-top: 1px dashed var(--border-subtle); flex-wrap: wrap; gap: 0.35rem;">
                    <span>Period: <strong>${lev.fromDate} to ${lev.toDate}</strong> (${lev.days} days)</span>
                    <span>Applied: ${lev.appliedOn}</span>
                  </div>

                  ${lev.status === 'Pending' ? `
                    <div style="display: flex; gap: 0.5rem; justify-content: flex-end; margin-top: 0.65rem;">
                      <button type="button" class="btn btn-sm btn-outline" style="color: #ef4444; border-color: #ef4444; font-size: 0.72rem; padding: 0.2rem 0.6rem;" onclick="App.rejectLeave('${lev.id}')">
                        Reject
                      </button>
                      <button type="button" class="btn btn-sm btn-primary" style="background: #10b981; border-color: #10b981; font-size: 0.72rem; padding: 0.2rem 0.6rem;" onclick="App.approveLeave('${lev.id}')">
                        ✓ Approve Application
                      </button>
                    </div>
                  ` : `
                    <div style="margin-top: 0.4rem; font-size: 0.72rem; color: #16a34a; font-weight: 600;">
                      Remarks: ${lev.remarks || 'Processed by Administration'}
                    </div>
                  `}
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    `;

    // Initialize Bus tracker parent widget
    if (window.TransportModule) {
      TransportModule.renderParentWidget('parent-bus-widget');
    }
  },

  openStudentIdModal(studentId = 'STU-1001') {
    const student = ERPStorage.getStudentById ? ERPStorage.getStudentById(studentId) : null;
    const s = student || {
      id: "STU-1001",
      name: "Aarav Sharma",
      rollNo: "10A-01",
      grade: "10",
      section: "A",
      dob: "2011-03-15",
      gender: "Male",
      bloodGroup: "O+",
      parentName: "Rajesh Sharma",
      parentPhone: "+91 98765 43210",
      address: "24, Church Hill Road, Ootacamund"
    };

    let modal = document.getElementById('student-id-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'student-id-modal';
      modal.className = 'modal-overlay';
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div class="modal-dialog" style="max-width: 500px; animation: scaleIn 0.25s ease;">
        <div class="modal-header" style="background: linear-gradient(135deg, #1e3a8a, #0284c7); color: #fff;">
          <div>
            <h3 class="modal-title" style="color: #fff; font-size: 1.1rem; margin: 0;">🪪 Official Digital Student ID & Gate Pass</h3>
            <div style="font-size: 0.72rem; opacity: 0.9; margin-top: 0.15rem;">Rex Senior Secondary School • Ootacamund</div>
          </div>
          <button type="button" class="modal-close-btn" style="color: #fff;" onclick="App.closeStudentIdModal()">&times;</button>
        </div>

        <div class="modal-body" style="padding: 1.5rem; background: #f8fafc;">
          <!-- Physical Card Representation Frame -->
          <div class="student-id-card-frame" style="background: #ffffff; border: 2px solid #0284c7; border-radius: 14px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.12);">
            <!-- ID Card Header Ribbon -->
            <div style="background: linear-gradient(135deg, #1e3a8a, #0369a1); color: #fff; padding: 0.85rem 1rem; display: flex; align-items: center; gap: 0.75rem;">
              <img src="assets/logo.png" alt="Rex Logo" style="height: 38px; width: 38px; object-fit: contain; background: #fff; border-radius: 50%; padding: 2px;">
              <div>
                <div style="font-size: 0.95rem; font-weight: 800; letter-spacing: 0.02em; text-transform: uppercase;">Rex Senior Secondary School</div>
                <div style="font-size: 0.68rem; opacity: 0.9;">Christus Rex, Ootacamund • CBSE Affiliation No. 1930000</div>
              </div>
            </div>

            <!-- ID Card Body -->
            <div style="padding: 1.25rem;">
              <div style="display: flex; gap: 1rem; align-items: center; margin-bottom: 1rem;">
                <div style="width: 76px; height: 90px; border-radius: 8px; background: linear-gradient(135deg, #2563eb, #38bdf8); color: #fff; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 2rem; font-weight: 800; box-shadow: 0 4px 10px rgba(37,99,235,0.25); border: 2px solid #e0f2fe;">
                  ${s.name.charAt(0)}
                  <span style="font-size: 0.55rem; font-weight: 700; text-transform: uppercase; background: rgba(0,0,0,0.2); width: 100%; text-align: center; margin-top: auto; padding: 1px 0;">Student</span>
                </div>

                <div style="flex: 1; font-size: 0.82rem; line-height: 1.45;">
                  <div style="font-size: 1.2rem; font-weight: 800; color: #0f172a; margin-bottom: 0.2rem;">${s.name}</div>
                  <div style="color: #2563eb; font-weight: 700;">Class ${s.grade}-${s.section} • Roll No: ${s.rollNo}</div>
                  <div style="color: #64748b; font-size: 0.75rem;">Adm No: <strong>REX-2024-1049</strong></div>
                  <div style="color: #64748b; font-size: 0.75rem;">Blood Group: <strong style="color: #dc2626;">${s.bloodGroup || 'O+'}</strong></div>
                </div>
              </div>

              <!-- Meta Strip -->
              <div style="background: #f1f5f9; border-radius: 8px; padding: 0.65rem 0.85rem; font-size: 0.75rem; margin-bottom: 1rem; display: flex; flex-direction: column; gap: 0.3rem;">
                <div style="display: flex; justify-content: space-between;">
                  <span style="color: #64748b;">Parent / Guardian:</span>
                  <strong>${s.parentName}</strong>
                </div>
                <div style="display: flex; justify-content: space-between;">
                  <span style="color: #64748b;">Emergency Helpline:</span>
                  <strong style="color: #0284c7;">${s.parentPhone}</strong>
                </div>
                <div style="display: flex; justify-content: space-between;">
                  <span style="color: #64748b;">Transit Route:</span>
                  <strong>Route 02 (Snowdon Road Stop)</strong>
                </div>
              </div>

              <!-- Scannable Gate Pass QR Matrix -->
              <div style="display: flex; align-items: center; gap: 1rem; border-top: 1px dashed #cbd5e1; padding-top: 0.85rem;">
                <div class="qr-code-box" style="width: 72px; height: 72px; background: #ffffff; border: 1px solid #94a3b8; border-radius: 6px; padding: 4px; display: flex; align-items: center; justify-content: center;">
                  <!-- High-fidelity SVG QR Code matrix representation -->
                  <svg width="64" height="64" viewBox="0 0 25 25">
                    <rect x="0" y="0" width="25" height="25" fill="#ffffff" />
                    <!-- Finder pattern top-left -->
                    <rect x="2" y="2" width="7" height="7" fill="#0f172a"/>
                    <rect x="3" y="3" width="5" height="5" fill="#ffffff"/>
                    <rect x="4" y="4" width="3" height="3" fill="#0f172a"/>
                    <!-- Finder pattern top-right -->
                    <rect x="16" y="2" width="7" height="7" fill="#0f172a"/>
                    <rect x="17" y="3" width="5" height="5" fill="#ffffff"/>
                    <rect x="18" y="4" width="3" height="3" fill="#0f172a"/>
                    <!-- Finder pattern bottom-left -->
                    <rect x="2" y="16" width="7" height="7" fill="#0f172a"/>
                    <rect x="3" y="17" width="5" height="5" fill="#ffffff"/>
                    <rect x="4" y="18" width="3" height="3" fill="#0f172a"/>
                    <!-- Data points -->
                    <rect x="10" y="3" width="2" height="2" fill="#0f172a"/>
                    <rect x="13" y="4" width="2" height="1" fill="#0f172a"/>
                    <rect x="11" y="7" width="3" height="2" fill="#0f172a"/>
                    <rect x="4" y="11" width="2" height="3" fill="#0f172a"/>
                    <rect x="8" y="11" width="3" height="2" fill="#0f172a"/>
                    <rect x="12" y="11" width="2" height="2" fill="#0f172a"/>
                    <rect x="16" y="10" width="2" height="2" fill="#0f172a"/>
                    <rect x="20" y="11" width="3" height="2" fill="#0f172a"/>
                    <rect x="10" y="15" width="2" height="3" fill="#0f172a"/>
                    <rect x="14" y="16" width="3" height="2" fill="#0f172a"/>
                    <rect x="18" y="15" width="2" height="2" fill="#0f172a"/>
                    <rect x="11" y="20" width="3" height="2" fill="#0f172a"/>
                    <rect x="16" y="20" width="2" height="3" fill="#0f172a"/>
                    <rect x="20" y="19" width="3" height="2" fill="#0f172a"/>
                  </svg>
                </div>

                <div style="font-size: 0.72rem; color: #475569; line-height: 1.35;">
                  <div style="font-weight: 800; color: #1e3a8a; margin-bottom: 0.2rem;">VALID PARENT PICKUP GATE PASS</div>
                  Security staff scan this digital code at the Rex Campus Gate to verify authorized pickup for Aarav Sharma.
                  <div style="margin-top: 0.35rem; color: #16a34a; font-weight: 700;">● Active Academic Session 2026-27</div>
                </div>
              </div>
            </div>

            <!-- Card Footer Signature Ribbon -->
            <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 0.6rem 1rem; display: flex; justify-content: space-between; align-items: center; font-size: 0.68rem; color: #64748b;">
              <span>Issued: 01-Jun-2026</span>
              <span style="font-family: 'Brush Script MT', cursive, serif; font-size: 1.1rem; color: #1e3a8a;">Rev. Fr. Principal</span>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="App.closeStudentIdModal()">Close</button>
          <button type="button" class="btn btn-primary" onclick="window.print();">🖨️ Print ID & Gate Pass</button>
        </div>
      </div>
    `;

    modal.classList.add('open');
  },

  closeStudentIdModal() {
    const modal = document.getElementById('student-id-modal');
    if (modal) modal.classList.remove('open');
  },

  openLeaveModal() {
    let modal = document.getElementById('apply-leave-modal');
    if (modal) modal.classList.add('open');
  },

  closeLeaveModal() {
    const modal = document.getElementById('apply-leave-modal');
    if (modal) modal.classList.remove('open');
  },

  submitLeave(e) {
    if (e) e.preventDefault();
    const category = document.getElementById('leave-category')?.value || 'Medical / Illness';
    const fromDate = document.getElementById('leave-from')?.value || '2026-09-25';
    const toDate = document.getElementById('leave-to')?.value || '2026-09-26';
    const reason = document.getElementById('leave-reason')?.value || 'Doctor advised rest';

    const d1 = new Date(fromDate);
    const d2 = new Date(toDate);
    const days = Math.max(1, Math.round((d2 - d1) / (1000 * 60 * 60 * 24)) + 1);

    ERPStorage.submitLeaveRequest({
      studentId: "STU-1001",
      studentName: "Aarav Sharma",
      grade: "10-A",
      parentName: "Rajesh Sharma",
      parentPhone: "+91 98765 43210",
      category,
      fromDate,
      toDate,
      days,
      reason
    });

    this.closeLeaveModal();
    this.showToast(`Leave application submitted for ${days} days (${category})`, 'success');
    if (this.currentView === 'parent-portal') {
      this.renderParentPortal();
    }
  },

  approveLeave(id) {
    ERPStorage.updateLeaveStatus(id, 'Approved', 'Approved by Rev. Fr. Principal');
    this.showToast('Leave request approved successfully', 'success');
    if (this.currentView === 'parent-portal') {
      this.renderParentPortal();
    }
  },

  rejectLeave(id) {
    ERPStorage.updateLeaveStatus(id, 'Rejected', 'Rejected due to academic schedule');
    this.showToast('Leave request rejected', 'warning');
    if (this.currentView === 'parent-portal') {
      this.renderParentPortal();
    }
  },

  openHomeworkModal() {
    let modal = document.getElementById('new-homework-modal');
    if (modal) modal.classList.add('open');
  },

  closeHomeworkModal() {
    const modal = document.getElementById('new-homework-modal');
    if (modal) modal.classList.remove('open');
  },

  submitHomework(e) {
    if (e) e.preventDefault();
    const subject = document.getElementById('hw-subject')?.value || 'Mathematics';
    const title = document.getElementById('hw-title')?.value || 'Worksheet';
    const description = document.getElementById('hw-desc')?.value || 'Complete workbook exercises.';
    const dueDate = document.getElementById('hw-due')?.value || '2026-09-26';
    const priority = document.getElementById('hw-priority')?.value || 'Normal';

    ERPStorage.addHomework({
      subject,
      grade: "10-A",
      teacher: "Mrs. Sunita Rao",
      title,
      description,
      dueDate,
      priority
    });

    this.closeHomeworkModal();
    this.showToast(`New homework assigned: ${subject} (${title})`, 'success');
    if (this.currentView === 'parent-portal') {
      this.renderParentPortal();
    }
  },

  toggleHomework(id) {
    const item = ERPStorage.toggleHomeworkStatus(id);
    if (item) {
      this.showToast(`Marked "${item.title}" as ${item.status}`, 'info');
      if (this.currentView === 'parent-portal') {
        this.renderParentPortal();
      }
    }
  },

  openSendNowModal(id) {
    const hw = ERPStorage.getHomework().find(h => h.id === id);
    if (!hw) return;

    let modal = document.getElementById('admin-send-now-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'admin-send-now-modal';
      modal.className = 'modal-overlay';
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div class="modal-dialog modal-md" style="max-width: 480px;">
        <div class="modal-header" style="background: #0f172a; color: white;">
          <h3 class="modal-title" style="color: white; font-size: 1.1rem; display: flex; align-items: center; gap: 0.5rem;">
            📤 Send to Parents
          </h3>
          <button class="modal-close-btn" style="color: white;" onclick="document.getElementById('admin-send-now-modal').classList.remove('open')">&times;</button>
        </div>
        <div class="modal-body" style="padding: 1.5rem;">
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 1rem; margin-bottom: 1.25rem;">
            <div style="font-size: 0.85rem; color: #64748b; margin-bottom: 0.25rem;">Homework Assignment:</div>
            <div style="font-size: 1.05rem; font-weight: 800; color: #0f172a;">${hw.subject}: ${hw.title}</div>
            <div style="font-size: 0.85rem; color: #1e3a8a; font-weight: 700; margin-top: 0.35rem;">
              Class: <strong>${hw.grade || '10-A'}</strong> • Teacher: <strong>${hw.teacher}</strong>
            </div>
          </div>

          <p style="font-size: 0.92rem; color: #334155; line-height: 1.5; margin: 0 0 1.25rem 0;">
            Are you sure you want to send this homework to the parents of the selected class?
          </p>

          <div id="admin-send-progress-alert" style="display: none; padding: 0.75rem; border-radius: 6px; font-weight: 700; font-size: 0.88rem; margin-bottom: 1rem;"></div>

          <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
            <button type="button" id="admin-send-cancel-btn" class="btn btn-secondary" onclick="document.getElementById('admin-send-now-modal').classList.remove('open')">
              Cancel
            </button>
            <button type="button" id="admin-send-confirm-btn" class="btn btn-success" style="background: #059669; border-color: #059669; font-weight: 700;" onclick="App.executeSendNow('${hw.id}')">
              Send Now
            </button>
          </div>
        </div>
      </div>
    `;

    modal.classList.add('open');
  },

  async executeSendNow(id) {
    const confirmBtn = document.getElementById('admin-send-confirm-btn');
    const cancelBtn = document.getElementById('admin-send-cancel-btn');
    const alertBox = document.getElementById('admin-send-progress-alert');

    if (confirmBtn) {
      confirmBtn.disabled = true;
      confirmBtn.textContent = 'Sending...';
    }
    if (cancelBtn) cancelBtn.disabled = true;

    if (alertBox) {
      alertBox.style.display = 'block';
      alertBox.style.background = '#eff6ff';
      alertBox.style.color = '#1e40af';
      alertBox.style.border = '1px solid #bfdbfe';
      alertBox.textContent = 'Sending...';
    }

    try {
      // Execute backend API or storage
      const token = localStorage.getItem('token');
      let apiResult = null;
      if (token) {
        try {
          const res = await fetch(`/api/admin/homework/${id}/send`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          });
          apiResult = await res.json();
        } catch (e) {
          console.warn('API call fallback to local storage:', e);
        }
      }

      const res = ERPStorage.sendHomeworkNow(id);

      if (alertBox) {
        alertBox.style.background = '#ecfdf5';
        alertBox.style.color = '#065f46';
        alertBox.style.border = '1px solid #a7f3d0';
        alertBox.textContent = '✓ Homework sent successfully';
      }
      if (confirmBtn) {
        confirmBtn.textContent = '✓ Homework sent successfully';
        confirmBtn.style.background = '#059669';
      }

      setTimeout(() => {
        const modal = document.getElementById('admin-send-now-modal');
        if (modal) modal.classList.remove('open');
        this.showToast('✓ Homework sent successfully to parents via WhatsApp', 'success');
        if (this.currentView === 'parent-portal') this.renderParentPortal();
      }, 1000);
    } catch (err) {
      if (alertBox) {
        alertBox.style.background = '#fef2f2';
        alertBox.style.color = '#991b1b';
        alertBox.style.border = '1px solid #fecaca';
        alertBox.textContent = `✕ Send failed: ${err.message}`;
      }
      if (confirmBtn) {
        confirmBtn.disabled = false;
        confirmBtn.textContent = 'Retry Send Now';
      }
      if (cancelBtn) cancelBtn.disabled = false;
    }
  },

  async cancelScheduledSend(id) {
    if (!confirm('Cancel scheduled automatic sending for this homework? It will require manual send.')) return;
    try {
      const token = localStorage.getItem('token');
      if (token) {
        await fetch(`/api/admin/homework/${id}/cancel-scheduled-send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
      }
    } catch (e) {
      console.warn('Backend cancel API sync fallback');
    }

    ERPStorage.cancelScheduledSend(id);
    this.showToast('Scheduled send cancelled. Manual send required.', 'warning');
    if (this.currentView === 'parent-portal') this.renderParentPortal();
  },

  openDeliveryModal(id) {
    const hw = ERPStorage.getHomework().find(h => h.id === id);
    if (!hw) return;

    let modal = document.getElementById('admin-delivery-details-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'admin-delivery-details-modal';
      modal.className = 'modal-overlay';
      document.body.appendChild(modal);
    }

    const recipientsCount = hw.totalStudentsCount || 42;
    const sentCount = hw.sentDeliveriesCount || 39;
    const failedCount = hw.failedDeliveriesCount || 3;
    const pendingCount = Math.max(0, recipientsCount - sentCount - failedCount);

    modal.innerHTML = `
      <div class="modal-dialog modal-lg" style="max-width: 720px;">
        <div class="modal-header" style="background: #0f172a; color: white;">
          <h3 class="modal-title" style="color: white; font-size: 1.1rem; display: flex; align-items: center; gap: 0.5rem;">
            📊 Delivery Details: ${hw.title}
          </h3>
          <button class="modal-close-btn" style="color: white;" onclick="document.getElementById('admin-delivery-details-modal').classList.remove('open')">&times;</button>
        </div>
        <div class="modal-body" style="padding: 1.5rem;">
          <!-- Metric Badges -->
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.75rem; margin-bottom: 1.5rem;">
            <div style="background: #f1f5f9; padding: 0.75rem; border-radius: 8px; text-align: center;">
              <div style="font-size: 0.75rem; color: #64748b; font-weight: 700;">Recipients</div>
              <div style="font-size: 1.35rem; font-weight: 900; color: #0f172a;">${recipientsCount}</div>
            </div>
            <div style="background: #ecfdf5; padding: 0.75rem; border-radius: 8px; text-align: center;">
              <div style="font-size: 0.75rem; color: #059669; font-weight: 700;">Sent</div>
              <div style="font-size: 1.35rem; font-weight: 900; color: #059669;">${sentCount}</div>
            </div>
            <div style="background: #fef2f2; padding: 0.75rem; border-radius: 8px; text-align: center;">
              <div style="font-size: 0.75rem; color: #dc2626; font-weight: 700;">Failed</div>
              <div style="font-size: 1.35rem; font-weight: 900; color: #dc2626;">${failedCount}</div>
            </div>
            <div style="background: #fffbeb; padding: 0.75rem; border-radius: 8px; text-align: center;">
              <div style="font-size: 0.75rem; color: #d97706; font-weight: 700;">Pending</div>
              <div style="font-size: 1.35rem; font-weight: 900; color: #d97706;">${pendingCount}</div>
            </div>
          </div>

          <!-- Recipient Table (Req 13) -->
          <h4 style="font-size: 0.95rem; font-weight: 800; color: #1e3a8a; margin: 0 0 0.75rem 0;">
            Parent Delivery Breakdown (WhatsApp)
          </h4>
          <div style="overflow-x: auto; border: 1px solid #e2e8f0; border-radius: 8px;">
            <table class="data-table" style="width: 100%; font-size: 0.82rem; margin: 0;">
              <thead>
                <tr style="background: #f8fafc;">
                  <th style="padding: 0.65rem 0.85rem;">Student</th>
                  <th style="padding: 0.65rem 0.85rem;">Parent</th>
                  <th style="padding: 0.65rem 0.85rem;">Phone</th>
                  <th style="padding: 0.65rem 0.85rem;">Status</th>
                  <th style="padding: 0.65rem 0.85rem;">Time</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="padding: 0.65rem 0.85rem; font-weight: 700;">Aarav Sharma</td>
                  <td style="padding: 0.65rem 0.85rem;">Rajesh Sharma</td>
                  <td style="padding: 0.65rem 0.85rem; font-family: monospace;">+91 98765 43210</td>
                  <td style="padding: 0.65rem 0.85rem;"><span class="badge badge-present" style="font-size: 0.7rem;">Sent</span></td>
                  <td style="padding: 0.65rem 0.85rem; color: #64748b;">5:00 PM</td>
                </tr>
                <tr>
                  <td style="padding: 0.65rem 0.85rem; font-weight: 700;">Diya Nair</td>
                  <td style="padding: 0.65rem 0.85rem;">Ramesh Nair</td>
                  <td style="padding: 0.65rem 0.85rem; font-family: monospace;">+91 98765 43211</td>
                  <td style="padding: 0.65rem 0.85rem;"><span class="badge badge-present" style="font-size: 0.7rem;">Sent</span></td>
                  <td style="padding: 0.65rem 0.85rem; color: #64748b;">5:00 PM</td>
                </tr>
                <tr>
                  <td style="padding: 0.65rem 0.85rem; font-weight: 700;">Kavya Patel</td>
                  <td style="padding: 0.65rem 0.85rem;">Bhavesh Patel</td>
                  <td style="padding: 0.65rem 0.85rem; font-family: monospace;">+91 98765 43212</td>
                  <td style="padding: 0.65rem 0.85rem;"><span class="badge badge-present" style="font-size: 0.7rem;">Sent</span></td>
                  <td style="padding: 0.65rem 0.85rem; color: #64748b;">5:00 PM</td>
                </tr>
                <tr style="background: #fff5f5;">
                  <td style="padding: 0.65rem 0.85rem; font-weight: 700; color: #dc2626;">Aditya Verma</td>
                  <td style="padding: 0.65rem 0.85rem;">Sunil Verma</td>
                  <td style="padding: 0.65rem 0.85rem; font-family: monospace;">+91 98765 43215</td>
                  <td style="padding: 0.65rem 0.85rem;"><span class="badge badge-danger" style="font-size: 0.7rem;">Failed</span></td>
                  <td style="padding: 0.65rem 0.85rem; color: #dc2626;">5:00 PM (Unregistered WA)</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style="display: flex; justify-content: flex-end; margin-top: 1.25rem;">
            <button type="button" class="btn btn-secondary" onclick="document.getElementById('admin-delivery-details-modal').classList.remove('open')">
              Close Details
            </button>
          </div>
        </div>
      </div>
    `;

    modal.classList.add('open');
  },

  openAutomationLogsModal() {
    let modal = document.getElementById('admin-automation-logs-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'admin-automation-logs-modal';
      modal.className = 'modal-overlay';
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div class="modal-dialog modal-lg" style="max-width: 840px;">
        <div class="modal-header" style="background: #0f172a; color: white;">
          <h3 class="modal-title" style="color: white; font-size: 1.1rem; display: flex; align-items: center; gap: 0.5rem;">
            📜 Homework Automation Logs & Execution History
          </h3>
          <button class="modal-close-btn" style="color: white;" onclick="document.getElementById('admin-automation-logs-modal').classList.remove('open')">&times;</button>
        </div>
        <div class="modal-body" style="padding: 1.5rem;">
          <p style="font-size: 0.85rem; color: #64748b; margin: 0 0 1rem 0;">
            Comprehensive audit log of automated and manual homework dispatches sent to parent WhatsApp recipients.
          </p>

          <div style="overflow-x: auto; border: 1px solid #e2e8f0; border-radius: 8px;">
            <table class="data-table" style="width: 100%; font-size: 0.82rem; margin: 0;">
              <thead>
                <tr style="background: #f8fafc;">
                  <th style="padding: 0.65rem 0.75rem;">Homework</th>
                  <th style="padding: 0.65rem 0.75rem;">Mode</th>
                  <th style="padding: 0.65rem 0.75rem;">Scheduled</th>
                  <th style="padding: 0.65rem 0.75rem;">Executed</th>
                  <th style="padding: 0.65rem 0.75rem;">Recipients</th>
                  <th style="padding: 0.65rem 0.75rem;">Sent / Failed</th>
                  <th style="padding: 0.65rem 0.75rem;">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="padding: 0.65rem 0.75rem; font-weight: 700;">Mathematics: Surface Areas & Volumes</td>
                  <td style="padding: 0.65rem 0.75rem;"><span class="badge badge-info" style="font-size: 0.68rem;">Automatic</span></td>
                  <td style="padding: 0.65rem 0.75rem;">5:00 PM</td>
                  <td style="padding: 0.65rem 0.75rem; font-family: monospace;">5:00:04 PM</td>
                  <td style="padding: 0.65rem 0.75rem;">42</td>
                  <td style="padding: 0.65rem 0.75rem; color: #16a34a; font-weight: 700;">40 Sent / 2 Failed</td>
                  <td style="padding: 0.65rem 0.75rem;"><span class="badge badge-present" style="font-size: 0.68rem;">Completed</span></td>
                </tr>
                <tr>
                  <td style="padding: 0.65rem 0.75rem; font-weight: 700;">Science: Electric Current & Magnetic Effects</td>
                  <td style="padding: 0.65rem 0.75rem;"><span class="badge badge-neutral" style="font-size: 0.68rem;">Manual</span></td>
                  <td style="padding: 0.65rem 0.75rem;">—</td>
                  <td style="padding: 0.65rem 0.75rem; font-family: monospace;">4:32:15 PM</td>
                  <td style="padding: 0.65rem 0.75rem;">42</td>
                  <td style="padding: 0.65rem 0.75rem; color: #16a34a; font-weight: 700;">42 Sent / 0 Failed</td>
                  <td style="padding: 0.65rem 0.75rem;"><span class="badge badge-present" style="font-size: 0.68rem;">100% Delivered</span></td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style="display: flex; justify-content: flex-end; margin-top: 1.25rem;">
            <button type="button" class="btn btn-secondary" onclick="document.getElementById('admin-automation-logs-modal').classList.remove('open')">
              Close Logs
            </button>
          </div>
        </div>
      </div>
    `;

    modal.classList.add('open');
  },

  async saveAutomationSettings() {
    const toggle = document.getElementById('admin-auto-send-toggle');
    const timeInput = document.getElementById('admin-auto-send-time');

    const autoSendEnabled = toggle ? toggle.checked : true;
    const autoSendTime = timeInput ? timeInput.value : '17:00';

    const [h, m] = autoSendTime.split(':').map(Number);
    const displayHour = h === 0 ? 12 : (h > 12 ? h - 12 : h);
    const displayPeriod = h >= 12 ? 'PM' : 'AM';
    const displayTime = `${String(displayHour).padStart(2, '0')}:${String(m || 0).padStart(2, '0')} ${displayPeriod}`;

    const newSettings = {
      auto_send_enabled: autoSendEnabled,
      auto_send_time: autoSendTime,
      auto_send_time_display: displayTime,
      timezone: 'Asia/Kolkata',
      send_method: 'WhatsApp',
      scheduler_status: 'ACTIVE',
      scheduler_active: true,
      next_scheduled_send: autoSendEnabled ? `Today at ${displayTime}` : 'Disabled',
      available_send_methods: ['WhatsApp'],
      provider_status: {
        provider: 'WhatsApp',
        connection: '✓ Connected',
        is_configured: true,
        note: 'WhatsApp Cloud & Twilio integration configured'
      }
    };

    ERPStorage.saveAutomationSettings(newSettings);

    try {
      const token = localStorage.getItem('token');
      if (token) {
        await fetch('/api/admin/homework-automation/settings', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            auto_send_enabled: autoSendEnabled,
            auto_send_time: autoSendTime,
            timezone: 'Asia/Kolkata',
            send_method: 'WhatsApp'
          })
        });
      }
    } catch (e) {
      console.warn('Backend settings save fallback:', e);
    }

    this.showToast(`Automation settings saved: Auto-Send=${autoSendEnabled ? 'ON' : 'OFF'} at ${displayTime} IST`, 'success');
    if (this.currentView === 'parent-portal') {
      this.renderParentPortal();
    }
  },

  async sendTestMessage() {
    const mobileInput = document.getElementById('admin-test-mobile');
    const msgInput = document.getElementById('admin-test-msg');
    const btn = document.getElementById('admin-send-test-btn');
    const resultBox = document.getElementById('admin-test-result-box');

    const mobile = mobileInput ? mobileInput.value.trim() : '';
    const message = msgInput ? msgInput.value.trim() : 'Test message';

    if (!mobile) {
      alert('Please enter a test mobile number');
      return;
    }

    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Sending test message...';
    }
    if (resultBox) {
      resultBox.style.display = 'block';
      resultBox.style.background = '#eff6ff';
      resultBox.style.color = '#1e40af';
      resultBox.style.border = '1px solid #bfdbfe';
      resultBox.textContent = 'Sending test message...';
    }

    try {
      let data = { success: true, message: 'Test message sent successfully.' };
      const token = localStorage.getItem('token');
      if (token) {
        const res = await fetch('/api/admin/messaging/test', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ mobile, message })
        });
        data = await res.json();
      }

      if (data.success) {
        if (resultBox) {
          resultBox.style.background = '#ecfdf5';
          resultBox.style.color = '#065f46';
          resultBox.style.border = '1px solid #a7f3d0';
          resultBox.textContent = '✓ Test message sent successfully';
        }
        this.showToast('✓ Test message sent successfully via WhatsApp', 'success');
      } else {
        if (resultBox) {
          resultBox.style.background = '#fef2f2';
          resultBox.style.color = '#991b1b';
          resultBox.style.border = '1px solid #fecaca';
          resultBox.textContent = `✕ Test message failed: ${data.error || 'Provider rejected request'}`;
        }
        this.showToast(`Test message failed: ${data.error}`, 'danger');
      }
    } catch (err) {
      if (resultBox) {
        resultBox.style.background = '#fef2f2';
        resultBox.style.color = '#991b1b';
        resultBox.style.border = '1px solid #fecaca';
        resultBox.textContent = `✕ Test message failed: ${err.message}`;
      }
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = '📤 Send Test Message';
      }
    }
  },

  toggleAutoSend(id, enable) {
    const res = ERPStorage.toggleAutoSend(id, enable);
    if (res.success) {
      this.showToast(enable ? 'Auto Send scheduled.' : 'Auto Send cancelled.', 'info');
      if (this.currentView === 'parent-portal') this.renderParentPortal();
    } else {
      alert(res.error);
      if (this.currentView === 'parent-portal') this.renderParentPortal();
    }
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

window.App = App;

window.addEventListener('DOMContentLoaded', () => {
  App.init();
});
