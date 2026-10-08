-- ============================================================================
-- Normalized Relational Database Schema for Rex Senior Secondary School ERP
-- ============================================================================

PRAGMA foreign_keys = ON;

-- 1. ROLES
CREATE TABLE IF NOT EXISTS roles (
  name TEXT PRIMARY KEY,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. USERS
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE,
  email TEXT UNIQUE,
  mobile TEXT UNIQUE,
  password_hash TEXT,
  role TEXT NOT NULL REFERENCES roles(name),
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'disabled')),
  last_login_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. ACADEMIC YEARS
CREATE TABLE IF NOT EXISTS academic_years (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_current INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 4. CLASSES
CREATE TABLE IF NOT EXISTS classes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  grade_level INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 5. SECTIONS
CREATE TABLE IF NOT EXISTS sections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  room_number TEXT,
  max_capacity INTEGER DEFAULT 40,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(class_id, name)
);

-- 6. SUBJECTS
CREATE TABLE IF NOT EXISTS subjects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  department TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 7. TEACHERS
CREATE TABLE IF NOT EXISTS teachers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE SET NULL,
  employee_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  mobile TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  gender TEXT CHECK(gender IN ('male', 'female', 'other')),
  dob DATE,
  qualification TEXT,
  experience TEXT,
  department TEXT,
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'disabled')),
  profile_photo TEXT,
  joining_date DATE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 8. TEACHER ASSIGNMENTS
CREATE TABLE IF NOT EXISTS teacher_assignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  teacher_id INTEGER NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  section_id INTEGER NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  academic_year_id INTEGER REFERENCES academic_years(id) ON DELETE SET NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(teacher_id, subject_id, class_id, section_id)
);

-- 9. PARENTS
CREATE TABLE IF NOT EXISTS parents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  mobile TEXT NOT NULL UNIQUE,
  email TEXT,
  address TEXT,
  occupation TEXT,
  alternate_phone TEXT,
  pin_code TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 10. STUDENTS
CREATE TABLE IF NOT EXISTS students (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admission_no TEXT NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  dob DATE NOT NULL,
  gender TEXT CHECK(gender IN ('male', 'female', 'other')),
  class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE RESTRICT,
  section_id INTEGER NOT NULL REFERENCES sections(id) ON DELETE RESTRICT,
  roll_no INTEGER NOT NULL,
  academic_year_id INTEGER REFERENCES academic_years(id) ON DELETE SET NULL,
  parent_id INTEGER REFERENCES parents(id) ON DELETE SET NULL,
  parent_mobile TEXT,
  parent_email TEXT,
  address TEXT,
  profile_photo TEXT,
  admission_date DATE,
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'transferred', 'graduated')),
  emergency_contact TEXT,
  medical_notes TEXT,
  blood_group TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(class_id, section_id, roll_no)
);

-- 11. STUDENT PARENTS (Many-to-many relationship supporting guardians)
CREATE TABLE IF NOT EXISTS student_parents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  parent_id INTEGER NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  relationship TEXT DEFAULT 'Father',
  is_primary INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(student_id, parent_id)
);

-- 12. ATTENDANCE
CREATE TABLE IF NOT EXISTS attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE RESTRICT,
  section_id INTEGER NOT NULL REFERENCES sections(id) ON DELETE RESTRICT,
  date DATE NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('present', 'absent', 'late', 'excused')),
  marked_by_teacher_id INTEGER REFERENCES teachers(id) ON DELETE SET NULL,
  remarks TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(student_id, date)
);

-- 13. EVENTS
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  event_time TEXT,
  location TEXT,
  banner_image TEXT,
  target_audience TEXT DEFAULT 'all' CHECK(target_audience IN ('all', 'teachers', 'parents', 'class')),
  target_class_id INTEGER REFERENCES classes(id) ON DELETE SET NULL,
  target_section_id INTEGER REFERENCES sections(id) ON DELETE SET NULL,
  is_published INTEGER DEFAULT 1,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 14. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'general' CHECK(type IN ('general', 'academic', 'attendance', 'event', 'emergency', 'holiday', 'announcement')),
  priority TEXT DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high', 'urgent')),
  target_audience TEXT DEFAULT 'all' CHECK(target_audience IN ('all', 'teachers', 'parents', 'class')),
  target_class_id INTEGER REFERENCES classes(id) ON DELETE SET NULL,
  target_section_id INTEGER REFERENCES sections(id) ON DELETE SET NULL,
  publish_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  expiry_date DATETIME,
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'archived', 'draft')),
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 15. NOTIFICATION RECIPIENTS
CREATE TABLE IF NOT EXISTS notification_recipients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  notification_id INTEGER NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_read INTEGER DEFAULT 0,
  read_at DATETIME,
  UNIQUE(notification_id, user_id)
);

-- 16. OTP VERIFICATIONS
CREATE TABLE IF NOT EXISTS otp_verifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mobile TEXT NOT NULL,
  otp_hash TEXT NOT NULL,
  role TEXT DEFAULT 'TEACHER',
  attempts INTEGER DEFAULT 0,
  verified INTEGER DEFAULT 0,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 17. SESSIONS / REFRESH TOKENS
CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  user_agent TEXT,
  ip_address TEXT,
  expires_at DATETIME NOT NULL,
  revoked INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 18. AUDIT LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  user_role TEXT,
  action TEXT NOT NULL,
  module TEXT NOT NULL,
  record_id TEXT,
  details TEXT,
  ip_address TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 19. SCHOOL SETTINGS
CREATE TABLE IF NOT EXISTS school_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  school_name TEXT NOT NULL,
  affiliation_no TEXT,
  school_code TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  logo_url TEXT,
  academic_year TEXT,
  timings TEXT,
  config_json TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 20. AUTOMATED SMS LOGS
CREATE TABLE IF NOT EXISTS sms_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  recipient TEXT NOT NULL,
  message TEXT NOT NULL,
  sms_type TEXT NOT NULL CHECK(sms_type IN ('OTP', 'ABSENTEE_ALERT', 'EMERGENCY', 'ANNOUNCEMENT', 'GENERAL')),
  status TEXT DEFAULT 'SENT' CHECK(status IN ('SENT', 'FAILED', 'PENDING', 'DELIVERED')),
  provider TEXT NOT NULL,
  reference_id TEXT,
  error_message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 21. PERMISSIONS & ROLE PERMISSIONS
CREATE TABLE IF NOT EXISTS permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  module TEXT NOT NULL,
  description TEXT
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role TEXT NOT NULL REFERENCES roles(name) ON DELETE CASCADE,
  permission_code TEXT NOT NULL REFERENCES permissions(code) ON DELETE CASCADE,
  PRIMARY KEY (role, permission_code)
);

-- 22. HOMEWORK & SUBMISSIONS
CREATE TABLE IF NOT EXISTS homework (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  section_id INTEGER NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  teacher_id INTEGER NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  attachment_url TEXT,
  assigned_date DATE NOT NULL,
  due_date DATE NOT NULL,
  status TEXT DEFAULT 'READY_FOR_REVIEW' CHECK(status IN ('DRAFT', 'READY_FOR_REVIEW', 'SCHEDULED', 'SENT', 'EDIT_LOCKED', 'FAILED', 'published', 'draft', 'archived')),
  send_mode TEXT DEFAULT 'MANUAL' CHECK(send_mode IN ('MANUAL', 'AUTO_5PM')),
  auto_send_enabled INTEGER DEFAULT 0 CHECK(auto_send_enabled IN (0, 1)),
  scheduled_send_at DATETIME,
  sent_at DATETIME,
  sent_by INTEGER REFERENCES users(id),
  edit_locked_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS homework_deliveries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  homework_id INTEGER NOT NULL REFERENCES homework(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  parent_id INTEGER REFERENCES parents(id) ON DELETE SET NULL,
  phone_number TEXT NOT NULL,
  delivery_status TEXT NOT NULL CHECK(delivery_status IN ('SENT', 'FAILED', 'PENDING')),
  channel TEXT DEFAULT 'WHATSAPP' CHECK(channel IN ('WHATSAPP', 'SMS')),
  provider_message_id TEXT,
  error_message TEXT,
  sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_hw_deliv_hw_id ON homework_deliveries(homework_id);
CREATE INDEX IF NOT EXISTS idx_hw_deliv_student_id ON homework_deliveries(student_id);

CREATE TABLE IF NOT EXISTS homework_submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  homework_id INTEGER NOT NULL REFERENCES homework(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'completed' CHECK(status IN ('pending', 'submitted', 'completed', 'graded')),
  submission_text TEXT,
  attachment_url TEXT,
  submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  grade TEXT,
  feedback TEXT,
  UNIQUE(homework_id, student_id)
);

-- 23. FEES & PAYMENTS
CREATE TABLE IF NOT EXISTS fee_structures (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  academic_year_id INTEGER REFERENCES academic_years(id),
  class_id INTEGER NOT NULL REFERENCES classes(id),
  term_name TEXT NOT NULL,
  total_amount REAL NOT NULL,
  due_date DATE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS fee_payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  fee_structure_id INTEGER REFERENCES fee_structures(id) ON DELETE SET NULL,
  amount_paid REAL NOT NULL,
  total_fees REAL NOT NULL,
  pending_amount REAL NOT NULL,
  previously_paid REAL DEFAULT 0,
  payment_type TEXT DEFAULT 'FULL' CHECK(payment_type IN ('FULL', 'SPLIT')),
  payment_mode TEXT DEFAULT 'ONLINE_UPI' CHECK(payment_mode IN ('CASH', 'CHEQUE', 'ONLINE_UPI', 'NET_BANKING', 'CARD')),
  transaction_ref TEXT UNIQUE,
  status TEXT DEFAULT 'PAID' CHECK(status IN ('PAID', 'PENDING', 'PARTIAL', 'FAILED')),
  parent_id INTEGER REFERENCES parents(id),
  created_by INTEGER REFERENCES users(id),
  paid_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  receipt_no TEXT UNIQUE NOT NULL
);

-- 24. TRANSPORT FLEET & TELEMATICS
CREATE TABLE IF NOT EXISTS buses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bus_number TEXT NOT NULL UNIQUE,
  vehicle_no TEXT NOT NULL UNIQUE,
  model TEXT NOT NULL,
  capacity INTEGER DEFAULT 36,
  status TEXT DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'MAINTENANCE', 'IDLE', 'INACTIVE')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS drivers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  mobile TEXT NOT NULL UNIQUE,
  license_no TEXT NOT NULL UNIQUE,
  assigned_bus_id INTEGER REFERENCES buses(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'ACTIVE'
);

CREATE TABLE IF NOT EXISTS bus_routes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  route_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  assigned_bus_id INTEGER REFERENCES buses(id) ON DELETE SET NULL,
  start_point TEXT NOT NULL,
  end_point TEXT NOT NULL,
  eta_minutes INTEGER DEFAULT 15,
  live_status TEXT DEFAULT 'On Route'
);

CREATE TABLE IF NOT EXISTS bus_stops (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  route_id INTEGER NOT NULL REFERENCES bus_routes(id) ON DELETE CASCADE,
  stop_name TEXT NOT NULL,
  stop_order INTEGER NOT NULL,
  pickup_time TEXT NOT NULL,
  drop_time TEXT NOT NULL,
  distance_meters INTEGER DEFAULT 0,
  latitude REAL,
  longitude REAL
);

CREATE TABLE IF NOT EXISTS student_transport_assignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL UNIQUE REFERENCES students(id) ON DELETE CASCADE,
  bus_id INTEGER NOT NULL REFERENCES buses(id) ON DELETE CASCADE,
  route_id INTEGER NOT NULL REFERENCES bus_routes(id) ON DELETE CASCADE,
  pickup_stop_id INTEGER REFERENCES bus_stops(id) ON DELETE SET NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bus_tracking_state (
  bus_id INTEGER PRIMARY KEY REFERENCES buses(id) ON DELETE CASCADE,
  route_id INTEGER REFERENCES bus_routes(id) ON DELETE SET NULL,
  driver_id INTEGER REFERENCES drivers(id) ON DELETE SET NULL,
  tracking_mode TEXT DEFAULT 'DEMO' CHECK(tracking_mode IN ('DEMO', 'LIVE_GPS')),
  is_active INTEGER DEFAULT 0,
  speed_multiplier INTEGER DEFAULT 1,
  current_stop_index INTEGER DEFAULT 0,
  progress_percent REAL DEFAULT 0.0,
  latitude REAL,
  longitude REAL,
  current_stop_name TEXT,
  next_stop_name TEXT,
  eta_minutes INTEGER DEFAULT 15,
  status_text TEXT DEFAULT 'Stationary',
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 25. HOMEWORK AUTOMATION SETTINGS
CREATE TABLE IF NOT EXISTS homework_automation_settings (
  id INTEGER PRIMARY KEY CHECK(id = 1),
  auto_send_enabled INTEGER DEFAULT 1 CHECK(auto_send_enabled IN (0, 1)),
  auto_send_time TEXT DEFAULT '17:00',
  timezone TEXT DEFAULT 'Asia/Kolkata',
  send_method TEXT DEFAULT 'WhatsApp',
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================================
-- GREXOTIX PLATFORM EXTENSIONS (MODULES 01 - 10)
-- ============================================================================

-- 26. ADMISSIONS & ENROLMENTS
CREATE TABLE IF NOT EXISTS admissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  application_no TEXT NOT NULL UNIQUE,
  student_first_name TEXT NOT NULL,
  student_last_name TEXT NOT NULL,
  dob DATE NOT NULL,
  gender TEXT CHECK(gender IN ('male', 'female', 'other')),
  target_grade_level INTEGER NOT NULL,
  academic_year_id INTEGER REFERENCES academic_years(id),
  parent_name TEXT NOT NULL,
  parent_mobile TEXT NOT NULL,
  parent_email TEXT,
  address TEXT,
  status TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'ENROLLED')),
  applied_date DATE DEFAULT (DATE('now')),
  allocated_class_id INTEGER REFERENCES classes(id),
  allocated_section_id INTEGER REFERENCES sections(id),
  enrolled_student_id INTEGER REFERENCES students(id),
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 27. QUESTION BANK
CREATE TABLE IF NOT EXISTS question_bank (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  question_type TEXT DEFAULT 'MCQ' CHECK(question_type IN ('MCQ', 'TRUE_FALSE', 'SHORT_ANSWER', 'LONG_ANSWER')),
  difficulty TEXT DEFAULT 'MEDIUM' CHECK(difficulty IN ('EASY', 'MEDIUM', 'HARD')),
  question_text TEXT NOT NULL,
  options_json TEXT,
  correct_answer TEXT NOT NULL,
  explanation TEXT,
  marks REAL DEFAULT 1.0,
  created_by_teacher_id INTEGER REFERENCES teachers(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 28. ONLINE EXAMINATIONS & ASSESSMENTS
CREATE TABLE IF NOT EXISTS exams (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  exam_type TEXT DEFAULT 'FORMATIVE' CHECK(exam_type IN ('FORMATIVE', 'SUMMATIVE', 'TERM', 'QUIZ', 'UNIT_TEST')),
  class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  academic_year_id INTEGER REFERENCES academic_years(id),
  exam_date DATE NOT NULL,
  start_time TEXT,
  end_time TEXT,
  duration_minutes INTEGER DEFAULT 60,
  total_marks REAL NOT NULL DEFAULT 100,
  passing_marks REAL NOT NULL DEFAULT 40,
  status TEXT DEFAULT 'SCHEDULED' CHECK(status IN ('DRAFT', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'PUBLISHED')),
  created_by INTEGER REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS exam_questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  exam_id INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  question_id INTEGER REFERENCES question_bank(id) ON DELETE SET NULL,
  question_text TEXT NOT NULL,
  question_type TEXT DEFAULT 'MCQ',
  options_json TEXT,
  correct_answer TEXT,
  marks REAL DEFAULT 1.0,
  sort_order INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS exam_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  exam_id INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  marks_obtained REAL NOT NULL,
  max_marks REAL NOT NULL,
  percentage REAL NOT NULL,
  grade TEXT,
  pass_status TEXT CHECK(pass_status IN ('PASS', 'FAIL')),
  rank INTEGER,
  remarks TEXT,
  evaluated_by INTEGER REFERENCES users(id),
  evaluated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(exam_id, student_id)
);

-- 29. CAMPUS: LIBRARY MANAGEMENT
CREATE TABLE IF NOT EXISTS library_books (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  isbn TEXT,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  category TEXT NOT NULL,
  publisher TEXT,
  edition TEXT,
  total_copies INTEGER DEFAULT 1,
  available_copies INTEGER DEFAULT 1,
  rack_location TEXT,
  status TEXT DEFAULT 'AVAILABLE' CHECK(status IN ('AVAILABLE', 'OUT_OF_STOCK', 'ARCHIVED')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS library_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  book_id INTEGER NOT NULL REFERENCES library_books(id) ON DELETE CASCADE,
  student_id INTEGER REFERENCES students(id) ON DELETE SET NULL,
  teacher_id INTEGER REFERENCES teachers(id) ON DELETE SET NULL,
  borrower_type TEXT DEFAULT 'STUDENT' CHECK(borrower_type IN ('STUDENT', 'STAFF')),
  issue_date DATE NOT NULL,
  due_date DATE NOT NULL,
  return_date DATE,
  fine_amount REAL DEFAULT 0.0,
  status TEXT DEFAULT 'ISSUED' CHECK(status IN ('ISSUED', 'RETURNED', 'OVERDUE', 'LOST')),
  remarks TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 30. CAMPUS: INVENTORY MANAGEMENT
CREATE TABLE IF NOT EXISTS inventory_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  quantity_in_stock INTEGER NOT NULL DEFAULT 0,
  unit TEXT DEFAULT 'units',
  min_stock_level INTEGER DEFAULT 5,
  unit_price REAL DEFAULT 0.0,
  supplier_name TEXT,
  status TEXT DEFAULT 'IN_STOCK' CHECK(status IN ('IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS inventory_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id INTEGER NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK(transaction_type IN ('PURCHASE', 'ISSUE', 'RETURN', 'ADJUSTMENT')),
  quantity INTEGER NOT NULL,
  issued_to TEXT,
  department TEXT,
  transaction_date DATE NOT NULL,
  remarks TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 31. CAMPUS: VISITOR MANAGEMENT
CREATE TABLE IF NOT EXISTS visitors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  visitor_name TEXT NOT NULL,
  mobile TEXT NOT NULL,
  purpose TEXT NOT NULL,
  whom_to_meet TEXT NOT NULL,
  entry_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  exit_time DATETIME,
  id_proof_type TEXT,
  id_proof_number TEXT,
  pass_number TEXT UNIQUE,
  status TEXT DEFAULT 'CHECKED_IN' CHECK(status IN ('CHECKED_IN', 'CHECKED_OUT', 'REJECTED')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 32. CAMPUS: HOSTEL MANAGEMENT
CREATE TABLE IF NOT EXISTS hostels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT CHECK(type IN ('BOYS', 'GIRLS', 'STAFF')),
  warden_name TEXT,
  warden_contact TEXT,
  total_rooms INTEGER DEFAULT 20,
  address TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS hostel_rooms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hostel_id INTEGER NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
  room_number TEXT NOT NULL,
  capacity INTEGER DEFAULT 2,
  occupied INTEGER DEFAULT 0,
  floor_number INTEGER DEFAULT 1,
  status TEXT DEFAULT 'AVAILABLE' CHECK(status IN ('AVAILABLE', 'FULL', 'MAINTENANCE')),
  UNIQUE(hostel_id, room_number)
);

CREATE TABLE IF NOT EXISTS hostel_allocations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id INTEGER NOT NULL REFERENCES hostel_rooms(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL UNIQUE REFERENCES students(id) ON DELETE CASCADE,
  allocation_date DATE NOT NULL,
  checkout_date DATE,
  fee_per_term REAL DEFAULT 15000.0,
  status TEXT DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'CHECKED_OUT')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 33. HR & STAFF MANAGEMENT: ATTENDANCE, LEAVE, PAYROLL & EVALUATIONS
CREATE TABLE IF NOT EXISTS staff_attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  teacher_id INTEGER NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'ON_DUTY')),
  check_in_time TEXT,
  check_out_time TEXT,
  remarks TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(teacher_id, date)
);

CREATE TABLE IF NOT EXISTS staff_leaves (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  teacher_id INTEGER NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  leave_type TEXT NOT NULL CHECK(leave_type IN ('CASUAL', 'SICK', 'EARNED', 'MATERNITY', 'UNPAID')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'APPROVED', 'REJECTED')),
  reviewed_by INTEGER REFERENCES users(id),
  reviewed_at DATETIME,
  rejection_reason TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS salary_structures (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  teacher_id INTEGER NOT NULL UNIQUE REFERENCES teachers(id) ON DELETE CASCADE,
  basic_salary REAL NOT NULL,
  hra REAL DEFAULT 0.0,
  da REAL DEFAULT 0.0,
  special_allowance REAL DEFAULT 0.0,
  provident_fund REAL DEFAULT 0.0,
  tax_deduction REAL DEFAULT 0.0,
  net_salary REAL NOT NULL,
  currency TEXT DEFAULT 'INR',
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payroll_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  teacher_id INTEGER NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  month_year TEXT NOT NULL,
  basic_salary REAL NOT NULL,
  allowances REAL NOT NULL,
  deductions REAL NOT NULL,
  net_amount REAL NOT NULL,
  payment_status TEXT DEFAULT 'PAID' CHECK(payment_status IN ('PENDING', 'PROCESSED', 'PAID')),
  payment_date DATE,
  payment_mode TEXT DEFAULT 'BANK_TRANSFER',
  payslip_ref TEXT UNIQUE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(teacher_id, month_year)
);

CREATE TABLE IF NOT EXISTS staff_evaluations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  teacher_id INTEGER NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  evaluation_period TEXT NOT NULL,
  evaluator_name TEXT NOT NULL,
  subject_mastery_rating INTEGER CHECK(subject_mastery_rating BETWEEN 1 AND 5),
  classroom_management_rating INTEGER CHECK(classroom_management_rating BETWEEN 1 AND 5),
  student_engagement_rating INTEGER CHECK(student_engagement_rating BETWEEN 1 AND 5),
  overall_score REAL NOT NULL,
  comments TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 34. AI INTELLIGENCE & CONVERSATION LOGS
CREATE TABLE IF NOT EXISTS ai_query_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  user_role TEXT NOT NULL,
  query_text TEXT NOT NULL,
  response_summary TEXT,
  scope_entity_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 35. CONFIGURABLE MODULE SETTINGS & MULTI-CAMPUS
CREATE TABLE IF NOT EXISTS module_configurations (
  id INTEGER PRIMARY KEY CHECK(id = 1),
  library_enabled INTEGER DEFAULT 1,
  inventory_enabled INTEGER DEFAULT 1,
  hostel_enabled INTEGER DEFAULT 1,
  transport_enabled INTEGER DEFAULT 1,
  hr_enabled INTEGER DEFAULT 1,
  payroll_enabled INTEGER DEFAULT 1,
  ai_assistant_enabled INTEGER DEFAULT 1,
  online_exams_enabled INTEGER DEFAULT 1,
  visitors_enabled INTEGER DEFAULT 1,
  multi_campus_enabled INTEGER DEFAULT 1,
  active_campus_name TEXT DEFAULT 'Rex Senior Secondary Main Campus, Ootacamund',
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- INDEXES for Maximum Query Performance & Referential Integrity
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_mobile ON users(mobile);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_students_admission ON students(admission_no);
CREATE INDEX IF NOT EXISTS idx_students_class_section ON students(class_id, section_id);
CREATE INDEX IF NOT EXISTS idx_students_parent ON students(parent_id);
CREATE INDEX IF NOT EXISTS idx_teachers_mobile ON teachers(mobile);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON attendance(student_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_class_date ON attendance(class_id, section_id, date);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(event_date);
CREATE INDEX IF NOT EXISTS idx_notifications_target ON notifications(target_audience, target_class_id);
CREATE INDEX IF NOT EXISTS idx_notification_recipients_user ON notification_recipients(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_otp_mobile ON otp_verifications(mobile, verified);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_sms_logs_recipient ON sms_logs(recipient);
CREATE INDEX IF NOT EXISTS idx_sms_logs_created ON sms_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_homework_class_section ON homework(class_id, section_id, due_date);
CREATE INDEX IF NOT EXISTS idx_homework_submissions_student ON homework_submissions(student_id, homework_id);
CREATE INDEX IF NOT EXISTS idx_fee_payments_student ON fee_payments(student_id);
CREATE INDEX IF NOT EXISTS idx_student_transport_student ON student_transport_assignments(student_id);
CREATE INDEX IF NOT EXISTS idx_admissions_status ON admissions(status);
CREATE INDEX IF NOT EXISTS idx_library_books_cat ON library_books(category);
CREATE INDEX IF NOT EXISTS idx_library_trans_student ON library_transactions(student_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_code ON inventory_items(item_code);
CREATE INDEX IF NOT EXISTS idx_visitors_status ON visitors(status);
CREATE INDEX IF NOT EXISTS idx_staff_att_date ON staff_attendance(teacher_id, date);
CREATE INDEX IF NOT EXISTS idx_payroll_rec_teacher ON payroll_records(teacher_id, month_year);


