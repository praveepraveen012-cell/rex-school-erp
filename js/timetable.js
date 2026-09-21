/**
 * NeverSkip School ERP - Timetable & Teacher Substitution Module
 */

const TimetableModule = {
  currentClass: "10-A",

  init() {
    this.render();
    this.attachEvents();
  },

  attachEvents() {
    const classSelect = document.getElementById('timetable-class-select');
    if (classSelect) {
      classSelect.addEventListener('change', (e) => {
        this.currentClass = e.target.value;
        this.render();
      });
    }
  },

  render() {
    const container = document.getElementById('timetable-grid-content');
    if (!container) return;

    const timetableData = ERPStorage.getTimetable();
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    // Sample schedule generators for other days based on Monday/Tuesday
    const mondaySched = timetableData['Monday'] || [];
    const tuesdaySched = timetableData['Tuesday'] || [];

    const scheduleByDay = {
      Monday: mondaySched,
      Tuesday: tuesdaySched,
      Wednesday: [
        { period: 1, time: "08:00 - 08:45", subject: "English Literature", teacher: "Mrs. Sunita Rao", room: "Room 204", type: "subject-english" },
        { period: 2, time: "08:45 - 09:30", subject: "Social Science", teacher: "Mr. Vivek Nanda", room: "Room 204", type: "subject-social" },
        { period: 3, time: "09:30 - 10:15", subject: "Science (Biology)", teacher: "Dr. Anita Desai", room: "Biology Lab", type: "subject-science" },
        { period: 4, time: "10:15 - 10:45", subject: "Short Break", teacher: "-", room: "Courtyard", type: "subject-break" },
        { period: 5, time: "10:45 - 11:30", subject: "Mathematics", teacher: "Mr. R.K. Sharma", room: "Room 204", type: "subject-math" },
        { period: 6, time: "11:30 - 12:15", subject: "Computer Apps", teacher: "Ms. Shalini Gupta", room: "Computer Lab 1", type: "subject-computer" },
        { period: 7, time: "12:15 - 01:00", subject: "Hindi / 2nd Lang", teacher: "Mr. S.P. Tiwari", room: "Room 204", type: "subject-social" },
        { period: 8, time: "01:00 - 01:45", subject: "Music & Band", teacher: "Mr. David Paul", room: "Music Room", type: "subject-break" }
      ],
      Thursday: [
        { period: 1, time: "08:00 - 08:45", subject: "Mathematics", teacher: "Mr. R.K. Sharma", room: "Room 204", type: "subject-math" },
        { period: 2, time: "08:45 - 09:30", subject: "Science (Physics)", teacher: "Dr. Anita Desai", room: "Physics Lab", type: "subject-science" },
        { period: 3, time: "09:30 - 10:15", subject: "Physical Education", teacher: "Coach Vikram", room: "Sports Ground", type: "subject-sports" },
        { period: 4, time: "10:15 - 10:45", subject: "Short Break", teacher: "-", room: "Courtyard", type: "subject-break" },
        { period: 5, time: "10:45 - 11:30", subject: "English Language", teacher: "Mrs. Sunita Rao", room: "Room 204", type: "subject-english" },
        { period: 6, time: "11:30 - 12:15", subject: "Social Science", teacher: "Mr. Vivek Nanda", room: "Room 204", type: "subject-social" },
        { period: 7, time: "12:15 - 01:00", subject: "Science (Chemistry)", teacher: "Dr. Anita Desai", room: "Chemistry Lab", type: "subject-science" },
        { period: 8, time: "01:00 - 01:45", subject: "Life Skills / Debate", teacher: "Mrs. Sunita Rao", room: "Room 204", type: "subject-english" }
      ],
      Friday: [
        { period: 1, time: "08:00 - 08:45", subject: "Science (Chemistry)", teacher: "Dr. Anita Desai", room: "Chemistry Lab", type: "subject-science" },
        { period: 2, time: "08:45 - 09:30", subject: "Mathematics", teacher: "Mr. R.K. Sharma", room: "Room 204", type: "subject-math" },
        { period: 3, time: "09:30 - 10:15", subject: "Computer Apps", teacher: "Ms. Shalini Gupta", room: "Computer Lab 1", type: "subject-computer" },
        { period: 4, time: "10:15 - 10:45", subject: "Short Break", teacher: "-", room: "Courtyard", type: "subject-break" },
        { period: 5, time: "10:45 - 11:30", subject: "Social Science", teacher: "Mr. Vivek Nanda", room: "Room 204", type: "subject-social" },
        { period: 6, time: "11:30 - 12:15", subject: "English Literature", teacher: "Mrs. Sunita Rao", room: "Room 204", type: "subject-english" },
        { period: 7, time: "12:15 - 01:00", subject: "Club Activities", teacher: "Faculty Leads", room: "Campus Activity", type: "subject-break" },
        { period: 8, time: "01:00 - 01:45", subject: "Remedial Coaching", teacher: "Subject Teachers", room: "Room 204", type: "subject-math" }
      ],
      Saturday: [
        { period: 1, time: "08:00 - 08:45", subject: "Mathematics Quiz", teacher: "Mr. R.K. Sharma", room: "Room 204", type: "subject-math" },
        { period: 2, time: "08:45 - 09:30", subject: "Science Projects", teacher: "Dr. Anita Desai", room: "Science Lab", type: "subject-science" },
        { period: 3, time: "09:30 - 10:15", subject: "Sports & Athletics", teacher: "Coach Vikram", room: "Athletics Field", type: "subject-sports" },
        { period: 4, time: "10:15 - 10:45", subject: "Short Break", teacher: "-", room: "Courtyard", type: "subject-break" },
        { period: 5, time: "10:45 - 11:30", subject: "Houses Meeting", teacher: "House Masters", room: "Auditorium", type: "subject-english" },
        { period: 6, time: "11:30 - 12:15", subject: "Dispersal", teacher: "-", room: "Bus Bays", type: "subject-break" },
        { period: 7, time: "12:15 - 01:00", subject: "-", teacher: "-", room: "-", type: "subject-break" },
        { period: 8, time: "01:00 - 01:45", subject: "-", teacher: "-", room: "-", type: "subject-break" }
      ]
    };

    container.innerHTML = `
      <table class="timetable-table">
        <thead>
          <tr>
            <th style="width: 100px;">Day</th>
            <th>P1<br><small style="font-weight: normal;">08:00-08:45</small></th>
            <th>P2<br><small style="font-weight: normal;">08:45-09:30</small></th>
            <th>P3<br><small style="font-weight: normal;">09:30-10:15</small></th>
            <th style="background: var(--bg-subtle); width: 80px;">Break<br><small style="font-weight: normal;">10:15-10:45</small></th>
            <th>P4<br><small style="font-weight: normal;">10:45-11:30</small></th>
            <th>P5<br><small style="font-weight: normal;">11:30-12:15</small></th>
            <th>P6<br><small style="font-weight: normal;">12:15-01:00</small></th>
            <th>P7<br><small style="font-weight: normal;">01:00-01:45</small></th>
          </tr>
        </thead>
        <tbody>
          ${days.map(day => {
            const periods = scheduleByDay[day] || [];
            return `
              <tr>
                <td class="timetable-day-header">${day}</td>
                ${periods.map((slot, pIdx) => `
                  <td>
                    <div class="timetable-slot-card ${slot.type}" onclick="TimetableModule.openSubstitutionModal('${day}', ${pIdx + 1}, '${slot.subject}', '${slot.teacher}', '${slot.room}')">
                      <div>
                        <div class="slot-subject">${slot.subject}</div>
                        <div class="slot-teacher">${slot.teacher}</div>
                      </div>
                      <div class="slot-room">${slot.room}</div>
                    </div>
                  </td>
                `).join('')}
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;
  },

  openSubstitutionModal(day, period, subject, teacher, room) {
    if (subject === "Short Break" || subject === "-") return;

    const modal = document.getElementById('substitution-modal');
    const content = document.getElementById('substitution-modal-content');
    if (!modal || !content) return;

    content.innerHTML = `
      <div style="background: var(--bg-subtle); padding: 1.25rem; border-radius: var(--radius-sm); margin-bottom: 1.25rem;">
        <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Selected Slot</div>
        <h4 style="font-size: 1.15rem; font-weight: 800; color: var(--text-primary); margin: 0.2rem 0;">
          ${subject} • ${day} (Period ${period})
        </h4>
        <p style="font-size: 0.85rem; color: var(--text-secondary); margin: 0;">
          Currently Assigned Faculty: <b>${teacher}</b> • Venue: <b>${room}</b>
        </p>
      </div>

      <div class="form-group" style="margin-bottom: 1.25rem;">
        <label class="form-label" style="font-weight: 700;">Select Substitute Teacher (Available Free Staff):</label>
        <select class="form-select" id="substitute-teacher-select">
          <option value="Mr. Amit Sen (Senior Faculty - Free this slot)">Mr. Amit Sen (Senior Faculty - Free this slot)</option>
          <option value="Ms. Shalini Gupta (Computer Science Dept - Free)">Ms. Shalini Gupta (Computer Science Dept - Free)</option>
          <option value="Mr. David Paul (Music/Activity Lead - Free)">Mr. David Paul (Music/Activity Lead - Free)</option>
          <option value="Mrs. M. Kapoor (Library Incharge - Free)">Mrs. M. Kapoor (Library Incharge - Free)</option>
        </select>
      </div>

      <div class="form-group" style="margin-bottom: 1.25rem;">
        <label class="form-label" style="font-weight: 700;">Reason for Substitution:</label>
        <select class="form-select" id="substitute-reason">
          <option value="Medical Leave">Medical Leave</option>
          <option value="Official CBSE Duty / Evaluation">Official CBSE Duty / Evaluation</option>
          <option value="Inter-School Competition Delegation">Inter-School Competition Delegation</option>
          <option value="Emergency Personal Leave">Emergency Personal Leave</option>
        </select>
      </div>

      <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: var(--radius-sm); padding: 0.85rem; font-size: 0.8rem; color: #1e40af;">
        ℹ️ The substituted faculty and class monitor will receive an instant NeverSkip push notification and SMS regarding this period arrangement.
      </div>
    `;

    modal.classList.add('open');
  },

  closeSubstitutionModal() {
    const modal = document.getElementById('substitution-modal');
    if (modal) modal.classList.remove('open');
  },

  confirmSubstitution() {
    const teacherSelect = document.getElementById('substitute-teacher-select');
    const substituteName = teacherSelect?.value.split('(')[0].trim() || 'Substitute Teacher';

    ERPStorage.addActivity(`Teacher substitution assigned: ${substituteName} will cover Grade ${this.currentClass}`);
    this.closeSubstitutionModal();
    App.showToast(`Arranged substitute teacher: ${substituteName}`, "success");
    DashboardModule.render();
  }
};
