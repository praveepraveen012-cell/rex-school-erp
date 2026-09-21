/**
 * NeverSkip School ERP - Notice Board & WhatsApp Broadcast Simulator
 */

const CommunicationModule = {
  selectedTemplateId: 'tpl-absent',
  sampleStudent: null,

  init() {
    const students = ERPStorage.getStudents();
    this.sampleStudent = students[0] || SEED_STUDENTS[0];
    this.render();
    this.attachEvents();
  },

  attachEvents() {
    const tplSelect = document.getElementById('wa-template-select');
    if (tplSelect) {
      tplSelect.addEventListener('change', (e) => {
        this.selectedTemplateId = e.target.value;
        this.updateSimulator();
      });
    }

    const recipientSelect = document.getElementById('wa-recipient-select');
    if (recipientSelect) {
      recipientSelect.addEventListener('change', () => {
        this.updateSimulator();
      });
    }

    // Publish circular form
    const pubForm = document.getElementById('new-circular-form');
    if (pubForm) {
      pubForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handlePublishCircular();
      });
    }
  },

  render() {
    this.renderCirculars();
    this.updateSimulator();
  },

  renderCirculars() {
    const container = document.getElementById('circulars-list-container');
    if (!container) return;

    const circulars = ERPStorage.getCirculars();
    container.innerHTML = circulars.map(c => {
      let badgeClass = 'badge-info';
      if (c.priority === 'High' || c.category === 'Emergency') badgeClass = 'badge-danger';
      else if (c.category === 'Finance') badgeClass = 'badge-warning';

      return `
        <div class="card" style="margin-bottom: 1rem; border-left: 4px solid ${c.priority === 'High' ? 'var(--danger)' : 'var(--primary)'};">
          <div class="card-body" style="padding: 1.25rem;">
            <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; margin-bottom: 0.5rem;">
              <div>
                <span class="badge ${badgeClass}" style="margin-bottom: 0.35rem;">${c.category} • ${c.priority} Priority</span>
                <h4 style="font-size: 1.05rem; font-weight: 800; color: var(--text-primary); margin: 0;">${c.title}</h4>
              </div>
              <span style="font-size: 0.78rem; color: var(--text-muted); font-family: var(--font-mono); white-space: nowrap;">${c.date}</span>
            </div>
            <p style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.5; margin: 0.5rem 0;">
              ${c.summary}
            </p>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.75rem; font-size: 0.78rem; color: var(--text-muted); border-top: 1px solid var(--border-subtle); padding-top: 0.5rem;">
              <span>Issued by: <b>${c.author}</b></span>
              <span>Target: <b>${c.target}</b></span>
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  updateSimulator() {
    const tpl = SEED_WHATSAPP_TEMPLATES.find(t => t.id === this.selectedTemplateId) || SEED_WHATSAPP_TEMPLATES[0];
    const s = this.sampleStudent || SEED_STUDENTS[0];

    const todayStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const dueAmount = ((s.feesTotal || 54000) - (s.feesPaid || 0)) || 19000;

    // Fill variables
    let text = tpl.content
      .replace(/{student_name}/g, `*${s.name}*`)
      .replace(/{roll_no}/g, s.rollNo)
      .replace(/{class_sec}/g, `Grade ${s.grade}-${s.section}`)
      .replace(/{date}/g, todayStr)
      .replace(/{parent_name}/g, `*${s.parentName}*`)
      .replace(/{amount_due}/g, dueAmount.toLocaleString())
      .replace(/{due_date}/g, "30-Sep-2026")
      .replace(/{portal_link}/g, "https://rexschoolooty.edu.in/pay")
      .replace(/{score}/g, "92.4")
      .replace(/{bus_route}/g, s.busRoute.split('(')[0].trim());

    // Update Phone Mockup DOM
    const waChat = document.getElementById('wa-sim-chat');
    if (waChat) {
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      waChat.innerHTML = `
        <div class="wa-message-bubble">
          <div class="wa-message-header">📢 Christus Rex Senior Secondary School (Ooty)</div>
          <div>${text.replace(/\*(.*?)\*/g, '<b>$1</b>')}</div>
          <div class="wa-message-footer">
            <span>${timeStr}</span>
            <span class="wa-ticks">✓✓</span>
          </div>
        </div>
      `;
    }

    const tplDesc = document.getElementById('wa-template-desc');
    if (tplDesc) {
      tplDesc.textContent = `Category: ${tpl.category} • Automated Variable Injection Active`;
    }
  },

  openWhatsAppPreviewForStudent(studentId) {
    const students = ERPStorage.getStudents();
    const s = students.find(item => item.id === studentId);
    if (s) {
      this.sampleStudent = s;
      App.switchView('communication');
      this.updateSimulator();
      App.showToast(`Loaded WhatsApp broadcast preview for ${s.name}`, "info");
    }
  },

  dispatchWhatsAppBroadcast() {
    const tpl = SEED_WHATSAPP_TEMPLATES.find(t => t.id === this.selectedTemplateId) || SEED_WHATSAPP_TEMPLATES[0];
    const recipient = document.getElementById('wa-recipient-select')?.value || 'All Parents';

    ERPStorage.addActivity(`Broadcast dispatched: "${tpl.title}" sent via WhatsApp Gateway to ${recipient}`);
    App.showToast(`WhatsApp broadcast "${tpl.title}" dispatched successfully!`, "success");
    DashboardModule.render();

    // Trigger visual highlight in phone mockup
    const bubble = document.querySelector('.wa-message-bubble');
    if (bubble) {
      bubble.style.transform = 'scale(1.04)';
      bubble.style.boxShadow = '0 0 15px rgba(37, 211, 102, 0.6)';
      setTimeout(() => {
        bubble.style.transform = 'scale(1)';
        bubble.style.boxShadow = 'none';
      }, 500);
    }
  },

  openNewCircularModal() {
    const modal = document.getElementById('new-circular-modal');
    if (modal) modal.classList.add('open');
  },

  closeNewCircularModal() {
    const modal = document.getElementById('new-circular-modal');
    if (modal) modal.classList.remove('open');
  },

  handlePublishCircular() {
    const title = document.getElementById('circ-title')?.value.trim();
    const category = document.getElementById('circ-category')?.value;
    const priority = document.getElementById('circ-priority')?.value;
    const target = document.getElementById('circ-target')?.value;
    const summary = document.getElementById('circ-summary')?.value.trim();

    if (!title || !summary) {
      App.showToast("Please provide title and announcement details", "warning");
      return;
    }

    const circulars = ERPStorage.getCirculars();
    const newCirc = {
      id: `CIR-2026-${Math.floor(100 + Math.random() * 900)}`,
      title,
      date: new Date().toISOString().split('T')[0],
      category,
      priority,
      author: "Principal's Office",
      summary,
      target
    };

    circulars.unshift(newCirc);
    ERPStorage.saveCirculars(circulars);
    ERPStorage.addActivity(`Published Circular ${newCirc.id}: ${title}`);

    this.closeNewCircularModal();
    this.renderCirculars();
    DashboardModule.render();
    App.showToast("Circular published & sent to parent mobile apps!", "success");

    document.getElementById('new-circular-form')?.reset();
  }
};
