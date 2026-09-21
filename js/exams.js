/**
 * NeverSkip School ERP - Examination & Official Report Card Module
 */

const ExamsModule = {
  currentTerm: "Mid-Term 2026",

  init() {
    this.render();
    this.attachEvents();
  },

  attachEvents() {
    const termSelect = document.getElementById('exam-term-select');
    if (termSelect) {
      termSelect.addEventListener('change', (e) => {
        this.currentTerm = e.target.value;
        this.render();
      });
    }
  },

  calculateGrade(marks) {
    if (marks >= 91) return 'A1';
    if (marks >= 81) return 'A2';
    if (marks >= 71) return 'B1';
    if (marks >= 61) return 'B2';
    if (marks >= 51) return 'C1';
    if (marks >= 41) return 'C2';
    if (marks >= 33) return 'D';
    return 'E (Needs Improvement)';
  },

  render() {
    const students = ERPStorage.getStudents();
    const classStudents = students.filter(s => s.grade === "10" && s.section === "A");
    const examsData = ERPStorage.getExams();
    const termData = examsData[this.currentTerm] || {};

    const tbody = document.getElementById('exam-marks-table-body');
    if (!tbody) return;

    tbody.innerHTML = classStudents.map((s, idx) => {
      const studentResult = termData[s.id] || {
        subjects: [
          { name: "Mathematics", marksObtained: 85, maxMarks: 100, grade: "A2" },
          { name: "Science", marksObtained: 82, maxMarks: 100, grade: "A2" },
          { name: "English Language", marksObtained: 88, maxMarks: 100, grade: "A2" },
          { name: "Social Science", marksObtained: 80, maxMarks: 100, grade: "B1" },
          { name: "Computer Applications", marksObtained: 90, maxMarks: 100, grade: "A1" },
          { name: "Hindi / 2nd Lang", marksObtained: 78, maxMarks: 100, grade: "B1" }
        ],
        rank: idx + 1,
        remarks: "Consistent performance."
      };

      let totalObtained = 0;
      let totalMax = 0;
      studentResult.subjects.forEach(sub => {
        totalObtained += sub.marksObtained;
        totalMax += sub.maxMarks;
      });

      const percentage = Math.round((totalObtained / totalMax) * 100);
      const overallGrade = this.calculateGrade(percentage);

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
                <div style="font-size: 0.72rem; color: var(--text-muted);">Roll: ${s.rollNo}</div>
              </div>
            </div>
          </td>
          <td><span style="font-weight: 700;">${totalObtained} / ${totalMax}</span></td>
          <td>
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <div style="flex: 1; height: 6px; width: 50px; background: var(--border-subtle); border-radius: 3px; overflow: hidden;">
                <div style="height: 100%; width: ${percentage}%; background: ${percentage >= 80 ? '#10b981' : '#f59e0b'};"></div>
              </div>
              <span style="font-weight: 800; font-size: 0.85rem;">${percentage}%</span>
            </div>
          </td>
          <td>
            <span class="badge ${percentage >= 80 ? 'badge-present' : 'badge-warning'}">
              ${overallGrade}
            </span>
          </td>
          <td><span style="font-weight: 700; color: var(--primary);">Rank #${studentResult.rank || (idx + 1)}</span></td>
          <td style="text-align: right;">
            <button class="btn btn-sm btn-primary" onclick="ExamsModule.openReportCardModal('${s.id}')">
              📄 Official Report Card
            </button>
          </td>
        </tr>
      `;
    }).join('');
  },

  openReportCardModal(studentId) {
    const students = ERPStorage.getStudents();
    const s = students.find(item => item.id === studentId);
    if (!s) return;

    const examsData = ERPStorage.getExams();
    const termData = examsData[this.currentTerm] || {};
    const result = termData[s.id] || {
      subjects: [
        { name: "Mathematics", marksObtained: 85, maxMarks: 100, grade: "A2" },
        { name: "Science (Physics, Chem, Bio)", marksObtained: 82, maxMarks: 100, grade: "A2" },
        { name: "English Communicative", marksObtained: 88, maxMarks: 100, grade: "A2" },
        { name: "Social Science (Hist, Civ, Geo)", marksObtained: 80, maxMarks: 100, grade: "B1" },
        { name: "Computer Applications (Python/AI)", marksObtained: 90, maxMarks: 100, grade: "A1" },
        { name: "Hindi Course - A", marksObtained: 78, maxMarks: 100, grade: "B1" }
      ],
      rank: 4,
      remarks: "Demonstrates commendable curiosity and analytical skills. Keep it up!"
    };

    let totalObtained = 0;
    let totalMax = 0;
    result.subjects.forEach(sub => {
      totalObtained += sub.marksObtained;
      totalMax += sub.maxMarks;
    });
    const percentage = Math.round((totalObtained / totalMax) * 100);
    const overallGrade = this.calculateGrade(percentage);

    const modal = document.getElementById('report-card-modal');
    const content = document.getElementById('report-card-content');
    if (!modal || !content) return;

    content.innerHTML = `
      <div class="printable-document" style="max-width: 820px;">
        <div class="school-letterhead">
          <img src="${SEED_SCHOOL_INFO.logo}" alt="Rex School Logo" style="height: 56px; margin: 0 auto 8px auto; display: block; object-fit: contain;">
          <h2>${SEED_SCHOOL_INFO.name}</h2>
          <p>${SEED_SCHOOL_INFO.fullName} • ${SEED_SCHOOL_INFO.tagline}</p>
          <p>${SEED_SCHOOL_INFO.affiliation}</p>
          <p>${SEED_SCHOOL_INFO.address}</p>
          <div class="doc-badge-title">SCHOLASTIC PROGRESS REPORT CARD • ${this.currentTerm.toUpperCase()}</div>
        </div>

        <table class="print-meta-table" style="margin-bottom: 1.25rem;">
          <tr>
            <td><strong>Student Name:</strong> ${s.name}</td>
            <td style="text-align: right;"><strong>Roll No:</strong> <span style="font-family: monospace;">${s.rollNo}</span></td>
          </tr>
          <tr>
            <td><strong>Admission No:</strong> ${s.id}</td>
            <td style="text-align: right;"><strong>Class & Section:</strong> Grade ${s.grade}-${s.section}</td>
          </tr>
          <tr>
            <td><strong>Parent / Guardian:</strong> ${s.parentName}</td>
            <td style="text-align: right;"><strong>Academic Session:</strong> ${SEED_SCHOOL_INFO.academicYear}</td>
          </tr>
          <tr>
            <td><strong>Attendance:</strong> ${s.attendanceRate}%</td>
            <td style="text-align: right;"><strong>Class Rank:</strong> Rank #${result.rank || 1}</td>
          </tr>
        </table>

        <!-- Scholastic Performance Table -->
        <h4 style="font-size: 0.9rem; font-weight: 800; color: #1e3a8a; margin-bottom: 0.5rem; text-transform: uppercase;">
          Part 1: Scholastic Performance
        </h4>
        <table class="print-items-table" style="margin-bottom: 1.25rem;">
          <thead>
            <tr>
              <th style="text-align: left; width: 40px;">#</th>
              <th style="text-align: left;">Subject Title</th>
              <th style="text-align: center; width: 100px;">Max Marks</th>
              <th style="text-align: center; width: 120px;">Marks Obtained</th>
              <th style="text-align: center; width: 90px;">Grade</th>
            </tr>
          </thead>
          <tbody>
            ${result.subjects.map((sub, i) => `
              <tr>
                <td>${i + 1}</td>
                <td style="font-weight: 600;">${sub.name}</td>
                <td style="text-align: center;">${sub.maxMarks}</td>
                <td style="text-align: center; font-weight: bold;">${sub.marksObtained}</td>
                <td style="text-align: center;">
                  <span class="badge ${sub.marksObtained >= 80 ? 'badge-present' : 'badge-warning'}">
                    ${sub.grade || this.calculateGrade(sub.marksObtained)}
                  </span>
                </td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr style="background: #f8fafc; font-weight: 800;">
              <td colspan="2" style="text-align: right;">Grand Aggregate Total:</td>
              <td style="text-align: center;">${totalMax}</td>
              <td style="text-align: center; color: #1e3a8a; font-size: 11pt;">${totalObtained} (${percentage}%)</td>
              <td style="text-align: center; color: #10b981;">${overallGrade}</td>
            </tr>
          </tfoot>
        </table>

        <!-- Co-Scholastic Table -->
        <h4 style="font-size: 0.9rem; font-weight: 800; color: #1e3a8a; margin-bottom: 0.5rem; text-transform: uppercase;">
          Part 2: Co-Scholastic & Behavioral Traits
        </h4>
        <table class="print-items-table" style="margin-bottom: 1.25rem;">
          <thead>
            <tr>
              <th style="text-align: left;">Activity Domain</th>
              <th style="text-align: center; width: 120px;">Evaluation Grade</th>
              <th style="text-align: left;">Remarks</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Work Education & Digital Literacy</td>
              <td style="text-align: center; font-weight: bold; color: #10b981;">A</td>
              <td>Exemplary enthusiasm in Python coding lab</td>
            </tr>
            <tr>
              <td>Art Education & Cultural Participation</td>
              <td style="text-align: center; font-weight: bold; color: #10b981;">A</td>
              <td>Active participation in debate and drama</td>
            </tr>
            <tr>
              <td>Health, Physical Education & Sportsmanship</td>
              <td style="text-align: center; font-weight: bold; color: #10b981;">A</td>
              <td>Disciplined, shows strong teamwork on football field</td>
            </tr>
            <tr>
              <td>Discipline & Personal Conduct</td>
              <td style="text-align: center; font-weight: bold; color: #10b981;">A</td>
              <td>Punctual, polite, and respectful towards peers</td>
            </tr>
          </tbody>
        </table>

        <!-- Remarks -->
        <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 4px; padding: 10px 14px; margin-bottom: 25px;">
          <div style="font-weight: bold; font-size: 9.5pt; color: #1e3a8a; margin-bottom: 3px;">Class Teacher Remarks:</div>
          <div style="font-size: 9.5pt; color: #334155; font-style: italic;">"${result.remarks}"</div>
        </div>

        <!-- Signature Blocks -->
        <div class="receipt-signatures" style="margin-top: 35px;">
          <div class="sign-box">
            Mrs. Sunita Rao<br>
            <span style="font-size: 8pt; font-weight: normal; color: #64748b;">Class Mentor</span>
          </div>
          <div class="sign-box">
            Rev. Fr. Principal<br>
            <span style="font-size: 8pt; font-weight: normal; color: #64748b;">Principal</span>
          </div>
          <div class="sign-box">
            School Seal & Crest<br>
            <span style="font-size: 8pt; font-weight: normal; color: #64748b;">Rex Senior Secondary School, Ootacamund</span>
          </div>
        </div>
      </div>
    `;

    modal.classList.add('open');
  },

  closeReportCardModal() {
    const modal = document.getElementById('report-card-modal');
    if (modal) modal.classList.remove('open');
  },

  printReportCard() {
    window.print();
  }
};
