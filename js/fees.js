/**
 * NeverSkip School ERP - Fee Cashier & Receipt Management Module
 */

const FeesModule = {
  selectedStudent: null,
  selectedPaymentMode: 'UPI',

  init() {
    this.render();
    this.attachEvents();
  },

  attachEvents() {
    const searchInput = document.getElementById('fee-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', () => this.renderTable());
    }

    const filterStatus = document.getElementById('fee-status-filter');
    if (filterStatus) {
      filterStatus.addEventListener('change', () => this.renderTable());
    }
  },

  render() {
    const students = ERPStorage.getStudents();
    let totalBilled = 0;
    let totalCollected = 0;
    let overdueCount = 0;

    students.forEach(s => {
      const tot = s.feesTotal || 54000;
      const paid = s.feesPaid || 0;
      totalBilled += tot;
      totalCollected += paid;
      if (tot > paid) overdueCount++;
    });

    const outstanding = totalBilled - totalCollected;

    // Update Fee KPI cards
    const elBilled = document.getElementById('fee-total-billed');
    if (elBilled) elBilled.textContent = `₹${totalBilled.toLocaleString()}`;

    const elCollected = document.getElementById('fee-total-collected');
    if (elCollected) elCollected.textContent = `₹${totalCollected.toLocaleString()}`;

    const elOutstanding = document.getElementById('fee-total-outstanding');
    if (elOutstanding) elOutstanding.textContent = `₹${outstanding.toLocaleString()}`;

    const elOverdueCount = document.getElementById('fee-overdue-count');
    if (elOverdueCount) elOverdueCount.textContent = `${overdueCount} Accounts`;

    this.renderTable();
  },

  renderTable() {
    const students = ERPStorage.getStudents();
    const searchVal = (document.getElementById('fee-search-input')?.value || '').toLowerCase().trim();
    const statusVal = document.getElementById('fee-status-filter')?.value || 'all';

    const filtered = students.filter(s => {
      const matchSearch = !searchVal || 
        s.name.toLowerCase().includes(searchVal) || 
        s.rollNo.toLowerCase().includes(searchVal);
      const matchStatus = statusVal === 'all' || s.feeStatus.toLowerCase() === statusVal.toLowerCase();
      return matchSearch && matchStatus;
    });

    const tbody = document.getElementById('fee-table-body');
    if (!tbody) return;

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">No records found.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(s => {
      const due = (s.feesTotal || 54000) - (s.feesPaid || 0);
      let badgeClass = 'badge-paid';
      if (s.feeStatus === 'Partial') badgeClass = 'badge-partial';
      if (s.feeStatus === 'Overdue') badgeClass = 'badge-overdue';

      return `
        <tr>
          <td>
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <div class="student-avatar" style="background: ${s.avatarColor || '#3b82f6'}; width: 34px; height: 34px; font-size: 0.75rem;">
                ${s.name.charAt(0)}
              </div>
              <div>
                <div style="font-weight: 700; color: var(--text-primary);">${s.name}</div>
                <div style="font-size: 0.72rem; color: var(--text-muted);">Class: Grade ${s.grade}-${s.section}</div>
              </div>
            </div>
          </td>
          <td><span style="font-family: var(--font-mono); font-weight: 600;">${s.rollNo}</span></td>
          <td style="font-weight: 700;">₹${(s.feesTotal || 54000).toLocaleString()}</td>
          <td style="color: var(--success); font-weight: 700;">₹${(s.feesPaid || 0).toLocaleString()}</td>
          <td style="color: ${due > 0 ? '#dc2626' : 'var(--text-muted)'}; font-weight: 800;">
            ₹${due.toLocaleString()}
          </td>
          <td>
            <span class="badge ${badgeClass}">
              <span class="badge-dot"></span>
              ${s.feeStatus}
            </span>
          </td>
          <td style="text-align: right;">
            ${due > 0 ? `
              <button class="btn btn-sm btn-primary" onclick="FeesModule.openCashierModal('${s.id}')">
                💳 Collect Fee
              </button>
            ` : `
              <button class="btn btn-sm btn-secondary" onclick="FeesModule.previewReceipt('${s.id}')">
                🧾 Receipt
              </button>
            `}
          </td>
        </tr>
      `;
    }).join('');
  },

  openCashierModal(studentId) {
    const students = ERPStorage.getStudents();
    const s = students.find(item => item.id === studentId);
    if (!s) return;

    this.selectedStudent = s;
    const due = (s.feesTotal || 54000) - (s.feesPaid || 0);

    const modal = document.getElementById('cashier-modal');
    const content = document.getElementById('cashier-modal-content');
    if (!modal || !content) return;

    content.innerHTML = `
      <div style="background: var(--bg-subtle); border-radius: var(--radius-sm); padding: 1.25rem; margin-bottom: 1.25rem; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <h4 style="font-size: 1.1rem; font-weight: 800; color: var(--text-primary); margin: 0;">${s.name}</h4>
          <p style="font-size: 0.8rem; color: var(--text-secondary); margin: 0.2rem 0 0 0;">
            Roll No: <b>${s.rollNo}</b> • Grade <b>${s.grade}-${s.section}</b> • Parent: <b>${s.parentName}</b>
          </p>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 700;">CURRENT DUE BALANCE</div>
          <div style="font-size: 1.4rem; font-weight: 800; color: #dc2626;">₹${due.toLocaleString()}</div>
        </div>
      </div>

      <!-- Payment Amount -->
      <div class="form-group" style="margin-bottom: 1.25rem;">
        <label class="form-label" style="font-weight: 700;">Payment Amount to Collect (₹):</label>
        <div style="display: flex; gap: 0.5rem;">
          <input type="number" id="cashier-pay-amount" class="form-control" value="${due > 0 ? due : 54000}" min="1" max="${due > 0 ? due : 54000}" style="font-size: 1.1rem; font-weight: 800;" />
          <button class="btn btn-secondary" onclick="document.getElementById('cashier-pay-amount').value = ${due > 0 ? due : 54000}">Full Due</button>
        </div>
      </div>

      <!-- Payment Mode -->
      <div class="form-group" style="margin-bottom: 1.25rem;">
        <label class="form-label" style="font-weight: 700;">Select Payment Channel:</label>
        <div class="payment-modes-grid">
          <div class="payment-mode-pill selected" id="pm-upi" onclick="FeesModule.selectMode('UPI')">
            <span>📱 UPI / QR</span>
          </div>
          <div class="payment-mode-pill" id="pm-card" onclick="FeesModule.selectMode('Card')">
            <span>💳 Card / POS</span>
          </div>
          <div class="payment-mode-pill" id="pm-netbanking" onclick="FeesModule.selectMode('NetBanking')">
            <span>🏛️ NetBanking</span>
          </div>
          <div class="payment-mode-pill" id="pm-cash" onclick="FeesModule.selectMode('Cash')">
            <span>💵 Cash Counter</span>
          </div>
        </div>
      </div>

      <!-- Dynamic QR Code simulation for UPI -->
      <div id="payment-qr-container" style="background: #f8fafc; border: 1px dashed var(--border-medium); border-radius: var(--radius-sm); padding: 1.25rem; text-align: center; margin-bottom: 1rem;">
        <div style="display: inline-block; padding: 10px; background: #fff; border-radius: 8px; box-shadow: var(--shadow-sm); margin-bottom: 0.5rem;">
          <svg width="120" height="120" viewBox="0 0 100 100">
            <!-- Simulated QR Pattern -->
            <rect width="100" height="100" fill="#ffffff" />
            <rect x="5" y="5" width="25" height="25" fill="#000" />
            <rect x="10" y="10" width="15" height="15" fill="#fff" />
            <rect x="13" y="13" width="9" height="9" fill="#000" />
            <rect x="70" y="5" width="25" height="25" fill="#000" />
            <rect x="75" y="10" width="15" height="15" fill="#fff" />
            <rect x="78" y="13" width="9" height="9" fill="#000" />
            <rect x="5" y="70" width="25" height="25" fill="#000" />
            <rect x="10" y="75" width="15" height="15" fill="#fff" />
            <rect x="13" y="78" width="9" height="9" fill="#000" />
            <!-- Inner dots -->
            <rect x="35" y="10" width="8" height="8" fill="#000" />
            <rect x="48" y="15" width="12" height="8" fill="#000" />
            <rect x="35" y="35" width="30" height="30" fill="#2563eb" rx="4" />
            <text x="50" y="53" text-anchor="middle" fill="#fff" font-size="9" font-weight="bold">UPI</text>
            <rect x="70" y="70" width="10" height="10" fill="#000" />
            <rect x="85" y="85" width="10" height="10" fill="#000" />
          </svg>
        </div>
        <div style="font-size: 0.8rem; font-weight: 700; color: var(--text-primary);">Scan with Any UPI App (GPay / PhonePe / Paytm)</div>
        <div style="font-size: 0.72rem; color: var(--text-muted); font-family: var(--font-mono);">rexschool.ooty@icici</div>
      </div>
    `;

    modal.classList.add('open');
  },

  selectMode(mode) {
    this.selectedPaymentMode = mode;
    document.querySelectorAll('.payment-mode-pill').forEach(el => el.classList.remove('selected'));
    const target = document.getElementById(`pm-${mode.toLowerCase()}`);
    if (target) target.classList.add('selected');

    const qrContainer = document.getElementById('payment-qr-container');
    if (qrContainer) {
      if (mode === 'UPI') {
        qrContainer.style.display = 'block';
      } else {
        qrContainer.style.display = 'none';
      }
    }
  },

  closeCashierModal() {
    const modal = document.getElementById('cashier-modal');
    if (modal) modal.classList.remove('open');
  },

  processPayment() {
    if (!this.selectedStudent) return;

    const amountInput = document.getElementById('cashier-pay-amount');
    const amount = parseInt(amountInput?.value || 0, 10);
    if (amount <= 0) {
      App.showToast("Please enter a valid payment amount", "warning");
      return;
    }

    const students = ERPStorage.getStudents();
    const index = students.findIndex(s => s.id === this.selectedStudent.id);
    if (index === -1) return;

    students[index].feesPaid = (students[index].feesPaid || 0) + amount;
    if (students[index].feesPaid >= students[index].feesTotal) {
      students[index].feeStatus = 'Paid';
    } else {
      students[index].feeStatus = 'Partial';
    }

    ERPStorage.saveStudents(students);
    const receiptNo = `REC-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    ERPStorage.addActivity(`Fee collection of ₹${amount.toLocaleString()} received for ${students[index].name} (${receiptNo}) via ${this.selectedPaymentMode}`);

    this.closeCashierModal();
    this.render();
    DashboardModule.render();
    App.showToast(`Payment of ₹${amount.toLocaleString()} processed successfully!`, "success");

    // Open Printable Receipt
    this.showPrintableReceipt(students[index], amount, receiptNo, this.selectedPaymentMode);
  },

  previewReceipt(studentId) {
    const students = ERPStorage.getStudents();
    const s = students.find(item => item.id === studentId);
    if (!s) return;

    const receiptNo = `REC-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    this.showPrintableReceipt(s, s.feesPaid, receiptNo, "Online Gateway");
  },

  showPrintableReceipt(student, amount, receiptNo, mode) {
    const modal = document.getElementById('receipt-preview-modal');
    const content = document.getElementById('receipt-preview-content');
    if (!modal || !content) return;

    const dateStr = new Date().toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });

    content.innerHTML = `
      <div class="printable-document">
        <div class="school-letterhead">
          <img src="${SEED_SCHOOL_INFO.logo}" alt="Rex School Logo" style="height: 52px; margin: 0 auto 8px auto; display: block; object-fit: contain;">
          <h2>${SEED_SCHOOL_INFO.name}</h2>
          <p>${SEED_SCHOOL_INFO.fullName} • ${SEED_SCHOOL_INFO.tagline}</p>
          <p>${SEED_SCHOOL_INFO.affiliation}</p>
          <p>${SEED_SCHOOL_INFO.address} • Tel: ${SEED_SCHOOL_INFO.phone}</p>
          <div class="doc-badge-title">OFFICIAL FEE RECEIPT</div>
        </div>

        <table class="print-meta-table">
          <tr>
            <td><strong>Receipt No:</strong> <span style="font-family: monospace;">${receiptNo}</span></td>
            <td style="text-align: right;"><strong>Date:</strong> ${dateStr}</td>
          </tr>
          <tr>
            <td><strong>Student Name:</strong> ${student.name}</td>
            <td style="text-align: right;"><strong>Roll No:</strong> ${student.rollNo}</td>
          </tr>
          <tr>
            <td><strong>Class & Section:</strong> Grade ${student.grade}-${student.section}</td>
            <td style="text-align: right;"><strong>Academic Year:</strong> ${SEED_SCHOOL_INFO.academicYear}</td>
          </tr>
          <tr>
            <td><strong>Parent / Guardian:</strong> ${student.parentName}</td>
            <td style="text-align: right;"><strong>Payment Channel:</strong> ${mode}</td>
          </tr>
        </table>

        <table class="print-items-table" style="margin-top: 15px;">
          <thead>
            <tr>
              <th style="text-align: left; width: 40px;">#</th>
              <th style="text-align: left;">Particulars / Fee Breakdown</th>
              <th style="text-align: right; width: 120px;">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>1</td>
              <td>Quarterly Tuition & Academic Instruction Fee</td>
              <td style="text-align: right;">₹36,000</td>
            </tr>
            <tr>
              <td>2</td>
              <td>STEM Laboratories, Robotics & Computer Lab Fee</td>
              <td style="text-align: right;">₹8,000</td>
            </tr>
            <tr>
              <td>3</td>
              <td>Sports Arena & Physical Education Activity Fee</td>
              <td style="text-align: right;">₹4,000</td>
            </tr>
            <tr>
              <td>4</td>
              <td>Digital Learning Management & Library Resources</td>
              <td style="text-align: right;">₹6,000</td>
            </tr>
          </tbody>
          <tfoot>
            <tr style="background: #f8fafc; font-weight: bold;">
              <td colspan="2" style="text-align: right; font-size: 11pt;">Total Paid This Receipt:</td>
              <td style="text-align: right; font-size: 11pt; color: #10b981;">₹${amount.toLocaleString()}</td>
            </tr>
          </tfoot>
        </table>

        <div style="margin-top: 15px; font-size: 9pt; color: #64748b;">
          <i>Amount in words: Indian Rupees Fifty Four Thousand Only. Computer generated voucher via Rex Senior Secondary School Portal.</i>
        </div>

        <div class="receipt-signatures" style="margin-top: 40px;">
          <div class="sign-box">
            Parent / Depositor
          </div>
          <div class="sign-box">
            Accounts Officer / Cashier
          </div>
          <div class="sign-box">
            Authorized Seal & Stamp<br>
            <span style="font-size: 8pt; font-weight: normal; color: #64748b;">Rex SSS, Ootacamund</span>
          </div>
        </div>
      </div>
    `;

    modal.classList.add('open');
  },

  closeReceiptModal() {
    const modal = document.getElementById('receipt-preview-modal');
    if (modal) modal.classList.remove('open');
  },

  printReceipt() {
    window.print();
  }
};
