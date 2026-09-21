/**
 * NeverSkip School ERP - Seed Data & LocalStorage Repository
 */

const SEED_SCHOOL_INFO = {
  name: "Rex Senior Secondary School",
  fullName: "Christus Rex Senior Secondary School",
  shortName: "Rex SSS",
  tagline: "Virtus Scientia Character • Ootacamund",
  affiliation: "Affiliated to CBSE, New Delhi (Affiliation No: 1930142)",
  address: "Coonoor Road, Ootacamund (Ooty), The Nilgiris, Tamil Nadu - 643001",
  phone: "+91 423 244 2356",
  email: "principal@rexschoolooty.edu.in",
  academicYear: "2026 - 2027",
  principal: "Rev. Fr. Principal, M.A., B.Ed.",
  currency: "₹",
  logo: "assets/logo.png"
};

const SEED_STUDENTS = [
  {
    id: "STU-1001",
    name: "Aarav Sharma",
    rollNo: "10A-01",
    grade: "10",
    section: "A",
    gender: "Male",
    dob: "2011-04-14",
    bloodGroup: "O+",
    parentName: "Rajesh Sharma",
    parentPhone: "+91 98765 43210",
    parentEmail: "rajesh.sharma@gmail.com",
    address: "42, Shivalik Enclave, New Delhi",
    admissionDate: "2018-06-10",
    status: "Active",
    feeStatus: "Paid",
    feesTotal: 54000,
    feesPaid: 54000,
    attendanceRate: 96,
    busRoute: "Route 04 (Stop: Saket Metro)",
    medicalNotes: "Mild asthma, carry inhaler",
    avatarColor: "#3b82f6"
  },
  {
    id: "STU-1002",
    name: "Ananya Iyer",
    rollNo: "10A-02",
    grade: "10",
    section: "A",
    gender: "Female",
    dob: "2011-08-22",
    bloodGroup: "B+",
    parentName: "Suresh Iyer",
    parentPhone: "+91 98451 23456",
    parentEmail: "suresh.iyer@outlook.com",
    address: "15B, Greater Kailash-I, New Delhi",
    admissionDate: "2018-06-12",
    status: "Active",
    feeStatus: "Paid",
    feesTotal: 54000,
    feesPaid: 54000,
    attendanceRate: 98,
    busRoute: "Route 02 (Stop: GK-1 M-Block)",
    medicalNotes: "No allergies reported",
    avatarColor: "#8b5cf6"
  },
  {
    id: "STU-1003",
    name: "Rohan Verma",
    rollNo: "10A-03",
    grade: "10",
    section: "A",
    gender: "Male",
    dob: "2010-12-05",
    bloodGroup: "A+",
    parentName: "Vikram Verma",
    parentPhone: "+91 99100 87654",
    parentEmail: "v.verma@yahoo.com",
    address: "78, Panchsheel Park, New Delhi",
    admissionDate: "2019-04-05",
    status: "Active",
    feeStatus: "Partial",
    feesTotal: 54000,
    feesPaid: 35000,
    attendanceRate: 88,
    busRoute: "Route 06 (Stop: Siri Fort)",
    medicalNotes: "Peanut allergy",
    avatarColor: "#10b981"
  },
  {
    id: "STU-1004",
    name: "Priya Nair",
    rollNo: "10A-04",
    grade: "10",
    section: "A",
    gender: "Female",
    dob: "2011-03-18",
    bloodGroup: "AB+",
    parentName: "Manoj Nair",
    parentPhone: "+91 98200 11223",
    parentEmail: "manoj.nair@tcs.com",
    address: "102, Gulmohar Park, New Delhi",
    admissionDate: "2018-06-10",
    status: "Active",
    feeStatus: "Paid",
    feesTotal: 54000,
    feesPaid: 54000,
    attendanceRate: 95,
    busRoute: "Route 04 (Stop: Green Park)",
    medicalNotes: "Wears corrective glasses",
    avatarColor: "#f59e0b"
  },
  {
    id: "STU-1005",
    name: "Kabir Khan",
    rollNo: "10A-05",
    grade: "10",
    section: "A",
    gender: "Male",
    dob: "2011-01-30",
    bloodGroup: "O-",
    parentName: "Imran Khan",
    parentPhone: "+91 98711 99887",
    parentEmail: "imran.k@infotech.in",
    address: "22A, Defence Colony, New Delhi",
    admissionDate: "2020-07-15",
    status: "Active",
    feeStatus: "Overdue",
    feesTotal: 54000,
    feesPaid: 20000,
    attendanceRate: 84,
    busRoute: "Private Transport",
    medicalNotes: "None",
    avatarColor: "#ef4444"
  },
  {
    id: "STU-1006",
    name: "Diya Patel",
    rollNo: "10A-06",
    grade: "10",
    section: "A",
    gender: "Female",
    dob: "2011-07-11",
    bloodGroup: "A-",
    parentName: "Bhavesh Patel",
    parentPhone: "+91 98112 33445",
    parentEmail: "bhavesh.patel@rediff.com",
    address: "88, Hauz Khas Enclave, New Delhi",
    admissionDate: "2018-06-10",
    status: "Active",
    feeStatus: "Paid",
    feesTotal: 54000,
    feesPaid: 54000,
    attendanceRate: 97,
    busRoute: "Route 04 (Stop: Hauz Khas)",
    medicalNotes: "None",
    avatarColor: "#06b6d4"
  },
  {
    id: "STU-1007",
    name: "Siddharth Malhotra",
    rollNo: "10A-07",
    grade: "10",
    section: "A",
    gender: "Male",
    dob: "2010-10-15",
    bloodGroup: "B-",
    parentName: "Sunil Malhotra",
    parentPhone: "+91 98990 44556",
    parentEmail: "sunil.m@gmail.com",
    address: "55, Vasant Vihar, New Delhi",
    admissionDate: "2019-04-01",
    status: "Active",
    feeStatus: "Paid",
    feesTotal: 54000,
    feesPaid: 54000,
    attendanceRate: 91,
    busRoute: "Route 01 (Stop: Vasant Vihar)",
    medicalNotes: "Lactose intolerant",
    avatarColor: "#4f46e5"
  },
  {
    id: "STU-1008",
    name: "Tanvi Joshi",
    rollNo: "10A-08",
    grade: "10",
    section: "A",
    gender: "Female",
    dob: "2011-09-03",
    bloodGroup: "O+",
    parentName: "Prakash Joshi",
    parentPhone: "+91 97170 55667",
    parentEmail: "prakash.joshi@wipro.com",
    address: "12, Anand Lok, New Delhi",
    admissionDate: "2018-06-10",
    status: "Active",
    feeStatus: "Paid",
    feesTotal: 54000,
    feesPaid: 54000,
    attendanceRate: 94,
    busRoute: "Route 06 (Stop: Andrews Ganj)",
    medicalNotes: "None",
    avatarColor: "#ec4899"
  },
  {
    id: "STU-1009",
    name: "Aryan Gupta",
    rollNo: "10A-09",
    grade: "10",
    section: "A",
    gender: "Male",
    dob: "2010-11-20",
    bloodGroup: "A+",
    parentName: "Deepak Gupta",
    parentPhone: "+91 98101 66778",
    parentEmail: "deepak.gupta@delhi.gov.in",
    address: "34, South Extension Part II, New Delhi",
    admissionDate: "2018-06-10",
    status: "Active",
    feeStatus: "Partial",
    feesTotal: 54000,
    feesPaid: 42000,
    attendanceRate: 89,
    busRoute: "Route 02 (Stop: South Ext)",
    medicalNotes: "None",
    avatarColor: "#14b8a6"
  },
  {
    id: "STU-1010",
    name: "Meera Sen",
    rollNo: "10A-10",
    grade: "10",
    section: "A",
    gender: "Female",
    dob: "2011-05-19",
    bloodGroup: "B+",
    parentName: "Amit Sen",
    parentPhone: "+91 99580 77889",
    parentEmail: "amit.sen@delhiuniversity.ac.in",
    address: "67, Golf Links, New Delhi",
    admissionDate: "2021-04-10",
    status: "Active",
    feeStatus: "Paid",
    feesTotal: 54000,
    feesPaid: 54000,
    attendanceRate: 99,
    busRoute: "Private Transport",
    medicalNotes: "None",
    avatarColor: "#f97316"
  },
  {
    id: "STU-1011",
    name: "Ishaan Reddy",
    rollNo: "10B-01",
    grade: "10",
    section: "B",
    gender: "Male",
    dob: "2010-09-14",
    bloodGroup: "O+",
    parentName: "K.V. Reddy",
    parentPhone: "+91 98490 12345",
    parentEmail: "kvreddy@hyderabad.biz",
    address: "9, Jor Bagh, New Delhi",
    admissionDate: "2019-06-01",
    status: "Active",
    feeStatus: "Paid",
    feesTotal: 54000,
    feesPaid: 54000,
    attendanceRate: 92,
    busRoute: "Route 05 (Stop: Lodhi Road)",
    medicalNotes: "None",
    avatarColor: "#0284c7"
  },
  {
    id: "STU-1012",
    name: "Kavya Choudhury",
    rollNo: "10B-02",
    grade: "10",
    section: "B",
    gender: "Female",
    dob: "2011-02-28",
    bloodGroup: "AB-",
    parentName: "Debashis Choudhury",
    parentPhone: "+91 98111 88990",
    parentEmail: "d.choudhury@ongc.co.in",
    address: "104, Chanakyapuri, New Delhi",
    admissionDate: "2018-06-10",
    status: "Active",
    feeStatus: "Paid",
    feesTotal: 54000,
    feesPaid: 54000,
    attendanceRate: 96,
    busRoute: "Route 01 (Stop: Shanti Path)",
    medicalNotes: "None",
    avatarColor: "#a855f7"
  }
];

const SEED_ATTENDANCE_TODAY = {
  date: "2026-09-21",
  "10-A": {
    "STU-1001": "P",
    "STU-1002": "P",
    "STU-1003": "A",
    "STU-1004": "P",
    "STU-1005": "A",
    "STU-1006": "P",
    "STU-1007": "L",
    "STU-1008": "P",
    "STU-1009": "P",
    "STU-1010": "P"
  },
  "10-B": {
    "STU-1011": "P",
    "STU-1012": "P"
  }
};

const SEED_EXAM_RESULTS = {
  "Mid-Term 2026": {
    "STU-1001": {
      subjects: [
        { name: "Mathematics", maxMarks: 100, marksObtained: 94, grade: "A1" },
        { name: "Science", maxMarks: 100, marksObtained: 91, grade: "A1" },
        { name: "English Language", maxMarks: 100, marksObtained: 88, grade: "A2" },
        { name: "Social Science", maxMarks: 100, marksObtained: 92, grade: "A1" },
        { name: "Computer Applications", maxMarks: 100, marksObtained: 98, grade: "A1" },
        { name: "Hindi / 2nd Lang", maxMarks: 100, marksObtained: 85, grade: "A2" }
      ],
      remarks: "Outstanding academic performance. Shows high aptitude for STEM subjects.",
      rank: 2,
      classTeacher: "Mrs. Sunita Rao"
    },
    "STU-1002": {
      subjects: [
        { name: "Mathematics", maxMarks: 100, marksObtained: 98, grade: "A1" },
        { name: "Science", maxMarks: 100, marksObtained: 95, grade: "A1" },
        { name: "English Language", maxMarks: 100, marksObtained: 92, grade: "A1" },
        { name: "Social Science", maxMarks: 100, marksObtained: 94, grade: "A1" },
        { name: "Computer Applications", maxMarks: 100, marksObtained: 96, grade: "A1" },
        { name: "Hindi / 2nd Lang", maxMarks: 100, marksObtained: 89, grade: "A2" }
      ],
      remarks: "Exceptional dedication and leadership in class. Ranked #1 in Grade 10-A.",
      rank: 1,
      classTeacher: "Mrs. Sunita Rao"
    },
    "STU-1003": {
      subjects: [
        { name: "Mathematics", maxMarks: 100, marksObtained: 72, grade: "B1" },
        { name: "Science", maxMarks: 100, marksObtained: 68, grade: "B2" },
        { name: "English Language", maxMarks: 100, marksObtained: 75, grade: "B1" },
        { name: "Social Science", maxMarks: 100, marksObtained: 70, grade: "B1" },
        { name: "Computer Applications", maxMarks: 100, marksObtained: 82, grade: "A2" },
        { name: "Hindi / 2nd Lang", maxMarks: 100, marksObtained: 65, grade: "C1" }
      ],
      remarks: "Good potential. Needs regular practice in Mathematics and Science numericals.",
      rank: 7,
      classTeacher: "Mrs. Sunita Rao"
    }
  }
};

const SEED_TIMETABLE_10A = {
  Monday: [
    { period: 1, time: "08:00 - 08:45", subject: "Mathematics", teacher: "Mr. R.K. Sharma", room: "Room 204", type: "subject-math" },
    { period: 2, time: "08:45 - 09:30", subject: "Science (Physics)", teacher: "Dr. Anita Desai", room: "Physics Lab", type: "subject-science" },
    { period: 3, time: "09:30 - 10:15", subject: "English Literature", teacher: "Mrs. Sunita Rao", room: "Room 204", type: "subject-english" },
    { period: 4, time: "10:15 - 10:45", subject: "Short Break", teacher: "-", room: "Courtyard", type: "subject-break" },
    { period: 5, time: "10:45 - 11:30", subject: "Social Science", teacher: "Mr. Vivek Nanda", room: "Room 204", type: "subject-social" },
    { period: 6, time: "11:30 - 12:15", subject: "Computer Apps", teacher: "Ms. Shalini Gupta", room: "Computer Lab 1", type: "subject-computer" },
    { period: 7, time: "12:15 - 01:00", subject: "Physical Education", teacher: "Coach Vikram", room: "Sports Ground", type: "subject-sports" },
    { period: 8, time: "01:00 - 01:45", subject: "Library / Remedial", teacher: "Mrs. M. Kapoor", room: "Central Library", type: "subject-english" }
  ],
  Tuesday: [
    { period: 1, time: "08:00 - 08:45", subject: "Science (Chemistry)", teacher: "Dr. Anita Desai", room: "Chemistry Lab", type: "subject-science" },
    { period: 2, time: "08:45 - 09:30", subject: "Mathematics", teacher: "Mr. R.K. Sharma", room: "Room 204", type: "subject-math" },
    { period: 3, time: "09:30 - 10:15", subject: "Social Science", teacher: "Mr. Vivek Nanda", room: "Room 204", type: "subject-social" },
    { period: 4, time: "10:15 - 10:45", subject: "Short Break", teacher: "-", room: "Courtyard", type: "subject-break" },
    { period: 5, time: "10:45 - 11:30", subject: "English Language", teacher: "Mrs. Sunita Rao", room: "Room 204", type: "subject-english" },
    { period: 6, time: "11:30 - 12:15", subject: "Hindi / 2nd Lang", teacher: "Mr. S.P. Tiwari", room: "Room 204", type: "subject-social" },
    { period: 7, time: "12:15 - 01:00", subject: "Mathematics", teacher: "Mr. R.K. Sharma", room: "Room 204", type: "subject-math" },
    { period: 8, time: "01:00 - 01:45", subject: "Art & Culture", teacher: "Ms. Neha Sinha", room: "Art Studio", type: "subject-break" }
  ]
};

const SEED_CIRCULARS = [
  {
    id: "CIR-2026-042",
    title: "Monsoon Weather Advisory: Nilgiris District Alert",
    date: "2026-09-20",
    category: "Emergency",
    priority: "High",
    author: "Principal's Office",
    summary: "In accordance with the Nilgiris District Collector advisory on ghat rainfall, school bus routes on Coonoor-Ooty lines will operate with 15-minute staggered departures. Parents can track live bus GPS via Rex SSS Portal.",
    target: "All Parents & Staff"
  },
  {
    id: "CIR-2026-041",
    title: "Annual Christus Rex Science & Botanical Expo 2026",
    date: "2026-09-18",
    category: "Academic",
    priority: "Normal",
    author: "Science Dept",
    summary: "Students from Grades 8-12 are invited to register their working robotics, botanical ecology, and clean energy projects for the upcoming Annual Science Exhibition.",
    target: "Grades 8 to 12"
  },
  {
    id: "CIR-2026-040",
    title: "Quarter 2 Fee Clearance Notice",
    date: "2026-09-15",
    category: "Finance",
    priority: "Medium",
    author: "Accounts Dept",
    summary: "Parents are kindly requested to complete Q2 tuition and transport fee clearance before September 30, 2026. Secure online payment is available via the Rex Senior Secondary School portal.",
    target: "All Parents"
  }
];

const SEED_WHATSAPP_TEMPLATES = [
  {
    id: "tpl-absent",
    title: "Daily Absentee Alert",
    category: "Attendance",
    content: "Dear Parent, your ward {student_name} (Roll: {roll_no}, Class: {class_sec}) is marked ABSENT today ({date}). If this is unexpected, kindly contact the school office at +91 423 244 2356 immediately. - Rex Senior Secondary School, Ootacamund"
  },
  {
    id: "tpl-fee",
    title: "Fee Reminder Alert",
    category: "Finance",
    content: "Dear {parent_name}, gentle reminder: Q2 tuition fee of ₹{amount_due} for {student_name} ({roll_no}) is due on {due_date}. Pay securely on the Rex Senior Secondary School portal: {portal_link} - Rex SSS Accounts"
  },
  {
    id: "tpl-exam",
    title: "Exam Report Card Available",
    category: "Academics",
    content: "Dear {parent_name}, Mid-Term 2026 results for {student_name} have been published. Aggregate Score: {score}%. You can download the official CBSE signed report card on your Rex SSS Parent App."
  },
  {
    id: "tpl-bus",
    title: "School Bus Delay Alert",
    category: "Transport",
    content: "Notice to parents on {bus_route}: School bus is experiencing a 15-minute delay due to Nilgiris mist and ghat road traffic. Real-time GPS tracking is active on your Rex SSS app."
  }
];

// LocalStorage Manager
const ERPStorage = {
  KEYS: {
    STUDENTS: 'neverskip_students',
    ATTENDANCE: 'neverskip_attendance',
    EXAMS: 'neverskip_exams',
    TIMETABLE: 'neverskip_timetable',
    CIRCULARS: 'neverskip_circulars',
    THEME: 'neverskip_theme',
    CURRENT_ROLE: 'neverskip_role',
    ACTIVITY_LOG: 'neverskip_activity'
  },

  init() {
    if (!localStorage.getItem(this.KEYS.STUDENTS) || localStorage.getItem('rex_school_v2') !== 'true') {
      this.resetAll();
      localStorage.setItem('rex_school_v2', 'true');
    }
  },

  getSchoolInfo() {
    return SEED_SCHOOL_INFO;
  },

  resetAll() {
    localStorage.setItem(this.KEYS.STUDENTS, JSON.stringify(SEED_STUDENTS));
    localStorage.setItem(this.KEYS.ATTENDANCE, JSON.stringify(SEED_ATTENDANCE_TODAY));
    localStorage.setItem(this.KEYS.EXAMS, JSON.stringify(SEED_EXAM_RESULTS));
    localStorage.setItem(this.KEYS.TIMETABLE, JSON.stringify(SEED_TIMETABLE_10A));
    localStorage.setItem(this.KEYS.CIRCULARS, JSON.stringify(SEED_CIRCULARS));
    localStorage.setItem(this.KEYS.CURRENT_ROLE, 'admin');
    localStorage.setItem(this.KEYS.ACTIVITY_LOG, JSON.stringify([
      { time: "08:15 AM", text: "Morning attendance marked for Grade 10-A by Mrs. Sunita Rao" },
      { time: "09:30 AM", text: "Fee payment of ₹54,000 received for Aarav Sharma (Receipt #REC-8842)" },
      { time: "10:10 AM", text: "WhatsApp absence alert dispatched to 2 student guardians via Rex SSS Gateway" },
      { time: "11:00 AM", text: "Circular CIR-2026-042 (Nilgiris Advisory) published to all parents" }
    ]));
  },

  getStudents() {
    return JSON.parse(localStorage.getItem(this.KEYS.STUDENTS) || '[]');
  },

  saveStudents(students) {
    localStorage.setItem(this.KEYS.STUDENTS, JSON.stringify(students));
  },

  getAttendance() {
    return JSON.parse(localStorage.getItem(this.KEYS.ATTENDANCE) || '{}');
  },

  saveAttendance(att) {
    localStorage.setItem(this.KEYS.ATTENDANCE, JSON.stringify(att));
  },

  getExams() {
    return JSON.parse(localStorage.getItem(this.KEYS.EXAMS) || '{}');
  },

  saveExams(exams) {
    localStorage.setItem(this.KEYS.EXAMS, JSON.stringify(exams));
  },

  getCirculars() {
    return JSON.parse(localStorage.getItem(this.KEYS.CIRCULARS) || '[]');
  },

  saveCirculars(circs) {
    localStorage.setItem(this.KEYS.CIRCULARS, JSON.stringify(circs));
  },

  getTimetable() {
    return JSON.parse(localStorage.getItem(this.KEYS.TIMETABLE) || '{}');
  },

  saveTimetable(tt) {
    localStorage.setItem(this.KEYS.TIMETABLE, JSON.stringify(tt));
  },

  getRole() {
    return localStorage.getItem(this.KEYS.CURRENT_ROLE) || 'admin';
  },

  setRole(role) {
    localStorage.setItem(this.KEYS.CURRENT_ROLE, role);
  },

  getActivity() {
    return JSON.parse(localStorage.getItem(this.KEYS.ACTIVITY_LOG) || '[]');
  },

  addActivity(text) {
    const logs = this.getActivity();
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    logs.unshift({ time: timeStr, text });
    if (logs.length > 20) logs.pop();
    localStorage.setItem(this.KEYS.ACTIVITY_LOG, JSON.stringify(logs));
  }
};
