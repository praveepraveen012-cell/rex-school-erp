/**
 * NeverSkip School ERP - Smart Attendance Management Module
 */

const AttendanceModule = {
  currentClass: "10-A",
  currentDate: "2026-09-21",

  init() {
    this.render();
    this.attachEvents();
  },

  attachEvents() {
    const classSelector = document.getElementById('att-class-select');
    if (classSelector) {
      classSelector.addEventListener('change', (e) => {
        this.currentClass = e.target.value;
        this.render();
      });
    }

    const dateSelector = document.getElementById('att-date-input');
    if (dateSelector) {
      dateSelector.value = this.currentDate;
      dateSelector.addEventListener('change', (e) => {
        this.currentDate = e.target.value;
        this.render();
      });
    }

    const markAllBtn = document.getElementById('att-mark-all-present');
    if (markAllBtn) {
      markAllBtn.addEventListener('click', () => this.markAllPresent());
    }

    const sendAlertsBtn = document.getElementById('att-send-absent-alerts');
    if (sendAlertsBtn) {
      sendAlertsBtn.addEventListener('click', () => this.openAbsentAlertModal());
    }
  },

  render() {
    const students = ERPStorage.getStudents();
    const attendanceData = ERPStorage.getAttendance();
    const classRecords = attendanceData[this.currentClass] || {};

    const [targetGrade, targetSection] = this.currentClass.split('-');
    const classStudents = students.filter(s => s.grade === targetGrade && s.section === targetSection);

    // Compute stats
    let present = 0, absent = 0, late = 0, excused = 0;
    classStudents.forEach(s => {
      const status = classRecords[s.id] || 'P';
      if (status === 'P') present++;
      else if (status === 'A') absent++;
      else if (status === 'L') late++;
      else if (status === 'E') excused++;
    });

    const total = classStudents.length;
    const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 0;

    // Update Stats Chips
    const elStats = document.getElementById('att-stats-summary');
    if (elStats) {
      elStats.innerHTML = `
        <div class="stat-badge" style="background: var(--bg-subtle); color: var(--text-primary);">
          <span>Enrolled: <b>${total}</b></span>
        </div>
        <div class="stat-badge" style="background: var(--success-subtle); color: #065f46; border: 1px solid var(--success-border);">
          <span>Present: <b>${present}</b></span>
        </div>
        <div class="stat-badge" style="background: var(--danger-subtle); color: #991b1b; border: 1px solid var(--danger-border);">
          <span>Absent: <b>${absent}</b></span>
        </div>
        <div class="stat-badge" style="background: var(--warning-subtle); color: #92400e; border: 1px solid var(--warning-border);">
          <span>Late: <b>${late}</b></span>
        </div>
        <div class="stat-badge" style="background: var(--primary-50); color: var(--primary-700);">
          <span>Attendance: <b>${rate}%</b></span>
        </div>
      `;
    }

    const container = document.getElementById('att-table-body');
    if (!container) return;

    if (classStudents.length === 0) {
      container.innerHTML = `
        <tr><td colspan="6" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
          No students registered in Grade ${this.currentClass}.
        </td></tr>
      `;
      return;
    }

    container.innerHTML = classStudents.map((s, idx) => {
      const currentStatus = classRecords[s.id] || 'P';

      return `
        <tr>
          <td style="font-weight: 700; width: 40px; color: var(--text-muted);">${idx + 1}</td>
          <td>
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <div class="student-avatar" style="background: ${s.avatarColor || '#3b82f6'}; width: 34px; height: 34px; font-size: 0.75rem;">
                ${s.name.charAt(0)}
              </div>
              <div>
                <div style="font-weight: 700; color: var(--text-primary);">${s.name}</div>
                <div style="font-size: 0.72rem; color: var(--text-muted);">Parent: ${s.parentName} (${s.parentPhone})</div>
              </div>
            </div>
          </td>
          <td><span style="font-family: var(--font-mono); font-weight: 600;">${s.rollNo}</span></td>
          <td>
            <span style="font-weight: 700; color: ${s.attendanceRate >= 90 ? '#10b981' : '#f59e0b'};">
              ${s.attendanceRate}%
            </span>
          </td>
          <td>
            <div class="attendance-btn-group">
              <button class="att-btn ${currentStatus === 'P' ? 'active-p' : ''}" 
                onclick="AttendanceModule.setStatus('${s.id}', 'P')">P</button>
              <button class="att-btn ${currentStatus === 'A' ? 'active-a' : ''}" 
                onclick="AttendanceModule.setStatus('${s.id}', 'A')">A</button>
              <button class="att-btn ${currentStatus === 'L' ? 'active-l' : ''}" 
                onclick="AttendanceModule.setStatus('${s.id}', 'L')">L</button>
              <button class="att-btn ${currentStatus === 'E' ? 'active-e' : ''}" 
                onclick="AttendanceModule.setStatus('${s.id}', 'E')">E</button>
            </div>
          </td>
          <td style="font-size: 0.8rem; color: var(--text-muted);">
            ${currentStatus === 'A' ? '<span style="color: #dc2626; font-weight: 700;">● Absent Alert Pending</span>' : 'Normal'}
          </td>
        </tr>
      `;
    }).join('');
  },

  setStatus(studentId, status) {
    const attendanceData = ERPStorage.getAttendance();
    if (!attendanceData[this.currentClass]) {
      attendanceData[this.currentClass] = {};
    }
    attendanceData[this.currentClass][studentId] = status;
    ERPStorage.saveAttendance(attendanceData);

    this.render();
    DashboardModule.render();
  },

  markAllPresent() {
    const students = ERPStorage.getStudents();
    const attendanceData = ERPStorage.getAttendance();
    const [targetGrade, targetSection] = this.currentClass.split('-');
    const classStudents = students.filter(s => s.grade === targetGrade && s.section === targetSection);

    if (!attendanceData[this.currentClass]) {
      attendanceData[this.currentClass] = {};
    }

    classStudents.forEach(s => {
      attendanceData[this.currentClass][s.id] = 'P';
    });

    ERPStorage.saveAttendance(attendanceData);
    ERPStorage.addActivity(`Marked all ${classStudents.length} students Present in Grade ${this.currentClass}`);
    this.render();
    DashboardModule.render();
    App.showToast(`Marked all students in Grade ${this.currentClass} as Present!`, "success");
  },

  openAbsentAlertModal() {
    const students = ERPStorage.getStudents();
    const attendanceData = ERPStorage.getAttendance();
    const classRecords = attendanceData[this.currentClass] || {};

    const [targetGrade, targetSection] = this.currentClass.split('-');
    const absentees = students.filter(s => s.grade === targetGrade && s.section === targetSection && classRecords[s.id] === 'A');

    const modal = document.getElementById('absent-alert-modal');
    const content = document.getElementById('absent-alert-modal-content');
    if (!modal || !content) return;

    if (absentees.length === 0) {
      content.innerHTML = `
        <div style="text-align: center; padding: 2rem; color: var(--text-secondary);">
          <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🎉</div>
          <h4 style="font-size: 1.1rem; font-weight: 700; color: var(--text-primary);">Zero Absentees Today!</h4>
          <p style="font-size: 0.85rem; margin-top: 0.25rem;">Every student in Grade ${this.currentClass} is present or excused.</p>
        </div>
      `;
    } else {
      content.innerHTML = `
        <div style="margin-bottom: 1.25rem;">
          <p style="font-size: 0.88rem; color: var(--text-secondary);">
            The following <b>${absentees.length} student(s)</b> are marked absent today in Grade <b>${this.currentClass}</b>.
            An automated WhatsApp & SMS alert will be dispatched to their primary parent contact numbers.
          </p>
        </div>

        <div style="display: flex; flex-direction: column; gap: 0.75rem; max-height: 260px; overflow-y: auto; margin-bottom: 1.5rem;">
          ${absentees.map(s => `
            <div style="background: var(--bg-subtle); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 0.85rem; display: flex; align-items: center; justify-content: space-between;">
              <div style="display: flex; align-items: center; gap: 0.75rem;">
                <div class="student-avatar" style="background: #ef4444; width: 34px; height: 34px; font-size: 0.75rem;">
                  ${s.name.charAt(0)}
                </div>
                <div>
                  <div style="font-weight: 700; color: var(--text-primary); font-size: 0.88rem;">${s.name} (${s.rollNo})</div>
                  <div style="font-size: 0.75rem; color: var(--text-muted);">Parent: ${s.parentName} • ${s.parentPhone}</div>
                </div>
              </div>
              <span class="badge badge-absent">Absent</span>
            </div>
          `).join('')}
        </div>

        <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: var(--radius-sm); padding: 0.85rem; font-size: 0.8rem; color: #065f46;">
          <b>Message Template:</b> "Dear Parent, your ward {student_name} is marked ABSENT today (${this.currentDate}). Kindly contact the school office if this is unexpected."
        </div>
      `;
    }

    modal.classList.add('open');
  },

  closeAbsentAlertModal() {
    const modal = document.getElementById('absent-alert-modal');
    if (modal) modal.classList.remove('open');
  },

  dispatchAbsentAlerts() {
    const attendanceData = ERPStorage.getAttendance();
    const classRecords = attendanceData[this.currentClass] || {};
    const students = ERPStorage.getStudents();
    const [targetGrade, targetSection] = this.currentClass.split('-');
    const absentees = students.filter(s => s.grade === targetGrade && s.section === targetSection && classRecords[s.id] === 'A');

    if (absentees.length === 0) {
      this.closeAbsentAlertModal();
      return;
    }

    ERPStorage.addActivity(`Dispatched WhatsApp & SMS absence alerts to ${absentees.length} parent(s) in Grade ${this.currentClass}`);
    this.closeAbsentAlertModal();
    App.showToast(`Dispatched WhatsApp absence alerts to ${absentees.length} guardians!`, "success");
    DashboardModule.render();
  }
};
