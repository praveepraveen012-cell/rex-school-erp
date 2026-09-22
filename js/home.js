/**
 * Rex Senior Secondary School - Home WebApp & Mobile Experience Controller
 * Inspired by NeverSkip modern EdTech & School Management Platforms
 */

const HomeModule = {
  activeTab: 'admin',
  deviceMode: 'desktop',
  deferredPrompt: null,

  init() {
    this.attachEventListeners();
    this.initFeeCalculator();
    this.initWhatsAppSimulator();
    this.initGradeSimulator();
    this.setupPwaPrompt();
    this.detectScreenDevice();

    window.addEventListener('resize', () => {
      if (!document.body.classList.contains('erp-active') && !document.body.classList.contains('desktop-view-forced')) {
        this.detectScreenDevice();
      }
    });

    console.log("Rex Senior Secondary School - Home WebApp initialized.");
  },

  detectScreenDevice() {
    if (window.innerWidth <= 768) {
      this.deviceMode = 'mobile';
      document.body.classList.add('mobile-viewport-active');
      document.body.classList.remove('desktop-view-forced');

      const sim = document.getElementById('mobile-device-simulator');
      if (sim) {
        sim.style.display = 'flex';
        sim.classList.add('active');
      }
      const home = document.getElementById('home-view');
      if (home) home.style.display = 'none';

      const toggleMobile = document.getElementById('btn-mode-mobile');
      const toggleDesk = document.getElementById('btn-mode-desktop');
      if (toggleMobile) toggleMobile.classList.add('active');
      if (toggleDesk) toggleDesk.classList.remove('active');
    } else {
      this.deviceMode = 'desktop';
      document.body.classList.remove('mobile-viewport-active');
      document.body.classList.remove('desktop-view-forced');

      const sim = document.getElementById('mobile-device-simulator');
      if (sim) {
        sim.style.display = 'none';
        sim.classList.remove('active');
      }
      const home = document.getElementById('home-view');
      if (home) home.style.display = 'block';

      const toggleMobile = document.getElementById('btn-mode-mobile');
      const toggleDesk = document.getElementById('btn-mode-desktop');
      if (toggleDesk) toggleDesk.classList.add('active');
      if (toggleMobile) toggleMobile.classList.remove('active');
    }
  },

  attachEventListeners() {
    // Solution tabs
    document.querySelectorAll('.sol-tab-pill[data-sol-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-sol-tab');
        this.switchSolTab(tab);
      });
    });

    // Device Switcher
    const btnDesktop = document.getElementById('btn-mode-desktop');
    const btnMobile = document.getElementById('btn-mode-mobile');
    if (btnDesktop) {
      btnDesktop.addEventListener('click', () => this.setDeviceMode('desktop'));
    }
    if (btnMobile) {
      btnMobile.addEventListener('click', () => this.setDeviceMode('mobile'));
    }

    // Demo/Tour modal triggers
    document.querySelectorAll('[data-action="book-tour"]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        this.openTourModal();
      });
    });

    const tourForm = document.getElementById('home-tour-form');
    if (tourForm) {
      tourForm.addEventListener('submit', (e) => this.submitTourForm(e));
    }

    // Mobile Bottom Navigation Tabs
    document.querySelectorAll('.mobile-nav-tab[data-tab]').forEach(tabBtn => {
      tabBtn.addEventListener('click', () => {
        const tabKey = tabBtn.getAttribute('data-tab');
        this.switchMobileTab(tabKey);
      });
    });
  },

  switchSolTab(tabId) {
    this.activeTab = tabId;

    // Update buttons
    document.querySelectorAll('.sol-tab-pill').forEach(btn => {
      if (btn.getAttribute('data-sol-tab') === tabId) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Update panes
    document.querySelectorAll('.solution-tab-pane').forEach(pane => {
      if (pane.id === `sol-pane-${tabId}`) {
        pane.classList.add('active');
      } else {
        pane.classList.remove('active');
      }
    });
  },

  setDeviceMode(mode) {
    this.deviceMode = mode;
    const btnDesktop = document.getElementById('btn-mode-desktop');
    const btnMobile = document.getElementById('btn-mode-mobile');
    const simulatorOverlay = document.getElementById('mobile-device-simulator');
    const homeView = document.getElementById('home-view');

    if (mode === 'mobile') {
      if (btnDesktop) btnDesktop.classList.remove('active');
      if (btnMobile) btnMobile.classList.add('active');

      document.body.classList.add('mobile-viewport-active');
      document.body.classList.remove('desktop-view-forced');

      if (homeView) homeView.style.display = 'none';
      if (simulatorOverlay) {
        simulatorOverlay.style.display = 'flex';
        simulatorOverlay.classList.add('active');
      }

      if (window.App && App.showToast) {
        App.showToast("Rex SSS Native Mobile App Mode Active 📱", "info");
      }
    } else {
      if (btnDesktop) btnDesktop.classList.add('active');
      if (btnMobile) btnMobile.classList.remove('active');

      document.body.classList.remove('mobile-viewport-active');
      document.body.classList.add('desktop-view-forced');

      if (homeView) homeView.style.display = 'block';
      if (simulatorOverlay) {
        simulatorOverlay.style.display = 'none';
        simulatorOverlay.classList.remove('active');
      }

      if (window.App && App.showToast) {
        App.showToast("Rex SSS Desktop WebApp View Active 💻", "info");
      }
    }
  },

  closeMobileSimulator() {
    this.setDeviceMode('desktop');
  },

  switchMobileTab(tabKey) {
    document.querySelectorAll('.mobile-nav-tab').forEach(btn => {
      if (btn.getAttribute('data-tab') === tabKey) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    if (tabKey === 'erp') {
      this.launchERP('dashboard');
    } else if (tabKey === 'attendance') {
      this.openMobileSheet('attendance');
    } else if (tabKey === 'fees') {
      this.openMobileSheet('fees');
    } else if (tabKey === 'notices') {
      this.openMobileSheet('notices');
    } else {
      // Home tab
      this.closeMobileSheet();
    }
  },

  openMobileSheet(type) {
    const sheetOverlay = document.getElementById('mobile-bottom-sheet');
    const sheetBody = document.getElementById('mobile-sheet-content');
    const sheetTitle = document.getElementById('mobile-sheet-title');
    if (!sheetOverlay || !sheetBody) return;

    if (type === 'attendance') {
      if (sheetTitle) sheetTitle.textContent = "Today's Smart Attendance";
      sheetBody.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 1rem; background: var(--bg-subtle); border-radius: var(--radius-md); margin-bottom: 1rem;">
          <div>
            <div style="font-weight: 800; font-size: 1.1rem; color: #16a34a;">Present ✅</div>
            <div style="font-size: 0.75rem; color: var(--text-secondary);">Punch-in: 08:24 AM (RFID Gate 1)</div>
          </div>
          <div style="text-align: right;">
            <span class="badge badge-present" style="font-size: 0.8rem;">96.4% Overall</span>
          </div>
        </div>
        <div style="font-size: 0.8rem; color: var(--text-secondary); line-height: 1.6; margin-bottom: 1rem;">
          Monthly streak: 21 consecutive days present. Absent notifications are instantly dispatched to parents via official WhatsApp alert.
        </div>
        <button class="btn btn-primary btn-block" onclick="HomeModule.launchERP('attendance')">Open Full Smart Attendance Manager &rarr;</button>
      `;
    } else if (type === 'fees') {
      if (sheetTitle) sheetTitle.textContent = "Fee Ledger & Online Payment";
      sheetBody.innerHTML = `
        <div style="background: linear-gradient(135deg, #1e3a8a, #2563eb); color: #fff; padding: 1.25rem; border-radius: var(--radius-md); margin-bottom: 1rem;">
          <div style="font-size: 0.75rem; opacity: 0.9; text-transform: uppercase; font-weight: 700;">Term II Fee Outstanding</div>
          <div style="font-size: 1.8rem; font-weight: 800; margin: 0.3rem 0;">₹ 0.00 <span style="font-size: 0.85rem; font-weight: normal; background: rgba(255,255,255,0.2); padding: 2px 8px; border-radius: 12px;">All Cleared</span></div>
          <div style="font-size: 0.72rem; opacity: 0.85;">Last settled via UPI / NetBanking on 15-Sep-2026</div>
        </div>
        <div style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 1rem;">
          Official digitally verified receipt #REX-2026-089 is available for download and printing.
        </div>
        <button class="btn btn-primary btn-block" onclick="HomeModule.launchERP('fees')">Open Fee Cashier & Receipts &rarr;</button>
      `;
    } else if (type === 'notices') {
      if (sheetTitle) sheetTitle.textContent = "School Circulars & WhatsApp Broadcast";
      sheetBody.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 1.25rem;">
          <div style="padding: 0.85rem; background: var(--bg-subtle); border-radius: var(--radius-sm); border-left: 4px solid var(--primary);">
            <div style="font-weight: 700; font-size: 0.85rem;">Pre-Board Examination Date Sheet</div>
            <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 0.2rem;">Official CBSE Pre-Board routine published for Class 10 & 12.</div>
          </div>
          <div style="padding: 0.85rem; background: var(--bg-subtle); border-radius: var(--radius-sm); border-left: 4px solid #16a34a;">
            <div style="font-weight: 700; font-size: 0.85rem;">Annual Sports Meet 2026</div>
            <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 0.2rem;">Inter-house athletic trials commence this Friday.</div>
          </div>
        </div>
        <button class="btn btn-primary btn-block" onclick="HomeModule.launchERP('communication')">Open WhatsApp & Notices Module &rarr;</button>
      `;
    } else if (type === 'bus') {
      if (sheetTitle) sheetTitle.textContent = "🚌 School Bus GPS & 500m Radar";
      sheetBody.innerHTML = `
        <div style="background: linear-gradient(135deg, #1e3a8a, #0284c7); color: #fff; padding: 1.25rem; border-radius: var(--radius-md); margin-bottom: 1rem; text-align: center;">
          <div style="font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.05em; opacity: 0.9;">Bus TN-43-A-2104 • Route 02</div>
          <div style="font-size: 2rem; font-weight: 800; margin: 0.25rem 0;">480 Meters Away</div>
          <div style="font-size: 0.8rem; background: #22c55e; color: #000; display: inline-block; padding: 2px 10px; border-radius: 12px; font-weight: 800;">
            🎯 Within 500m Geofence!
          </div>
        </div>

        <div style="background: var(--bg-subtle); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 0.85rem; margin-bottom: 1rem; font-size: 0.8rem; display: flex; flex-direction: column; gap: 0.4rem;">
          <div style="display: flex; justify-content: space-between;">
            <span style="color: var(--text-muted);">Boarding Stop:</span>
            <strong>Snowdon Road Crossing</strong>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: var(--text-muted);">Driver:</span>
            <strong>Joseph Selvaraj (+91 94432 10045)</strong>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: var(--text-muted);">Current Transit:</span>
            <span style="color: #16a34a; font-weight: 700;">Morning Pickup (32 km/h)</span>
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 0.6rem;">
          <button class="btn btn-primary btn-block" style="background: #f59e0b; border-color: #f59e0b; color: #000; font-weight: 800;" onclick="if(window.TransportModule) TransportModule.simulate500mAlert()">
            ⚡ Test 500m Proximity Alarm & Alert
          </button>
          <button class="btn btn-secondary btn-block" onclick="HomeModule.launchERP('parent-portal')">
            Open Interactive Live Bus Map &rarr;
          </button>
        </div>
      `;
    } else if (type === 'homework') {
      if (sheetTitle) sheetTitle.textContent = "📖 Daily Homework Diary (Class 10-A)";
      const hwList = (window.ERPStorage && ERPStorage.getHomework) ? ERPStorage.getHomework() : [];
      sheetBody.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 1rem;">
          ${hwList.slice(0, 4).map(h => `
            <div style="padding: 0.75rem; background: var(--bg-subtle); border-radius: var(--radius-sm); border-left: 3px solid ${h.status === 'Completed' ? '#10b981' : '#2563eb'};">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.2rem;">
                <strong style="font-size: 0.82rem; color: var(--text-primary); text-decoration: ${h.status === 'Completed' ? 'line-through' : 'none'};">${h.subject}</strong>
                <span class="badge ${h.status === 'Completed' ? 'badge-present' : 'badge-neutral'}" style="font-size: 0.65rem;">${h.status}</span>
              </div>
              <div style="font-size: 0.75rem; color: var(--text-secondary); text-decoration: ${h.status === 'Completed' ? 'line-through' : 'none'};">${h.title}</div>
              <div style="font-size: 0.68rem; color: var(--text-muted); margin-top: 0.3rem;">Due: ${h.dueDate} • ${h.teacher}</div>
            </div>
          `).join('')}
        </div>
        <button class="btn btn-primary btn-block" onclick="HomeModule.launchERP('parent-portal')">Open Full Homework Hub & Leaves &rarr;</button>
      `;
    } else {
      if (sheetTitle) sheetTitle.textContent = "Rex SSS Mobile Services";
      sheetBody.innerHTML = `
        <p style="font-size: 0.85rem; color: var(--text-secondary);">Direct instant access to school management services.</p>
        <button class="btn btn-primary btn-block" onclick="HomeModule.launchERP('dashboard')">Launch Full ERP Dashboard</button>
      `;
    }

    sheetOverlay.classList.add('open');
  },

  closeMobileSheet() {
    const sheetOverlay = document.getElementById('mobile-bottom-sheet');
    if (sheetOverlay) sheetOverlay.classList.remove('open');
  },

  // Interactive Fee Calculator Sandbox
  initFeeCalculator() {
    const gradeSelect = document.getElementById('calc-grade');
    const termSelect = document.getElementById('calc-term');
    const transportCheck = document.getElementById('calc-transport');
    const mealsCheck = document.getElementById('calc-meals');

    const updateCalc = () => {
      let base = 28000;
      const g = gradeSelect ? gradeSelect.value : '10';
      if (['11', '12'].includes(g)) base = 34000;
      else if (['9', '10'].includes(g)) base = 28000;
      else base = 24000;

      let termMultiplier = 1;
      const t = termSelect ? termSelect.value : '1';
      if (t === 'annual') termMultiplier = 3 * 0.95; // 5% discount for annual

      let tuition = base * (t === 'annual' ? 3 * 0.95 : 1);
      let transport = (transportCheck && transportCheck.checked) ? (t === 'annual' ? 18000 : 6500) : 0;
      let meals = (mealsCheck && mealsCheck.checked) ? (t === 'annual' ? 15000 : 5000) : 0;
      let labExam = ['11', '12', '10', '9'].includes(g) ? 2500 : 1200;

      let total = Math.round(tuition + transport + meals + labExam);

      const tuitionEl = document.getElementById('calc-res-tuition');
      const transportEl = document.getElementById('calc-res-transport');
      const otherEl = document.getElementById('calc-res-other');
      const totalEl = document.getElementById('calc-res-total');

      if (tuitionEl) tuitionEl.textContent = `₹ ${Math.round(tuition).toLocaleString('en-IN')}`;
      if (transportEl) transportEl.textContent = `₹ ${transport.toLocaleString('en-IN')}`;
      if (otherEl) otherEl.textContent = `₹ ${Math.round(meals + labExam).toLocaleString('en-IN')}`;
      if (totalEl) totalEl.textContent = `₹ ${total.toLocaleString('en-IN')}`;
    };

    if (gradeSelect) gradeSelect.addEventListener('change', updateCalc);
    if (termSelect) termSelect.addEventListener('change', updateCalc);
    if (transportCheck) transportCheck.addEventListener('change', updateCalc);
    if (mealsCheck) mealsCheck.addEventListener('change', updateCalc);

    updateCalc();
  },

  // Interactive WhatsApp Broadcast Sandbox
  initWhatsAppSimulator() {
    const studentInput = document.getElementById('wa-sim-student');
    const typeSelect = document.getElementById('wa-sim-type');
    const busInput = document.getElementById('wa-sim-bus');
    const msgPreview = document.getElementById('wa-sim-preview');

    const updatePreview = () => {
      const student = (studentInput && studentInput.value.trim()) || 'Aarav Sharma';
      const type = (typeSelect && typeSelect.value) || 'attendance';
      const bus = (busInput && busInput.value.trim()) || 'Route #4 (Charring Cross)';

      let text = '';
      if (type === 'attendance') {
        text = `*REX SENIOR SECONDARY SCHOOL*\n_Christus Rex, Ootacamund_\n\nDear Parent,\nThis is to inform that your ward *${student}* (Grade 10-A) has safely arrived at campus today at 08:24 AM via Smart RFID punch.\n\n_School Helpdesk: +91 423 2442220_`;
      } else if (type === 'fee') {
        text = `*REX SENIOR SECONDARY SCHOOL*\n_Christus Rex, Ootacamund_\n\nDear Parent of *${student}*,\nOfficial payment receipt for Term II Fees (₹ 28,000) is generated. All dues are cleared.\n\nView Receipt: rexschool.edu.in/receipt/89\n_Thank you for your timely settlement._`;
      } else if (type === 'transport') {
        text = `*REX SENIOR SECONDARY SCHOOL - BUS TRACKER*\n\nAlert: Bus *${bus}* carrying *${student}* has departed from Ooty campus at 03:45 PM. Expected arrival at your stop in 14 mins.\n\nLive GPS: rexschool.edu.in/gps/bus4`;
      } else {
        text = `*REX SENIOR SECONDARY SCHOOL*\n\nDear Parent,\nCircular: Pre-Board Date Sheet has been uploaded on parent portal for *${student}*.\n\nRex SSS Admin Office.`;
      }

      if (msgPreview) {
        msgPreview.innerHTML = text.replace(/\n/g, '<br>').replace(/\*(.*?)\*/g, '<strong>$1</strong>').replace(/_(.*?)_/g, '<em>$1</em>');
      }
    };

    if (studentInput) studentInput.addEventListener('input', updatePreview);
    if (typeSelect) typeSelect.addEventListener('change', updatePreview);
    if (busInput) busInput.addEventListener('input', updatePreview);

    updatePreview();
  },

  // Interactive Grade & CBSE GPA Simulator Sandbox
  initGradeSimulator() {
    const mathSlider = document.getElementById('grade-sim-math');
    const scienceSlider = document.getElementById('grade-sim-science');
    const englishSlider = document.getElementById('grade-sim-english');

    const updateGrades = () => {
      const m = mathSlider ? parseInt(mathSlider.value) : 92;
      const s = scienceSlider ? parseInt(scienceSlider.value) : 88;
      const e = englishSlider ? parseInt(englishSlider.value) : 95;

      const mValEl = document.getElementById('grade-val-math');
      const sValEl = document.getElementById('grade-val-science');
      const eValEl = document.getElementById('grade-val-english');

      if (mValEl) mValEl.textContent = `${m} / 100`;
      if (sValEl) sValEl.textContent = `${s} / 100`;
      if (eValEl) eValEl.textContent = `${e} / 100`;

      const avg = Math.round((m + s + e) / 3);
      let grade = 'A1';
      let gpa = 10.0;

      if (avg >= 91) { grade = 'A1'; gpa = 10.0; }
      else if (avg >= 81) { grade = 'A2'; gpa = 9.0; }
      else if (avg >= 71) { grade = 'B1'; gpa = 8.0; }
      else if (avg >= 61) { grade = 'B2'; gpa = 7.0; }
      else if (avg >= 51) { grade = 'C1'; gpa = 6.0; }
      else { grade = 'C2'; gpa = 5.0; }

      const avgEl = document.getElementById('grade-sim-avg');
      const badgeEl = document.getElementById('grade-sim-badge');
      const gpaEl = document.getElementById('grade-sim-gpa');

      if (avgEl) avgEl.textContent = `${avg}%`;
      if (badgeEl) badgeEl.textContent = `Grade ${grade}`;
      if (gpaEl) gpaEl.textContent = `CGPA: ${gpa.toFixed(1)}`;
    };

    if (mathSlider) mathSlider.addEventListener('input', updateGrades);
    if (scienceSlider) scienceSlider.addEventListener('input', updateGrades);
    if (englishSlider) englishSlider.addEventListener('input', updateGrades);

    updateGrades();
  },

  openTourModal() {
    const modal = document.getElementById('home-tour-modal');
    if (modal) {
      modal.classList.add('open');
      modal.classList.add('active');
    }
  },

  closeTourModal() {
    const modal = document.getElementById('home-tour-modal');
    if (modal) {
      modal.classList.remove('open');
      modal.classList.remove('active');
    }
  },

  submitTourForm(e) {
    e.preventDefault();
    const name = document.getElementById('tour-parent-name')?.value || 'Guest';
    const phone = document.getElementById('tour-phone')?.value || '';
    const grade = document.getElementById('tour-grade')?.value || 'Class 10';

    this.closeTourModal();

    if (window.App && App.showToast) {
      App.showToast(`Thank you ${name}! Your campus visit for ${grade} is confirmed. Details sent to ${phone || 'WhatsApp'}.`, 'success');
    } else {
      alert(`Thank you ${name}! Your campus visit for ${grade} has been registered.`);
    }
  },

  setupPwaPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      const installCards = document.querySelectorAll('.pwa-install-trigger');
      installCards.forEach(btn => {
        btn.style.display = 'inline-flex';
      });
    });

    document.querySelectorAll('.pwa-install-trigger').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (this.deferredPrompt) {
          this.deferredPrompt.prompt();
          const { outcome } = await this.deferredPrompt.userChoice;
          console.log(`PWA install prompt outcome: ${outcome}`);
          this.deferredPrompt = null;
        } else {
          if (window.App && App.showToast) {
            App.showToast("Rex SSS App is ready to install via your browser menu (Add to Home Screen)!", "info");
          }
        }
      });
    });
  },

  launchERP(targetView) {
    document.body.classList.add('erp-active');
    const simulatorOverlay = document.getElementById('mobile-device-simulator');
    if (simulatorOverlay) {
      simulatorOverlay.style.display = 'none';
      simulatorOverlay.classList.remove('active');
    }
    const homeView = document.getElementById('home-view');
    if (homeView) homeView.style.display = 'none';
    const appContainer = document.querySelector('.app-container');
    if (appContainer) appContainer.style.display = 'flex';

    if (window.App && App.switchView) {
      App.switchView(targetView || 'dashboard');
      App.showToast("Welcome to Rex Senior Secondary School ERP Management Portal", "info");
    }
  },

  returnToHome() {
    document.body.classList.remove('erp-active');
    if (window.App && App.switchView) {
      App.switchView('home');
    }
  }
};

window.HomeModule = HomeModule;
