/**
 * Rex Senior Secondary School ERP - Fee Cashier, Split Payment & Receipt Module
 * Strict Role Separation: Super Admin CANNOT pay fees; Only Parent can pay fees.
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

  getUserRole() {
    const user = (typeof window.RexApi !== 'undefined' && window.RexApi.getUser()) ||
                 (typeof Api !== 'undefined' && Api.getUser()) || null;
    if (user && user.role) return user.role.toUpperCase();
    if (window.App && window.App.currentRole) {
      if (window.App.currentRole === 'parent') return 'PARENT';
      if (window.App.currentRole === 'teacher') return 'TEACHER';
      return 'SUPER_ADMIN';
    }
    const storedRole = (typeof ERPStorage !== 'undefined' && ERPStorage.getRole) ? ERPStorage.getRole() : null;
    if (storedRole === 'parent') return 'PARENT';
    if (storedRole === 'teacher') return 'TEACHER';
    return 'SUPER_ADMIN';
  },

  render() {
    const students = ERPStorage.getStudents();
    let totalBilled = 0;
    let totalCollected = 0;
    let paidCount = 0;
    let unpaidCount = 0;
    let partialCount = 0;

    students.forEach(s => {
      const tot = s.feesTotal || 54000;
      const paid = s.feesPaid || 0;
      totalBilled += tot;
      totalCollected += paid;
      if (paid >= tot) paidCount++;
      else if (paid === 0) unpaidCount++;
      else partialCount++;
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
    if (elOverdueCount) elOverdueCount.textContent = `${unpaidCount + partialCount} Pending`;

    this.renderTable();
  },

  renderTable() {
    const role = this.getUserRole();
    const isSuperAdmin = (role === 'SUPER_ADMIN');
    const isParent = (role === 'PARENT');

    const students = ERPStorage.getStudents();
    const searchVal = (document.getElementById('fee-search-input')?.value || '').toLowerCase().trim();
    const statusVal = document.getElementById('fee-status-filter')?.value || 'all';

    const filtered = students.filter(s => {
      const matchSearch = !searchVal || 
        s.name.toLowerCase().includes(searchVal) || 
        s.rollNo.toLowerCase().includes(searchVal) ||
        (s.parentName && s.parentName.toLowerCase().includes(searchVal));
      
      const due = (s.feesTotal || 54000) - (s.feesPaid || 0);
      let statusKey = 'unpaid';
      if (due === 0) statusKey = 'paid';
      else if ((s.feesPaid || 0) > 0) statusKey = 'partial';

      const matchStatus = statusVal === 'all' || statusKey === statusVal.toLowerCase() || s.feeStatus.toLowerCase() === statusVal.toLowerCase();
      return matchSearch && matchStatus;
    });

    const tbody = document.getElementById('fee-table-body');
    if (!tbody) return;

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">No fee records found.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(s => {
      const tot = s.feesTotal || 54000;
      const paid = s.feesPaid || 0;
      const due = tot - paid;
      const minSplit = Math.round(due * 0.30);

      let badgeClass = 'badge-paid';
      let statusLabel = 'PAID';
      if (due === 0) {
        badgeClass = 'badge-paid';
        statusLabel = 'PAID';
      } else if (paid > 0) {
        badgeClass = 'badge-partial';
        statusLabel = 'PARTIAL';
      } else {
        badgeClass = 'badge-overdue';
        statusLabel = 'UNPAID';
      }

      // CRITICAL PERMISSION RULE (Requirements 1 & 3):
      // Super Admin NEVER gets "Collect Fee" or any payment buttons!
      // Super Admin sees: "View Details", "Receipt", "Send Reminder"
      // Parent sees: "Pay Fees (Split / Full)", "Receipt"
      let actionButtons = '';
      if (isSuperAdmin) {
        actionButtons = `
          <button class="btn btn-sm btn-outline-primary" onclick="FeesModule.openStudentLedgerModal('${s.id}')" title="View details and payment history">
            📋 View Details
          </button>
          ${paid > 0 ? `
            <button class="btn btn-sm btn-secondary" onclick="FeesModule.previewReceipt('${s.id}')" style="margin-left: 4px;" title="View official fee receipt">
              🧾 Receipt
            </button>
          ` : ''}
          ${due > 0 ? `
            <button class="btn btn-sm btn-primary" onclick="FeesModule.sendReminder('${s.id}')" style="margin-left: 4px; background: #1e3a8a; border-color: #1e3a8a;" title="Send fee payment reminder to parent">
              🔔 Send Reminder
            </button>
          ` : ''}
        `;
      } else {
        // Parent view
        actionButtons = `
          ${due > 0 ? `
            <button class="btn btn-sm btn-primary" onclick="FeesModule.openSplitPaymentModal('${s.id}')" style="background: #047857; border-color: #047857;">
              💳 Pay Fees (Split / Full)
            </button>
          ` : `
            <button class="btn btn-sm btn-secondary" onclick="FeesModule.previewReceipt('${s.id}')">
              🧾 Official Receipt
            </button>
          `}
        `;
      }

      return `
        <tr>
          <td>
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <div class="student-avatar" style="background: ${s.avatarColor || '#3b82f6'}; width: 34px; height: 34px; font-size: 0.75rem;">
                ${s.name.charAt(0)}
              </div>
              <div>
                <div style="font-weight: 700; color: var(--text-primary);">${s.name}</div>
                <div style="font-size: 0.72rem; color: var(--text-muted);">Grade ${s.grade}-${s.section} • Roll: ${s.rollNo}</div>
              </div>
            </div>
          </td>
          <td>
            <div style="font-size: 0.85rem; font-weight: 600; color: var(--text-primary);">${s.parentName || 'Parent'}</div>
            <div style="font-size: 0.72rem; color: var(--text-muted);">${s.parentPhone || '+91 98765 43210'}</div>
          </td>
          <td style="font-weight: 700;">₹${tot.toLocaleString()}</td>
          <td style="color: var(--success); font-weight: 700;">₹${paid.toLocaleString()}</td>
          <td style="color: ${due > 0 ? '#dc2626' : 'var(--text-muted)'}; font-weight: 800;">
            ₹${due.toLocaleString()}
            ${due > 0 ? `<div style="font-size: 0.68rem; color: #059669; font-weight: 700;">Min Split (30%): ₹${minSplit.toLocaleString()}</div>` : ''}
          </td>
          <td>
            <span class="badge ${badgeClass}">
              <span class="badge-dot"></span>
              ${statusLabel}
            </span>
          </td>
          <td style="text-align: right; white-space: nowrap;">
            ${actionButtons}
          </td>
        </tr>
      `;
    }).join('');
  },

  // Backward compatibility alias: Super Admin always routes to ledger view
  openCashierModal(studentId) {
    if (this.getUserRole() === 'PARENT') {
      this.openSplitPaymentModal(studentId);
    } else {
      this.openStudentLedgerModal(studentId);
    }
  },

  // ==========================================================================
  // SUPER ADMIN STUDENT FEE DETAILS MODAL (STRICTLY NO PAYMENT CAPABILITY)
  // Requirements 1, 2, 3: Full ledger details, payment history, receipts, reminders
  // ==========================================================================
  openStudentLedgerModal(studentId) {
    const students = ERPStorage.getStudents();
    const s = students.find(item => item.id === studentId);
    if (!s) return;

    const tot = s.feesTotal || 54000;
    const paid = s.feesPaid || 0;
    const due = tot - paid;
    const statusText = due === 0 ? "PAID" : (paid === 0 ? "UNPAID" : "PARTIALLY PAID");
    const statusColor = due === 0 ? "#10b981" : (paid === 0 ? "#dc2626" : "#d97706");

    const modal = document.getElementById('cashier-modal');
    const content = document.getElementById('cashier-modal-content');
    const titleEl = document.getElementById('cashier-modal-title');
    if (titleEl) titleEl.textContent = "Fee Details & Student Ledger";
    if (!modal || !content) return;

    content.innerHTML = `
      <div style="background: var(--bg-subtle); border-radius: var(--radius-sm); padding: 1.25rem; margin-bottom: 1.25rem; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <span style="font-size: 0.75rem; background: #e2e8f0; color: #1e293b; padding: 2px 8px; border-radius: 4px; font-weight: 700; letter-spacing: 0.5px;">ADMINISTRATIVE OVERSIGHT • NO PAYMENT ACTIONS</span>
          <h4 style="font-size: 1.25rem; font-weight: 800; color: var(--text-primary); margin: 0.4rem 0 0.1rem 0;">${s.name}</h4>
          <p style="font-size: 0.8rem; color: var(--text-secondary); margin: 0;">
            Student ID: <b>${s.id}</b> • Roll No: <b>${s.rollNo}</b> • Grade <b>${s.grade}-${s.section}</b>
          </p>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 0.72rem; color: var(--text-muted); font-weight: 700;">LEDGER STATUS</div>
          <div style="font-size: 1.25rem; font-weight: 800; color: ${statusColor};">${statusText}</div>
        </div>
      </div>

      <!-- Financial & Guardian Summary Cards -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.25rem; font-size: 0.85rem;">
        <div style="background: #f8fafc; border: 1px solid var(--border-subtle); border-radius: 10px; padding: 1rem;">
          <strong style="color: var(--text-primary); display: flex; align-items: center; gap: 6px; margin-bottom: 0.6rem; font-size: 0.9rem;">
            👨‍👩‍👧 Parent & Contact Details
          </strong>
          <div style="margin-bottom: 4px;">Parent / Guardian: <b>${s.parentName || 'Rajesh Sharma'}</b></div>
          <div style="margin-bottom: 4px;">Mobile Number: <b>${s.parentPhone || '+91 98765 43210'}</b></div>
          <div style="margin-bottom: 4px;">Email: ${s.parentEmail || 'parent@rexschool.edu'}</div>
          <div>Residential Address: ${s.address || 'Coonoor Road, Ootacamund'}</div>
        </div>

        <div style="background: #f8fafc; border: 1px solid var(--border-subtle); border-radius: 10px; padding: 1rem;">
          <strong style="color: var(--text-primary); display: flex; align-items: center; gap: 6px; margin-bottom: 0.6rem; font-size: 0.9rem;">
            💰 Fee Account Summary
          </strong>
          <div style="margin-bottom: 4px; display: flex; justify-content: space-between;">
            <span>Total Annual Fee:</span>
            <b>₹${tot.toLocaleString()}</b>
          </div>
          <div style="margin-bottom: 4px; display: flex; justify-content: space-between;">
            <span>Total Collected:</span>
            <b style="color: #10b981;">₹${paid.toLocaleString()}</b>
          </div>
          <div style="margin-bottom: 4px; display: flex; justify-content: space-between;">
            <span>Outstanding Receivable:</span>
            <b style="color: #dc2626; font-size: 1.05rem;">₹${due.toLocaleString()}</b>
          </div>
          ${due > 0 ? `
            <div style="margin-top: 6px; padding-top: 6px; border-top: 1px dashed #cbd5e1; font-size: 0.75rem; color: #047857;">
              Parent Minimum Split (30%): <b>₹${Math.round(due * 0.30).toLocaleString()}</b>
            </div>
          ` : ''}
        </div>
      </div>

      <!-- Fee Breakdown Table (Preserve Information) -->
      <div style="background: #fff; border: 1px solid var(--border-subtle); border-radius: 10px; padding: 1rem; margin-bottom: 1.25rem;">
        <strong style="color: var(--text-primary); display: block; margin-bottom: 0.6rem; font-size: 0.88rem;">
          📊 Fee Structure Breakdown
        </strong>
        <table style="width: 100%; border-collapse: collapse; font-size: 0.8rem;">
          <thead>
            <tr style="border-bottom: 1px solid var(--border-subtle); text-align: left; color: var(--text-muted);">
              <th style="padding: 6px 0;">Particulars</th>
              <th style="padding: 6px 0; text-align: right;">Total (₹)</th>
              <th style="padding: 6px 0; text-align: right;">Paid (₹)</th>
              <th style="padding: 6px 0; text-align: right;">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 6px 0;">Quarterly Tuition & Academic Instruction</td>
              <td style="padding: 6px 0; text-align: right;">₹36,000</td>
              <td style="padding: 6px 0; text-align: right; color: #10b981;">₹${Math.min(paid, 36000).toLocaleString()}</td>
              <td style="padding: 6px 0; text-align: right;"><span class="badge ${paid >= 36000 ? 'badge-paid' : 'badge-partial'}">${paid >= 36000 ? 'PAID' : 'PENDING'}</span></td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 6px 0;">STEM Robotics & Computer Science Labs</td>
              <td style="padding: 6px 0; text-align: right;">₹8,000</td>
              <td style="padding: 6px 0; text-align: right; color: #10b981;">₹${paid > 36000 ? Math.min(paid - 36000, 8000).toLocaleString() : '0'}</td>
              <td style="padding: 6px 0; text-align: right;"><span class="badge ${paid >= 44000 ? 'badge-paid' : 'badge-partial'}">${paid >= 44000 ? 'PAID' : 'PENDING'}</span></td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 6px 0;">Sports Arena & Nilgiris Athletic Activities</td>
              <td style="padding: 6px 0; text-align: right;">₹4,000</td>
              <td style="padding: 6px 0; text-align: right; color: #10b981;">₹${paid > 44000 ? Math.min(paid - 44000, 4000).toLocaleString() : '0'}</td>
              <td style="padding: 6px 0; text-align: right;"><span class="badge ${paid >= 48000 ? 'badge-paid' : 'badge-partial'}">${paid >= 48000 ? 'PAID' : 'PENDING'}</span></td>
            </tr>
            <tr>
              <td style="padding: 6px 0;">Library Resources & Digital Management</td>
              <td style="padding: 6px 0; text-align: right;">₹6,000</td>
              <td style="padding: 6px 0; text-align: right; color: #10b981;">₹${paid > 48000 ? Math.min(paid - 48000, 6000).toLocaleString() : '0'}</td>
              <td style="padding: 6px 0; text-align: right;"><span class="badge ${paid >= 54000 ? 'badge-paid' : 'badge-partial'}">${paid >= 54000 ? 'PAID' : 'PENDING'}</span></td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Payment History & Receipts -->
      ${paid > 0 ? `
        <div style="background: #f8fafc; border: 1px solid var(--border-subtle); border-radius: 10px; padding: 0.9rem; margin-bottom: 1.25rem;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="font-weight: 700; color: var(--text-primary); font-size: 0.85rem;">Official Payment Receipt Available</div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">Verified digital counter receipt for ₹${paid.toLocaleString()}</div>
            </div>
            <button type="button" class="btn btn-sm btn-secondary" onclick="FeesModule.previewReceipt('${s.id}')">
              🧾 View Official Receipt
            </button>
          </div>
        </div>
      ` : ''}

      <!-- Administrative Actions: Close, View Receipt, Send Reminder -->
      <!-- STRICTLY NO PAYMENT FORMS OR PAYMENT INITIATION BUTTONS -->
      <div style="margin-top: 1.5rem; display: flex; justify-content: space-between; align-items: center;">
        <div style="font-size: 0.75rem; color: var(--text-muted); font-style: italic;">
          Student fee payments must be completed by parents through the Parent App.
        </div>
        <div style="display: flex; gap: 0.5rem;">
          <button type="button" class="btn btn-secondary" onclick="FeesModule.closeCashierModal()">Close</button>
          ${due > 0 ? `
            <button type="button" class="btn btn-primary" style="background: #1e3a8a; border-color: #1e3a8a;" onclick="FeesModule.sendReminder('${s.id}'); FeesModule.closeCashierModal();">
              🔔 Send Payment Reminder to Parent
            </button>
          ` : ''}
        </div>
      </div>
    `;

    modal.classList.add('open');
  },

  // ==========================================================================
  // PARENT SPLIT PAYMENT MODAL (Dynamic 30% Minimum Validation)
  // ==========================================================================
  openSplitPaymentModal(studentId) {
    if (this.getUserRole() !== 'PARENT') {
      if (window.App && App.showToast) {
        App.showToast("Super Admin cannot initiate student fee payments. Viewing ledger details.", "info");
      }
      return this.openStudentLedgerModal(studentId);
    }

    const students = ERPStorage.getStudents();
    const s = students.find(item => item.id === studentId);
    if (!s) return;

    this.selectedStudent = s;
    const tot = s.feesTotal || 54000;
    const paid = s.feesPaid || 0;
    const due = tot - paid;
    const minSplit = Math.round(due * 0.30);

    const modal = document.getElementById('cashier-modal');
    const content = document.getElementById('cashier-modal-content');
    const titleEl = document.getElementById('cashier-modal-title');
    if (titleEl) titleEl.textContent = "Parent Fee Payment Desk";
    if (!modal || !content) return;

    content.innerHTML = `
      <div style="background: var(--bg-subtle); border-radius: var(--radius-sm); padding: 1.25rem; margin-bottom: 1.25rem;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div>
            <h4 style="font-size: 1.15rem; font-weight: 800; color: var(--text-primary); margin: 0;">${s.name}</h4>
            <p style="font-size: 0.8rem; color: var(--text-secondary); margin: 0.2rem 0 0 0;">
              Student ID: <b>${s.id}</b> • Class: <b>Grade ${s.grade}-${s.section}</b>
            </p>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 0.72rem; color: var(--text-muted); font-weight: 700;">OUTSTANDING BALANCE</div>
            <div style="font-size: 1.4rem; font-weight: 800; color: #dc2626;">₹${due.toLocaleString()}</div>
          </div>
        </div>
        <div style="margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px dashed var(--border-medium); display: flex; justify-content: space-between; font-size: 0.8rem;">
          <span style="color: var(--text-muted);">Minimum Split Payment (30% of outstanding):</span>
          <strong style="color: #059669; font-size: 0.95rem;">₹${minSplit.toLocaleString()}</strong>
        </div>
      </div>

      <!-- Payment Type Selector (Pay Full Amount vs Split Payment) -->
      <div class="form-group" style="margin-bottom: 1.25rem;">
        <label class="form-label" style="font-weight: 700;">Select Payment Type:</label>
        <div style="display: flex; gap: 0.75rem;">
          <label style="flex: 1; border: 2px solid #047857; background: #ecfdf5; padding: 0.75rem; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 0.5rem;">
            <input type="radio" name="paymentTypeOption" value="FULL" onchange="FeesModule.onPaymentTypeChange('FULL', ${due}, ${minSplit})" />
            <div>
              <div style="font-weight: 800; font-size: 0.85rem; color: #065f46;">Pay Full Amount</div>
              <div style="font-size: 0.72rem; color: #047857;">Pay ₹${due.toLocaleString()} now</div>
            </div>
          </label>
          <label style="flex: 1; border: 2px solid var(--border-medium); background: #fff; padding: 0.75rem; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 0.5rem;" id="split-radio-label">
            <input type="radio" name="paymentTypeOption" value="SPLIT" checked onchange="FeesModule.onPaymentTypeChange('SPLIT', ${due}, ${minSplit})" />
            <div>
              <div style="font-weight: 800; font-size: 0.85rem; color: var(--text-primary);">Split Payment</div>
              <div style="font-size: 0.72rem; color: var(--text-muted);">Pay minimum 30% (₹${minSplit.toLocaleString()})</div>
            </div>
          </label>
        </div>
      </div>

      <!-- Enter Payment Amount -->
      <div class="form-group" style="margin-bottom: 1.25rem;">
        <label class="form-label" style="font-weight: 700;">Enter Payment Amount (₹):</label>
        <input type="number" id="split-pay-amount" class="form-control" value="${minSplit}" min="${minSplit}" max="${due}" style="font-size: 1.2rem; font-weight: 800;" oninput="FeesModule.validateSplitAmount(${due}, ${minSplit})" />
        <div id="split-amount-help" style="font-size: 0.75rem; color: #059669; font-weight: 600; margin-top: 0.35rem;">
          Minimum payment: 30% of outstanding amount (₹${minSplit.toLocaleString()})
        </div>
        <div id="split-amount-error" style="display: none; font-size: 0.75rem; color: #dc2626; font-weight: 700; margin-top: 0.35rem;">
          Minimum split payment is 30% of the outstanding fee.
        </div>
      </div>

      <!-- Payment Channel -->
      <div class="form-group" style="margin-bottom: 1.25rem;">
        <label class="form-label" style="font-weight: 700;">Select Payment Channel:</label>
        <div class="payment-modes-grid">
          <div class="payment-mode-pill selected" id="pm-upi" onclick="FeesModule.selectMode('UPI')">
            <span>📱 UPI / QR</span>
          </div>
          <div class="payment-mode-pill" id="pm-card" onclick="FeesModule.selectMode('Card')">
            <span>💳 Card</span>
          </div>
          <div class="payment-mode-pill" id="pm-netbanking" onclick="FeesModule.selectMode('NetBanking')">
            <span>🏛️ NetBanking</span>
          </div>
        </div>
      </div>

      <div style="margin-top: 1.5rem; display: flex; justify-content: flex-end; gap: 0.5rem;">
        <button type="button" class="btn btn-secondary" onclick="FeesModule.closeCashierModal()">Cancel</button>
        <button type="button" id="btn-submit-split-pay" class="btn btn-primary" onclick="FeesModule.processSplitPayment(${due}, ${minSplit})" style="background: #047857; border-color: #047857; font-weight: 800;">
          Proceed to Payment
        </button>
      </div>
    `;

    modal.classList.add('open');
  },

  onPaymentTypeChange(type, due, minSplit) {
    const input = document.getElementById('split-pay-amount');
    if (!input) return;

    if (type === 'FULL') {
      input.value = due;
      input.readOnly = true;
    } else {
      input.value = minSplit;
      input.readOnly = false;
    }
    this.validateSplitAmount(due, minSplit);
  },

  validateSplitAmount(due, minSplit) {
    const input = document.getElementById('split-pay-amount');
    const err = document.getElementById('split-amount-error');
    const help = document.getElementById('split-amount-help');
    const btn = document.getElementById('btn-submit-split-pay');
    if (!input || !err || !btn) return;

    const val = parseInt(input.value || 0, 10);
    const radioFull = document.querySelector('input[name="paymentTypeOption"][value="FULL"]');
    const isFull = radioFull && radioFull.checked;

    if (val <= 0 || isNaN(val)) {
      err.textContent = "Please enter a valid amount greater than zero.";
      err.style.display = 'block';
      if (help) help.style.display = 'none';
      btn.disabled = true;
      return false;
    }

    if (val > due) {
      err.textContent = `Payment amount cannot exceed outstanding fee balance of ₹${due.toLocaleString()}.`;
      err.style.display = 'block';
      if (help) help.style.display = 'none';
      btn.disabled = true;
      return false;
    }

    if (!isFull && val < minSplit) {
      err.textContent = "Minimum split payment is 30% of the outstanding fee.";
      err.style.display = 'block';
      if (help) help.style.display = 'none';
      btn.disabled = true;
      return false;
    }

    err.style.display = 'none';
    if (help) help.style.display = 'block';
    btn.disabled = false;
    return true;
  },

  processSplitPayment(due, minSplit) {
    if (!this.selectedStudent) return;
    if (!this.validateSplitAmount(due, minSplit)) return;

    const amountInput = document.getElementById('split-pay-amount');
    const amount = parseInt(amountInput?.value || 0, 10);

    const radioFull = document.querySelector('input[name="paymentTypeOption"][value="FULL"]');
    const isFull = radioFull && radioFull.checked || (amount === due);
    const paymentType = isFull ? 'FULL' : 'SPLIT';

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
    ERPStorage.addActivity(`Fee payment of ₹${amount.toLocaleString()} (${paymentType}) received for ${students[index].name} (${receiptNo})`);

    // Call backend API if connected
    const apiClient = (typeof window.RexApi !== 'undefined' ? window.RexApi : (typeof Api !== 'undefined' ? Api : null));
    if (apiClient && (apiClient.request || apiClient.fetch)) {
      const numericId = parseInt(this.selectedStudent.id.replace(/[^0-9]/g, '') || 1, 10);
      const reqFn = apiClient.request ? apiClient.request.bind(apiClient) : apiClient.fetch.bind(apiClient);
      reqFn('/fees/pay', {
        method: 'POST',
        body: JSON.stringify({
          studentId: numericId,
          amount: amount,
          paymentType: paymentType,
          paymentMode: this.selectedPaymentMode
        })
      }).catch(err => console.log('Backend payment sync:', err));
    }

    this.closeCashierModal();
    this.render();
    if (window.DashboardModule) DashboardModule.render();

    if (window.App && App.showToast) {
      App.showToast(`Payment of ₹${amount.toLocaleString()} received successfully! Receipt generated.`, "success");
    }

    this.showPrintableReceipt(students[index], amount, receiptNo, this.selectedPaymentMode);
  },

  // ==========================================================================
  // PAYMENT REMINDERS (Super Admin)
  // ==========================================================================
  sendReminder(studentId) {
    const students = ERPStorage.getStudents();
    const s = students.find(item => item.id === studentId);
    if (!s) return;

    const tot = s.feesTotal || 54000;
    const paid = s.feesPaid || 0;
    const due = tot - paid;
    if (due <= 0) return;

    const isUnpaid = (paid === 0);
    const message = isUnpaid
      ? `Fee Payment Reminder: Your child's fee of ₹${due.toLocaleString()} is currently unpaid. Please make the payment through the Parent App.`
      : `Fee Payment Reminder: Your child's outstanding fee balance is ₹${due.toLocaleString()}. Please complete the remaining payment through the Parent App.`;

    const apiClient = (typeof window.RexApi !== 'undefined' ? window.RexApi : (typeof Api !== 'undefined' ? Api : null));
    if (apiClient && (apiClient.request || apiClient.fetch)) {
      const numericId = parseInt(s.id.replace(/[^0-9]/g, '') || 1, 10);
      const reqFn = apiClient.request ? apiClient.request.bind(apiClient) : apiClient.fetch.bind(apiClient);
      reqFn('/fees/send-reminder', {
        method: 'POST',
        body: JSON.stringify({ studentId: numericId })
      }).then(res => {
        if (window.App && App.showToast) {
          App.showToast(`Fee reminder sent to parent of ${s.name}`, "info");
        }
      }).catch(() => {
        if (window.App && App.showToast) {
          App.showToast(`Fee reminder recorded for parent of ${s.name}`, "info");
        }
      });
    } else {
      if (window.App && App.showToast) {
        App.showToast(`Fee reminder recorded for parent of ${s.name}`, "info");
      }
    }
  },

  selectMode(mode) {
    this.selectedPaymentMode = mode;
    document.querySelectorAll('.payment-mode-pill').forEach(el => el.classList.remove('selected'));
    const target = document.getElementById(`pm-${mode.toLowerCase()}`);
    if (target) target.classList.add('selected');
  },

  closeCashierModal() {
    const modal = document.getElementById('cashier-modal');
    if (modal) modal.classList.remove('open');
  },

  previewReceipt(studentId) {
    const students = ERPStorage.getStudents();
    const s = students.find(item => item.id === studentId);
    if (!s) return;

    const receiptNo = `REC-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    this.showPrintableReceipt(s, s.feesPaid || 54000, receiptNo, "Online Gateway");
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
            <td style="text-align: right;"><strong>Roll No / ID:</strong> ${student.rollNo} (${student.id})</td>
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
          <i>Computer generated digital receipt via Rex Senior Secondary School Platform.</i>
        </div>

        <div class="receipt-signatures" style="margin-top: 40px;">
          <div class="sign-box">Parent / Depositor</div>
          <div class="sign-box">Accounts Officer / Cashier</div>
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

window.FeesModule = FeesModule;
