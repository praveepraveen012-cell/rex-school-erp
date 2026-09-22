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

    // Load saved preferences
    this.currentRole = ERPStorage.getRole() || 'admin';
    const savedTheme = localStorage.getItem(ERPStorage.KEYS.THEME) || 'light';
    this.setTheme(savedTheme);

    // Initial view: check URL hash or default to home webapp
    const hash = window.location.hash ? window.location.hash.replace('#', '') : '';
    const initialView = hash || 'home';

    this.attachEvents();
    this.applyRole(this.currentRole, false);
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

    const userNameEl = document.getElementById('current-user-name');
    const userRoleEl = document.getElementById('current-user-role');
    const userAvatarEl = document.getElementById('current-user-avatar');

    if (role === 'admin') {
      if (userNameEl) userNameEl.textContent = "Rev. Fr. Principal";
      if (userRoleEl) userRoleEl.textContent = "Principal / Super Admin";
      if (userAvatarEl) userAvatarEl.textContent = "RP";
      if (isUserAction) this.switchView('dashboard');
    } else if (role === 'teacher') {
      if (userNameEl) userNameEl.textContent = "Mrs. Sunita Rao";
      if (userRoleEl) userRoleEl.textContent = "Grade 10-A Mentor";
      if (userAvatarEl) userAvatarEl.textContent = "SR";
      if (isUserAction) this.switchView('attendance');
    } else if (role === 'parent') {
      if (userNameEl) userNameEl.textContent = "Rajesh Sharma";
      if (userRoleEl) userRoleEl.textContent = "Parent of Aarav (10-A)";
      if (userAvatarEl) userAvatarEl.textContent = "RS";
      if (isUserAction) this.switchView('parent-portal');
    }

    if (isUserAction) {
      this.showToast(`Switched perspective to ${role.toUpperCase()} Mode`, "info");
    }
  },

  switchView(viewId) {
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
              ${homework.map(hw => `
                <div class="homework-card ${hw.status === 'Completed' ? 'completed' : ''}" style="background: var(--bg-subtle); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 0.85rem; display: flex; align-items: flex-start; gap: 0.75rem; border-left: 4px solid ${hw.status === 'Completed' ? '#10b981' : '#2563eb'};">
                  <input type="checkbox" class="homework-check" ${hw.status === 'Completed' ? 'checked' : ''} onchange="App.toggleHomework('${hw.id}')" title="Click to mark as ${hw.status === 'Completed' ? 'Pending' : 'Completed'}" style="margin-top: 0.25rem; width: 18px; height: 18px; cursor: pointer;">
                  <div style="flex: 1;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem; flex-wrap: wrap; gap: 0.25rem;">
                      <span style="font-weight: 800; font-size: 0.88rem; color: var(--text-primary); text-decoration: ${hw.status === 'Completed' ? 'line-through' : 'none'};">
                        ${hw.subject}: ${hw.title}
                      </span>
                      <span class="badge ${hw.status === 'Completed' ? 'badge-present' : (hw.priority === 'High' ? 'badge-absent' : 'badge-neutral')}" style="font-size: 0.68rem;">
                        ${hw.status}
                      </span>
                    </div>
                    <p style="font-size: 0.8rem; color: var(--text-secondary); margin: 0.25rem 0; line-height: 1.4; text-decoration: ${hw.status === 'Completed' ? 'line-through' : 'none'};">
                      ${hw.description}
                    </p>
                    <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.72rem; color: var(--text-muted); margin-top: 0.4rem;">
                      <span>Teacher: <strong>${hw.teacher}</strong></span>
                      <span>Due: <strong>${hw.dueDate}</strong></span>
                    </div>
                  </div>
                </div>
              `).join('')}
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
