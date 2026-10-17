/**
 * Grexotix School Management Platform - Student Information System (SIS) Module
 * Features Live SQLite Bidirectional Synchronization with Mobile,
 * Complete Multi-Section EMIS 2026-27 Registration Form, and 360° Student Profiles.
 */

const StudentsModule = {
  currentView: 'table', // 'grid' or 'table'
  selectedStudentId: null,
  studentsList: [],
  formOptions: null,
  isLoading: false,
  tabsOrder: ['tab-basic', 'tab-parent', 'tab-social', 'tab-address', 'tab-admission', 'tab-bank', 'tab-transport'],
  currentTabIndex: 0,

  async init() {
    this.attachEvents();
    if (window.RexApi && window.RexApi.isAuthenticated()) {
      await this.loadFormOptions();
      await this.loadStudents();
    } else {
      if (window.ERPStorage && typeof ERPStorage.getStudents === 'function') {
        this.studentsList = ERPStorage.getStudents();
        this.render();
      }
    }
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

    // Student Form Submission
    const addStudentForm = document.getElementById('add-student-form');
    if (addStudentForm) {
      addStudentForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleSubmitStudentForm();
      });
    }
  },

  async loadFormOptions() {
    try {
      if (window.RexApi && typeof RexApi.getStudentFormOptions === 'function') {
        const res = await RexApi.getStudentFormOptions();
        if (res && res.success) {
          this.formOptions = res;
          this.populateDropdowns(res);
        }
      }
    } catch (e) {
      console.warn("Could not load dynamic form options from API:", e.message);
    }
  },

  populateDropdowns(opts) {
    if (!opts) return;

    // 1. Class dropdowns
    const classSelect = document.getElementById('new-stu-class');
    const classAdmittedSelect = document.getElementById('new-stu-class-admitted');
    const gradeFilter = document.getElementById('student-grade-filter');

    if (classSelect && opts.classes) {
      const cur = classSelect.value;
      classSelect.innerHTML = '<option value="">-- Select Class --</option>' +
        opts.classes.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
      if (cur) classSelect.value = cur;

      // When class changes, populate sections
      classSelect.onchange = () => {
        this.updateSectionDropdown(classSelect.value);
      };
    }

    if (classAdmittedSelect && opts.classes) {
      classAdmittedSelect.innerHTML = '<option value="">-- Same as Current Class --</option>' +
        opts.classes.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
    }

    if (gradeFilter && opts.classes && gradeFilter.children.length <= 1) {
      opts.classes.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.name;
        opt.textContent = c.name;
        gradeFilter.appendChild(opt);
      });
    }

    // 2. Academic Years
    const yearSelect = document.getElementById('new-stu-academic-year');
    if (yearSelect && opts.academicYears) {
      yearSelect.innerHTML = opts.academicYears.map(y =>
        `<option value="${y.id}" ${y.is_current ? 'selected' : ''}>${y.name} ${y.is_current ? '(Current)' : ''}</option>`
      ).join('');
    }

    // 3. Buses
    const busSelect = document.getElementById('new-stu-bus-id');
    if (busSelect && opts.buses) {
      busSelect.innerHTML = '<option value="">-- Select Active Bus --</option>' +
        opts.buses.map(b => `<option value="${b.id}">${b.bus_number} (${b.vehicle_no}) - Cap: ${b.capacity}</option>`).join('');
    }

    // 4. Routes
    const routeSelect = document.getElementById('new-stu-route-id');
    if (routeSelect && opts.routes) {
      routeSelect.innerHTML = '<option value="">-- Select Route --</option>' +
        opts.routes.map(r => `<option value="${r.id}">${r.name} (${r.start_point} → ${r.end_point})</option>`).join('');
    }
  },

  updateSectionDropdown(classId) {
    const secSelect = document.getElementById('new-stu-section');
    if (!secSelect) return;

    if (!classId || !this.formOptions || !this.formOptions.sections) {
      secSelect.innerHTML = '<option value="">-- Select Section --</option>';
      return;
    }

    const filtered = this.formOptions.sections.filter(s => String(s.class_id) === String(classId));
    secSelect.innerHTML = '<option value="">-- Select Section --</option>' +
      filtered.map(s => `<option value="${s.id}">${s.name}</option>`).join('');

    if (filtered.length === 1) {
      secSelect.value = filtered[0].id;
    }
  },

  handleBusSelection(busId) {
    if (!busId || !this.formOptions || !this.formOptions.buses) return;
    const bus = this.formOptions.buses.find(b => String(b.id) === String(busId));
    if (bus && bus.route_id) {
      const routeSelect = document.getElementById('new-stu-route-id');
      if (routeSelect) {
        routeSelect.value = bus.route_id;
        this.handleRouteSelection(bus.route_id);
      }
    }
  },

  handleRouteSelection(routeId) {
    const stopSelect = document.getElementById('new-stu-stop-id');
    if (!stopSelect || !this.formOptions || !this.formOptions.routes) return;

    const route = this.formOptions.routes.find(r => String(r.id) === String(routeId));
    if (route && Array.isArray(route.stops)) {
      stopSelect.innerHTML = '<option value="">-- Select Designated Bus Stop --</option>' +
        route.stops.map(s => `<option value="${s.id}">${s.stop_number || s.sequence_order}. ${s.stop_name} (${s.expected_time || ''})</option>`).join('');
    } else {
      stopSelect.innerHTML = '<option value="">-- Select Designated Bus Stop --</option>';
    }
  },

  handleSameAddressToggle(checkbox) {
    const perm = document.getElementById('new-stu-perm-address');
    const comm = document.getElementById('new-stu-comm-address');
    if (!perm || !comm) return;

    if (checkbox.checked) {
      comm.value = perm.value;
      comm.setAttribute('readonly', 'true');
      comm.style.background = '#f1f5f9';
    } else {
      comm.removeAttribute('readonly');
      comm.style.background = '#fff';
    }
  },

  handleTransportToggle(checkbox) {
    const fields = document.getElementById('transport-assignment-fields');
    if (fields) {
      fields.style.display = checkbox.checked ? 'block' : 'none';
    }
  },

  async loadStudents() {
    this.isLoading = true;
    const container = document.getElementById('students-data-container');
    if (container && this.studentsList.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 3rem; color: var(--text-muted);">
          <div class="spinner" style="margin: 0 auto 1rem; width: 36px; height: 36px; border-width: 3px;"></div>
          <p style="font-weight: 600;">Synchronizing authoritative student records with school database...</p>
        </div>
      `;
    }

    try {
      if (window.RexApi && typeof RexApi.getStudents === 'function') {
        const res = await RexApi.getStudents();
        if (res && res.success && Array.isArray(res.students)) {
          this.studentsList = res.students.map(s => this.mapApiStudent(s));
          // Keep ERPStorage synchronized for offline resilience
          if (window.ERPStorage && typeof ERPStorage.saveStudents === 'function') {
            ERPStorage.saveStudents(this.studentsList);
          }
        }
      }
    } catch (e) {
      console.warn("API student sync error, falling back to local storage:", e.message);
      if (window.ERPStorage) {
        this.studentsList = ERPStorage.getStudents();
      }
    } finally {
      this.isLoading = false;
      this.render();
    }
  },

  mapApiStudent(s) {
    const fullName = [s.first_name, s.middle_name, s.last_name].filter(Boolean).join(' ') || s.name || 'Student';
    const className = s.class_name || (s.grade ? `Grade ${s.grade}` : 'Class 10');
    const sectionName = s.section_name || s.section || 'A';
    const parentFullName = s.parent_name || s.father_name || s.mother_name || 'Rajesh Sharma';
    const mobile = s.parent_mobile || s.parent_phone || s.parentPhone || '9876543210';
    
    return {
      id: s.id,
      admissionNo: s.admission_no || s.admissionNo || `REX-${s.id}`,
      name: fullName,
      firstName: s.first_name || '',
      middleName: s.middle_name || '',
      lastName: s.last_name || '',
      rollNo: s.roll_no != null ? String(s.roll_no) : (s.rollNo || '1'),
      classId: s.class_id,
      sectionId: s.section_id,
      grade: className.replace(/Grade|Class/gi, '').trim(),
      className: className,
      section: sectionName,
      sectionName: sectionName,
      gender: s.gender || 'Male',
      dob: s.dob || '2010-05-14',
      bloodGroup: s.blood_group || s.bloodGroup || 'O+',
      aadhaarNo: s.aadhaar_no || '',
      house: s.house || '',
      motherTongue: s.mother_tongue || '',
      nationality: s.nationality || 'Indian',
      mark1: s.mark1 || '',
      mark2: s.mark2 || '',
      fatherName: s.father_name || '',
      motherName: s.mother_name || '',
      guardianName: s.guardian_name || '',
      guardianRelationship: s.guardian_relationship || '',
      parentName: parentFullName,
      parentPhone: mobile,
      parentMobile: mobile,
      alternateMobile: s.alternate_mobile || '',
      parentEmail: s.parent_email || s.parentEmail || '',
      fatherQualification: s.father_qualification || '',
      fatherOccupation: s.father_occupation || '',
      motherQualification: s.mother_qualification || '',
      motherOccupation: s.mother_occupation || '',
      annualIncome: s.annual_income || '',
      religion: s.religion || '',
      community: s.community || '',
      doorNo: s.door_no || '',
      street: s.street || '',
      villageTown: s.village_town || '',
      district: s.district || '',
      state: s.state || 'Tamil Nadu',
      pinCode: s.pin_code || '',
      permanentAddress: s.permanent_address || s.address || '',
      communicationAddress: s.communication_address || s.address || '',
      address: s.address || s.permanent_address || '',
      admissionDate: s.admission_date || s.admissionDate || '2024-06-01',
      classAdmitted: s.class_admitted || '',
      academicYearId: s.academic_year_id,
      previousSchool: s.previous_school || '',
      bankName: s.bank_name || '',
      accountHolderName: s.account_holder_name || '',
      accountNo: s.account_no || '',
      ifscCode: s.ifsc_code || '',
      branchName: s.branch_name || '',
      transportRequired: s.transport_required === 1 || s.transport_required === true,
      busId: s.bus_id,
      busNumber: s.bus_number || '',
      routeId: s.route_id,
      routeName: s.route_name || '',
      pickupStopId: s.pickup_stop_id,
      pickupStopName: s.pickup_stop_name || '',
      busRoute: s.bus_route || (s.bus_number ? `${s.bus_number} (${s.pickup_stop_name || 'En Route'})` : 'Self Transport'),
      status: s.status || 'Active',
      feeStatus: s.fee_status || s.feeStatus || 'Paid',
      feesTotal: s.fees_total || s.feesTotal || 54000,
      feesPaid: s.fees_paid || s.feesPaid || 54000,
      attendanceRate: s.attendance_rate != null ? s.attendance_rate : (s.attendanceRate != null ? s.attendanceRate : 96),
      emergencyContact: s.emergency_contact || mobile,
      medicalNotes: s.medical_notes || s.medicalNotes || 'None',
      avatarColor: s.avatar_color || '#1e3a8a'
    };
  },

  getFilteredStudents() {
    const searchVal = (document.getElementById('student-search-input')?.value || '').toLowerCase().trim();
    const gradeVal = document.getElementById('student-grade-filter')?.value || 'all';
    const feeVal = document.getElementById('student-fee-filter')?.value || 'all';

    return this.studentsList.filter(s => {
      const matchSearch = !searchVal ||
        s.name.toLowerCase().includes(searchVal) ||
        s.rollNo.toLowerCase().includes(searchVal) ||
        (s.admissionNo && s.admissionNo.toLowerCase().includes(searchVal)) ||
        (s.parentName && s.parentName.toLowerCase().includes(searchVal)) ||
        (s.parentPhone && s.parentPhone.includes(searchVal));

      const matchGrade = gradeVal === 'all' || s.grade === gradeVal || s.className === gradeVal;
      const matchFee = feeVal === 'all' || (s.feeStatus && s.feeStatus.toLowerCase() === feeVal.toLowerCase());

      return matchSearch && matchGrade && matchFee;
    });
  },

  render() {
    const students = this.getFilteredStudents();
    const container = document.getElementById('students-data-container');
    if (!container) return;

    const countLabel = document.getElementById('students-count-badge');
    if (countLabel) countLabel.textContent = `${students.length} Students`;

    if (students.length === 0 && !this.isLoading) {
      container.innerHTML = `
        <div style="text-align: center; padding: 4rem 1rem; color: var(--text-muted);">
          <svg style="width: 48px; height: 48px; stroke-width: 1.5; margin-bottom: 0.75rem;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          <h4 style="font-size: 1.1rem; color: var(--text-primary); font-weight: 700;">No students found</h4>
          <p style="font-size: 0.85rem;">Try adjusting your filters or search keywords, or click "+ Add Student" to register a new scholar.</p>
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
                <th>Admission No</th>
                <th>Student</th>
                <th>Roll No</th>
                <th>Class & Sec</th>
                <th>Parent Contact</th>
                <th>Transport</th>
                <th>Attendance</th>
                <th>Fee Status</th>
                <th style="text-align: right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${students.map(s => `
                <tr style="cursor: pointer;" onclick="StudentsModule.openStudentDrawer('${s.id}')">
                  <td>
                    <span class="badge badge-neutral" style="font-family: var(--font-mono); font-size: 0.76rem; font-weight: 700;">
                      ${s.admissionNo}
                    </span>
                  </td>
                  <td>
                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                      <div class="student-avatar" style="background: ${s.avatarColor || '#1e3a8a'}; width: 34px; height: 34px; border-radius: 50%; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.85rem;">
                        ${s.name.charAt(0)}
                      </div>
                      <div>
                        <div style="font-weight: 700; color: var(--text-primary);">${s.name}</div>
                        <div style="font-size: 0.75rem; color: var(--text-muted);">
                          Blood: ${s.bloodGroup} • ${s.gender}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td><span style="font-family: var(--font-mono); font-weight: 600;">${s.rollNo}</span></td>
                  <td>
                    <span class="badge badge-info" style="font-size: 0.78rem;">
                      ${s.className} - ${s.section}
                    </span>
                  </td>
                  <td>
                    <div style="font-size: 0.85rem; font-weight: 600; color: var(--text-primary);">${s.parentName}</div>
                    <div style="font-size: 0.75rem; color: var(--text-muted); font-family: var(--font-mono);">
                      📞 ${s.parentPhone}
                    </div>
                  </td>
                  <td>
                    ${s.transportRequired ? `
                      <span class="badge badge-present" style="font-size: 0.72rem;">
                        🚌 ${s.busNumber || 'Assigned'}
                      </span>
                    ` : `
                      <span class="badge badge-neutral" style="font-size: 0.72rem;">Self</span>
                    `}
                  </td>
                  <td>
                    <div style="display: flex; align-items: center; gap: 0.4rem;">
                      <div style="flex: 1; min-width: 45px; background: #e2e8f0; height: 6px; border-radius: 3px; overflow: hidden;">
                        <div style="width: ${s.attendanceRate}%; height: 100%; background: ${s.attendanceRate >= 90 ? 'var(--success)' : (s.attendanceRate >= 75 ? 'var(--warning)' : 'var(--danger)')};"></div>
                      </div>
                      <span style="font-size: 0.75rem; font-weight: 700; font-family: var(--font-mono);">${s.attendanceRate}%</span>
                    </div>
                  </td>
                  <td>
                    <span class="badge ${s.feeStatus.toLowerCase() === 'paid' ? 'badge-present' : (s.feeStatus.toLowerCase() === 'partial' ? 'badge-warning' : 'badge-absent')}">
                      ${s.feeStatus}
                    </span>
                  </td>
                  <td style="text-align: right;" onclick="event.stopPropagation();">
                    <div style="display: inline-flex; gap: 0.35rem;">
                      <button class="btn btn-sm btn-outline-primary" title="Edit Student Record" onclick="StudentsModule.openEnrollModal('${s.id}')">
                        ✏️ Edit
                      </button>
                      <button class="btn btn-sm btn-secondary" title="View Full Profile" onclick="StudentsModule.openStudentDrawer('${s.id}')">
                        👤 360°
                      </button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  renderGridView(container, students) {
    container.innerHTML = `
      <div class="students-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); gap: 1rem;">
        ${students.map(s => `
          <div class="card student-card" style="padding: 1.25rem; display: flex; flex-direction: column; cursor: pointer;" onclick="StudentsModule.openStudentDrawer('${s.id}')">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem;">
              <div style="display: flex; align-items: center; gap: 0.75rem;">
                <div class="student-avatar" style="background: ${s.avatarColor || '#1e3a8a'}; width: 44px; height: 44px; border-radius: 50%; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1.1rem;">
                  ${s.name.charAt(0)}
                </div>
                <div>
                  <h4 style="margin: 0; font-size: 1rem; font-weight: 700; color: var(--text-primary);">${s.name}</h4>
                  <div style="font-size: 0.75rem; color: var(--text-muted); font-family: var(--font-mono);">
                    ${s.admissionNo} • Roll: ${s.rollNo}
                  </div>
                </div>
              </div>
              <span class="badge ${s.feeStatus.toLowerCase() === 'paid' ? 'badge-present' : 'badge-warning'}">
                ${s.feeStatus}
              </span>
            </div>

            <div style="background: var(--bg-subtle); border-radius: 6px; padding: 0.75rem; font-size: 0.8rem; margin-bottom: 1rem;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 0.35rem;">
                <span style="color: var(--text-muted);">Class:</span>
                <span style="font-weight: 700; color: var(--text-primary);">${s.className} - ${s.section}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 0.35rem;">
                <span style="color: var(--text-muted);">Parent:</span>
                <span style="font-weight: 600; color: var(--text-primary);">${s.parentName}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 0.35rem;">
                <span style="color: var(--text-muted);">Phone:</span>
                <span style="font-family: var(--font-mono); font-weight: 600;">${s.parentPhone}</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: var(--text-muted);">Transport:</span>
                <span style="font-weight: 600; color: ${s.transportRequired ? '#16a34a' : 'inherit'};">
                  ${s.transportRequired ? '🚌 ' + (s.busNumber || 'Bus Transit') : 'Self Transport'}
                </span>
              </div>
            </div>

            <div style="display: flex; gap: 0.5rem; margin-top: auto;" onclick="event.stopPropagation();">
              <button class="btn btn-sm btn-outline-primary" style="flex: 1;" onclick="StudentsModule.openEnrollModal('${s.id}')">
                ✏️ Edit Record
              </button>
              <button class="btn btn-sm btn-secondary" onclick="StudentsModule.openStudentDrawer('${s.id}')">
                👤 Profile
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  },

  // --------------------------------------------------------------------------
  // REGISTRATION MODAL CONTROLS & TABS
  // --------------------------------------------------------------------------
  openEnrollModal(studentId = null) {
    const modal = document.getElementById('enroll-student-modal');
    if (!modal) return;

    this.resetEnrollForm();
    const errorBox = document.getElementById('enroll-form-error');
    if (errorBox) errorBox.style.display = 'none';

    const titleEl = document.getElementById('enroll-modal-title-text');
    const submitBtnText = document.getElementById('reg-submit-btn-text');

    if (studentId) {
      const s = this.studentsList.find(item => String(item.id) === String(studentId));
      if (s) {
        if (titleEl) titleEl.textContent = `Edit Student: ${s.name} (${s.admissionNo})`;
        if (submitBtnText) submitBtnText.textContent = 'Update Student Record';
        this.populateFormForEdit(s);
      }
    } else {
      if (titleEl) titleEl.textContent = 'Student Registration Form — EMIS Standard (2026-27)';
      if (submitBtnText) submitBtnText.textContent = 'Save & Complete Enrollment';
      
      // Auto-suggest next admission number and roll number
      const nextNum = 1000 + this.studentsList.length + 1;
      const admField = document.getElementById('new-stu-admission-no');
      if (admField && !admField.value) {
        admField.value = `REX-2026-${nextNum}`;
      }
      const admDateField = document.getElementById('new-stu-admission-date');
      if (admDateField && !admDateField.value) {
        admDateField.value = new Date().toISOString().split('T')[0];
      }
      const dobField = document.getElementById('new-stu-dob');
      if (dobField && !dobField.value) {
        dobField.value = '2012-05-15';
      }
    }

    this.switchRegTab('tab-basic');
    modal.classList.add('open');
  },

  closeEnrollModal() {
    const modal = document.getElementById('enroll-student-modal');
    if (modal) modal.classList.remove('open');
  },

  resetEnrollForm() {
    const form = document.getElementById('add-student-form');
    if (form) form.reset();
    document.getElementById('edit-student-id').value = '';
    const transportFields = document.getElementById('transport-assignment-fields');
    if (transportFields) transportFields.style.display = 'none';
  },

  populateFormForEdit(s) {
    document.getElementById('edit-student-id').value = s.id;
    document.getElementById('new-stu-firstname').value = s.firstName || s.name.split(' ')[0] || '';
    document.getElementById('new-stu-middlename').value = s.middleName || '';
    document.getElementById('new-stu-lastname').value = s.lastName || s.name.split(' ').slice(1).join(' ') || 'Student';
    document.getElementById('new-stu-roll').value = s.rollNo || '';
    
    if (s.classId) {
      document.getElementById('new-stu-class').value = s.classId;
      this.updateSectionDropdown(s.classId);
    }
    if (s.sectionId) {
      document.getElementById('new-stu-section').value = s.sectionId;
    }
    
    document.getElementById('new-stu-dob').value = s.dob || '';
    document.getElementById('new-stu-gender').value = s.gender || 'Male';
    document.getElementById('new-stu-blood').value = s.bloodGroup || 'O+';
    document.getElementById('new-stu-aadhaar').value = s.aadhaarNo || '';
    document.getElementById('new-stu-house').value = s.house || '';
    document.getElementById('new-stu-mothertongue').value = s.motherTongue || '';
    document.getElementById('new-stu-nationality').value = s.nationality || 'Indian';
    document.getElementById('new-stu-mark1').value = s.mark1 || '';
    document.getElementById('new-stu-mark2').value = s.mark2 || '';

    // Parent
    document.getElementById('new-stu-father').value = s.fatherName || s.parentName || '';
    document.getElementById('new-stu-mother').value = s.motherName || '';
    document.getElementById('new-stu-guardian').value = s.guardianName || '';
    document.getElementById('new-stu-guardian-rel').value = s.guardianRelationship || '';
    document.getElementById('new-stu-parent-mobile').value = s.parentMobile || s.parentPhone || '';
    document.getElementById('new-stu-alt-mobile').value = s.alternateMobile || '';
    document.getElementById('new-stu-parent-email').value = s.parentEmail || '';
    document.getElementById('new-stu-father-qual').value = s.fatherQualification || '';
    document.getElementById('new-stu-father-occ').value = s.fatherOccupation || '';
    document.getElementById('new-stu-mother-qual').value = s.motherQualification || '';
    document.getElementById('new-stu-mother-occ').value = s.motherOccupation || '';
    document.getElementById('new-stu-annual-income').value = s.annualIncome || '';

    // Social
    document.getElementById('new-stu-religion').value = s.religion || '';
    document.getElementById('new-stu-community').value = s.community || '';

    // Address
    document.getElementById('new-stu-door').value = s.doorNo || '';
    document.getElementById('new-stu-street').value = s.street || '';
    document.getElementById('new-stu-village').value = s.villageTown || '';
    document.getElementById('new-stu-district').value = s.district || '';
    document.getElementById('new-stu-state').value = s.state || 'Tamil Nadu';
    document.getElementById('new-stu-pincode').value = s.pinCode || '';
    document.getElementById('new-stu-perm-address').value = s.permanentAddress || s.address || '';
    document.getElementById('new-stu-comm-address').value = s.communicationAddress || s.address || '';

    // Admission
    document.getElementById('new-stu-admission-no').value = s.admissionNo || '';
    document.getElementById('new-stu-admission-date').value = s.admissionDate || '';
    document.getElementById('new-stu-class-admitted').value = s.classAdmitted || '';
    if (s.academicYearId) {
      document.getElementById('new-stu-academic-year').value = s.academicYearId;
    }
    document.getElementById('new-stu-status').value = s.status || 'Active';
    document.getElementById('new-stu-previous-school').value = s.previousSchool || '';
    document.getElementById('new-stu-medical').value = s.medicalNotes || '';

    // Bank
    document.getElementById('new-stu-bank-holder').value = s.accountHolderName || '';
    document.getElementById('new-stu-bank-name').value = s.bankName || '';
    document.getElementById('new-stu-bank-branch').value = s.branchName || '';
    document.getElementById('new-stu-bank-acc').value = s.accountNo || '';
    document.getElementById('new-stu-bank-ifsc').value = s.ifscCode || '';

    // Transport
    const transportReqCheckbox = document.getElementById('new-stu-transport-req');
    transportReqCheckbox.checked = !!s.transportRequired;
    this.handleTransportToggle(transportReqCheckbox);

    if (s.busId) {
      document.getElementById('new-stu-bus-id').value = s.busId;
      this.handleBusSelection(s.busId);
    }
    if (s.routeId) {
      document.getElementById('new-stu-route-id').value = s.routeId;
      this.handleRouteSelection(s.routeId);
    }
    if (s.pickupStopId) {
      setTimeout(() => {
        const stopEl = document.getElementById('new-stu-stop-id');
        if (stopEl) stopEl.value = s.pickupStopId;
      }, 50);
    }
  },

  switchRegTab(tabId) {
    const idx = this.tabsOrder.indexOf(tabId);
    if (idx === -1) return;
    this.currentTabIndex = idx;

    // Toggle tab buttons
    document.querySelectorAll('.reg-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
      if (btn.getAttribute('data-tab') === tabId) {
        btn.classList.add('btn-primary');
        btn.classList.remove('btn-secondary');
      } else {
        btn.classList.remove('btn-primary');
        btn.classList.add('btn-secondary');
      }
    });

    // Toggle tab panes
    document.querySelectorAll('.reg-tab-pane').forEach(pane => {
      pane.style.display = (pane.id === tabId) ? 'block' : 'none';
    });

    // Update footer buttons
    const prevBtn = document.getElementById('reg-prev-btn');
    const nextBtn = document.getElementById('reg-next-btn');
    const submitBtn = document.getElementById('reg-submit-btn');

    if (prevBtn) prevBtn.style.display = idx > 0 ? 'inline-block' : 'none';
    if (nextBtn) nextBtn.style.display = idx < this.tabsOrder.length - 1 ? 'inline-block' : 'none';
    if (submitBtn) submitBtn.style.display = idx === this.tabsOrder.length - 1 ? 'inline-block' : 'none';
  },

  prevRegTab() {
    if (this.currentTabIndex > 0) {
      this.switchRegTab(this.tabsOrder[this.currentTabIndex - 1]);
    }
  },

  nextRegTab() {
    // Validate current tab before moving forward
    const currentTabId = this.tabsOrder[this.currentTabIndex];
    if (currentTabId === 'tab-basic') {
      const fName = document.getElementById('new-stu-firstname')?.value.trim();
      const lName = document.getElementById('new-stu-lastname')?.value.trim();
      const roll = document.getElementById('new-stu-roll')?.value.trim();
      const cls = document.getElementById('new-stu-class')?.value;
      const sec = document.getElementById('new-stu-section')?.value;
      const dob = document.getElementById('new-stu-dob')?.value;

      if (!fName || !lName || !roll || !cls || !sec || !dob) {
        this.showEnrollError("Please fill all mandatory fields marked with * in Step 1 (First Name, Last Name, Roll No, Class, Section, DOB).");
        return;
      }
    } else if (currentTabId === 'tab-parent') {
      const mobile = document.getElementById('new-stu-parent-mobile')?.value.replace(/\D/g, '');
      if (!mobile || mobile.length !== 10) {
        this.showEnrollError("Please provide a valid 10-digit Parent Mobile Number in Step 2.");
        return;
      }
    } else if (currentTabId === 'tab-address') {
      const perm = document.getElementById('new-stu-perm-address')?.value.trim();
      const comm = document.getElementById('new-stu-comm-address')?.value.trim();
      if (!perm || !comm) {
        this.showEnrollError("Please provide both Permanent and Communication Addresses in Step 4.");
        return;
      }
    } else if (currentTabId === 'tab-admission') {
      const adm = document.getElementById('new-stu-admission-no')?.value.trim();
      const admDate = document.getElementById('new-stu-admission-date')?.value;
      if (!adm || !admDate) {
        this.showEnrollError("Please specify Admission Number and Admission Date in Step 5.");
        return;
      }
    }

    this.clearEnrollError();
    if (this.currentTabIndex < this.tabsOrder.length - 1) {
      this.switchRegTab(this.tabsOrder[this.currentTabIndex + 1]);
    }
  },

  showEnrollError(msg) {
    const errorBox = document.getElementById('enroll-form-error');
    if (errorBox) {
      errorBox.textContent = `⚠ ${msg}`;
      errorBox.style.display = 'block';
      errorBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
      alert(msg);
    }
  },

  clearEnrollError() {
    const errorBox = document.getElementById('enroll-form-error');
    if (errorBox) errorBox.style.display = 'none';
  },

  async handleSubmitStudentForm() {
    this.clearEnrollError();

    // 1. Gather all form inputs
    const editId = document.getElementById('edit-student-id')?.value;
    const isEdit = !!editId;

    const firstName = document.getElementById('new-stu-firstname')?.value.trim();
    const middleName = document.getElementById('new-stu-middlename')?.value.trim();
    const lastName = document.getElementById('new-stu-lastname')?.value.trim();
    const rollNo = document.getElementById('new-stu-roll')?.value.trim();
    const classId = document.getElementById('new-stu-class')?.value;
    const sectionId = document.getElementById('new-stu-section')?.value;
    const dob = document.getElementById('new-stu-dob')?.value;
    const gender = document.getElementById('new-stu-gender')?.value;
    const bloodGroup = document.getElementById('new-stu-blood')?.value;
    const aadhaarNo = document.getElementById('new-stu-aadhaar')?.value.trim();
    const house = document.getElementById('new-stu-house')?.value;
    const motherTongue = document.getElementById('new-stu-mothertongue')?.value.trim();
    const nationality = document.getElementById('new-stu-nationality')?.value.trim() || 'Indian';
    const mark1 = document.getElementById('new-stu-mark1')?.value.trim();
    const mark2 = document.getElementById('new-stu-mark2')?.value.trim();

    const fatherName = document.getElementById('new-stu-father')?.value.trim();
    const motherName = document.getElementById('new-stu-mother')?.value.trim();
    const guardianName = document.getElementById('new-stu-guardian')?.value.trim();
    const guardianRelationship = document.getElementById('new-stu-guardian-rel')?.value.trim();
    const parentMobile = document.getElementById('new-stu-parent-mobile')?.value.replace(/\D/g, '');
    const alternateMobile = document.getElementById('new-stu-alt-mobile')?.value.trim();
    const parentEmail = document.getElementById('new-stu-parent-email')?.value.trim();
    const fatherQualification = document.getElementById('new-stu-father-qual')?.value.trim();
    const fatherOccupation = document.getElementById('new-stu-father-occ')?.value.trim();
    const motherQualification = document.getElementById('new-stu-mother-qual')?.value.trim();
    const motherOccupation = document.getElementById('new-stu-mother-occ')?.value.trim();
    const annualIncome = document.getElementById('new-stu-annual-income')?.value;

    const religion = document.getElementById('new-stu-religion')?.value.trim();
    const community = document.getElementById('new-stu-community')?.value.trim();

    const doorNo = document.getElementById('new-stu-door')?.value.trim();
    const street = document.getElementById('new-stu-street')?.value.trim();
    const villageTown = document.getElementById('new-stu-village')?.value.trim();
    const district = document.getElementById('new-stu-district')?.value.trim();
    const state = document.getElementById('new-stu-state')?.value.trim();
    const pinCode = document.getElementById('new-stu-pincode')?.value.trim();
    const permanentAddress = document.getElementById('new-stu-perm-address')?.value.trim();
    const communicationAddress = document.getElementById('new-stu-comm-address')?.value.trim();

    const admissionNo = document.getElementById('new-stu-admission-no')?.value.trim();
    const admissionDate = document.getElementById('new-stu-admission-date')?.value;
    const classAdmitted = document.getElementById('new-stu-class-admitted')?.value;
    const academicYearId = document.getElementById('new-stu-academic-year')?.value;
    const status = document.getElementById('new-stu-status')?.value || 'Active';
    const previousSchool = document.getElementById('new-stu-previous-school')?.value.trim();
    const medicalNotes = document.getElementById('new-stu-medical')?.value.trim();

    const accountHolderName = document.getElementById('new-stu-bank-holder')?.value.trim();
    const bankName = document.getElementById('new-stu-bank-name')?.value.trim();
    const branchName = document.getElementById('new-stu-bank-branch')?.value.trim();
    const accountNo = document.getElementById('new-stu-bank-acc')?.value.trim();
    const ifscCode = document.getElementById('new-stu-bank-ifsc')?.value.trim();

    const transportRequired = document.getElementById('new-stu-transport-req')?.checked;
    const busId = transportRequired ? document.getElementById('new-stu-bus-id')?.value : null;
    const routeId = transportRequired ? document.getElementById('new-stu-route-id')?.value : null;
    const pickupStopId = transportRequired ? document.getElementById('new-stu-stop-id')?.value : null;

    // 2. Validate essential mandatory requirements
    if (!firstName || !lastName) {
      this.switchRegTab('tab-basic');
      this.showEnrollError("First Name and Last Name are required.");
      return;
    }
    if (!rollNo) {
      this.switchRegTab('tab-basic');
      this.showEnrollError("Roll Number is required.");
      return;
    }
    if (!classId || !sectionId) {
      this.switchRegTab('tab-basic');
      this.showEnrollError("Please select both Class and Section.");
      return;
    }
    if (!parentMobile || parentMobile.length !== 10) {
      this.switchRegTab('tab-parent');
      this.showEnrollError("Please provide a valid 10-digit Parent Mobile Number.");
      return;
    }
    if (!permanentAddress) {
      this.switchRegTab('tab-address');
      this.showEnrollError("Permanent Address is required.");
      return;
    }
    if (!admissionNo) {
      this.switchRegTab('tab-admission');
      this.showEnrollError("Admission Number is required.");
      return;
    }

    if (transportRequired && !busId) {
      this.switchRegTab('tab-transport');
      this.showEnrollError("Please select an Assigned Bus since transport is required.");
      return;
    }

    // 3. Prevent duplicate submissions with loading state
    const submitBtn = document.getElementById('reg-submit-btn');
    const submitText = document.getElementById('reg-submit-btn-text');
    const origText = submitText ? submitText.textContent : 'Save';
    if (submitBtn) {
      submitBtn.disabled = true;
      if (submitText) submitText.textContent = isEdit ? 'Updating Student...' : 'Saving Enrollment...';
    }

    const payload = {
      admissionNo,
      rollNo,
      firstName,
      middleName,
      lastName,
      dob,
      gender,
      bloodGroup,
      aadhaarNo,
      motherTongue,
      nationality,
      house,
      identificationMarks: [mark1, mark2].filter(Boolean).join('; '),
      mark1,
      mark2,
      fatherName,
      motherName,
      guardianName,
      guardianRelationship,
      parentMobile,
      alternateMobile,
      parentEmail,
      fatherQualification,
      motherQualification,
      fatherOccupation,
      motherOccupation,
      annualIncome,
      religion,
      community,
      doorNo,
      street,
      villageTown,
      district,
      state,
      pinCode,
      permanentAddress,
      communicationAddress: communicationAddress || permanentAddress,
      address: permanentAddress,
      classId: parseInt(classId, 10),
      sectionId: parseInt(sectionId, 10),
      academicYearId: academicYearId ? parseInt(academicYearId, 10) : 1,
      admissionDate,
      classAdmitted: classAdmitted || undefined,
      previousSchool,
      status,
      bankName,
      accountHolderName,
      accountNo,
      ifscCode,
      branchName,
      transportRequired: !!transportRequired,
      busId: busId ? parseInt(busId, 10) : null,
      routeId: routeId ? parseInt(routeId, 10) : null,
      pickupStopId: pickupStopId ? parseInt(pickupStopId, 10) : null,
      emergencyContact: alternateMobile || parentMobile,
      medicalNotes
    };

    try {
      let result;
      if (isEdit) {
        result = await RexApi.updateStudent(editId, payload);
      } else {
        result = await RexApi.createStudent(payload);
      }

      if (result && result.success) {
        const studentFullName = `${firstName} ${lastName}`;
        App.showToast(result.message || `Student ${studentFullName} saved successfully!`, 'success');
        this.closeEnrollModal();
        await this.loadStudents();

        if (window.DashboardModule && typeof DashboardModule.render === 'function') {
          DashboardModule.render();
        }
      } else {
        throw new Error(result?.error || 'Registration failed.');
      }
    } catch (err) {
      console.error("Student form submission error:", err);
      this.showEnrollError(err.message || 'Failed to save student record. Please verify fields and try again.');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        if (submitText) submitText.textContent = origText;
      }
    }
  },

  // --------------------------------------------------------------------------
  // STUDENT 360° DRAWER
  // --------------------------------------------------------------------------
  async openStudentDrawer(studentId) {
    let s = this.studentsList.find(item => String(item.id) === String(studentId));
    if (!s) return;

    this.selectedStudentId = studentId;
    const drawerOverlay = document.getElementById('student-drawer-overlay');
    const drawerContent = document.getElementById('student-drawer-content');
    if (!drawerOverlay || !drawerContent) return;

    // Fetch detailed info if available
    try {
      if (window.RexApi && typeof RexApi.getStudentById === 'function') {
        const full = await RexApi.getStudentById(studentId);
        if (full && full.success && full.student) {
          s = this.mapApiStudent(full.student);
        }
      }
    } catch (e) {}

    drawerContent.innerHTML = `
      <div class="drawer-header" style="background: linear-gradient(135deg, #1e3a8a, #0284c7); color: #fff; padding: 1rem 1.25rem;">
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <h3 style="font-size: 1.15rem; font-weight: 800; color: #fff; margin: 0;">Student 360° Profile</h3>
          <span class="badge badge-neutral" style="font-family: var(--font-mono); font-weight: 700;">${s.admissionNo}</span>
        </div>
        <button class="modal-close-btn" style="color: #fff;" onclick="StudentsModule.closeStudentDrawer()">&times;</button>
      </div>

      <div class="drawer-body" style="padding: 1.25rem; overflow-y: auto;">
        <!-- Hero Card -->
        <div class="profile-hero" style="display: flex; align-items: center; gap: 1rem; background: var(--bg-surface); padding: 1rem; border-radius: 8px; border: 1px solid var(--border-medium); margin-bottom: 1.25rem;">
          <div class="profile-hero-avatar" style="background: ${s.avatarColor || '#1e3a8a'}; width: 56px; height: 56px; border-radius: 50%; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 1.4rem; font-weight: 800;">
            ${s.name.charAt(0)}
          </div>
          <div class="profile-hero-info">
            <h3 style="margin: 0; font-size: 1.15rem; font-weight: 800; color: var(--text-primary);">${s.name}</h3>
            <div style="color: var(--text-secondary); font-size: 0.85rem; font-weight: 600; margin-top: 0.2rem;">
              Class: ${s.className} - ${s.section} • Roll No: <span style="font-family: var(--font-mono);">${s.rollNo}</span>
            </div>
            <div style="margin-top: 0.4rem; display: flex; gap: 0.5rem; flex-wrap: wrap;">
              <span class="badge badge-present"><span class="badge-dot"></span> ${s.status} Scholar</span>
              <span class="badge badge-info">Blood: ${s.bloodGroup}</span>
              ${s.house ? `<span class="badge badge-neutral">House: ${s.house}</span>` : ''}
            </div>
          </div>
        </div>

        <!-- Quick Action Buttons -->
        <div style="display: flex; gap: 0.5rem; margin-bottom: 1.25rem; flex-wrap: wrap;">
          <button class="btn btn-sm btn-outline-primary" onclick="StudentsModule.openEnrollModal('${s.id}')">
            ✏️ Edit Full Record
          </button>
          <button class="btn btn-sm btn-secondary" onclick="FeesModule.openStudentLedgerModal('${s.id}')">
            📋 Fee Details
          </button>
          <button class="btn btn-sm btn-secondary" onclick="ExamsModule.openReportCardModal('${s.id}')">
            📄 Academic Report
          </button>
        </div>

        <!-- Section 1: Basic & Identity -->
        <div style="margin-bottom: 1.25rem;">
          <h4 style="font-size: 0.85rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-muted); margin-bottom: 0.5rem;">
            Personal & Identification
          </h4>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; background: var(--bg-subtle); padding: 0.85rem; border-radius: 6px; font-size: 0.82rem;">
            <div><span style="color: var(--text-muted);">Date of Birth:</span> <strong style="color: var(--text-primary);">${s.dob}</strong></div>
            <div><span style="color: var(--text-muted);">Gender:</span> <strong style="color: var(--text-primary);">${s.gender}</strong></div>
            <div><span style="color: var(--text-muted);">Aadhaar No:</span> <strong style="color: var(--text-primary); font-family: var(--font-mono);">${s.aadhaarNo || 'Not Provided'}</strong></div>
            <div><span style="color: var(--text-muted);">Mother Tongue:</span> <strong style="color: var(--text-primary);">${s.motherTongue || 'Tamil'}</strong></div>
            <div><span style="color: var(--text-muted);">Nationality:</span> <strong style="color: var(--text-primary);">${s.nationality}</strong></div>
            <div><span style="color: var(--text-muted);">Admission Date:</span> <strong style="color: var(--text-primary);">${s.admissionDate}</strong></div>
          </div>
        </div>

        <!-- Section 2: Parent / Guardian -->
        <div style="margin-bottom: 1.25rem;">
          <h4 style="font-size: 0.85rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-muted); margin-bottom: 0.5rem;">
            Parent & Guardian Contacts
          </h4>
          <div style="background: var(--bg-subtle); padding: 0.85rem; border-radius: 6px; font-size: 0.82rem; display: flex; flex-direction: column; gap: 0.4rem;">
            <div><span style="color: var(--text-muted);">Father:</span> <strong style="color: var(--text-primary);">${s.fatherName || s.parentName}</strong> ${s.fatherOccupation ? `(${s.fatherOccupation})` : ''}</div>
            <div><span style="color: var(--text-muted);">Mother:</span> <strong style="color: var(--text-primary);">${s.motherName || 'N/A'}</strong> ${s.motherOccupation ? `(${s.motherOccupation})` : ''}</div>
            <div><span style="color: var(--text-muted);">Primary Mobile:</span> <strong style="color: #1e3a8a; font-family: var(--font-mono);">📞 +91 ${s.parentMobile}</strong></div>
            ${s.alternateMobile ? `<div><span style="color: var(--text-muted);">Alt Mobile:</span> <strong style="font-family: var(--font-mono);">${s.alternateMobile}</strong></div>` : ''}
            ${s.parentEmail ? `<div><span style="color: var(--text-muted);">Email:</span> <strong>${s.parentEmail}</strong></div>` : ''}
            <div><span style="color: var(--text-muted);">Permanent Address:</span> <div>${s.permanentAddress}</div></div>
          </div>
        </div>

        <!-- Section 3: Transport & GPS -->
        <div style="margin-bottom: 1.25rem;">
          <h4 style="font-size: 0.85rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-muted); margin-bottom: 0.5rem;">
            Transport & Fleet Telematics
          </h4>
          <div style="background: ${s.transportRequired ? '#f0fdf4' : 'var(--bg-subtle)'}; border: 1px solid ${s.transportRequired ? '#bbf7d0' : 'var(--border-medium)'}; padding: 0.85rem; border-radius: 6px; font-size: 0.82rem;">
            ${s.transportRequired ? `
              <div style="font-weight: 700; color: #166534; margin-bottom: 0.35rem;">🚌 Active School Bus Transit</div>
              <div style="margin-bottom: 0.25rem;"><span style="color: var(--text-muted);">Assigned Bus:</span> <strong>${s.busNumber || 'Bus #02'}</strong></div>
              <div style="margin-bottom: 0.25rem;"><span style="color: var(--text-muted);">Designated Stop:</span> <strong>${s.pickupStopName || 'Charring Cross Junction'}</strong></div>
              <div><span style="color: var(--text-muted);">Live Tracking:</span> <span class="badge badge-present" style="font-size: 0.72rem;">Enabled for Parent App</span></div>
            ` : `
              <div style="color: var(--text-muted); font-weight: 600;">🚶 Student does not use school bus transport (Self / Parent Transit).</div>
            `}
          </div>
        </div>

        <!-- Section 4: Bank Details -->
        ${s.bankName || s.accountNo ? `
          <div style="margin-bottom: 1.25rem;">
            <h4 style="font-size: 0.85rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-muted); margin-bottom: 0.5rem;">
              Bank Account (EMIS Record)
            </h4>
            <div style="background: var(--bg-subtle); padding: 0.85rem; border-radius: 6px; font-size: 0.82rem; display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
              <div><span style="color: var(--text-muted);">Bank:</span> <strong>${s.bankName}</strong></div>
              <div><span style="color: var(--text-muted);">Branch:</span> <strong>${s.branchName}</strong></div>
              <div><span style="color: var(--text-muted);">Account No:</span> <strong style="font-family: var(--font-mono);">${s.accountNo}</strong></div>
              <div><span style="color: var(--text-muted);">IFSC:</span> <strong style="font-family: var(--font-mono);">${s.ifscCode}</strong></div>
            </div>
          </div>
        ` : ''}

        <!-- Section 5: Monthly Attendance Heatmap -->
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
            <h4 style="font-size: 0.85rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-muted); margin: 0;">
              Attendance Overview (${s.attendanceRate}%)
            </h4>
            <span style="font-size: 0.75rem; color: var(--text-muted);">Current Academic Term</span>
          </div>
          <div style="background: var(--bg-subtle); padding: 0.85rem; border-radius: 6px;">
            <div style="display: flex; justify-content: space-between; font-size: 0.8rem; margin-bottom: 0.35rem;">
              <span>Term Attendance Rate:</span>
              <strong style="color: ${s.attendanceRate >= 85 ? 'var(--success)' : 'var(--danger)'};">${s.attendanceRate}%</strong>
            </div>
            <div style="width: 100%; background: #e2e8f0; height: 8px; border-radius: 4px; overflow: hidden;">
              <div style="width: ${s.attendanceRate}%; height: 100%; background: var(--success);"></div>
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
  }
};
