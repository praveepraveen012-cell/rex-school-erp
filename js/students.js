/**
 * NeverSkip School ERP - Student Information System (SIS) Module
 */

const StudentsModule = {
  currentView: 'table', // 'grid' or 'table'
  selectedStudentId: null,

  init() {
    this.render();
    this.attachEvents();
  },

  attachEvents() {
    const searchInput = document.getElementById('student-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', () => this.render());
    }

    const gradeFilter = document.getElementById('student-grade-filter');
    if (gradeFilter) {
      gradeFilter.addEventListener('change', () => this.render());
    }

    const feeFilter = document.getElementById('student-fee-filter');
    if (feeFilter) {
      feeFilter.addEventListener('change', () => this.render());
    }

    const viewToggleTable = document.getElementById('view-toggle-table');
    const viewToggleGrid = document.getElementById('view-toggle-grid');
    if (viewToggleTable && viewToggleGrid) {
      viewToggleTable.addEventListener('click', () => {
        this.currentView = 'table';
        viewToggleTable.classList.add('btn-primary');
        viewToggleTable.classList.remove('btn-secondary');
        viewToggleGrid.classList.add('btn-secondary');
        viewToggleGrid.classList.remove('btn-primary');
        this.render();
      });
      viewToggleGrid.addEventListener('click', () => {
        this.currentView = 'grid';
        viewToggleGrid.classList.add('btn-primary');
        viewToggleGrid.classList.remove('btn-secondary');
        viewToggleTable.classList.add('btn-secondary');
        viewToggleTable.classList.remove('btn-primary');
        this.render();
      });
    }

    // New Student Form Submission
    const addStudentForm = document.getElementById('add-student-form');
    if (addStudentForm) {
      addStudentForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleCreateStudent();
      });
    }
  },

  getFilteredStudents() {
    const students = ERPStorage.getStudents();
    const searchVal = (document.getElementById('student-search-input')?.value || '').toLowerCase().trim();
    const gradeVal = document.getElementById('student-grade-filter')?.value || 'all';
    const feeVal = document.getElementById('student-fee-filter')?.value || 'all';

    return students.filter(s => {
      const matchSearch = !searchVal || 
        s.name.toLowerCase().includes(searchVal) || 
        s.rollNo.toLowerCase().includes(searchVal) || 
        s.parentName.toLowerCase().includes(searchVal);

      const matchGrade = gradeVal === 'all' || s.grade === gradeVal;
      const matchFee = feeVal === 'all' || s.feeStatus.toLowerCase() === feeVal.toLowerCase();

      return matchSearch && matchGrade && matchFee;
    });
  },

  render() {
    const students = this.getFilteredStudents();
    const container = document.getElementById('students-data-container');
    if (!container) return;

    const countLabel = document.getElementById('students-count-badge');
    if (countLabel) countLabel.textContent = `${students.length} Students`;

    if (students.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 4rem 1rem; color: var(--text-muted);">
          <svg style="width: 48px; height: 48px; stroke-width: 1.5; margin-bottom: 0.75rem;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          <h4 style="font-size: 1.1rem; color: var(--text-primary); font-weight: 700;">No students found</h4>
          <p style="font-size: 0.85rem;">Try adjusting your filters or search keywords.</p>
        </div>
      `;
      return;
    }

    if (this.currentView === 'table') {
      this.renderTableView(container, students);
    } else {
      this.renderGridView(container, students);
    }
  },

  renderTableView(container, students) {
    container.innerHTML = `
      <div class="card">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Roll No</th>
                <th>Class & Sec</th>
                <th>Parent Contact</th>
                <th>Attendance</th>
                <th>Fee Status</th>
                <th style="text-align: right;">Action</th>
              </tr>
            </thead>
            <tbody>
              ${students.map(s => {
                let badgeClass = 'badge-paid';
                if (s.feeStatus === 'Partial') badgeClass = 'badge-partial';
                if (s.feeStatus === 'Overdue') badgeClass = 'badge-overdue';

                return `
                  <tr onclick="StudentsModule.openStudentDrawer('${s.id}')" style="cursor: pointer;">
                    <td>
                      <div style="display: flex; align-items: center; gap: 0.75rem;">
                        <div class="student-avatar" style="background: ${s.avatarColor || '#3b82f6'}; width: 36px; height: 36px; font-size: 0.8rem;">
                          ${s.name.charAt(0)}
                        </div>
                        <div>
                          <div style="font-weight: 700; color: var(--text-primary);">${s.name}</div>
                          <div style="font-size: 0.75rem; color: var(--text-muted);">${s.gender} • Blood: ${s.bloodGroup}</div>
                        </div>
                      </div>
                    </td>
                    <td><span style="font-family: var(--font-mono); font-weight: 600;">${s.rollNo}</span></td>
                    <td><b>Grade ${s.grade}-${s.section}</b></td>
                    <td>
                      <div>${s.parentName}</div>
                      <div style="font-size: 0.75rem; color: var(--text-muted);">${s.parentPhone}</div>
                    </td>
                    <td>
                      <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <div style="flex: 1; height: 6px; width: 60px; background: var(--border-subtle); border-radius: 3px; overflow: hidden;">
                          <div style="height: 100%; width: ${s.attendanceRate}%; background: ${s.attendanceRate >= 90 ? '#10b981' : '#f59e0b'};"></div>
                        </div>
                        <span style="font-weight: 700; font-size: 0.78rem;">${s.attendanceRate}%</span>
                      </div>
                    </td>
                    <td>
                      <span class="badge ${badgeClass}">
                        <span class="badge-dot"></span>
                        ${s.feeStatus}
                      </span>
                    </td>
                    <td style="text-align: right;" onclick="event.stopPropagation();">
                      <button class="btn btn-sm btn-outline-primary" onclick="StudentsModule.openStudentDrawer('${s.id}')">
                        360° Profile
                      </button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  renderGridView(container, students) {
    container.innerHTML = `
      <div class="student-grid">
        ${students.map(s => {
          let badgeClass = 'badge-paid';
          if (s.feeStatus === 'Partial') badgeClass = 'badge-partial';
          if (s.feeStatus === 'Overdue') badgeClass = 'badge-overdue';

          return `
            <div class="student-card" onclick="StudentsModule.openStudentDrawer('${s.id}')">
              <div class="student-card-header">
                <div class="student-avatar-wrap">
                  <div class="student-avatar" style="background: ${s.avatarColor || '#3b82f6'};">
                    ${s.name.charAt(0)}
                  </div>
                  <span class="student-status-dot" style="background-color: ${s.attendanceRate >= 90 ? '#10b981' : '#f59e0b'};"></span>
                </div>
                <div class="student-basic-info" style="flex: 1;">
                  <h4>${s.name}</h4>
                  <div class="student-roll">Roll: ${s.rollNo} • Grade ${s.grade}-${s.section}</div>
                </div>
                <span class="badge ${badgeClass}">
                  ${s.feeStatus}
                </span>
              </div>

              <div class="student-meta-list">
                <div>
                  <span class="meta-item-label">Parent:</span>
                  <div class="meta-item-val" style="text-align: left;">${s.parentName}</div>
                </div>
                <div>
                  <span class="meta-item-label">Phone:</span>
                  <div class="meta-item-val">${s.parentPhone}</div>
                </div>
                <div>
                  <span class="meta-item-label">Attendance:</span>
                  <div class="meta-item-val">${s.attendanceRate}%</div>
                </div>
                <div>
                  <span class="meta-item-label">Transport:</span>
                  <div class="meta-item-val" style="font-size: 0.7rem;">${s.busRoute.split('(')[0]}</div>
                </div>
              </div>

              <div style="display: flex; gap: 0.5rem; margin-top: auto;">
                <button class="btn btn-sm btn-outline-primary" style="flex: 1;" onclick="event.stopPropagation(); StudentsModule.openStudentDrawer('${s.id}')">
                  Full 360° Profile
                </button>
                <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation(); FeesModule.openCashierModal('${s.id}')" title="Collect Fee">
                  ₹ Pay
                </button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  },

  openStudentDrawer(studentId) {
    const students = ERPStorage.getStudents();
    const s = students.find(item => item.id === studentId);
    if (!s) return;

    this.selectedStudentId = studentId;
    const drawerOverlay = document.getElementById('student-drawer-overlay');
    const drawerContent = document.getElementById('student-drawer-content');
    if (!drawerOverlay || !drawerContent) return;

    // Generate 30-day attendance heatmap simulation
    const daysArr = [];
    for (let i = 1; i <= 28; i++) {
      let status = 'p';
      if (i % 7 === 0) status = 'h'; // Sunday
      else if (i === 6 || i === 19) status = 'a';
      else if (i === 12) status = 'l';
      daysArr.push({ day: i, status });
    }

    drawerContent.innerHTML = `
      <div class="drawer-header">
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <h3 style="font-size: 1.15rem; font-weight: 800; color: var(--text-primary);">Student 360° Profile</h3>
          <span class="badge badge-neutral" style="font-family: var(--font-mono);">${s.id}</span>
        </div>
        <button class="modal-close-btn" onclick="StudentsModule.closeStudentDrawer()">&times;</button>
      </div>

      <div class="drawer-body">
        <!-- Hero Card -->
        <div class="profile-hero">
          <div class="profile-hero-avatar" style="background: ${s.avatarColor || '#3b82f6'};">
            ${s.name.charAt(0)}
          </div>
          <div class="profile-hero-info">
            <h3>${s.name}</h3>
            <div style="color: var(--text-secondary); font-size: 0.85rem; font-weight: 600;">
              Class: Grade ${s.grade}-${s.section} • Roll No: <span style="font-family: var(--font-mono);">${s.rollNo}</span>
            </div>
            <div style="margin-top: 0.4rem; display: flex; gap: 0.5rem;">
              <span class="badge badge-present"><span class="badge-dot"></span> Active Scholar</span>
              <span class="badge badge-info">Blood: ${s.bloodGroup}</span>
            </div>
          </div>
        </div>

        <!-- Quick Action Buttons -->
        <div style="display: flex; gap: 0.5rem; margin-bottom: 1.5rem; flex-wrap: wrap;">
          <button class="btn btn-sm btn-primary" onclick="FeesModule.openCashierModal('${s.id}')">
            💳 Collect Fee
          </button>
          <button class="btn btn-sm btn-outline-primary" onclick="ExamsModule.openReportCardModal('${s.id}')">
            📄 Academic Report
          </button>
          <button class="btn btn-sm btn-secondary" onclick="CommunicationModule.openWhatsAppPreviewForStudent('${s.id}')">
            💬 Message Parent
          </button>
        </div>

        <!-- Section: Personal & Guardian Info -->
        <div style="margin-bottom: 1.5rem;">
          <h4 style="font-size: 0.9rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-muted); margin-bottom: 0.75rem;">
            Personal & Guardian Info
          </h4>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; background: var(--bg-subtle); padding: 1rem; border-radius: var(--radius-sm); font-size: 0.82rem;">
            <div>
              <span style="color: var(--text-muted);">Date of Birth:</span>
              <div style="font-weight: 700; color: var(--text-primary);">${s.dob}</div>
            </div>
            <div>
              <span style="color: var(--text-muted);">Gender:</span>
              <div style="font-weight: 700; color: var(--text-primary);">${s.gender}</div>
            </div>
            <div>
              <span style="color: var(--text-muted);">Father / Guardian:</span>
              <div style="font-weight: 700; color: var(--text-primary);">${s.parentName}</div>
            </div>
            <div>
              <span style="color: var(--text-muted);">Guardian Phone:</span>
              <div style="font-weight: 700; color: var(--text-primary); font-family: var(--font-mono);">${s.parentPhone}</div>
            </div>
            <div style="grid-column: span 2;">
              <span style="color: var(--text-muted);">Residential Address:</span>
              <div style="font-weight: 600; color: var(--text-primary);">${s.address}</div>
            </div>
            <div style="grid-column: span 2;">
              <span style="color: var(--text-muted);">Transport Route:</span>
              <div style="font-weight: 600; color: var(--primary);">${s.busRoute}</div>
            </div>
            <div style="grid-column: span 2;">
              <span style="color: var(--text-muted);">Medical Remarks:</span>
              <div style="font-weight: 600; color: #dc2626;">${s.medicalNotes || 'None'}</div>
            </div>
          </div>
        </div>

        <!-- Section: Attendance Heatmap -->
        <div style="margin-bottom: 1.5rem;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem;">
            <h4 style="font-size: 0.9rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-muted);">
              Monthly Attendance Tracker (${s.attendanceRate}%)
            </h4>
            <span style="font-size: 0.75rem; color: var(--text-muted);">September 2026</span>
          </div>

          <div style="display: flex; gap: 0.75rem; font-size: 0.72rem; margin-bottom: 0.5rem;">
            <span style="display: flex; align-items: center; gap: 0.25rem;"><span style="width: 8px; height: 8px; border-radius: 2px; background: var(--success);"></span> Present</span>
            <span style="display: flex; align-items: center; gap: 0.25rem;"><span style="width: 8px; height: 8px; border-radius: 2px; background: var(--danger);"></span> Absent</span>
            <span style="display: flex; align-items: center; gap: 0.25rem;"><span style="width: 8px; height: 8px; border-radius: 2px; background: var(--warning);"></span> Late</span>
            <span style="display: flex; align-items: center; gap: 0.25rem;"><span style="width: 8px; height: 8px; border-radius: 2px; background: var(--border-medium);"></span> Holiday</span>
          </div>

          <div class="attendance-heatmap-grid">
            ${daysArr.map(d => `
              <div class="heatmap-day ${d.status}" title="Day ${d.day}: ${d.status.toUpperCase()}">
                <span>${d.day}</span>
                <span style="font-size: 0.6rem; text-transform: uppercase;">${d.status}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Section: Fee Summary -->
        <div>
          <h4 style="font-size: 0.9rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-muted); margin-bottom: 0.75rem;">
            Fee Ledger Summary
          </h4>
          <div style="background: var(--bg-subtle); border-radius: var(--radius-sm); padding: 1rem; border: 1px solid var(--border-subtle);">
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem; font-size: 0.85rem;">
              <span style="color: var(--text-secondary);">Total Annual Fees:</span>
              <span style="font-weight: 800;">₹${(s.feesTotal || 54000).toLocaleString()}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem; font-size: 0.85rem;">
              <span style="color: var(--text-secondary);">Amount Paid To Date:</span>
              <span style="font-weight: 800; color: var(--success);">₹${(s.feesPaid || 0).toLocaleString()}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 0.85rem; border-top: 1px dashed var(--border-medium); padding-top: 0.5rem;">
              <span style="color: var(--text-secondary); font-weight: 700;">Balance Outstanding:</span>
              <span style="font-weight: 800; color: ${(s.feesTotal - s.feesPaid) > 0 ? '#dc2626' : 'var(--success)'};">
                ₹${((s.feesTotal || 54000) - (s.feesPaid || 0)).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    `;

    drawerOverlay.classList.add('open');
  },

  closeStudentDrawer() {
    const drawerOverlay = document.getElementById('student-drawer-overlay');
    if (drawerOverlay) drawerOverlay.classList.remove('open');
  },

  openEnrollModal() {
    const modal = document.getElementById('enroll-student-modal');
    if (modal) modal.classList.add('open');
  },

  closeEnrollModal() {
    const modal = document.getElementById('enroll-student-modal');
    if (modal) modal.classList.remove('open');
  },

  handleCreateStudent() {
    const name = document.getElementById('new-stu-name')?.value.trim();
    const rollNo = document.getElementById('new-stu-roll')?.value.trim();
    const grade = document.getElementById('new-stu-grade')?.value;
    const section = document.getElementById('new-stu-section')?.value;
    const gender = document.getElementById('new-stu-gender')?.value;
    const dob = document.getElementById('new-stu-dob')?.value;
    const bloodGroup = document.getElementById('new-stu-blood')?.value;
    const parentName = document.getElementById('new-stu-parent')?.value.trim();
    const parentPhone = document.getElementById('new-stu-phone')?.value.trim();
    const address = document.getElementById('new-stu-address')?.value.trim();

    if (!name || !rollNo || !parentName || !parentPhone) {
      App.showToast("Please fill all required fields", "warning");
      return;
    }

    const students = ERPStorage.getStudents();
    const newId = `STU-${1000 + students.length + 1}`;

    const newStudent = {
      id: newId,
      name,
      rollNo,
      grade,
      section,
      gender,
      dob: dob || "2011-01-01",
      bloodGroup: bloodGroup || "O+",
      parentName,
      parentPhone,
      parentEmail: `${parentName.toLowerCase().replace(/\s+/g, '.')}@gmail.com`,
      address: address || "New Delhi",
      admissionDate: new Date().toISOString().split('T')[0],
      status: "Active",
      feeStatus: "Paid",
      feesTotal: 54000,
      feesPaid: 54000,
      attendanceRate: 100,
      busRoute: "Route 01 (General)",
      medicalNotes: "None",
      avatarColor: "#2563eb"
    };

    students.unshift(newStudent);
    ERPStorage.saveStudents(students);
    ERPStorage.addActivity(`New student enrolled: ${name} (Class ${grade}-${section}, Roll: ${rollNo})`);

    this.closeEnrollModal();
    this.render();
    DashboardModule.render();
    App.showToast(`Student ${name} successfully enrolled!`, "success");

    // Clear form
    document.getElementById('add-student-form')?.reset();
  }
};
