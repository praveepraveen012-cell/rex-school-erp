/**
 * NeverSkip School ERP - Dashboard & Analytics Engine
 */

const DashboardModule = {
  render() {
    const students = ERPStorage.getStudents();
    const attendance = ERPStorage.getAttendance();
    const attToday = attendance["10-A"] || {};
    
    // Calculations
    const totalStudents = students.length;
    let presentCount = 0;
    let totalMarked = 0;

    Object.values(attToday).forEach(status => {
      totalMarked++;
      if (status === 'P' || status === 'L') presentCount++;
    });

    const attendanceRate = totalMarked > 0 ? Math.round((presentCount / totalMarked) * 100) : 94;

    let totalFees = 0;
    let totalPaid = 0;
    students.forEach(s => {
      totalFees += (s.feesTotal || 54000);
      totalPaid += (s.feesPaid || 0);
    });
    const feeRate = totalFees > 0 ? Math.round((totalPaid / totalFees) * 100) : 88;

    // Update KPI Card values
    const elTotalStudents = document.getElementById('stat-total-students');
    if (elTotalStudents) elTotalStudents.textContent = totalStudents.toLocaleString();

    const elAttRate = document.getElementById('stat-attendance-rate');
    if (elAttRate) elAttRate.textContent = `${attendanceRate}%`;

    const elFeeRate = document.getElementById('stat-fee-rate');
    if (elFeeRate) elFeeRate.textContent = `₹${(totalPaid / 100000).toFixed(1)}L (${feeRate}%)`;

    const elStaffCount = document.getElementById('stat-staff-count');
    if (elStaffCount) elStaffCount.textContent = "84 / 88";

    // Render Charts
    this.renderAttendanceChart();
    this.renderFeeDonutChart();
    this.renderActivityFeed();
  },

  renderAttendanceChart() {
    const container = document.getElementById('dashboard-attendance-chart');
    if (!container) return;

    // 7-day attendance trend data
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Today'];
    const rates = [92, 95, 94, 91, 96, 90, 95];

    // Build SVG Line & Area Chart
    const width = 500;
    const height = 180;
    const padding = 30;

    const points = rates.map((rate, i) => {
      const x = padding + (i * (width - 2 * padding) / (rates.length - 1));
      const y = height - padding - ((rate - 80) / 20 * (height - 2 * padding));
      return { x, y, rate, day: days[i] };
    });

    let pathD = `M ${points[0].x} ${points[0].y}`;
    points.slice(1).forEach(p => {
      pathD += ` L ${p.x} ${p.y}`;
    });

    const areaD = `${pathD} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

    let circlesSvg = '';
    let labelsSvg = '';
    points.forEach((p, idx) => {
      circlesSvg += `
        <circle cx="${p.x}" cy="${p.y}" r="5" fill="#2563eb" stroke="#ffffff" stroke-width="2" class="chart-point" />
        <text x="${p.x}" y="${p.y - 10}" text-anchor="middle" font-size="11" font-weight="700" fill="#2563eb">${p.rate}%</text>
      `;
      labelsSvg += `
        <text x="${p.x}" y="${height - 10}" text-anchor="middle" font-size="11" fill="var(--text-muted)">${p.day}</text>
      `;
    });

    container.innerHTML = `
      <svg viewBox="0 0 ${width} ${height}" style="width: 100%; height: 100%; overflow: visible;">
        <defs>
          <linearGradient id="attAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.3" />
            <stop offset="100%" stop-color="#3b82f6" stop-opacity="0.0" />
          </linearGradient>
        </defs>
        <!-- Horizontal Grid Lines -->
        <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="var(--border-subtle)" stroke-dasharray="4" />
        <line x1="${padding}" y1="${height / 2}" x2="${width - padding}" y2="${height / 2}" stroke="var(--border-subtle)" stroke-dasharray="4" />
        <line x1="${padding}" y1="${padding}" x2="${width - padding}" y2="${padding}" stroke="var(--border-subtle)" stroke-dasharray="4" />

        <!-- Area fill -->
        <path d="${areaD}" fill="url(#attAreaGrad)" />
        <!-- Line stroke -->
        <path d="${pathD}" fill="none" stroke="#2563eb" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
        <!-- Points & labels -->
        ${circlesSvg}
        ${labelsSvg}
      </svg>
    `;
  },

  renderFeeDonutChart() {
    const container = document.getElementById('dashboard-fee-donut');
    if (!container) return;

    const students = ERPStorage.getStudents();
    let paid = 0, partial = 0, overdue = 0;
    students.forEach(s => {
      if (s.feeStatus === 'Paid') paid++;
      else if (s.feeStatus === 'Partial') partial++;
      else overdue++;
    });

    const total = students.length || 1;
    const paidPct = Math.round((paid / total) * 100);
    const partialPct = Math.round((partial / total) * 100);
    const overduePct = 100 - paidPct - partialPct;

    container.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-around; height: 100%; width: 100%;">
        <div style="position: relative; width: 130px; height: 130px;">
          <svg viewBox="0 0 36 36" style="width: 100%; height: 100%; transform: rotate(-90deg);">
            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none" stroke="var(--border-subtle)" stroke-width="3.8" />
            <!-- Paid slice -->
            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none" stroke="#10b981" stroke-width="4.2" stroke-dasharray="${paidPct}, 100" stroke-linecap="round" />
            <!-- Partial slice -->
            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none" stroke="#f59e0b" stroke-width="4.2" stroke-dasharray="${partialPct}, 100" stroke-dashoffset="-${paidPct}" />
            <!-- Overdue slice -->
            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none" stroke="#ef4444" stroke-width="4.2" stroke-dasharray="${overduePct}, 100" stroke-dashoffset="-${paidPct + partialPct}" />
          </svg>
          <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center;">
            <div style="font-size: 1.25rem; font-weight: 800; color: var(--text-primary);">${paidPct}%</div>
            <div style="font-size: 0.65rem; color: var(--text-muted); font-weight: 700;">COLLECTED</div>
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 0.6rem; font-size: 0.8rem;">
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <span style="width: 10px; height: 10px; border-radius: 50%; background: #10b981;"></span>
            <span style="color: var(--text-secondary); font-weight: 600;">Fully Paid: <b>${paid}</b></span>
          </div>
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <span style="width: 10px; height: 10px; border-radius: 50%; background: #f59e0b;"></span>
            <span style="color: var(--text-secondary); font-weight: 600;">Partial Due: <b>${partial}</b></span>
          </div>
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <span style="width: 10px; height: 10px; border-radius: 50%; background: #ef4444;"></span>
            <span style="color: var(--text-secondary); font-weight: 600;">Overdue: <b>${overdue}</b></span>
          </div>
        </div>
      </div>
    `;
  },

  renderActivityFeed() {
    const list = document.getElementById('dashboard-activity-list');
    if (!list) return;

    const activities = ERPStorage.getActivity();
    list.innerHTML = activities.slice(0, 5).map(act => `
      <div style="display: flex; align-items: flex-start; gap: 0.85rem; padding: 0.75rem 0; border-bottom: 1px solid var(--border-subtle);">
        <div style="width: 8px; height: 8px; border-radius: 50%; background: var(--primary); margin-top: 6px; flex-shrink: 0;"></div>
        <div style="flex: 1;">
          <p style="font-size: 0.82rem; font-weight: 600; color: var(--text-primary); margin: 0;">${act.text}</p>
          <span style="font-size: 0.7rem; color: var(--text-muted);">${act.time}</span>
        </div>
      </div>
    `).join('');
  }
};
