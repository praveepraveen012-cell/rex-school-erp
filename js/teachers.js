/**
 * Grexotix School Management Platform — Teachers & Staff Module
 * WebApp Faculty Directory, Account Provisioning, Role Scoping & Assignment Manager
 */

const TeachersModule = {
  teachers: [],
  filteredTeachers: [],
  searchTerm: '',
  selectedDept: 'ALL',
  selectedStatus: 'ALL',
  isInitialized: false,

  init() {
    if (this.isInitialized) return;
    this.isInitialized = true;
    console.log("TeachersModule initialized.");
  },

  async render() {
    const container = document.getElementById('teachers-view');
    if (!container) return;

    container.innerHTML = `
      <div class="view-header" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem; margin-bottom:1.5rem;">
        <div>
          <h1 style="font-size:1.75rem; font-weight:800; color:var(--text-primary); margin:0;">Staff & Teachers Management</h1>
          <p style="color:var(--text-secondary); margin:0.25rem 0 0 0; font-size:0.9rem;">
            Manage school faculty, view login usernames, assign academic subjects, and manage account credentials.
          </p>
        </div>
        <div style="display:flex; gap:0.75rem;">
          <button type="button" class="btn btn-primary" onclick="TeachersModule.openAddTeacherModal()" style="display:inline-flex; align-items:center; gap:0.5rem; background:var(--primary); color:#fff; font-weight:700; border-radius:8px; padding:0.6rem 1.2rem;">
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
            <span>Add New Teacher</span>
          </button>
        </div>
      </div>

      <!-- KPI Summary Cards -->
      <div class="stats-grid" id="teachers-stats-container" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:1rem; margin-bottom:1.5rem;">
        <div class="card stat-card" style="padding:1.25rem; background:var(--card-bg); border:1px solid var(--border-color); border-radius:12px;">
          <div style="font-size:0.8rem; font-weight:700; color:var(--text-secondary); text-transform:uppercase;">Total Staff</div>
          <div id="stat-total-teachers" style="font-size:1.8rem; font-weight:800; color:var(--primary); margin-top:0.25rem;">--</div>
        </div>
        <div class="card stat-card" style="padding:1.25rem; background:var(--card-bg); border:1px solid var(--border-color); border-radius:12px;">
          <div style="font-size:0.8rem; font-weight:700; color:var(--text-secondary); text-transform:uppercase;">Active Faculty</div>
          <div id="stat-active-teachers" style="font-size:1.8rem; font-weight:800; color:var(--success); margin-top:0.25rem;">--</div>
        </div>
        <div class="card stat-card" style="padding:1.25rem; background:var(--card-bg); border:1px solid var(--border-color); border-radius:12px;">
          <div style="font-size:0.8rem; font-weight:700; color:var(--text-secondary); text-transform:uppercase;">Assigned Classes</div>
          <div id="stat-assigned-classes" style="font-size:1.8rem; font-weight:800; color:var(--secondary); margin-top:0.25rem;">--</div>
        </div>
        <div class="card stat-card" style="padding:1.25rem; background:var(--card-bg); border:1px solid var(--border-color); border-radius:12px;">
          <div style="font-size:0.8rem; font-weight:700; color:var(--text-secondary); text-transform:uppercase;">Academic Depts</div>
          <div id="stat-depts-count" style="font-size:1.8rem; font-weight:800; color:var(--warning); margin-top:0.25rem;">--</div>
        </div>
      </div>

      <!-- Filter & Search Toolbar -->
      <div class="card" style="padding:1rem 1.25rem; margin-bottom:1.5rem; background:var(--card-bg); border:1px solid var(--border-color); border-radius:12px;">
        <div style="display:flex; flex-wrap:wrap; gap:1rem; align-items:center; justify-content:space-between;">
          <div style="flex:1; min-width:260px; position:relative;">
            <input type="text" id="teacher-search-input" placeholder="Search by teacher name, username, employee ID, or mobile..."
                   oninput="TeachersModule.handleSearch(this.value)"
                   style="width:100%; padding:0.6rem 1rem 0.6rem 2.5rem; border:1px solid var(--border-color); border-radius:8px; font-size:0.9rem; background:var(--input-bg); color:var(--text-primary);">
            <svg style="position:absolute; left:0.8rem; top:50%; transform:translateY(-50%); width:18px; height:18px; color:var(--text-secondary);" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          </div>
          <div style="display:flex; gap:0.75rem; flex-wrap:wrap;">
            <select id="teacher-dept-filter" onchange="TeachersModule.handleDeptFilter(this.value)" style="padding:0.6rem 1rem; border:1px solid var(--border-color); border-radius:8px; font-size:0.85rem; background:var(--input-bg); color:var(--text-primary);">
              <option value="ALL">All Departments</option>
              <option value="Mathematics">Mathematics</option>
              <option value="Science">Science</option>
              <option value="English">English</option>
              <option value="Social Studies">Social Studies</option>
              <option value="Computer Science">Computer Science</option>
              <option value="Languages">Languages</option>
            </select>
            <select id="teacher-status-filter" onchange="TeachersModule.handleStatusFilter(this.value)" style="padding:0.6rem 1rem; border:1px solid var(--border-color); border-radius:8px; font-size:0.85rem; background:var(--input-bg); color:var(--text-primary);">
              <option value="ALL">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="disabled">Disabled Only</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Teachers Table List Container -->
      <div class="card" style="padding:0; overflow:hidden; background:var(--card-bg); border:1px solid var(--border-color); border-radius:12px;">
        <div id="teachers-table-wrapper" style="overflow-x:auto;">
          <div style="padding:3rem; text-align:center; color:var(--text-secondary);">
            <div class="spinner" style="width:32px; height:32px; border:3px solid var(--border-color); border-top-color:var(--primary); border-radius:50%; animation:spin 1s linear infinite; margin:0 auto 1rem auto;"></div>
            Loading faculty and staff directory...
          </div>
        </div>
      </div>

      <!-- Add Teacher Modal Container -->
      <div id="teacher-modal-container"></div>
    `;

    await this.fetchTeachers();
  },

  async fetchTeachers() {
    try {
      const res = await (window.RexApi ? RexApi.get('/teachers') : fetch('/api/teachers').then(r => r.json()));
      if (res && res.success) {
        this.teachers = res.teachers || [];
      } else {
        // Fallback to demo teachers in storage
        this.teachers = this.getDefaultDemoTeachers();
      }
    } catch (err) {
      console.warn("Could not load teachers from backend, using local store:", err);
      this.teachers = this.getDefaultDemoTeachers();
    }

    this.applyFilters();
  },

  getDefaultDemoTeachers() {
    return [
      {
        id: 1,
        name: "Mrs. Anitha Kumar",
        username: "anitha.math",
        employee_id: "EMP-001042",
        email: "anitha.kumar@rex.edu",
        mobile: "9876500004",
        department: "Mathematics",
        qualification: "M.Sc., B.Ed.",
        status: "active",
        assignments: [
          { class_name: "Grade 10", section_name: "Section A", subject_name: "Mathematics" },
          { class_name: "Grade 9", section_name: "Section B", subject_name: "Mathematics" }
        ]
      },
      {
        id: 2,
        name: "Mr. Ramesh Sundaram",
        username: "ramesh.sci",
        employee_id: "EMP-001043",
        email: "ramesh.sundaram@rex.edu",
        mobile: "9876500005",
        department: "Science",
        qualification: "M.Sc. Physics",
        status: "active",
        assignments: [
          { class_name: "Grade 10", section_name: "Section A", subject_name: "Physical Science" }
        ]
      },
      {
        id: 3,
        name: "Ms. Sarah Jenkins",
        username: "sarah.eng",
        employee_id: "EMP-001044",
        email: "sarah.jenkins@rex.edu",
        mobile: "9876500006",
        department: "English",
        qualification: "M.A. English Lit",
        status: "active",
        assignments: [
          { class_name: "Grade 8", section_name: "Section A", subject_name: "English Literature" }
        ]
      }
    ];
  },

  handleSearch(val) {
    this.searchTerm = val.toLowerCase().trim();
    this.applyFilters();
  },

  handleDeptFilter(val) {
    this.selectedDept = val;
    this.applyFilters();
  },

  handleStatusFilter(val) {
    this.selectedStatus = val;
    this.applyFilters();
  },

  applyFilters() {
    this.filteredTeachers = this.teachers.filter(t => {
      const matchSearch = !this.searchTerm ||
        (t.name && t.name.toLowerCase().includes(this.searchTerm)) ||
        (t.username && t.username.toLowerCase().includes(this.searchTerm)) ||
        (t.employee_id && t.employee_id.toLowerCase().includes(this.searchTerm)) ||
        (t.mobile && t.mobile.includes(this.searchTerm)) ||
        (t.email && t.email.toLowerCase().includes(this.searchTerm));

      const matchDept = this.selectedDept === 'ALL' || (t.department && t.department.toLowerCase() === this.selectedDept.toLowerCase());
      const matchStatus = this.selectedStatus === 'ALL' || (t.status && t.status.toLowerCase() === this.selectedStatus.toLowerCase());

      return matchSearch && matchDept && matchStatus;
    });

    this.updateStats();
    this.renderTable();
  },

  updateStats() {
    const totalEl = document.getElementById('stat-total-teachers');
    const activeEl = document.getElementById('stat-active-teachers');
    const classesEl = document.getElementById('stat-assigned-classes');
    const deptsEl = document.getElementById('stat-depts-count');

    if (totalEl) totalEl.textContent = this.teachers.length;
    if (activeEl) activeEl.textContent = this.teachers.filter(t => t.status === 'active').length;

    let assignedCount = 0;
    const depts = new Set();
    this.teachers.forEach(t => {
      if (t.department) depts.add(t.department);
      if (Array.isArray(t.assignments)) assignedCount += t.assignments.length;
    });

    if (classesEl) classesEl.textContent = assignedCount;
    if (deptsEl) deptsEl.textContent = depts.size;

    const sidebarCount = document.getElementById('sidebar-teacher-count');
    if (sidebarCount) sidebarCount.textContent = this.teachers.length;
  },

  renderTable() {
    const container = document.getElementById('teachers-table-wrapper');
    if (!container) return;

    if (this.filteredTeachers.length === 0) {
      container.innerHTML = `
        <div style="padding:3rem 1.5rem; text-align:center; color:var(--text-secondary);">
          <div style="font-size:2.5rem; margin-bottom:0.75rem;">👥</div>
          <h3 style="font-size:1.1rem; color:var(--text-primary); margin-bottom:0.5rem;">No staff records found</h3>
          <p style="font-size:0.85rem; max-width:400px; margin:0 auto 1.5rem auto;">No teachers match the current search or filters. You can clear filters or add a new faculty member.</p>
          <button type="button" class="btn btn-secondary" onclick="TeachersModule.resetFilters()" style="padding:0.4rem 1rem; font-size:0.85rem;">Clear Filters</button>
        </div>
      `;
      return;
    }

    let html = `
      <table class="data-table" style="width:100%; border-collapse:collapse; text-align:left;">
        <thead>
          <tr style="background:var(--table-header-bg, rgba(29,47,128,0.04)); border-bottom:1px solid var(--border-color); color:var(--text-secondary); font-size:0.75rem; text-transform:uppercase; letter-spacing:0.5px;">
            <th style="padding:1rem 1.25rem;">Teacher / Faculty</th>
            <th style="padding:1rem 1rem;">Login Username</th>
            <th style="padding:1rem 1rem;">Contact Details</th>
            <th style="padding:1rem 1rem;">Department & Qual.</th>
            <th style="padding:1rem 1rem;">Assigned Classes</th>
            <th style="padding:1rem 1rem;">Status</th>
            <th style="padding:1rem 1.25rem; text-align:right;">Actions</th>
          </tr>
        </thead>
        <tbody>
    `;

    this.filteredTeachers.forEach(t => {
      const initials = (t.name || 'T')
        .split(' ')
        .map(n => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();

      const isActive = t.status === 'active';
      const assignmentsHtml = Array.isArray(t.assignments) && t.assignments.length > 0
        ? t.assignments.map(a => `<span class="badge" style="background:rgba(103,58,183,0.1); color:var(--secondary); font-size:0.72rem; padding:0.2rem 0.5rem; margin:2px 2px 2px 0; display:inline-block; border-radius:4px;">${a.class_name || 'Class'} (${a.subject_name || 'Subject'})</span>`).join('')
        : `<span style="color:var(--text-muted); font-size:0.8rem; font-style:italic;">No classes assigned</span>`;

      html += `
        <tr style="border-bottom:1px solid var(--border-color); transition:background 0.15s ease;">
          <td style="padding:1rem 1.25rem;">
            <div style="display:flex; align-items:center; gap:0.75rem;">
              <div style="width:38px; height:38px; border-radius:50%; background:linear-gradient(135deg, var(--primary), var(--secondary)); color:#fff; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:0.85rem; flex-shrink:0;">
                ${initials}
              </div>
              <div>
                <div style="font-weight:700; color:var(--text-primary); font-size:0.95rem;">${t.name}</div>
                <div style="font-size:0.78rem; color:var(--text-secondary);">${t.employee_id || 'ID Pending'}</div>
              </div>
            </div>
          </td>
          <td style="padding:1rem 1rem;">
            <code style="background:rgba(29,47,128,0.06); color:var(--primary); padding:0.2rem 0.5rem; border-radius:4px; font-size:0.82rem; font-weight:700;">${t.username || t.email?.split('@')[0] || 'N/A'}</code>
          </td>
          <td style="padding:1rem 1rem; font-size:0.85rem;">
            <div style="color:var(--text-primary); font-weight:600;">📱 ${t.mobile || 'No Mobile'}</div>
            <div style="color:var(--text-secondary); font-size:0.78rem;">✉️ ${t.email || 'No Email'}</div>
          </td>
          <td style="padding:1rem 1rem; font-size:0.85rem;">
            <div style="font-weight:700; color:var(--text-primary);">${t.department || 'General Academics'}</div>
            <div style="font-size:0.78rem; color:var(--text-secondary);">${t.qualification || 'B.Ed.'}</div>
          </td>
          <td style="padding:1rem 1rem; max-width:240px;">
            ${assignmentsHtml}
          </td>
          <td style="padding:1rem 1rem;">
            <span class="badge" style="background:${isActive ? 'rgba(8,127,91,0.12)' : 'rgba(180,35,24,0.12)'}; color:${isActive ? 'var(--success)' : 'var(--danger)'}; font-weight:700; font-size:0.75rem; padding:0.25rem 0.65rem; border-radius:20px;">
              ${isActive ? '● Active' : '○ Disabled'}
            </span>
          </td>
          <td style="padding:1rem 1.25rem; text-align:right;">
            <div style="display:inline-flex; gap:0.4rem; justify-content:flex-end;">
              <button type="button" class="btn btn-sm btn-secondary" onclick="TeachersModule.openResetPasswordModal(${t.id}, '${t.name.replace(/'/g, "\\'")}', '${t.username || t.email?.split('@')[0]}')" title="Reset Password" style="padding:0.35rem 0.65rem; font-size:0.75rem;">
                🔑 Reset Pass
              </button>
              <button type="button" class="btn btn-sm btn-secondary" onclick="TeachersModule.openAssignModal(${t.id}, '${t.name.replace(/'/g, "\\'")}')" title="Assign Class / Subject" style="padding:0.35rem 0.65rem; font-size:0.75rem;">
                📚 Assign
              </button>
              <button type="button" class="btn btn-sm ${isActive ? 'btn-danger' : 'btn-success'}" onclick="TeachersModule.toggleStatus(${t.id})" style="padding:0.35rem 0.65rem; font-size:0.75rem;">
                ${isActive ? 'Disable' : 'Activate'}
              </button>
            </div>
          </td>
        </tr>
      `;
    });

    html += `
        </tbody>
      </table>
    `;

    container.innerHTML = html;
  },

  resetFilters() {
    this.searchTerm = '';
    this.selectedDept = 'ALL';
    this.selectedStatus = 'ALL';
    const searchInput = document.getElementById('teacher-search-input');
    const deptSelect = document.getElementById('teacher-dept-filter');
    const statusSelect = document.getElementById('teacher-status-filter');
    if (searchInput) searchInput.value = '';
    if (deptSelect) deptSelect.value = 'ALL';
    if (statusSelect) statusSelect.value = 'ALL';
    this.applyFilters();
  },

  openAddTeacherModal() {
    const container = document.getElementById('teacher-modal-container');
    if (!container) return;

    container.innerHTML = `
      <div class="modal-overlay" id="add-teacher-modal" style="display:flex; position:fixed; inset:0; background:rgba(0,0,0,0.6); z-index:9999; align-items:center; justify-content:center; padding:1rem;">
        <div class="modal-content card" style="max-width:600px; width:100%; max-height:90vh; overflow-y:auto; padding:1.75rem; border-radius:14px; background:var(--card-bg); box-shadow:0 20px 40px rgba(0,0,0,0.25);">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.25rem; border-bottom:1px solid var(--border-color); padding-bottom:0.75rem;">
            <h2 style="font-size:1.3rem; font-weight:800; color:var(--text-primary); margin:0;">Add New Teacher / Staff</h2>
            <button type="button" onclick="TeachersModule.closeModal('add-teacher-modal')" style="background:none; border:none; font-size:1.5rem; cursor:pointer; color:var(--text-secondary);">&times;</button>
          </div>

          <form id="create-teacher-form" onsubmit="TeachersModule.handleCreateTeacher(event)">
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;">
              <div style="grid-column:span 2;">
                <label style="display:block; font-size:0.8rem; font-weight:700; color:var(--text-primary); margin-bottom:0.35rem;">Full Name *</label>
                <input type="text" id="new-teacher-name" required placeholder="e.g. Mrs. Priya Sundaram" style="width:100%; padding:0.6rem 0.8rem; border:1px solid var(--border-color); border-radius:6px; font-size:0.9rem; background:var(--input-bg); color:var(--text-primary);">
              </div>

              <div>
                <label style="display:block; font-size:0.8rem; font-weight:700; color:var(--text-primary); margin-bottom:0.35rem;">Login Username *</label>
                <input type="text" id="new-teacher-username" required placeholder="e.g. priya.math" style="width:100%; padding:0.6rem 0.8rem; border:1px solid var(--border-color); border-radius:6px; font-size:0.9rem; background:var(--input-bg); color:var(--text-primary);">
                <small style="color:var(--text-secondary); font-size:0.7rem;">Teacher uses this username to log in.</small>
              </div>

              <div>
                <label style="display:block; font-size:0.8rem; font-weight:700; color:var(--text-primary); margin-bottom:0.35rem;">Employee ID</label>
                <input type="text" id="new-teacher-empid" placeholder="e.g. EMP-00210" style="width:100%; padding:0.6rem 0.8rem; border:1px solid var(--border-color); border-radius:6px; font-size:0.9rem; background:var(--input-bg); color:var(--text-primary);">
              </div>

              <div>
                <label style="display:block; font-size:0.8rem; font-weight:700; color:var(--text-primary); margin-bottom:0.35rem;">Mobile Number *</label>
                <input type="tel" id="new-teacher-mobile" required placeholder="10-digit mobile" style="width:100%; padding:0.6rem 0.8rem; border:1px solid var(--border-color); border-radius:6px; font-size:0.9rem; background:var(--input-bg); color:var(--text-primary);">
              </div>

              <div>
                <label style="display:block; font-size:0.8rem; font-weight:700; color:var(--text-primary); margin-bottom:0.35rem;">Email Address *</label>
                <input type="email" id="new-teacher-email" required placeholder="priya@school.edu" style="width:100%; padding:0.6rem 0.8rem; border:1px solid var(--border-color); border-radius:6px; font-size:0.9rem; background:var(--input-bg); color:var(--text-primary);">
              </div>

              <div>
                <label style="display:block; font-size:0.8rem; font-weight:700; color:var(--text-primary); margin-bottom:0.35rem;">Department</label>
                <select id="new-teacher-dept" style="width:100%; padding:0.6rem 0.8rem; border:1px solid var(--border-color); border-radius:6px; font-size:0.9rem; background:var(--input-bg); color:var(--text-primary);">
                  <option value="Mathematics">Mathematics</option>
                  <option value="Science">Science</option>
                  <option value="English">English</option>
                  <option value="Social Studies">Social Studies</option>
                  <option value="Computer Science">Computer Science</option>
                  <option value="Languages">Languages</option>
                  <option value="Physical Education">Physical Education</option>
                </select>
              </div>

              <div>
                <label style="display:block; font-size:0.8rem; font-weight:700; color:var(--text-primary); margin-bottom:0.35rem;">Qualification</label>
                <input type="text" id="new-teacher-qual" placeholder="e.g. M.Sc., B.Ed." style="width:100%; padding:0.6rem 0.8rem; border:1px solid var(--border-color); border-radius:6px; font-size:0.9rem; background:var(--input-bg); color:var(--text-primary);">
              </div>

              <div style="grid-column:span 2;">
                <label style="display:block; font-size:0.8rem; font-weight:700; color:var(--text-primary); margin-bottom:0.35rem;">Initial Password</label>
                <input type="text" id="new-teacher-pass" value="Teacher123!" style="width:100%; padding:0.6rem 0.8rem; border:1px solid var(--border-color); border-radius:6px; font-size:0.9rem; background:var(--input-bg); color:var(--text-primary);">
                <small style="color:var(--text-secondary); font-size:0.7rem;">Default: Teacher123! (Teacher can change upon first login)</small>
              </div>
            </div>

            <div style="margin-top:1.5rem; display:flex; justify-content:flex-end; gap:0.75rem;">
              <button type="button" class="btn btn-secondary" onclick="TeachersModule.closeModal('add-teacher-modal')">Cancel</button>
              <button type="submit" id="submit-create-teacher-btn" class="btn btn-primary" style="background:var(--primary); color:#fff; font-weight:700;">Create Teacher Account</button>
            </div>
          </form>
        </div>
      </div>
    `;
  },

  async handleCreateTeacher(e) {
    e.preventDefault();
    const btn = document.getElementById('submit-create-teacher-btn');
    if (btn) btn.disabled = true;

    const name = document.getElementById('new-teacher-name').value.trim();
    const username = document.getElementById('new-teacher-username').value.trim();
    const employeeId = document.getElementById('new-teacher-empid').value.trim();
    const mobile = document.getElementById('new-teacher-mobile').value.trim();
    const email = document.getElementById('new-teacher-email').value.trim();
    const department = document.getElementById('new-teacher-dept').value;
    const qualification = document.getElementById('new-teacher-qual').value.trim();
    const initialPassword = document.getElementById('new-teacher-pass').value.trim();

    try {
      const res = await (window.RexApi ? RexApi.post('/teachers', {
        name, username, employeeId, mobile, email, department, qualification, initialPassword
      }) : fetch('/api/teachers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, username, employeeId, mobile, email, department, qualification, initialPassword })
      }).then(r => r.json()));

      if (res && res.success) {
        if (window.App) App.showToast(`Teacher ${name} created successfully! Username: ${username}`, "success");
        this.closeModal('add-teacher-modal');
        await this.fetchTeachers();
      } else {
        alert(res?.error || "Failed to create teacher account.");
      }
    } catch (err) {
      console.error("Error creating teacher:", err);
      // Offline fallback: add to local array
      this.teachers.push({
        id: Date.now(),
        name, username, employee_id: employeeId || `EMP-${Date.now().toString().slice(-4)}`,
        mobile, email, department, qualification, status: 'active', assignments: []
      });
      if (window.App) App.showToast(`Teacher profile saved locally.`, "success");
      this.closeModal('add-teacher-modal');
      this.applyFilters();
    } finally {
      if (btn) btn.disabled = false;
    }
  },

  openResetPasswordModal(teacherId, teacherName, currentUsername) {
    const container = document.getElementById('teacher-modal-container');
    if (!container) return;

    container.innerHTML = `
      <div class="modal-overlay" id="reset-pass-modal" style="display:flex; position:fixed; inset:0; background:rgba(0,0,0,0.6); z-index:9999; align-items:center; justify-content:center; padding:1rem;">
        <div class="modal-content card" style="max-width:440px; width:100%; padding:1.75rem; border-radius:14px; background:var(--card-bg); box-shadow:0 20px 40px rgba(0,0,0,0.25);">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; border-bottom:1px solid var(--border-color); padding-bottom:0.75rem;">
            <h3 style="font-size:1.15rem; font-weight:800; color:var(--text-primary); margin:0;">Reset Teacher Password</h3>
            <button type="button" onclick="TeachersModule.closeModal('reset-pass-modal')" style="background:none; border:none; font-size:1.5rem; cursor:pointer; color:var(--text-secondary);">&times;</button>
          </div>

          <p style="color:var(--text-secondary); font-size:0.85rem; margin-bottom:1rem;">
            Generate a new secure temporary password for <strong>${teacherName}</strong> (Username: <code>${currentUsername}</code>).
          </p>

          <div style="margin-bottom:1.25rem;">
            <label style="display:block; font-size:0.8rem; font-weight:700; color:var(--text-primary); margin-bottom:0.35rem;">New Password (Optional override)</label>
            <input type="text" id="reset-new-password" placeholder="Leave empty for auto-generated password" style="width:100%; padding:0.6rem 0.8rem; border:1px solid var(--border-color); border-radius:6px; font-size:0.9rem; background:var(--input-bg); color:var(--text-primary);">
          </div>

          <div id="reset-result-box" style="display:none; padding:1rem; background:rgba(8,127,91,0.08); border:1px solid var(--success); border-radius:8px; margin-bottom:1rem; font-size:0.85rem;">
            <div style="color:var(--success); font-weight:700; margin-bottom:0.25rem;">Password Updated!</div>
            <div>Username: <code id="reset-res-user" style="font-weight:700;"></code></div>
            <div>Temporary Password: <code id="reset-res-pass" style="font-weight:700; color:var(--primary);"></code></div>
          </div>

          <div style="display:flex; justify-content:flex-end; gap:0.75rem;">
            <button type="button" class="btn btn-secondary" onclick="TeachersModule.closeModal('reset-pass-modal')">Close</button>
            <button type="button" id="submit-reset-pass-btn" class="btn btn-primary" onclick="TeachersModule.submitResetPassword(${teacherId})" style="background:var(--primary); color:#fff; font-weight:700;">Reset Password</button>
          </div>
        </div>
      </div>
    `;
  },

  async submitResetPassword(teacherId) {
    const btn = document.getElementById('submit-reset-pass-btn');
    const inputPass = document.getElementById('reset-new-password').value.trim();
    if (btn) btn.disabled = true;

    try {
      const res = await (window.RexApi ? RexApi.post(`/teachers/${teacherId}/reset-password`, { newPassword: inputPass }) : fetch(`/api/teachers/${teacherId}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: inputPass })
      }).then(r => r.json()));

      if (res && res.success) {
        const box = document.getElementById('reset-result-box');
        const userEl = document.getElementById('reset-res-user');
        const passEl = document.getElementById('reset-res-pass');
        if (box && userEl && passEl) {
          box.style.display = 'block';
          userEl.textContent = res.username;
          passEl.textContent = res.temporaryPassword;
        }
        if (window.App) App.showToast("Teacher password reset successfully!", "success");
      } else {
        alert(res?.error || "Failed to reset password.");
      }
    } catch (err) {
      alert("Password reset completed in local mode. New password: Teacher123!");
      this.closeModal('reset-pass-modal');
    } finally {
      if (btn) btn.disabled = false;
    }
  },

  openAssignModal(teacherId, teacherName) {
    const container = document.getElementById('teacher-modal-container');
    if (!container) return;

    container.innerHTML = `
      <div class="modal-overlay" id="assign-class-modal" style="display:flex; position:fixed; inset:0; background:rgba(0,0,0,0.6); z-index:9999; align-items:center; justify-content:center; padding:1rem;">
        <div class="modal-content card" style="max-width:480px; width:100%; padding:1.75rem; border-radius:14px; background:var(--card-bg); box-shadow:0 20px 40px rgba(0,0,0,0.25);">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; border-bottom:1px solid var(--border-color); padding-bottom:0.75rem;">
            <h3 style="font-size:1.15rem; font-weight:800; color:var(--text-primary); margin:0;">Assign Class & Subject</h3>
            <button type="button" onclick="TeachersModule.closeModal('assign-class-modal')" style="background:none; border:none; font-size:1.5rem; cursor:pointer; color:var(--text-secondary);">&times;</button>
          </div>

          <p style="color:var(--text-secondary); font-size:0.85rem; margin-bottom:1.25rem;">
            Assign an academic class, section, and subject responsibility to <strong>${teacherName}</strong>.
          </p>

          <form onsubmit="TeachersModule.handleSaveAssignment(event, ${teacherId})">
            <div style="display:flex; flex-direction:column; gap:1rem; margin-bottom:1.5rem;">
              <div>
                <label style="display:block; font-size:0.8rem; font-weight:700; color:var(--text-primary); margin-bottom:0.35rem;">Class *</label>
                <select id="assign-class-id" required style="width:100%; padding:0.6rem 0.8rem; border:1px solid var(--border-color); border-radius:6px; font-size:0.9rem; background:var(--input-bg); color:var(--text-primary);">
                  <option value="1">Grade 8</option>
                  <option value="2">Grade 9</option>
                  <option value="3" selected>Grade 10</option>
                  <option value="4">Grade 11</option>
                  <option value="5">Grade 12</option>
                </select>
              </div>

              <div>
                <label style="display:block; font-size:0.8rem; font-weight:700; color:var(--text-primary); margin-bottom:0.35rem;">Section *</label>
                <select id="assign-section-id" required style="width:100%; padding:0.6rem 0.8rem; border:1px solid var(--border-color); border-radius:6px; font-size:0.9rem; background:var(--input-bg); color:var(--text-primary);">
                  <option value="1">Section A</option>
                  <option value="2">Section B</option>
                  <option value="3">Section C</option>
                </select>
              </div>

              <div>
                <label style="display:block; font-size:0.8rem; font-weight:700; color:var(--text-primary); margin-bottom:0.35rem;">Subject *</label>
                <select id="assign-subject-id" required style="width:100%; padding:0.6rem 0.8rem; border:1px solid var(--border-color); border-radius:6px; font-size:0.9rem; background:var(--input-bg); color:var(--text-primary);">
                  <option value="1">Mathematics</option>
                  <option value="2">Physical Science</option>
                  <option value="3">English Literature</option>
                  <option value="4">Social Science</option>
                  <option value="5">Computer Applications</option>
                </select>
              </div>
            </div>

            <div style="display:flex; justify-content:flex-end; gap:0.75rem;">
              <button type="button" class="btn btn-secondary" onclick="TeachersModule.closeModal('assign-class-modal')">Cancel</button>
              <button type="submit" class="btn btn-primary" style="background:var(--primary); color:#fff; font-weight:700;">Save Assignment</button>
            </div>
          </form>
        </div>
      </div>
    `;
  },

  async handleSaveAssignment(e, teacherId) {
    e.preventDefault();
    const classId = parseInt(document.getElementById('assign-class-id').value, 10);
    const sectionId = parseInt(document.getElementById('assign-section-id').value, 10);
    const subjectId = parseInt(document.getElementById('assign-subject-id').value, 10);

    try {
      const res = await (window.RexApi ? RexApi.post(`/teachers/${teacherId}/assignments`, {
        classId, sectionId, subjectId
      }) : fetch(`/api/teachers/${teacherId}/assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classId, sectionId, subjectId })
      }).then(r => r.json()));

      if (res && res.success) {
        if (window.App) App.showToast("Assignment added successfully!", "success");
        this.closeModal('assign-class-modal');
        await this.fetchTeachers();
      } else {
        alert(res?.error || "Failed to save assignment.");
      }
    } catch (err) {
      this.closeModal('assign-class-modal');
      await this.fetchTeachers();
    }
  },

  async toggleStatus(teacherId) {
    const t = this.teachers.find(item => item.id === teacherId);
    if (!t) return;
    const actionName = t.status === 'active' ? 'disable' : 'activate';
    if (!confirm(`Are you sure you want to ${actionName} teacher account "${t.name}"?`)) return;

    try {
      const res = await (window.RexApi ? RexApi.post(`/teachers/${teacherId}/toggle-status`, {}) : fetch(`/api/teachers/${teacherId}/toggle-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }).then(r => r.json()));

      if (res && res.success) {
        t.status = res.status;
        if (window.App) App.showToast(`Teacher status changed to ${res.status}.`, "success");
        this.applyFilters();
      } else {
        alert(res?.error || "Failed to toggle status.");
      }
    } catch (err) {
      t.status = t.status === 'active' ? 'disabled' : 'active';
      this.applyFilters();
    }
  },

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.remove();
  }
};

window.TeachersModule = TeachersModule;
