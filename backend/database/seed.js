const bcrypt = require('bcryptjs');
const db = require('./db');

function seedDatabase() {
  console.log('🌱 Starting Database Seeding...');

  // 1. Roles
  const roles = [
    { name: 'SUPER_ADMIN', description: 'Full administrative access across all school operations' },
    { name: 'TEACHER', description: 'Access to assigned classes, student attendance, exams, and diary' },
    { name: 'PARENT', description: 'Access strictly isolated to linked children profiles and updates' }
  ];

  for (const r of roles) {
    db.run(
      `INSERT OR IGNORE INTO roles (name, description) VALUES (?, ?)`,
      [r.name, r.description]
    );
  }

  // 2. School Settings
  const existingSettings = db.get(`SELECT id FROM school_settings LIMIT 1`);
  if (!existingSettings) {
    db.run(
      `INSERT INTO school_settings (
        school_name, affiliation_no, school_code, address, phone, email, website, logo_url, academic_year, timings, config_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'Rex Senior Secondary School',
        'CBSE #1930000',
        '55120',
        'Christus Rex, Catholic Diocese of Ootacamund, Nilgiris - 643001, Tamil Nadu',
        '+91 423 244 1234',
        'office@rex.edu',
        'https://rex.edu',
        'assets/rex_emblem.png',
        '2026-2027',
        '08:30 AM - 03:45 PM',
        JSON.stringify({
          attendanceCutoff: '09:30 AM',
          enableSmsAlerts: true,
          proximityRadiusMeters: 500
        })
      ]
    );
  }

  // 3. Academic Year
  let acadYear = db.get(`SELECT id FROM academic_years WHERE name = ?`, ['2026-2027']);
  if (!acadYear) {
    const res = db.run(
      `INSERT INTO academic_years (name, start_date, end_date, is_current) VALUES (?, ?, ?, ?)`,
      ['2026-2027', '2026-06-01', '2027-04-30', 1]
    );
    acadYear = { id: res.lastInsertRowid };
  }

  // 4. Classes & Sections
  const classList = [
    { name: 'Grade 8', grade_level: 8, sections: ['A', 'B'] },
    { name: 'Grade 9', grade_level: 9, sections: ['A', 'B'] },
    { name: 'Grade 10', grade_level: 10, sections: ['A', 'B'] },
    { name: 'Grade 11', grade_level: 11, sections: ['Science-A', 'Commerce-B'] },
    { name: 'Grade 12', grade_level: 12, sections: ['Science-A', 'Commerce-B'] },
  ];

  const sectionMap = {}; // '10-A' -> section_id

  for (const c of classList) {
    let cls = db.get(`SELECT id FROM classes WHERE name = ?`, [c.name]);
    if (!cls) {
      const res = db.run(
        `INSERT INTO classes (name, grade_level) VALUES (?, ?)`,
        [c.name, c.grade_level]
      );
      cls = { id: res.lastInsertRowid };
    }

    for (const secName of c.sections) {
      let sec = db.get(
        `SELECT id FROM sections WHERE class_id = ? AND name = ?`,
        [cls.id, secName]
      );
      if (!sec) {
        const secRes = db.run(
          `INSERT INTO sections (class_id, name, room_number, max_capacity) VALUES (?, ?, ?, ?)`,
          [cls.id, secName, `Room-${c.grade_level}${secName[0]}`, 40]
        );
        sec = { id: secRes.lastInsertRowid };
      }
      sectionMap[`${c.grade_level}-${secName}`] = { classId: cls.id, sectionId: sec.id };
    }
  }

  // 5. Subjects
  const subjects = [
    { name: 'Mathematics', code: 'MATH10', department: 'Mathematics' },
    { name: 'Physics', code: 'PHY10', department: 'Science' },
    { name: 'Chemistry', code: 'CHEM10', department: 'Science' },
    { name: 'English Core', code: 'ENG10', department: 'Languages' },
    { name: 'Social Science', code: 'SOC10', department: 'Social Studies' },
    { name: 'Computer Science', code: 'CS10', department: 'Computer Science' }
  ];

  const subjectMap = {};
  for (const sub of subjects) {
    let existing = db.get(`SELECT id FROM subjects WHERE code = ?`, [sub.code]);
    if (!existing) {
      const sRes = db.run(
        `INSERT INTO subjects (name, code, department) VALUES (?, ?, ?)`,
        [sub.name, sub.code, sub.department]
      );
      existing = { id: sRes.lastInsertRowid };
    }
    subjectMap[sub.code] = existing.id;
  }

  // 6. Users: Super Admin
  const adminPasswordHash = bcrypt.hashSync('AdminPassword123!', 10);
  let adminUser = db.get(`SELECT id FROM users WHERE username = ?`, ['admin']);
  if (!adminUser) {
    const res = db.run(
      `INSERT INTO users (username, email, mobile, password_hash, role, status) VALUES (?, ?, ?, ?, ?, ?)`,
      ['admin', 'admin@rex.edu', '9876500001', adminPasswordHash, 'SUPER_ADMIN', 'active']
    );
    adminUser = { id: res.lastInsertRowid };
    console.log('✅ Super Admin created (User: admin, Pass: AdminPassword123!)');
  }

  // 7. Teachers
  const teacherData = [
    {
      name: 'Mrs. Anitha Kumar',
      empId: 'TCH-1004',
      mobile: '9876500004',
      email: 'maths@rex.edu',
      gender: 'female',
      qualification: 'M.Sc., B.Ed.',
      experience: '12 Years',
      department: 'Mathematics',
      subjectCode: 'MATH10',
      assigned: ['10-A', '10-B']
    },
    {
      name: 'Mr. David Raj',
      empId: 'TCH-1005',
      mobile: '9876500005',
      email: 'commerce@rex.edu',
      gender: 'male',
      qualification: 'M.A., M.Ed.',
      experience: '9 Years',
      department: 'Languages',
      subjectCode: 'ENG10',
      assigned: ['9-A', '10-A']
    },
    {
      name: 'Mr. Rajan Pillai',
      empId: 'TCH-1003',
      mobile: '9876500003',
      email: 'science@rex.edu',
      gender: 'male',
      qualification: 'M.Sc. Physics, B.Ed.',
      experience: '14 Years',
      department: 'Science',
      subjectCode: 'PHY10',
      assigned: ['10-A', '11-Science-A']
    }
  ];

  const teacherMap = {};
  for (const t of teacherData) {
    let tUser = db.get(`SELECT id FROM users WHERE mobile = ?`, [t.mobile]);
    if (!tUser) {
      const uRes = db.run(
        `INSERT INTO users (username, email, mobile, password_hash, role, status) VALUES (?, ?, ?, ?, ?, ?)`,
        [t.email, t.email, t.mobile, adminPasswordHash, 'TEACHER', 'active']
      );
      tUser = { id: uRes.lastInsertRowid };
    }

    let teacher = db.get(`SELECT id FROM teachers WHERE employee_id = ?`, [t.empId]);
    if (!teacher) {
      const tRes = db.run(
        `INSERT INTO teachers (
          user_id, employee_id, name, mobile, email, gender, qualification, experience, department, status, joining_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          tUser.id, t.empId, t.name, t.mobile, t.email, t.gender,
          t.qualification, t.experience, t.department, 'active', '2018-06-01'
        ]
      );
      teacher = { id: tRes.lastInsertRowid };
    }
    teacherMap[t.empId] = teacher.id;

    // Assign classes
    for (const key of t.assigned) {
      const mapping = sectionMap[key];
      if (mapping) {
        db.run(
          `INSERT OR IGNORE INTO teacher_assignments (
            teacher_id, subject_id, class_id, section_id, academic_year_id
          ) VALUES (?, ?, ?, ?, ?)`,
          [teacher.id, subjectMap[t.subjectCode], mapping.classId, mapping.sectionId, acadYear.id]
        );
      }
    }
  }
  console.log('✅ Teachers seeded with assigned classes and subjects.');

  // 8. Parents & Students (Supporting Multi-Child parent account)
  const parentPasswordHash = bcrypt.hashSync('ParentPassword123!', 10);

  // Parent 1: Rajesh Sharma (2 Children: Aarav Sharma in 10-A, Ananya Sharma in 8-B)
  let p1User = db.get(`SELECT id FROM users WHERE mobile = ?`, ['9876543210']);
  if (!p1User) {
    const res = db.run(
      `INSERT INTO users (username, email, mobile, password_hash, role, status) VALUES (?, ?, ?, ?, ?, ?)`,
      ['rajesh.sharma', 'parent.sharma@rex.edu', '9876543210', parentPasswordHash, 'PARENT', 'active']
    );
    p1User = { id: res.lastInsertRowid };
  }

  let p1 = db.get(`SELECT id FROM parents WHERE mobile = ?`, ['9876543210']);
  if (!p1) {
    const res = db.run(
      `INSERT INTO parents (user_id, name, mobile, email, address, occupation, alternate_phone) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [p1User.id, 'Mr. Rajesh Sharma & Mrs. Priya Sharma', '9876543210', 'parent.sharma@rex.edu', '14 Charing Cross Road, Ooty', 'Software Architect', '+91 94432 11223']
    );
    p1 = { id: res.lastInsertRowid };
  }

  // Parent 2: Sunita Menon
  let p2User = db.get(`SELECT id FROM users WHERE mobile = ?`, ['9876543211']);
  if (!p2User) {
    const res = db.run(
      `INSERT INTO users (username, email, mobile, password_hash, role, status) VALUES (?, ?, ?, ?, ?, ?)`,
      ['sunita.menon', 'sunita.menon@rex.edu', '9876543211', parentPasswordHash, 'PARENT', 'active']
    );
    p2User = { id: res.lastInsertRowid };
  }

  let p2 = db.get(`SELECT id FROM parents WHERE mobile = ?`, ['9876543211']);
  if (!p2) {
    const res = db.run(
      `INSERT INTO parents (user_id, name, mobile, email, address, occupation, alternate_phone) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [p2User.id, 'Dr. Sunita Menon', '9876543211', 'sunita.menon@rex.edu', '28 Commercial Road, Coonoor', 'Cardiologist', '+91 94432 55667']
    );
    p2 = { id: res.lastInsertRowid };
  }

  // 9. Students Roster for Class 10-A
  const sec10A = sectionMap['10-A'];
  const sec8B = sectionMap['8-B'];

  const studentList = [
    {
      adm: 'REX-2024-001',
      first: 'Aarav',
      last: 'Sharma',
      dob: '2010-04-12',
      gender: 'male',
      roll: 1,
      classId: sec10A.classId,
      secId: sec10A.sectionId,
      parentId: p1.id,
      parentMobile: '9876543210',
      parentEmail: 'parent.sharma@rex.edu',
      emergency: '+91 98765 43210',
      medical: 'No known allergies',
      blood: 'O+'
    },
    {
      adm: 'REX-2025-042',
      first: 'Ananya',
      last: 'Sharma',
      dob: '2012-08-21',
      gender: 'female',
      roll: 7,
      classId: sec8B.classId,
      secId: sec8B.sectionId,
      parentId: p1.id,
      parentMobile: '9876543210',
      parentEmail: 'parent.sharma@rex.edu',
      emergency: '+91 98765 43210',
      medical: 'Asthma inhaler in school bag',
      blood: 'O+'
    },
    {
      adm: 'REX-2024-002',
      first: 'Rohan',
      last: 'Menon',
      dob: '2010-02-18',
      gender: 'male',
      roll: 2,
      classId: sec10A.classId,
      secId: sec10A.sectionId,
      parentId: p2.id,
      parentMobile: '9876543211',
      parentEmail: 'sunita.menon@rex.edu',
      emergency: '+91 98765 43211',
      medical: 'Penicillin allergy',
      blood: 'B+'
    },
    { adm: 'REX-2024-003', first: 'Priya', last: 'Patel', dob: '2010-06-15', gender: 'female', roll: 3, classId: sec10A.classId, secId: sec10A.sectionId, parentMobile: '9876543212', blood: 'A+' },
    { adm: 'REX-2024-004', first: 'David', last: 'Paul', dob: '2010-09-03', gender: 'male', roll: 4, classId: sec10A.classId, secId: sec10A.sectionId, parentMobile: '9876543213', blood: 'AB+' },
    { adm: 'REX-2024-005', first: 'Fatima', last: 'Sheikh', dob: '2010-01-25', gender: 'female', roll: 5, classId: sec10A.classId, secId: sec10A.sectionId, parentMobile: '9876543214', blood: 'O+' },
    { adm: 'REX-2024-006', first: 'Karthik', last: 'Raja', dob: '2010-11-12', gender: 'male', roll: 6, classId: sec10A.classId, secId: sec10A.sectionId, parentMobile: '9876543215', blood: 'B-' },
    { adm: 'REX-2024-007', first: 'Sneha', last: 'Reddy', dob: '2010-07-30', gender: 'female', roll: 7, classId: sec10A.classId, secId: sec10A.sectionId, parentMobile: '9876543216', blood: 'A-' },
    { adm: 'REX-2024-008', first: 'Vikram', last: 'Singh', dob: '2010-05-19', gender: 'male', roll: 8, classId: sec10A.classId, secId: sec10A.sectionId, parentMobile: '9876543217', blood: 'O+' },
    { adm: 'REX-2024-009', first: 'Divya', last: 'Nair', dob: '2010-12-08', gender: 'female', roll: 9, classId: sec10A.classId, secId: sec10A.sectionId, parentMobile: '9876543218', blood: 'B+' },
    { adm: 'REX-2024-010', first: 'Rahul', last: 'Verma', dob: '2010-03-22', gender: 'male', roll: 10, classId: sec10A.classId, secId: sec10A.sectionId, parentMobile: '9876543219', blood: 'AB-' }
  ];

  const studentIds = [];
  for (const s of studentList) {
    let student = db.get(`SELECT id FROM students WHERE admission_no = ?`, [s.adm]);
    if (!student) {
      const res = db.run(
        `INSERT INTO students (
          admission_no, first_name, last_name, dob, gender, class_id, section_id,
          roll_no, academic_year_id, parent_id, parent_mobile, parent_email, address,
          status, emergency_contact, medical_notes, blood_group, admission_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          s.adm, s.first, s.last, s.dob, s.gender, s.classId, s.secId,
          s.roll, acadYear.id, s.parentId || null, s.parentMobile || '', s.parentEmail || '',
          'Nilgiris District, Tamil Nadu', 'active', s.emergency || '', s.medical || '',
          s.blood || 'O+', '2024-06-01'
        ]
      );
      student = { id: res.lastInsertRowid };

      // Link student_parents
      if (s.parentId) {
        db.run(
          `INSERT OR IGNORE INTO student_parents (student_id, parent_id, relationship, is_primary) VALUES (?, ?, ?, ?)`,
          [student.id, s.parentId, 'Parent', 1]
        );
      }
    }
    studentIds.push({ id: student.id, classId: s.classId, secId: s.secId, roll: s.roll });
  }
  console.log(`✅ ${studentList.length} Students seeded.`);

  // 10. Attendance Records for past 7 days
  const today = new Date();
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    // Skip Sundays
    if (d.getDay() !== 0) {
      dates.push(d.toISOString().split('T')[0]);
    }
  }

  for (const dateStr of dates) {
    for (const st of studentIds) {
      // 95% attendance rate simulation: roll 5 is absent on latest day, roll 8 is late
      let status = 'present';
      let remarks = 'On time';
      if (st.roll === 5 && dateStr === dates[0]) {
        status = 'absent';
        remarks = 'Informed medical leave';
      } else if (st.roll === 8 && dateStr === dates[0]) {
        status = 'late';
        remarks = 'Late bus arrival (15m)';
      }

      db.run(
        `INSERT OR IGNORE INTO attendance (
          student_id, class_id, section_id, date, status, marked_by_teacher_id, remarks
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [st.id, st.classId, st.secId, dateStr, status, teacherMap['TCH-1004'], remarks]
      );
    }
  }
  console.log('✅ Attendance records generated for past school days.');

  // 11. Events
  const events = [
    {
      title: 'Annual Inter-House Sports Meet 2026',
      description: 'Track and field events, relay championships, and Nilgiris district athletic qualifiers.',
      date: '2026-10-10',
      time: '09:00 AM - 04:00 PM',
      location: 'Christus Rex Main Athletics Grounds',
      audience: 'all'
    },
    {
      title: 'Science & Robotics Exhibition (Grades 9-12)',
      description: 'Student engineering projects, AI demos, renewable energy models, and live experiments.',
      date: '2026-10-18',
      time: '10:00 AM - 02:30 PM',
      location: 'Dr. APJ Abdul Kalam Science Center',
      audience: 'all'
    },
    {
      title: 'Class 10 CBSE Pre-Board & Career Guidance Seminar',
      description: 'Orientation on board examination pattern, marks weightage, and stream selection.',
      date: '2026-10-25',
      time: '10:30 AM - 12:30 PM',
      location: 'Fr. Thomas Antony Memorial Auditorium',
      audience: 'class',
      classId: sec10A.classId,
      sectionId: sec10A.sectionId
    },
    {
      title: 'Faculty Continuous Professional Development Workshop',
      description: 'CBSE NEP 2020 Pedagogical Framework & Continuous Evaluation implementation training.',
      date: '2026-11-02',
      time: '02:00 PM - 05:00 PM',
      location: 'Staff Conference Hall',
      audience: 'teachers'
    }
  ];

  for (const ev of events) {
    db.run(
      `INSERT OR IGNORE INTO events (
        title, description, event_date, event_time, location, target_audience, target_class_id, target_section_id, is_published, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
      [ev.title, ev.description, ev.date, ev.time, ev.location, ev.audience, ev.classId || null, ev.sectionId || null, adminUser.id]
    );
  }
  console.log('✅ Events seeded.');

  // 12. Notifications
  const notifications = [
    {
      title: 'Nilgiris Weather Advisory - Safe Campus Transit',
      message: 'Due to forecasted heavy rains in Ootacamund, school buses will depart at 03:00 PM today. Live GPS is tracking all 4 routes.',
      type: 'emergency',
      priority: 'urgent',
      audience: 'all'
    },
    {
      title: 'Quarterly Assessment Grade Cards Released',
      message: 'Quarterly exam marks and report cards are now updated in the Parent Portal. Please review your wards evaluation.',
      type: 'academic',
      priority: 'high',
      audience: 'parents'
    },
    {
      title: 'Faculty Notice: Submission of Class 10 Internal Marks',
      message: 'All Class 10 subject teachers are requested to submit internal practical assessment rubrics by Friday 4 PM.',
      type: 'announcement',
      priority: 'medium',
      audience: 'teachers'
    },
    {
      title: 'Class 10-A Mathematics Homework Assignment',
      message: 'Exercise 4.3 (Quadratic Equations - Questions 1 to 8) to be completed in homework notebook.',
      type: 'academic',
      priority: 'medium',
      audience: 'class',
      classId: sec10A.classId,
      sectionId: sec10A.sectionId
    }
  ];

  for (const n of notifications) {
    const res = db.run(
      `INSERT INTO notifications (
        title, message, type, priority, target_audience, target_class_id, target_section_id, status, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?)`,
      [n.title, n.message, n.type, n.priority, n.audience, n.classId || null, n.sectionId || null, adminUser.id]
    );

    // Seed unread notification recipient for parent user
    db.run(
      `INSERT OR IGNORE INTO notification_recipients (notification_id, user_id, is_read) VALUES (?, ?, 0)`,
      [res.lastInsertRowid, p1User.id]
    );
  }
  console.log('✅ Notifications seeded with recipient tracking.');

  // 14. RBAC Permissions Matrix
  const permissionsList = [
    { code: 'admin.dashboard', module: 'DASHBOARD', description: 'Access Super Admin Dashboard' },
    { code: 'students.manage', module: 'STUDENTS', description: 'Full student CRUD' },
    { code: 'teachers.manage', module: 'TEACHERS', description: 'Full teacher management and assignments' },
    { code: 'parents.manage', module: 'PARENTS', description: 'Parent management and child linking' },
    { code: 'attendance.manage', module: 'ATTENDANCE', description: 'School-wide attendance control' },
    { code: 'attendance.mark', module: 'ATTENDANCE', description: 'Mark attendance for assigned classes' },
    { code: 'attendance.view_own', module: 'ATTENDANCE', description: 'View own child attendance' },
    { code: 'homework.manage', module: 'HOMEWORK', description: 'School-wide homework management' },
    { code: 'homework.create', module: 'HOMEWORK', description: 'Assign homework to classes' },
    { code: 'homework.view_own', module: 'HOMEWORK', description: 'View own child homework' },
    { code: 'fees.manage', module: 'FEES', description: 'Fee structure and collection administration' },
    { code: 'fees.view_own', module: 'FEES', description: 'View fee ledger for own child' },
    { code: 'fees.pay', module: 'FEES', description: 'Pay fees online' },
    { code: 'transport.manage', module: 'TRANSPORT', description: 'Fleet and route administration' },
    { code: 'transport.track_own', module: 'TRANSPORT', description: 'Live bus tracking for assigned student' },
    { code: 'events.manage', module: 'EVENTS', description: 'School events management' },
    { code: 'events.view', module: 'EVENTS', description: 'View school calendar and events' },
    { code: 'notifications.manage', module: 'NOTIFICATIONS', description: 'Create and dispatch notifications' },
    { code: 'notifications.view', module: 'NOTIFICATIONS', description: 'View notifications' }
  ];

  for (const p of permissionsList) {
    db.run(
      `INSERT OR IGNORE INTO permissions (code, module, description) VALUES (?, ?, ?)`,
      [p.code, p.module, p.description]
    );
  }

  // Assign to roles
  const adminPermissions = permissionsList.map(p => p.code);
  const teacherPermissions = [
    'attendance.mark', 'attendance.manage', 'homework.create', 'homework.manage',
    'events.view', 'notifications.view'
  ];
  const parentPermissions = [
    'attendance.view_own', 'homework.view_own', 'fees.view_own', 'fees.pay',
    'transport.track_own', 'events.view', 'notifications.view'
  ];

  for (const code of adminPermissions) {
    db.run(`INSERT OR IGNORE INTO role_permissions (role, permission_code) VALUES ('SUPER_ADMIN', ?)`, [code]);
  }
  for (const code of teacherPermissions) {
    db.run(`INSERT OR IGNORE INTO role_permissions (role, permission_code) VALUES ('TEACHER', ?)`, [code]);
  }
  for (const code of parentPermissions) {
    db.run(`INSERT OR IGNORE INTO role_permissions (role, permission_code) VALUES ('PARENT', ?)`, [code]);
  }
  console.log('✅ RBAC permissions matrix seeded.');

  // 15. Homework & Submissions Seed
  const tSarah = db.get(`SELECT id FROM teachers WHERE mobile = '9876500004' LIMIT 1`);
  const subPhys = db.get(`SELECT id FROM subjects WHERE code = 'PHY-01' LIMIT 1`);
  const subMath = db.get(`SELECT id FROM subjects WHERE code = 'MAT-01' LIMIT 1`);
  const student1Record = db.get(`SELECT id FROM students WHERE admission_no = 'REX-2024-001'`);
  const student7Record = db.get(`SELECT id FROM students WHERE admission_no = 'REX-2024-007'`);
  const student1Id = student1Record ? student1Record.id : 1;
  const student7Id = student7Record ? student7Record.id : 7;

  if (tSarah && subPhys && sec10A) {
    const hw1 = db.run(
      `INSERT OR IGNORE INTO homework (class_id, section_id, subject_id, teacher_id, title, description, assigned_date, due_date, status)
       VALUES (?, ?, ?, ?, ?, ?, '2026-09-24', '2026-09-29', 'published')`,
      [sec10A.classId, sec10A.sectionId, subPhys.id, tSarah.id, 'Exercise 5.2 - Ray Optics & Refraction', 'Solve numericals 1 through 12 in the physics problem notebook. Draw labeled ray diagrams for concave mirrors.']
    );
    const hw2 = db.run(
      `INSERT OR IGNORE INTO homework (class_id, section_id, subject_id, teacher_id, title, description, assigned_date, due_date, status)
       VALUES (?, ?, ?, ?, ?, ?, '2026-09-25', '2026-09-28', 'published')`,
      [sec10A.classId, sec10A.sectionId, subMath.id, tSarah.id, 'Quadratic Equations Worksheet', 'Complete NCERT Exercise 4.3 questions 1 to 8. Check discriminant criteria for real roots.']
    );

    // Submission for Aarav Sharma (student 1)
    if (student1Id) {
      db.run(
        `INSERT OR IGNORE INTO homework_submissions (homework_id, student_id, status, submission_text, grade, feedback)
         VALUES (?, ?, 'completed', 'Completed all 12 problems with ray diagrams.', 'A+ (19/20)', 'Neat work and correct focal length calculations.')`,
        [hw1.lastInsertRowid || 1, student1Id]
      );
    }
  }
  console.log('✅ Homework and submissions seeded.');

  // 16. Fee Structures & Payments Seed
  if (sec10A && acadYear) {
    const fs10 = db.run(
      `INSERT OR IGNORE INTO fee_structures (academic_year_id, class_id, term_name, total_amount, due_date)
       VALUES (?, ?, 'Term II Tuition & Lab Fee (2026-27)', 54000, '2026-10-15')`,
      [acadYear.id, sec10A.classId]
    );

    // Aarav Sharma full payment
    if (student1Id) {
      db.run(
        `INSERT OR IGNORE INTO fee_payments (student_id, fee_structure_id, amount_paid, total_fees, pending_amount, payment_mode, transaction_ref, status, receipt_no)
         VALUES (?, ?, 54000, 54000, 0, 'ONLINE_UPI', 'UPI-TXN-984210', 'PAID', 'REX-REC-2026-0084')`,
        [student1Id, fs10.lastInsertRowid || 1]
      );
    }

    // Ananya Sharma partial payment
    if (student7Id) {
      db.run(
        `INSERT OR IGNORE INTO fee_payments (student_id, fee_structure_id, amount_paid, total_fees, pending_amount, payment_mode, transaction_ref, status, receipt_no)
         VALUES (?, ?, 30000, 48000, 18000, 'ONLINE_UPI', 'UPI-TXN-984211', 'PARTIAL', 'REX-REC-2026-0092')`,
        [student7Id, fs10.lastInsertRowid || 1]
      );
    }
  }
  console.log('✅ Fee structures and payment receipts seeded.');

  // 17. Fleet & Transport Seed
  db.run(
    `INSERT OR IGNORE INTO buses (bus_number, vehicle_no, model, capacity, status)
     VALUES ('Route 02', 'TN-43-A-2015', 'Ashok Leyland Lynx 36-Seater Fleet', 36, 'ACTIVE')`
  );
  const bus2Record = db.get(`SELECT id FROM buses WHERE bus_number = 'Route 02'`);
  const bus2Id = bus2Record ? bus2Record.id : 1;

  db.run(
    `INSERT OR IGNORE INTO drivers (name, mobile, license_no, assigned_bus_id, status)
     VALUES ('M. Shanmugam', '9842188310', 'TN43-2012-00481', ?, 'ACTIVE')`,
    [bus2Id]
  );

  db.run(
    `INSERT OR IGNORE INTO bus_routes (route_code, name, assigned_bus_id, start_point, end_point, eta_minutes, live_status)
     VALUES ('ROUTE-02', 'Coonoor - Wellington - Charring Cross - Rex SSS', ?, 'Coonoor Stand', 'Rex SSS Campus Gate', 12, 'Approaching Gate')`,
    [bus2Id]
  );
  const route2Record = db.get(`SELECT id FROM bus_routes WHERE route_code = 'ROUTE-02'`);
  const route2Id = route2Record ? route2Record.id : 1;

  db.run(
    `INSERT OR IGNORE INTO bus_stops (route_id, stop_name, stop_order, pickup_time, drop_time, distance_meters)
     VALUES (?, 'Charring Cross Junction', 2, '07:48 AM', '04:05 PM', 480)`,
    [route2Id]
  );
  const stop1Record = db.get(`SELECT id FROM bus_stops WHERE route_id = ? AND stop_name = 'Charring Cross Junction'`, [route2Id]);
  const stop1Id = stop1Record ? stop1Record.id : 1;

  if (student1Id) {
    db.run(
      `INSERT OR IGNORE INTO student_transport_assignments (student_id, bus_id, route_id, pickup_stop_id)
       VALUES (?, ?, ?, ?)`,
      [student1Id, bus2Id, route2Id, stop1Id]
    );
  }
  // 18. Admissions Seed
  db.run(`
    INSERT OR IGNORE INTO admissions (id, application_no, student_first_name, student_last_name, dob, gender, target_grade_level, parent_name, parent_mobile, parent_email, address, status, notes)
    VALUES 
    (1, 'ADM-2026-0101', 'Kavya', 'Menon', '2012-05-14', 'female', 8, 'Suresh Menon', '9845199881', 'suresh.menon@example.com', '12, Club Road, Ooty', 'APPROVED', 'Verified birth certificate and previous school marksheet'),
    (2, 'ADM-2026-0102', 'Aditya', 'Verma', '2011-09-20', 'male', 10, 'Rajiv Verma', '9842211445', 'rajiv.verma@example.com', '45, Valley View, Coonoor', 'PENDING', 'Under evaluation for ICSE to CBSE transfer')
  `);

  // 19. Question Bank Seed
  db.run(`
    INSERT OR IGNORE INTO question_bank (id, subject_id, class_id, question_type, difficulty, question_text, options_json, correct_answer, explanation, marks)
    VALUES
    (1, 1, 3, 'MCQ', 'MEDIUM', 'What is the discriminant formula for a quadratic equation ax² + bx + c = 0?', '["D = b² - 4ac", "D = b² + 4ac", "D = 4ac - b²", "D = 2b - 4ac"]', 'D = b² - 4ac', 'The discriminant D = b² - 4ac determines the nature of the roots.', 1.0),
    (2, 2, 3, 'MCQ', 'EASY', 'What is the SI unit of electric resistance?', '["Ampere", "Volt", "Ohm", "Watt"]', 'Ohm', 'Resistance is measured in Ohms (Ω) according to Ohm’s Law.', 1.0),
    (3, 2, 3, 'SHORT_ANSWER', 'MEDIUM', 'State Snell’s Law of Refraction.', '[]', 'sin(i) / sin(r) = constant (n)', 'Ratio of sine of angle of incidence to sine of angle of refraction is constant.', 2.0)
  `);

  // 20. Exams & Results Seed
  db.run(`
    INSERT OR IGNORE INTO exams (id, title, exam_type, class_id, subject_id, exam_date, start_time, end_time, duration_minutes, total_marks, passing_marks, status)
    VALUES
    (1, 'Mid-Term Physics Assessment 2026', 'TERM', 3, 2, '2026-09-15', '09:30 AM', '11:00 AM', 90, 80, 28, 'PUBLISHED'),
    (2, 'Mathematics Unit Test - Quadratic Equations', 'UNIT_TEST', 3, 1, '2026-10-12', '10:00 AM', '11:00 AM', 60, 40, 14, 'SCHEDULED')
  `);

  db.run(`
    INSERT OR IGNORE INTO exam_results (exam_id, student_id, marks_obtained, max_marks, percentage, grade, pass_status, rank, remarks)
    VALUES
    (1, 1, 74.0, 80.0, 92.5, 'A1', 'PASS', 1, 'Exceptional conceptual clarity in Optics and Electromagnetism.')
  `);

  // 21. Campus: Library Seed
  db.run(`
    INSERT OR IGNORE INTO library_books (id, isbn, title, author, category, publisher, total_copies, available_copies, rack_location, status)
    VALUES
    (1, '978-8121908238', 'Concepts of Physics (Vol 1)', 'Dr. H.C. Verma', 'Science & Physics', 'Bharti Bhawan', 12, 10, 'Rack S-04', 'AVAILABLE'),
    (2, '978-8174507075', 'NCERT Mathematics Grade 10', 'NCERT Editorial Board', 'Mathematics', 'NCERT', 25, 22, 'Rack M-01', 'AVAILABLE'),
    (3, '978-8173711466', 'Wings of Fire: An Autobiography', 'Dr. A.P.J. Abdul Kalam', 'Biography', 'Universities Press', 8, 7, 'Rack B-02', 'AVAILABLE')
  `);

  db.run(`
    INSERT OR IGNORE INTO library_transactions (id, book_id, student_id, borrower_type, issue_date, due_date, status, remarks)
    VALUES
    (1, 1, 1, 'STUDENT', '2026-09-20', '2026-10-10', 'ISSUED', 'Issued for reference in Term 2 physics preparation')
  `);

  // 22. Campus: Inventory Seed
  db.run(`
    INSERT OR IGNORE INTO inventory_items (id, item_code, name, category, quantity_in_stock, unit, min_stock_level, unit_price, supplier_name, status)
    VALUES
    (1, 'INV-SCI-001', 'Borosilicate Beaker 500ml', 'Laboratory Equipment', 48, 'pieces', 15, 120.0, 'Nilgiris Scientific Supplies', 'IN_STOCK'),
    (2, 'INV-SPT-002', 'Cosco Match Basketball Size 7', 'Sports & PE', 14, 'balls', 6, 850.0, 'Coimbatore Sports Hub', 'IN_STOCK'),
    (3, 'INV-STA-003', 'A4 Printing Ream (75 GSM)', 'Stationery & Printing', 120, 'reams', 30, 240.0, 'TNPL Direct', 'IN_STOCK')
  `);

  // 23. Campus: Visitor Management Seed
  db.run(`
    INSERT OR IGNORE INTO visitors (id, visitor_name, mobile, purpose, whom_to_meet, entry_time, pass_number, status)
    VALUES
    (1, 'M. Robert Wilson', '9443218844', 'CBSE Regional Inspection & Audit', 'Rev. Fr. Principal', '2026-10-07 10:15:00', 'VIS-2026-042', 'CHECKED_IN'),
    (2, 'Dr. Geetha Swaminathan', '9842109933', 'Campus Health & Vaccination Drive', 'Staff Coordinator', '2026-10-07 09:00:00', 'VIS-2026-041', 'CHECKED_OUT')
  `);

  // 24. Campus: Hostel Management Seed
  db.run(`
    INSERT OR IGNORE INTO hostels (id, name, type, warden_name, warden_contact, total_rooms, address)
    VALUES
    (1, 'St. Thomas Boys Residence', 'BOYS', 'Bro. Augustine OFM', '+91 94432 00192', 40, 'Campus North Wing, Ooty'),
    (2, 'St. Maria Goretti Girls Residence', 'GIRLS', 'Sr. Clara FMM', '+91 94432 00193', 40, 'Campus East Wing, Ooty')
  `);

  db.run(`
    INSERT OR IGNORE INTO hostel_rooms (id, hostel_id, room_number, capacity, occupied, floor_number, status)
    VALUES
    (1, 1, '101', 2, 1, 1, 'AVAILABLE'),
    (2, 1, '102', 2, 2, 1, 'FULL'),
    (3, 2, '201', 2, 1, 2, 'AVAILABLE')
  `);

  // 25. HR & Payroll Seed
  db.run(`
    INSERT OR IGNORE INTO staff_attendance (teacher_id, date, status, check_in_time, check_out_time, remarks)
    VALUES
    (1, DATE('now'), 'PRESENT', '08:15 AM', '03:50 PM', 'On time morning assembly duty'),
    (2, DATE('now'), 'PRESENT', '08:20 AM', '03:45 PM', 'Class teacher Grade 10-A')
  `);

  db.run(`
    INSERT OR IGNORE INTO staff_leaves (id, teacher_id, leave_type, start_date, end_date, reason, status)
    VALUES
    (1, 1, 'CASUAL', '2026-10-15', '2026-10-16', 'Family wedding ceremony in Coimbatore', 'APPROVED'),
    (2, 2, 'SICK', '2026-09-28', '2026-09-28', 'Fever recovery', 'APPROVED')
  `);

  db.run(`
    INSERT OR IGNORE INTO salary_structures (id, teacher_id, basic_salary, hra, da, special_allowance, provident_fund, tax_deduction, net_salary)
    VALUES
    (1, 1, 42000, 10500, 8400, 4100, 5040, 2000, 57960),
    (2, 2, 38000, 9500, 7600, 3900, 4560, 1800, 52640)
  `);

  db.run(`
    INSERT OR IGNORE INTO payroll_records (id, teacher_id, month_year, basic_salary, allowances, deductions, net_amount, payment_status, payment_date, payslip_ref)
    VALUES
    (1, 1, '2026-09', 42000, 23000, 7040, 57960, 'PAID', '2026-09-30', 'PAY-2026-09-001'),
    (2, 2, '2026-09', 38000, 21000, 6360, 52640, 'PAID', '2026-09-30', 'PAY-2026-09-002')
  `);

  db.run(`
    INSERT OR IGNORE INTO staff_evaluations (id, teacher_id, evaluation_period, evaluator_name, subject_mastery_rating, classroom_management_rating, student_engagement_rating, overall_score, comments)
    VALUES
    (1, 1, 'Term 1 2026', 'Academic Vice Principal', 5, 5, 4, 4.8, 'Exemplary teaching methodologies in Physics. High board pass rates.'),
    (2, 2, 'Term 1 2026', 'Academic Vice Principal', 5, 4, 5, 4.7, 'Excellent rapport with Grade 10 students and prompt parent communication.')
  `);

  // 26. Configurable Module Settings Seed
  db.run(`
    INSERT OR IGNORE INTO module_configurations (
      id, library_enabled, inventory_enabled, hostel_enabled, transport_enabled, hr_enabled, payroll_enabled, ai_assistant_enabled, online_exams_enabled, visitors_enabled, multi_campus_enabled, active_campus_name
    ) VALUES (
      1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 'Rex Senior Secondary Main Campus, Ootacamund'
    )
  `);

  console.log('✅ Grexotix School Digital Operating Platform modules seeded.');
  console.log('🎉 Seeding successfully completed!');
}

if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;

