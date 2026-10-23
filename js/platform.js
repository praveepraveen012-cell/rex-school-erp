/**
 * Grexotix School Management Platform - Platform Operations & SaaS Controller
 * Handles Multi-School Registration Wizard, Registration Status Tracker,
 * Platform Admin Console (Approvals, Rejections, Tenant Management), and
 * New School Workspace Guided Onboarding.
 *
 * Product of Grexotix — Empowering Schools with Smart Management
 */

(function (window) {
  const PlatformModule = {
    currentRegStep: 1,
    regFormData: {},
    currentStatusRef: '',
    platformAdminTab: 'registrations', // 'registrations' | 'schools'
    adminFilterStatus: 'ALL',
    adminSearchQuery: '',

    init() {
      this.attachGlobalTriggers();
    },

    attachGlobalTriggers() {
      // Allow global triggering from any button
      document.querySelectorAll('[data-action="register-school"]').forEach(el => {
        el.addEventListener('click', (e) => {
          e.preventDefault();
          this.openRegistrationModal();
        });
      });

      document.querySelectorAll('[data-action="track-status"]').forEach(el => {
        el.addEventListener('click', (e) => {
          e.preventDefault();
          this.openStatusModal();
        });
      });
    },

    // ========================================================================
    // 1. 4-STEP SCHOOL REGISTRATION WIZARD
    // ========================================================================
    openRegistrationModal() {
      this.currentRegStep = 1;
      this.regFormData = {
        desiredModules: ['attendance', 'homework', 'fees', 'id_cards', 'transport']
      };

      let modal = document.getElementById('grexotix-registration-modal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'grexotix-registration-modal';
        modal.className = 'rex-modal-overlay';
        document.body.appendChild(modal);
      }

      this.renderRegModalContent();
      modal.style.display = 'flex';
    },

    closeRegistrationModal() {
      const modal = document.getElementById('grexotix-registration-modal');
      if (modal) modal.style.display = 'none';
    },

    renderRegModalContent() {
      const modal = document.getElementById('grexotix-registration-modal');
      if (!modal) return;

      modal.innerHTML = `
        <div class="rex-modal-card" style="max-width: 680px; width: 95%;">
          <div class="rex-modal-header" style="background: #ffffff; border-bottom: 1px solid var(--border-subtle); padding: 1.25rem 1.5rem;">
            <div class="rex-modal-title-group">
              <div class="grexotix-logo-container sm" style="background:#ffffff; border:1px solid #e2e8f0; padding:4px 8px; border-radius:6px;">
                <img src="assets/grexotix_logo.png" alt="Grexotix Logo" class="grexotix-logo-img" style="height:34px; object-fit:contain;">
              </div>
              <div style="margin-left: 0.75rem;">
                <h3 style="margin: 0; font-size: 1.15rem; font-weight: 800; color: #1e1b4b;">Register Your School</h3>
                <p style="margin: 0.15rem 0 0 0; font-size: 0.75rem; color: #64748b; font-weight: 600;">
                  Grexotix School Management Platform • Product of Grexotix
                </p>
              </div>
            </div>
            <button type="button" class="rex-modal-close" onclick="PlatformModule.closeRegistrationModal()" title="Close">&times;</button>
          </div>

          <!-- Wizard Progress Stepper -->
          <div style="background: #f8fafc; padding: 0.85rem 1.5rem; border-bottom: 1px solid var(--border-subtle); display: flex; align-items: center; justify-content: space-between;">
            <div class="stepper-item ${this.currentRegStep >= 1 ? 'active' : ''}" style="display: flex; align-items: center; gap: 0.45rem; font-size: 0.78rem; font-weight: 700; color: ${this.currentRegStep >= 1 ? '#7c3aed' : '#94a3b8'};">
              <span style="width: 22px; height: 22px; border-radius: 50%; background: ${this.currentRegStep >= 1 ? '#7c3aed' : '#e2e8f0'}; color: ${this.currentRegStep >= 1 ? '#fff' : '#64748b'}; display: flex; align-items: center; justify-content: center; font-size: 0.72rem;">1</span>
              <span>School Info</span>
            </div>
            <span style="color: #cbd5e1;">&rarr;</span>
            <div class="stepper-item ${this.currentRegStep >= 2 ? 'active' : ''}" style="display: flex; align-items: center; gap: 0.45rem; font-size: 0.78rem; font-weight: 700; color: ${this.currentRegStep >= 2 ? '#7c3aed' : '#94a3b8'};">
              <span style="width: 22px; height: 22px; border-radius: 50%; background: ${this.currentRegStep >= 2 ? '#7c3aed' : '#e2e8f0'}; color: ${this.currentRegStep >= 2 ? '#fff' : '#64748b'}; display: flex; align-items: center; justify-content: center; font-size: 0.72rem;">2</span>
              <span>Representative</span>
            </div>
            <span style="color: #cbd5e1;">&rarr;</span>
            <div class="stepper-item ${this.currentRegStep >= 3 ? 'active' : ''}" style="display: flex; align-items: center; gap: 0.45rem; font-size: 0.78rem; font-weight: 700; color: ${this.currentRegStep >= 3 ? '#7c3aed' : '#94a3b8'};">
              <span style="width: 22px; height: 22px; border-radius: 50%; background: ${this.currentRegStep >= 3 ? '#7c3aed' : '#e2e8f0'}; color: ${this.currentRegStep >= 3 ? '#fff' : '#64748b'}; display: flex; align-items: center; justify-content: center; font-size: 0.72rem;">3</span>
              <span>Modules</span>
            </div>
            <span style="color: #cbd5e1;">&rarr;</span>
            <div class="stepper-item ${this.currentRegStep >= 4 ? 'active' : ''}" style="display: flex; align-items: center; gap: 0.45rem; font-size: 0.78rem; font-weight: 700; color: ${this.currentRegStep >= 4 ? '#7c3aed' : '#94a3b8'};">
              <span style="width: 22px; height: 22px; border-radius: 50%; background: ${this.currentRegStep >= 4 ? '#7c3aed' : '#e2e8f0'}; color: ${this.currentRegStep >= 4 ? '#fff' : '#64748b'}; display: flex; align-items: center; justify-content: center; font-size: 0.72rem;">4</span>
              <span>Review</span>
            </div>
          </div>

          <div class="rex-modal-body" style="padding: 1.5rem; max-height: 72vh; overflow-y: auto;">
            <div id="reg-error-banner" class="rex-auth-error-banner" style="display: none; margin-bottom: 1rem;"></div>

            ${this.renderRegStepContent()}
          </div>
        </div>
      `;
    },

    renderRegStepContent() {
      if (this.currentRegStep === 1) {
        return `
          <form onsubmit="PlatformModule.handleStep1Submit(event)">
            <h4 style="margin: 0 0 0.5rem 0; font-size: 1rem; color: #0f172a;">Step 1: Institutional Information</h4>
            <p style="font-size: 0.78rem; color: #64748b; margin-bottom: 1.25rem;">
              Provide official school contact and institutional identification details.
            </p>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
              <div class="rex-form-group">
                <label>Official School Name *</label>
                <input type="text" id="reg-school-name" required placeholder="e.g. Cambridge International Academy" value="${this.regFormData.schoolName || ''}">
              </div>
              <div class="rex-form-group">
                <label>Display / Short Name *</label>
                <input type="text" id="reg-display-name" required placeholder="e.g. Cambridge Academy" value="${this.regFormData.displayName || ''}">
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
              <div class="rex-form-group">
                <label>Official School Email *</label>
                <input type="email" id="reg-school-email" required placeholder="office@cambridge-academy.edu" value="${this.regFormData.schoolEmail || ''}">
              </div>
              <div class="rex-form-group">
                <label>Official Contact Phone *</label>
                <input type="tel" id="reg-school-phone" required placeholder="+91 80 2345 6789" value="${this.regFormData.schoolPhone || ''}">
              </div>
            </div>

            <div class="rex-form-group" style="margin-bottom: 1rem;">
              <label>School Campus Address *</label>
              <input type="text" id="reg-address" required placeholder="Plot 12, Academic Enclave, Sector 4" value="${this.regFormData.address || ''}">
            </div>

            <div style="display: grid; grid-template-columns: 1.2fr 1fr 1fr; gap: 0.75rem; margin-bottom: 1rem;">
              <div class="rex-form-group">
                <label>City *</label>
                <input type="text" id="reg-city" required placeholder="Bangalore" value="${this.regFormData.city || ''}">
              </div>
              <div class="rex-form-group">
                <label>State *</label>
                <input type="text" id="reg-state" required placeholder="Karnataka" value="${this.regFormData.state || ''}">
              </div>
              <div class="rex-form-group">
                <label>Postal Code *</label>
                <input type="text" id="reg-postal" required placeholder="560001" value="${this.regFormData.postalCode || ''}">
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.25rem;">
              <div class="rex-form-group">
                <label>Affiliation Board</label>
                <select id="reg-board">
                  <option value="CBSE" ${this.regFormData.affiliationBoard === 'CBSE' ? 'selected' : ''}>CBSE (Central Board)</option>
                  <option value="ICSE" ${this.regFormData.affiliationBoard === 'ICSE' ? 'selected' : ''}>ICSE / CISCE</option>
                  <option value="State Board" ${this.regFormData.affiliationBoard === 'State Board' ? 'selected' : ''}>State Matriculation</option>
                  <option value="IB" ${this.regFormData.affiliationBoard === 'IB' ? 'selected' : ''}>International Baccalaureate (IB)</option>
                  <option value="Cambridge" ${this.regFormData.affiliationBoard === 'Cambridge' ? 'selected' : ''}>Cambridge IGCSE</option>
                </select>
              </div>
              <div class="rex-form-group">
                <label>Affiliation Number (Optional)</label>
                <input type="text" id="reg-affil-no" placeholder="e.g. 1930000" value="${this.regFormData.affiliationNumber || ''}">
              </div>
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.5rem;">
              <button type="button" class="btn btn-secondary" onclick="PlatformModule.closeRegistrationModal()">Cancel</button>
              <button type="submit" class="btn btn-primary" style="background: linear-gradient(135deg, #7c3aed, #6d28d9); border-color: #6d28d9;">
                Next: Representative &rarr;
              </button>
            </div>
          </form>
        `;
      }

      if (this.currentRegStep === 2) {
        return `
          <form onsubmit="PlatformModule.handleStep2Submit(event)">
            <h4 style="margin: 0 0 0.5rem 0; font-size: 1rem; color: #0f172a;">Step 2: Authorized Representative</h4>
            <p style="font-size: 0.78rem; color: #64748b; margin-bottom: 1.25rem;">
              The person authorized by the school management (e.g. Principal, Director, Secretary) who will be assigned the initial School Super Admin account.
            </p>

            <div style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 1rem; margin-bottom: 1rem;">
              <div class="rex-form-group">
                <label>Representative Full Name *</label>
                <input type="text" id="reg-rep-name" required placeholder="Dr. Sarah Johnson" value="${this.regFormData.repName || ''}">
              </div>
              <div class="rex-form-group">
                <label>Designation / Role *</label>
                <input type="text" id="reg-rep-desig" required placeholder="Principal / Managing Trustee" value="${this.regFormData.repDesignation || ''}">
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
              <div class="rex-form-group">
                <label>Official Email (Used for Login) *</label>
                <input type="email" id="reg-rep-email" required placeholder="principal@cambridge-academy.edu" value="${this.regFormData.repEmail || ''}">
              </div>
              <div class="rex-form-group">
                <label>Direct Mobile Number *</label>
                <input type="tel" id="reg-rep-phone" required placeholder="9876543210" value="${this.regFormData.repPhone || ''}">
              </div>
            </div>

            <div class="rex-form-group" style="margin-bottom: 1rem;">
              <label>Create School Super Admin Password * (Minimum 8 characters)</label>
              <input type="password" id="reg-password" required minlength="8" placeholder="••••••••••••" value="${this.regFormData.password || ''}">
              <div style="font-size: 0.72rem; color: #64748b; margin-top: 0.25rem;">
                🔒 Securely hashed on Grexotix platform servers using bcrypt. Never stored in plaintext.
              </div>
            </div>

            <div style="display: flex; justify-content: space-between; gap: 0.75rem; margin-top: 1.5rem;">
              <button type="button" class="btn btn-secondary" onclick="PlatformModule.goToStep(1)">&larr; Back to School Info</button>
              <button type="submit" class="btn btn-primary" style="background: linear-gradient(135deg, #7c3aed, #6d28d9); border-color: #6d28d9;">
                Next: Modules & Sizing &rarr;
              </button>
            </div>
          </form>
        `;
      }

      if (this.currentRegStep === 3) {
        const modules = [
          { id: 'attendance', label: 'Smart Attendance & RFID Sync', desc: 'Real-time student & staff attendance with parent SMS/WhatsApp triggers' },
          { id: 'homework', label: 'Daily Digital Diary & Homework', desc: 'Faculty authoring, daily homework lock at 5 PM, and verified push alerts' },
          { id: 'fees', label: 'Fee Cashier & Split Payments', desc: 'Automated receipt generation and 30% min split payment rule enforcement' },
          { id: 'id_cards', label: 'Student & Staff Digital ID Cards', desc: 'Instant photo digital cards with scannable QR Gate Passes' },
          { id: 'transport', label: 'School Bus Transit GPS Fleet', desc: 'Waypoint monitoring, route progression, and proximity geofencing' },
          { id: 'hr', label: 'Faculty HR & Payroll', desc: 'Staff directory, department allocations, and auto payslip calculation' }
        ];

        return `
          <form onsubmit="PlatformModule.handleStep3Submit(event)">
            <h4 style="margin: 0 0 0.5rem 0; font-size: 1rem; color: #0f172a;">Step 3: School Sizing & Desired Modules</h4>
            <p style="font-size: 0.78rem; color: #64748b; margin-bottom: 1.25rem;">
              Tailor the Grexotix workspace setup according to your institution scale.
            </p>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.25rem;">
              <div class="rex-form-group">
                <label>Approximate Student Count</label>
                <select id="reg-students-count">
                  <option value="100-500" ${this.regFormData.approxStudents === '100-500' ? 'selected' : ''}>100 – 500 Students</option>
                  <option value="500-1500" ${this.regFormData.approxStudents === '500-1500' || !this.regFormData.approxStudents ? 'selected' : ''}>500 – 1,500 Students</option>
                  <option value="1500-3000" ${this.regFormData.approxStudents === '1500-3000' ? 'selected' : ''}>1,500 – 3,000 Students</option>
                  <option value="3000+" ${this.regFormData.approxStudents === '3000+' ? 'selected' : ''}>3,000+ Students (Enterprise)</option>
                </select>
              </div>
              <div class="rex-form-group">
                <label>Number of Campuses</label>
                <input type="number" id="reg-campuses" min="1" max="10" value="${this.regFormData.campusesCount || 1}">
              </div>
            </div>

            <div style="margin-bottom: 1.25rem;">
              <label style="font-size: 0.8rem; font-weight: 700; color: #334155; display: block; margin-bottom: 0.5rem;">Select Desired Modules</label>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem;">
                ${modules.map(m => {
                  const isChecked = (this.regFormData.desiredModules || []).includes(m.id);
                  return `
                    <label style="display: flex; align-items: flex-start; gap: 0.5rem; padding: 0.65rem 0.85rem; background: #f8fafc; border: 1px solid var(--border-subtle); border-radius: 6px; cursor: pointer; font-size: 0.78rem;">
                      <input type="checkbox" name="desired_module" value="${m.id}" ${isChecked ? 'checked' : ''} style="margin-top: 0.15rem;">
                      <div>
                        <strong style="display: block; color: #0f172a;">${m.label}</strong>
                        <span style="font-size: 0.7rem; color: #64748b;">${m.desc}</span>
                      </div>
                    </label>
                  `;
                }).join('')}
              </div>
            </div>

            <div style="display: flex; justify-content: space-between; gap: 0.75rem; margin-top: 1.5rem;">
              <button type="button" class="btn btn-secondary" onclick="PlatformModule.goToStep(2)">&larr; Back to Representative</button>
              <button type="submit" class="btn btn-primary" style="background: linear-gradient(135deg, #7c3aed, #6d28d9); border-color: #6d28d9;">
                Review Application &rarr;
              </button>
            </div>
          </form>
        `;
      }

      if (this.currentRegStep === 4) {
        return `
          <div>
            <h4 style="margin: 0 0 0.5rem 0; font-size: 1rem; color: #0f172a;">Step 4: Review Details & Submit</h4>
            <p style="font-size: 0.78rem; color: #64748b; margin-bottom: 1.25rem;">
              Please review your school information before submitting for platform authorization.
            </p>

            <div style="background: #f8fafc; border: 1px solid var(--border-subtle); border-radius: 8px; padding: 1rem; font-size: 0.8rem; margin-bottom: 1.25rem;">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 0.75rem;">
                <div>
                  <span style="color: #64748b;">School Name:</span><br>
                  <strong style="color: #0f172a;">${this.regFormData.schoolName}</strong>
                </div>
                <div>
                  <span style="color: #64748b;">Display Name:</span><br>
                  <strong style="color: #0f172a;">${this.regFormData.displayName}</strong>
                </div>
                <div>
                  <span style="color: #64748b;">School Email:</span><br>
                  <strong style="color: #0f172a;">${this.regFormData.schoolEmail}</strong>
                </div>
                <div>
                  <span style="color: #64748b;">School Phone:</span><br>
                  <strong style="color: #0f172a;">${this.regFormData.schoolPhone}</strong>
                </div>
              </div>

              <div style="border-top: 1px dashed var(--border-subtle); padding-top: 0.75rem; margin-bottom: 0.75rem; display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
                <div>
                  <span style="color: #64748b;">Campus Location:</span><br>
                  <strong style="color: #0f172a;">${this.regFormData.city}, ${this.regFormData.state} (${this.regFormData.postalCode})</strong>
                </div>
                <div>
                  <span style="color: #64748b;">Affiliation:</span><br>
                  <strong style="color: #0f172a;">${this.regFormData.affiliationBoard} ${this.regFormData.affiliationNumber ? '#' + this.regFormData.affiliationNumber : ''}</strong>
                </div>
              </div>

              <div style="border-top: 1px dashed var(--border-subtle); padding-top: 0.75rem; display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
                <div>
                  <span style="color: #64748b;">Representative:</span><br>
                  <strong style="color: #0f172a;">${this.regFormData.repName} (${this.regFormData.repDesignation})</strong>
                </div>
                <div>
                  <span style="color: #64748b;">Login Email:</span><br>
                  <strong style="color: #0f172a;">${this.regFormData.repEmail}</strong>
                </div>
              </div>
            </div>

            <div style="margin-bottom: 1.25rem;">
              <label style="display: flex; align-items: flex-start; gap: 0.5rem; font-size: 0.78rem; color: #334155; cursor: pointer;">
                <input type="checkbox" id="reg-auth-confirm" required checked style="margin-top: 0.2rem;">
                <span>
                  I confirm that I am an authorized representative of <strong>${this.regFormData.schoolName}</strong> and authorized to register this institution on the Grexotix School Management Platform.
                </span>
              </label>
            </div>

            <div style="display: flex; justify-content: space-between; gap: 0.75rem;">
              <button type="button" class="btn btn-secondary" onclick="PlatformModule.goToStep(3)">&larr; Back to Modules</button>
              <button type="button" id="btn-submit-registration" class="btn btn-primary" onclick="PlatformModule.submitRegistration()" style="background: linear-gradient(135deg, #7c3aed, #5b21b6); border-color: #5b21b6; font-weight: 800; padding: 0.75rem 1.5rem;">
                🚀 Submit School Registration
              </button>
            </div>
          </div>
        `;
      }

      if (this.currentRegStep === 5) {
        const schoolId = this.regFormData.schoolId || 'GRX-SCH-NEW';
        const trialEnds = this.regFormData.trial?.endsAt ? new Date(this.regFormData.trial.endsAt).toLocaleDateString(undefined, { dateStyle: 'medium' }) : '7 Days from today';
        const adminEmail = this.regFormData.repEmail || '';

        return `
          <div style="text-align: center; padding: 1.5rem 0.5rem;">
            <div style="width: 68px; height: 68px; border-radius: 50%; background: linear-gradient(135deg, #10b981, #059669); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 2.2rem; margin: 0 auto 1.25rem auto; box-shadow: 0 10px 25px -5px rgba(16, 185, 129, 0.4);">
              ✓
            </div>
            <h3 style="margin: 0 0 0.5rem 0; font-size: 1.4rem; color: #0f172a; font-weight: 800;">
              School Registered & Trial Activated!
            </h3>
            <p style="font-size: 0.88rem; color: #64748b; max-width: 480px; margin: 0 auto 1.25rem auto; line-height: 1.5;">
              Welcome <strong>${this.regFormData.schoolName}</strong> to Grexotix SaaS! Your 7-day full platform trial has started.
            </p>

            <div style="background: linear-gradient(135deg, #f5f3ff, #ede9fe); border: 2px solid #7c3aed; border-radius: 12px; padding: 1.25rem; max-width: 440px; margin: 0 auto 1.25rem auto; text-align: center; box-shadow: 0 4px 12px rgba(124, 58, 237, 0.08);">
              <div style="font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.08em; color: #6d28d9; font-weight: 800;">
                Permanent Unique School ID
              </div>
              <div style="font-size: 1.85rem; font-weight: 900; color: #5b21b6; letter-spacing: 0.06em; margin: 0.4rem 0;" id="submitted-school-id">
                ${schoolId}
              </div>
              <div style="display: flex; align-items: center; justify-content: center; gap: 0.4rem; font-size: 0.76rem; font-weight: 700; color: #047857; margin-bottom: 0.75rem;">
                <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #10b981;"></span>
                7-Day Free Trial Active &bull; Valid until ${trialEnds}
              </div>
              <button type="button" class="btn btn-sm btn-outline" onclick="PlatformModule.copySchoolId('${schoolId}')" style="background: #ffffff; border-color: #7c3aed; color: #6d28d9; font-weight: 700;">
                📋 Copy School ID
              </button>
            </div>

            <div style="font-size: 0.8rem; color: #64748b; margin-bottom: 1.5rem; line-height: 1.5;">
              Registration confirmation, unique School ID, and administrator login credentials have been dispatched to <strong>${adminEmail}</strong>.
            </div>

            <div style="display: flex; justify-content: center; gap: 0.75rem;">
              <button type="button" class="btn btn-primary" onclick="PlatformModule.launchSchoolDashboard()" style="background: linear-gradient(135deg, #7c3aed, #5b21b6); border-color: #5b21b6; font-weight: 800; padding: 0.75rem 1.75rem; font-size: 0.95rem;">
                🚀 Enter School Workspace Dashboard
              </button>
            </div>
          </div>
        `;
      }

      return '';
    },

    goToStep(step) {
      this.currentRegStep = step;
      this.renderRegModalContent();
    },

    showRegError(msg) {
      const banner = document.getElementById('reg-error-banner');
      if (banner) {
        banner.textContent = msg;
        banner.style.display = 'block';
      }
      if (window.RexApi) window.RexApi.showToast(msg, 'error');
    },

    handleStep1Submit(e) {
      e.preventDefault();
      this.regFormData.schoolName = document.getElementById('reg-school-name').value.trim();
      this.regFormData.displayName = document.getElementById('reg-display-name').value.trim();
      this.regFormData.schoolEmail = document.getElementById('reg-school-email').value.trim();
      this.regFormData.schoolPhone = document.getElementById('reg-school-phone').value.trim();
      this.regFormData.address = document.getElementById('reg-address').value.trim();
      this.regFormData.city = document.getElementById('reg-city').value.trim();
      this.regFormData.state = document.getElementById('reg-state').value.trim();
      this.regFormData.postalCode = document.getElementById('reg-postal').value.trim();
      this.regFormData.affiliationBoard = document.getElementById('reg-board').value;
      this.regFormData.affiliationNumber = document.getElementById('reg-affil-no').value.trim();

      this.goToStep(2);
    },

    handleStep2Submit(e) {
      e.preventDefault();
      const pass = document.getElementById('reg-password').value;
      if (pass.length < 8) {
        this.showRegError('Password must be at least 8 characters long.');
        return;
      }

      this.regFormData.repName = document.getElementById('reg-rep-name').value.trim();
      this.regFormData.repDesignation = document.getElementById('reg-rep-desig').value.trim();
      this.regFormData.repEmail = document.getElementById('reg-rep-email').value.trim();
      this.regFormData.repPhone = document.getElementById('reg-rep-phone').value.trim();
      this.regFormData.password = pass;

      this.goToStep(3);
    },

    handleStep3Submit(e) {
      e.preventDefault();
      this.regFormData.approxStudents = document.getElementById('reg-students-count').value;
      this.regFormData.campusesCount = parseInt(document.getElementById('reg-campuses').value, 10) || 1;

      const checkedMods = Array.from(document.querySelectorAll('input[name="desired_module"]:checked')).map(el => el.value);
      this.regFormData.desiredModules = checkedMods;

      this.goToStep(4);
    },

    async submitRegistration() {
      const btn = document.getElementById('btn-submit-registration');
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting application...';
      }

      try {
        const payload = {
          schoolName: this.regFormData.schoolName,
          displayName: this.regFormData.displayName || this.regFormData.schoolName,
          schoolEmail: this.regFormData.schoolEmail,
          schoolPhone: this.regFormData.schoolPhone,
          address: this.regFormData.address,
          city: this.regFormData.city,
          state: this.regFormData.state,
          postalCode: this.regFormData.postalCode,
          adminName: this.regFormData.repName,
          adminEmail: this.regFormData.repEmail,
          adminMobile: this.regFormData.repPhone,
          password: this.regFormData.password,
          confirmPassword: this.regFormData.password,
          country: 'India',
          affiliationBoard: this.regFormData.affiliationBoard || 'CBSE',
          affiliationNumber: this.regFormData.affiliationNumber || ''
        };

        const res = await window.RexApi.registerSchool(payload);
        this.regFormData.schoolId = res.schoolId;
        this.regFormData.trial = res.trial;
        this.regFormData.adminUser = res.user;
        this.goToStep(5);
        if (window.RexApi) window.RexApi.showToast('School registered with 7-day free trial activated!', 'success');
      } catch (err) {
        this.showRegError(err.message || 'Failed to submit registration. Please check fields.');
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = '🚀 Submit School Registration';
        }
      }
    },

    copyRefCode(code) {
      if (!code) return;
      navigator.clipboard.writeText(code).then(() => {
        if (window.RexApi) window.RexApi.showToast(`Reference ${code} copied to clipboard!`, 'info');
      }).catch(() => {
        prompt('Registration Reference:', code);
      });
    },

    copySchoolId(id) {
      if (!id) return;
      navigator.clipboard.writeText(id).then(() => {
        if (window.RexApi) window.RexApi.showToast(`School ID ${id} copied to clipboard!`, 'success');
      }).catch(() => {
        prompt('Permanent School ID:', id);
      });
    },

    launchSchoolDashboard() {
      this.closeRegistrationModal();
      if (window.AuthUI) {
        window.AuthUI.renderUserBadge();
        window.AuthUI.routeToDashboard();
      } else if (window.App) {
        window.App.switchView('dashboard');
      }
    },

    // ========================================================================
    // 2. REGISTRATION STATUS TRACKER
    // ========================================================================
    openStatusModal(prefillRef = '') {
      let modal = document.getElementById('grexotix-status-modal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'grexotix-status-modal';
        modal.className = 'rex-modal-overlay';
        document.body.appendChild(modal);
      }

      modal.innerHTML = `
        <div class="rex-modal-card" style="max-width: 520px; width: 95%;">
          <div class="rex-modal-header" style="background:#fff; border-bottom:1px solid var(--border-subtle); padding: 1.25rem 1.5rem;">
            <div class="rex-modal-title-group">
              <div class="grexotix-logo-container sm">
                <img src="assets/grexotix_logo.png" alt="Grexotix Logo" class="grexotix-logo-img" style="height:32px;">
              </div>
              <div style="margin-left: 0.75rem;">
                <h3 style="margin: 0; font-size: 1.1rem; font-weight: 800; color: #0f172a;">Track Registration Status</h3>
                <p style="margin: 0.15rem 0 0 0; font-size: 0.75rem; color: #64748b;">Grexotix School Management Platform</p>
              </div>
            </div>
            <button type="button" class="rex-modal-close" onclick="document.getElementById('grexotix-status-modal').style.display='none'">&times;</button>
          </div>

          <div class="rex-modal-body" style="padding: 1.5rem;">
            <div class="rex-form-group" style="margin-bottom: 1rem;">
              <label>Registration Reference Code *</label>
              <div style="display: flex; gap: 0.5rem;">
                <input type="text" id="status-ref-input" placeholder="e.g. GRX-REG-2026-1234" value="${prefillRef || this.currentStatusRef || ''}" style="text-transform: uppercase; font-family: monospace; font-weight: 700; flex: 1;">
                <button type="button" class="btn btn-primary" onclick="PlatformModule.checkStatus()" style="background: #7c3aed; border-color: #7c3aed;">
                  Lookup
                </button>
              </div>
            </div>

            <div id="status-result-box" style="display: none; margin-top: 1.25rem;"></div>
          </div>
        </div>
      `;

      modal.style.display = 'flex';
      if (prefillRef) {
        this.checkStatus();
      }
    },

    async checkStatus() {
      const input = document.getElementById('status-ref-input');
      const box = document.getElementById('status-result-box');
      if (!input || !box) return;

      const ref = input.value.trim().toUpperCase();
      if (!ref) {
        if (window.RexApi) window.RexApi.showToast('Please enter your registration reference code.', 'warning');
        return;
      }

      box.style.display = 'block';
      box.innerHTML = '<div style="text-align: center; padding: 1rem; color: #64748b;"><i class="fas fa-spinner fa-spin"></i> Checking platform registration status...</div>';

      try {
        const res = await window.RexApi.getRegistrationStatus(ref);
        const reg = res.registration;

        let statusBadgeColor = '#f59e0b';
        let statusText = 'Pending Approval';
        let actionBtnHtml = '';

        if (reg.status === 'APPROVED' || reg.status === 'ACTIVE') {
          statusBadgeColor = '#10b981';
          statusText = 'Approved & Active';
          actionBtnHtml = `
            <div style="margin-top: 1rem; padding-top: 0.75rem; border-top: 1px dashed var(--border-subtle); text-align: center;">
              <p style="font-size: 0.78rem; color: #059669; font-weight: 700; margin-bottom: 0.5rem;">
                🎉 Your School Workspace is active!
              </p>
              <button type="button" class="btn btn-primary btn-block" onclick="PlatformModule.launchSchoolLogin('${reg.rep_email}')" style="background: #10b981; border-color: #10b981;">
                Sign In to School Workspace &rarr;
              </button>
            </div>
          `;
        } else if (reg.status === 'REJECTED') {
          statusBadgeColor = '#ef4444';
          statusText = 'Application Rejected';
        }

        box.innerHTML = `
          <div style="background: #f8fafc; border: 1px solid var(--border-subtle); border-radius: 8px; padding: 1rem; font-size: 0.8rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
              <strong style="font-size: 0.95rem; color: #0f172a;">${reg.school_name}</strong>
              <span class="badge" style="background: ${statusBadgeColor}; color: #fff; font-size: 0.72rem; padding: 0.2rem 0.5rem;">
                ${statusText}
              </span>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-bottom: 0.5rem; color: #64748b;">
              <div>Ref: <strong style="color: #0f172a;">${reg.registration_ref}</strong></div>
              <div>Submitted: <strong style="color: #0f172a;">${new Date(reg.created_at).toLocaleDateString()}</strong></div>
              <div>Representative: <strong style="color: #0f172a;">${reg.rep_name}</strong></div>
              <div>Email: <strong style="color: #0f172a;">${reg.rep_email}</strong></div>
            </div>

            ${reg.review_notes ? `
              <div style="margin-top: 0.5rem; padding: 0.6rem; background: #fff; border-radius: 4px; border-left: 3px solid ${statusBadgeColor}; font-size: 0.75rem;">
                <strong style="color: #0f172a;">Platform Notes:</strong> ${reg.review_notes}
              </div>
            ` : ''}

            ${actionBtnHtml}
          </div>
        `;
      } catch (err) {
        box.innerHTML = `
          <div style="padding: 0.85rem; background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; color: #dc2626; font-size: 0.8rem;">
            ${err.message || 'No registration record found for that reference code. Please verify the code.'}
          </div>
        `;
      }
    },

    launchSchoolLogin(email) {
      document.getElementById('grexotix-status-modal').style.display = 'none';
      if (window.AuthUI) {
        window.AuthUI.showLoginModal();
        setTimeout(() => {
          const emailInput = document.getElementById('admin-user');
          if (emailInput && email) emailInput.value = email;
        }, 150);
      }
    },

    // ========================================================================
    // 3. PLATFORM ADMINISTRATOR CONSOLE
    // ========================================================================
    async renderPlatformAdminView() {
      const container = document.getElementById('platform-admin-view');
      if (!container) return;

      container.innerHTML = `
        <div style="padding: 1.5rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
            <div>
              <div style="display: flex; align-items: center; gap: 0.75rem;">
                <div class="grexotix-logo-container sm" style="background:#fff; border:1px solid #e2e8f0; padding:4px 8px; border-radius:6px;">
                  <img src="assets/grexotix_logo.png" alt="Grexotix Logo" class="grexotix-logo-img" style="height:32px;">
                </div>
                <div>
                  <h2 style="margin: 0; font-size: 1.4rem; font-weight: 800; color: #0f172a;">Platform Administrator Console</h2>
                  <p style="margin: 0.15rem 0 0 0; font-size: 0.78rem; color: #64748b; font-weight: 600;">
                    Grexotix Multi-Tenant Operations & School Onboarding • Product of Grexotix
                  </p>
                </div>
              </div>
            </div>
            <div style="display: flex; gap: 0.5rem;">
              <button class="btn btn-sm btn-outline" onclick="PlatformModule.renderPlatformAdminView()">
                <i class="fas fa-sync-alt"></i> Refresh Data
              </button>
            </div>
          </div>

          <!-- Platform Metric Counters -->
          <div id="platform-analytics-cards" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1.75rem;">
            <div style="background: #fff; border: 1px solid var(--border-subtle); border-radius: 8px; padding: 1.25rem;">
              <div style="font-size: 0.75rem; color: #64748b; font-weight: 700; text-transform: uppercase;">Total Registered Schools</div>
              <div style="font-size: 1.85rem; font-weight: 800; color: #7c3aed; margin: 0.25rem 0;" id="metric-total-schools">-</div>
              <div style="font-size: 0.72rem; color: #10b981;">Independent Multi-Tenant Workspaces</div>
            </div>
            <div style="background: #fff; border: 1px solid var(--border-subtle); border-radius: 8px; padding: 1.25rem;">
              <div style="font-size: 0.75rem; color: #64748b; font-weight: 700; text-transform: uppercase;">Pending Registrations</div>
              <div style="font-size: 1.85rem; font-weight: 800; color: #f59e0b; margin: 0.25rem 0;" id="metric-pending-reg">-</div>
              <div style="font-size: 0.72rem; color: #64748b;">Awaiting Admin Review</div>
            </div>
            <div style="background: #fff; border: 1px solid var(--border-subtle); border-radius: 8px; padding: 1.25rem;">
              <div style="font-size: 0.75rem; color: #64748b; font-weight: 700; text-transform: uppercase;">Active Students Across Campuses</div>
              <div style="font-size: 1.85rem; font-weight: 800; color: #0284c7; margin: 0.25rem 0;" id="metric-total-students">-</div>
              <div style="font-size: 0.72rem; color: #64748b;">Platform Total Enrolled</div>
            </div>
            <div style="background: #fff; border: 1px solid var(--border-subtle); border-radius: 8px; padding: 1.25rem;">
              <div style="font-size: 0.75rem; color: #64748b; font-weight: 700; text-transform: uppercase;">Platform Status</div>
              <div style="font-size: 1.35rem; font-weight: 800; color: #10b981; margin: 0.4rem 0;">OPERATIONAL ✅</div>
              <div style="font-size: 0.72rem; color: #64748b;">v2.5.0 Multi-Tenant Engine</div>
            </div>
          </div>

          <!-- Platform Navigation Tabs -->
          <div style="display: flex; gap: 0.5rem; border-bottom: 1px solid var(--border-subtle); margin-bottom: 1.25rem;">
            <button type="button" class="btn btn-sm ${this.platformAdminTab === 'registrations' ? 'btn-primary' : 'btn-outline'}" onclick="PlatformModule.switchPlatformTab('registrations')" style="${this.platformAdminTab === 'registrations' ? 'background:#7c3aed; border-color:#7c3aed;' : ''}">
              <i class="fas fa-file-signature"></i> School Registrations Queue
            </button>
            <button type="button" class="btn btn-sm ${this.platformAdminTab === 'schools' ? 'btn-primary' : 'btn-outline'}" onclick="PlatformModule.switchPlatformTab('schools')" style="${this.platformAdminTab === 'schools' ? 'background:#7c3aed; border-color:#7c3aed;' : ''}">
              <i class="fas fa-school"></i> Active Schools Directory
            </button>
          </div>

          <!-- Tab Content Area -->
          <div id="platform-admin-tab-body">
            <div style="text-align: center; padding: 2rem; color: #64748b;">
              <i class="fas fa-spinner fa-spin"></i> Loading platform data...
            </div>
          </div>
        </div>
      `;

      this.loadPlatformAnalytics();
      if (this.platformAdminTab === 'registrations') {
        this.loadRegistrationsTable();
      } else {
        this.loadSchoolsTable();
      }
    },

    switchPlatformTab(tab) {
      this.platformAdminTab = tab;
      this.renderPlatformAdminView();
    },

    async loadPlatformAnalytics() {
      try {
        const res = await window.RexApi.getPlatformAnalytics();
        const a = res.analytics;
        const totalEl = document.getElementById('metric-total-schools');
        const pendingEl = document.getElementById('metric-pending-reg');
        const studentsEl = document.getElementById('metric-total-students');
        if (totalEl) totalEl.textContent = a.totalSchools;
        if (pendingEl) pendingEl.textContent = a.pendingRegistrations;
        if (studentsEl) studentsEl.textContent = a.totalStudents;
      } catch (err) {
        console.error('Failed to load platform analytics:', err);
      }
    },

    async loadRegistrationsTable() {
      const container = document.getElementById('platform-admin-tab-body');
      if (!container) return;

      try {
        const res = await window.RexApi.getPlatformRegistrations(this.adminFilterStatus, this.adminSearchQuery);
        const list = res.registrations || [];

        container.innerHTML = `
          <div style="background: #fff; border: 1px solid var(--border-subtle); border-radius: 8px; padding: 1.25rem;">
            <!-- Filter & Search Controls -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.75rem;">
              <div style="display: flex; gap: 0.35rem;">
                ${['ALL', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED'].map(st => `
                  <button type="button" class="btn btn-sm ${this.adminFilterStatus === st ? 'btn-primary' : 'btn-outline'}" onclick="PlatformModule.filterRegistrations('${st}')" style="font-size: 0.75rem; ${this.adminFilterStatus === st ? 'background:#7c3aed; border-color:#7c3aed;' : ''}">
                    ${st.replace('_', ' ')}
                  </button>
                `).join('')}
              </div>
              <div style="display: flex; gap: 0.5rem;">
                <input type="text" placeholder="Search school, city, or ref..." value="${this.adminSearchQuery}" oninput="PlatformModule.searchRegistrations(this.value)" style="padding: 0.35rem 0.65rem; font-size: 0.78rem; border: 1px solid var(--border-subtle); border-radius: 6px; width: 220px;">
              </div>
            </div>

            ${list.length === 0 ? `
              <div style="text-align: center; padding: 3rem 1rem; color: #64748b;">
                <i class="fas fa-clipboard-check" style="font-size: 2.5rem; opacity: 0.4; margin-bottom: 0.75rem; display: block;"></i>
                <h4 style="margin: 0; color: #0f172a;">No Registration Requests Found</h4>
                <p style="font-size: 0.78rem; margin: 0.35rem 0 0 0;">There are currently no registration applications matching the selected criteria.</p>
              </div>
            ` : `
              <div class="table-responsive">
                <table class="data-table" style="width: 100%; font-size: 0.8rem;">
                  <thead>
                    <tr>
                      <th>Ref Code</th>
                      <th>School Name</th>
                      <th>Representative</th>
                      <th>City / State</th>
                      <th>Board</th>
                      <th>Status</th>
                      <th>Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${list.map(r => {
                      let badgeBg = '#f59e0b';
                      if (r.status === 'APPROVED' || r.status === 'ACTIVE') badgeBg = '#10b981';
                      if (r.status === 'REJECTED') badgeBg = '#ef4444';

                      return `
                        <tr>
                          <td><strong style="font-family: monospace; color: #7c3aed;">${r.registration_ref}</strong></td>
                          <td>
                            <strong>${r.school_name}</strong>
                            <div style="font-size: 0.7rem; color: #64748b;">${r.school_email}</div>
                          </td>
                          <td>
                            ${r.rep_name}
                            <div style="font-size: 0.7rem; color: #64748b;">${r.rep_designation} • ${r.rep_email}</div>
                          </td>
                          <td>${r.city}, ${r.state}</td>
                          <td>${r.affiliation_board || 'CBSE'}</td>
                          <td>
                            <span class="badge" style="background: ${badgeBg}; color: #fff; font-size: 0.68rem; padding: 0.15rem 0.45rem;">
                              ${r.status}
                            </span>
                          </td>
                          <td>${new Date(r.created_at).toLocaleDateString()}</td>
                          <td>
                            <button type="button" class="btn btn-sm btn-primary" onclick="PlatformModule.openReviewModal(${r.id})" style="padding: 0.25rem 0.55rem; font-size: 0.72rem; background: #7c3aed; border-color: #7c3aed;">
                              Review & Action
                            </button>
                          </td>
                        </tr>
                      `;
                    }).join('')}
                  </tbody>
                </table>
              </div>
            `}
          </div>
        `;
      } catch (err) {
        container.innerHTML = `<div class="alert alert-danger">Failed to load registration queue: ${err.message}</div>`;
      }
    },

    filterRegistrations(status) {
      this.adminFilterStatus = status;
      this.loadRegistrationsTable();
    },

    searchRegistrations(q) {
      this.adminSearchQuery = q;
      clearTimeout(this._searchTimer);
      this._searchTimer = setTimeout(() => this.loadRegistrationsTable(), 300);
    },

    async openReviewModal(regId) {
      try {
        const res = await window.RexApi.getRegistrationDetails(regId);
        const r = res.registration;

        let modal = document.getElementById('platform-review-modal');
        if (!modal) {
          modal = document.createElement('div');
          modal.id = 'platform-review-modal';
          modal.className = 'rex-modal-overlay';
          document.body.appendChild(modal);
        }

        modal.innerHTML = `
          <div class="rex-modal-card" style="max-width: 620px; width: 95%;">
            <div class="rex-modal-header" style="background:#fff; border-bottom:1px solid var(--border-subtle); padding: 1.25rem 1.5rem;">
              <div>
                <h3 style="margin: 0; font-size: 1.15rem; font-weight: 800; color: #0f172a;">Review School Application</h3>
                <p style="margin: 0.15rem 0 0 0; font-size: 0.75rem; color: #64748b;">Ref: ${r.registration_ref} • Grexotix Platform Review</p>
              </div>
              <button type="button" class="rex-modal-close" onclick="document.getElementById('platform-review-modal').style.display='none'">&times;</button>
            </div>

            <div class="rex-modal-body" style="padding: 1.5rem; max-height: 70vh; overflow-y: auto;">
              <div style="background: #f8fafc; border: 1px solid var(--border-subtle); border-radius: 8px; padding: 1rem; font-size: 0.8rem; margin-bottom: 1rem;">
                <h5 style="margin: 0 0 0.5rem 0; color: #7c3aed; font-size: 0.88rem;">School Profile</h5>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-bottom: 0.75rem;">
                  <div>School Name: <strong>${r.school_name}</strong></div>
                  <div>Display Name: <strong>${r.display_name}</strong></div>
                  <div>Email: <strong>${r.school_email}</strong></div>
                  <div>Phone: <strong>${r.school_phone}</strong></div>
                  <div>Location: <strong>${r.address}, ${r.city}, ${r.state} - ${r.postal_code}</strong></div>
                  <div>Board: <strong>${r.affiliation_board} ${r.affiliation_number || ''}</strong></div>
                </div>

                <h5 style="margin: 0.75rem 0 0.5rem 0; color: #7c3aed; font-size: 0.88rem; border-top: 1px dashed var(--border-subtle); padding-top: 0.5rem;">Authorized Representative</h5>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
                  <div>Name: <strong>${r.rep_name}</strong></div>
                  <div>Designation: <strong>${r.rep_designation}</strong></div>
                  <div>Login Email: <strong>${r.rep_email}</strong></div>
                  <div>Mobile: <strong>${r.rep_phone}</strong></div>
                </div>
              </div>

              <div class="rex-form-group" style="margin-bottom: 1.25rem;">
                <label>Administrative Review Notes / Decision Remarks</label>
                <textarea id="admin-review-notes" rows="2" placeholder="e.g. Verified official school affiliation and authorized onboarding." style="width: 100%; font-size: 0.8rem; padding: 0.5rem; border: 1px solid var(--border-subtle); border-radius: 6px;">${r.review_notes || ''}</textarea>
              </div>

              ${r.status === 'PENDING_APPROVAL' ? `
                <div style="display: flex; justify-content: space-between; gap: 0.75rem;">
                  <button type="button" class="btn btn-danger" onclick="PlatformModule.rejectRegistration(${r.id})" style="background: #ef4444; border-color: #ef4444;">
                    <i class="fas fa-times"></i> Reject Application
                  </button>
                  <button type="button" class="btn btn-primary" onclick="PlatformModule.approveRegistration(${r.id})" style="background: #10b981; border-color: #10b981; font-weight: 800;">
                    <i class="fas fa-check"></i> Approve & Provision School Workspace
                  </button>
                </div>
              ` : `
                <div style="padding: 0.75rem; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 6px; color: #065f46; font-size: 0.8rem; text-align: center;">
                  Current Status: <strong>${r.status}</strong>
                  ${r.school_id ? `(Assigned School Workspace ID: ${r.school_id})` : ''}
                </div>
              `}
            </div>
          </div>
        `;

        modal.style.display = 'flex';
      } catch (err) {
        if (window.RexApi) window.RexApi.showToast(err.message, 'error');
      }
    },

    async approveRegistration(id) {
      const notes = (document.getElementById('admin-review-notes')?.value || '').trim();
      if (!confirm('Approve this school registration and initialize an independent workspace with Super Admin credentials?')) {
        return;
      }

      try {
        const res = await window.RexApi.approveSchoolRegistration(id, notes);
        document.getElementById('platform-review-modal').style.display = 'none';
        if (window.RexApi) window.RexApi.showToast(res.message || 'School approved successfully!', 'success');
        this.loadRegistrationsTable();
        this.loadPlatformAnalytics();
      } catch (err) {
        if (window.RexApi) window.RexApi.showToast(err.message, 'error');
      }
    },

    async rejectRegistration(id) {
      const notes = (document.getElementById('admin-review-notes')?.value || '').trim();
      const reason = prompt('Please enter the reason for rejection:', notes || 'Institutional credentials could not be verified.');
      if (!reason) return;

      try {
        const res = await window.RexApi.rejectSchoolRegistration(id, reason);
        document.getElementById('platform-review-modal').style.display = 'none';
        if (window.RexApi) window.RexApi.showToast(res.message || 'Registration rejected.', 'info');
        this.loadRegistrationsTable();
        this.loadPlatformAnalytics();
      } catch (err) {
        if (window.RexApi) window.RexApi.showToast(err.message, 'error');
      }
    },

    async loadSchoolsTable() {
      const container = document.getElementById('platform-admin-tab-body');
      if (!container) return;

      try {
        const res = await window.RexApi.getPlatformSchools();
        const schools = res.schools || [];

        container.innerHTML = `
          <div style="background: #fff; border: 1px solid var(--border-subtle); border-radius: 8px; padding: 1.25rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
              <h4 style="margin: 0; font-size: 1rem; color: #0f172a;">Active School Tenants (${schools.length})</h4>
              <span style="font-size: 0.75rem; color: #64748b;">Independent Isolated Workspaces</span>
            </div>

            <div class="table-responsive">
              <table class="data-table" style="width: 100%; font-size: 0.8rem;">
                <thead>
                  <tr>
                    <th>Tenant Code</th>
                    <th>Official School Name</th>
                    <th>Location</th>
                    <th>Affiliation</th>
                    <th>Students</th>
                    <th>Staff</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${schools.map(s => {
                    const isActive = s.status === 'ACTIVE';
                    return `
                      <tr>
                        <td><strong style="font-family: monospace; color: #7c3aed;">${s.code}</strong></td>
                        <td>
                          <strong>${s.display_name || s.name}</strong>
                          <div style="font-size: 0.7rem; color: #64748b;">${s.email || '-'}</div>
                        </td>
                        <td>${s.city || '-'}, ${s.state || '-'}</td>
                        <td>${s.affiliation_board || 'CBSE'}</td>
                        <td><strong style="color: #0284c7;">${s.activeStudents || 0}</strong></td>
                        <td><strong style="color: #059669;">${s.activeTeachers || 0}</strong></td>
                        <td>
                          <span class="badge" style="background: ${isActive ? '#10b981' : '#ef4444'}; color: #fff; font-size: 0.68rem;">
                            ${s.status}
                          </span>
                        </td>
                        <td>
                          ${isActive ? `
                            <button type="button" class="btn btn-sm btn-outline" onclick="PlatformModule.suspendSchool(${s.id}, '${s.name}')" style="font-size: 0.72rem; color: #ef4444; border-color: #fecaca;">
                              Suspend
                            </button>
                          ` : `
                            <button type="button" class="btn btn-sm btn-outline" onclick="PlatformModule.reactivateSchool(${s.id})" style="font-size: 0.72rem; color: #10b981; border-color: #a7f3d0;">
                              Reactivate
                            </button>
                          `}
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>
        `;
      } catch (err) {
        container.innerHTML = `<div class="alert alert-danger">Failed to load schools: ${err.message}</div>`;
      }
    },

    async suspendSchool(id, name) {
      const reason = prompt(`Reason for suspending school "${name}":`, 'Administrative review pending');
      if (!reason) return;

      try {
        await window.RexApi.suspendSchool(id, reason);
        if (window.RexApi) window.RexApi.showToast(`School "${name}" suspended.`, 'warning');
        this.loadSchoolsTable();
      } catch (err) {
        if (window.RexApi) window.RexApi.showToast(err.message, 'error');
      }
    },

    async reactivateSchool(id) {
      if (!confirm('Reactivate this school workspace and restore full user access?')) return;

      try {
        await window.RexApi.reactivateSchool(id);
        if (window.RexApi) window.RexApi.showToast('School workspace reactivated successfully!', 'success');
        this.loadSchoolsTable();
      } catch (err) {
        if (window.RexApi) window.RexApi.showToast(err.message, 'error');
      }
    },

    // ========================================================================
    // 4. GUIDED ONBOARDING & EMPTY-STATE CHECK
    // ========================================================================
    checkAndRenderOnboardingBanner() {
      const dashboardView = document.getElementById('dashboard-view');
      if (!dashboardView) return;

      const user = window.RexApi ? window.RexApi.getUser() : null;
      if (!user || user.role !== 'SUPER_ADMIN') return;

      const students = (window.ERPStorage && ERPStorage.getStudents) ? ERPStorage.getStudents() : [];
      let banner = document.getElementById('grexotix-onboarding-banner');

      if (students.length === 0) {
        if (!banner) {
          banner = document.createElement('div');
          banner.id = 'grexotix-onboarding-banner';
          banner.style.cssText = `
            background: linear-gradient(135deg, #f5f3ff, #ede9fe);
            border: 1px solid #c4b5fd;
            border-radius: 8px;
            padding: 1.25rem 1.5rem;
            margin-bottom: 1.5rem;
            box-shadow: 0 2px 8px rgba(124, 58, 237, 0.08);
          `;
          dashboardView.prepend(banner);
        }

        const schoolName = user.school ? (user.school.display_name || user.school.name) : 'Your School';

        banner.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; flex-wrap: wrap;">
            <div>
              <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.35rem;">
                <span style="font-size: 1.25rem;">🚀</span>
                <h4 style="margin: 0; font-size: 1.05rem; font-weight: 800; color: #4c1d95;">
                  Welcome to ${schoolName} Management Workspace!
                </h4>
              </div>
              <p style="margin: 0 0 1rem 0; font-size: 0.8rem; color: #5b21b6; line-height: 1.5;">
                Your workspace is active and ready for initial setup. Follow this guided launch roadmap to prepare your digital campus:
              </p>

              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 0.75rem;">
                <div style="background: #fff; padding: 0.75rem; border-radius: 6px; border: 1px solid #ddd6fe; font-size: 0.78rem;">
                  <strong style="color: #7c3aed; display: block; margin-bottom: 0.2rem;">1. Configure Profile</strong>
                  <span style="color: #64748b; font-size: 0.72rem;">Set official timings & affiliation.</span><br>
                  <a href="#" onclick="App.switchView('settings'); return false;" style="color: #7c3aed; font-weight: 700; font-size: 0.72rem;">Open Settings &rarr;</a>
                </div>
                <div style="background: #fff; padding: 0.75rem; border-radius: 6px; border: 1px solid #ddd6fe; font-size: 0.78rem;">
                  <strong style="color: #7c3aed; display: block; margin-bottom: 0.2rem;">2. Add Classes</strong>
                  <span style="color: #64748b; font-size: 0.72rem;">Create academic sections.</span><br>
                  <a href="#" onclick="App.switchView('timetable'); return false;" style="color: #7c3aed; font-weight: 700; font-size: 0.72rem;">Configure Classes &rarr;</a>
                </div>
                <div style="background: #fff; padding: 0.75rem; border-radius: 6px; border: 1px solid #ddd6fe; font-size: 0.78rem;">
                  <strong style="color: #7c3aed; display: block; margin-bottom: 0.2rem;">3. Enroll Students</strong>
                  <span style="color: #64748b; font-size: 0.72rem;">Add student & parent directory.</span><br>
                  <a href="#" onclick="App.switchView('students'); return false;" style="color: #7c3aed; font-weight: 700; font-size: 0.72rem;">Add First Student &rarr;</a>
                </div>
                <div style="background: #fff; padding: 0.75rem; border-radius: 6px; border: 1px solid #ddd6fe; font-size: 0.78rem;">
                  <strong style="color: #7c3aed; display: block; margin-bottom: 0.2rem;">4. Fee Structure</strong>
                  <span style="color: #64748b; font-size: 0.72rem;">Setup term fee cashier ledgers.</span><br>
                  <a href="#" onclick="App.switchView('fees'); return false;" style="color: #7c3aed; font-weight: 700; font-size: 0.72rem;">Manage Fees &rarr;</a>
                </div>
              </div>
            </div>
          </div>
        `;
      } else if (banner) {
        banner.remove();
      }
    }
  };

  window.PlatformModule = PlatformModule;

  // Auto-init on DOM content loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => PlatformModule.init());
  } else {
    PlatformModule.init();
  }
})(window);
