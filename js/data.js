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

// Seed Data for GPS School Bus Routes (With 500m Geofencing & Morning/Evening Schedules)
const SEED_BUS_ROUTES = [
  {
    id: "route-02",
    routeNumber: "Route 02",
    name: "Coonoor Road - Charing Cross - Rex SSS",
    vehicleNo: "TN-43-A-2104",
    model: "Tata Starbus Ultra (40-Seater GPS Smart Fleet)",
    driverName: "Joseph Selvaraj",
    driverPhone: "+91 94432 10045",
    driverLicense: "TN43 20140003829",
    attendantName: "K. Mariyammal",
    attendantPhone: "+91 94881 22910",
    speed: 34,
    status: "In Transit",
    currentLocationName: "Approaching Charing Cross Junction",
    distanceToStudentStop: 480, // meters - within 500m geofence!
    studentStop: "Charring Cross Junction (Nilgiris Library)",
    studentAssigned: "Aarav Sharma (10A-01)",
    morning: {
      title: "Morning Pickup Schedule",
      departs: "07:15 AM",
      destination: "Rex Senior Secondary School (08:15 AM)",
      currentStopIndex: 3,
      stops: [
        { name: "Coonoor Bus Stand", time: "07:15 AM", status: "passed", distanceMeters: 5200 },
        { name: "Wellington Barracks", time: "07:30 AM", status: "passed", distanceMeters: 3800 },
        { name: "Aruvankadu Junction", time: "07:42 AM", status: "passed", distanceMeters: 2100 },
        { name: "Charring Cross Junction", time: "07:58 AM", status: "approaching", distanceMeters: 480, isStudentStop: true },
        { name: "Rex SSS Campus Main Gate", time: "08:15 AM", status: "pending", distanceMeters: 0 }
      ]
    },
    evening: {
      title: "Evening Drop-off Schedule",
      departs: "03:45 PM",
      destination: "Coonoor Stand (04:45 PM)",
      currentStopIndex: 1,
      stops: [
        { name: "Rex SSS Campus Main Gate", time: "03:45 PM", status: "passed", distanceMeters: 0 },
        { name: "Charring Cross Junction", time: "04:02 PM", status: "approaching", distanceMeters: 480, isStudentStop: true },
        { name: "Aruvankadu Junction", time: "04:18 PM", status: "pending", distanceMeters: 2100 },
        { name: "Wellington Barracks", time: "04:30 PM", status: "pending", distanceMeters: 3800 },
        { name: "Coonoor Bus Stand", time: "04:45 PM", status: "pending", distanceMeters: 5200 }
      ]
    }
  },
  {
    id: "route-01",
    routeNumber: "Route 01",
    name: "Ooty Town - Botanical Garden - Rex SSS",
    vehicleNo: "TN-43-A-1980",
    model: "Ashok Leyland Sunshine (34-Seater)",
    driverName: "M. Ramanathan",
    driverPhone: "+91 94420 55102",
    driverLicense: "TN43 20120008812",
    attendantName: "S. Vasantha",
    attendantPhone: "+91 94862 33119",
    speed: 28,
    status: "In Transit",
    currentLocationName: "Near Botanical Garden Main Gate",
    distanceToStudentStop: 1200,
    studentStop: "Commercial Road Post Office",
    morning: {
      title: "Morning Pickup Schedule",
      departs: "07:30 AM",
      destination: "Rex SSS Campus (08:15 AM)",
      currentStopIndex: 1,
      stops: [
        { name: "Kandal Market", time: "07:30 AM", status: "passed", distanceMeters: 4200 },
        { name: "Botanical Garden Road", time: "07:45 AM", status: "approaching", distanceMeters: 1200 },
        { name: "Commercial Road Post Office", time: "07:55 AM", status: "pending", distanceMeters: 800, isStudentStop: true },
        { name: "Rex SSS Campus Main Gate", time: "08:15 AM", status: "pending", distanceMeters: 0 }
      ]
    },
    evening: {
      title: "Evening Drop-off Schedule",
      departs: "03:45 PM",
      destination: "Kandal Market (04:30 PM)",
      currentStopIndex: 1,
      stops: [
        { name: "Rex SSS Campus Main Gate", time: "03:45 PM", status: "passed", distanceMeters: 0 },
        { name: "Commercial Road Post Office", time: "04:05 PM", status: "pending", distanceMeters: 800, isStudentStop: true },
        { name: "Botanical Garden Road", time: "04:15 PM", status: "pending", distanceMeters: 1200 },
        { name: "Kandal Market", time: "04:30 PM", status: "pending", distanceMeters: 4200 }
      ]
    }
  },
  {
    id: "route-03",
    routeNumber: "Route 03",
    name: "Lovedale - Fernhill - Fingerpost - Rex SSS",
    vehicleNo: "TN-43-B-3341",
    model: "Force Traveller 26-Seater Special Hill Cruiser",
    driverName: "Anthony Das",
    driverPhone: "+91 98421 77334",
    driverLicense: "TN43 20150001923",
    attendantName: "R. Jayanthi",
    attendantPhone: "+91 94890 11843",
    speed: 35,
    status: "In Transit",
    currentLocationName: "Near Fernhill Palace Gate",
    distanceToStudentStop: 2400,
    studentStop: "Fingerpost Circle",
    morning: {
      title: "Morning Pickup Schedule",
      departs: "07:20 AM",
      destination: "Rex SSS Campus (08:15 AM)",
      currentStopIndex: 1,
      stops: [
        { name: "Lovedale Station", time: "07:20 AM", status: "passed", distanceMeters: 6100 },
        { name: "Fernhill Junction", time: "07:35 AM", status: "approaching", distanceMeters: 2400 },
        { name: "Fingerpost Circle", time: "07:52 AM", status: "pending", distanceMeters: 1500, isStudentStop: true },
        { name: "Rex SSS Campus Main Gate", time: "08:15 AM", status: "pending", distanceMeters: 0 }
      ]
    },
    evening: {
      title: "Evening Drop-off Schedule",
      departs: "03:45 PM",
      destination: "Lovedale Station (04:40 PM)",
      currentStopIndex: 1,
      stops: [
        { name: "Rex SSS Campus Main Gate", time: "03:45 PM", status: "passed", distanceMeters: 0 },
        { name: "Fingerpost Circle", time: "04:08 PM", status: "pending", distanceMeters: 1500, isStudentStop: true },
        { name: "Fernhill Junction", time: "04:22 PM", status: "pending", distanceMeters: 2400 },
        { name: "Lovedale Station", time: "04:40 PM", status: "pending", distanceMeters: 6100 }
      ]
    }
  },
  {
    id: "route-04",
    routeNumber: "Route 04",
    name: "Kotagiri Ghat Road - Dodabetta - Rex SSS",
    vehicleNo: "TN-43-A-4490",
    model: "SML Isuzu Executive 42-Seater",
    driverName: "C. Subramaniam",
    driverPhone: "+91 94425 88190",
    driverLicense: "TN43 20110004512",
    attendantName: "M. Kavitha",
    attendantPhone: "+91 94877 66201",
    speed: 30,
    status: "In Transit",
    currentLocationName: "Dodabetta Tea Factory Crossing",
    distanceToStudentStop: 3100,
    studentStop: "Snowdon Road Crossing",
    morning: {
      title: "Morning Pickup Schedule",
      departs: "07:10 AM",
      destination: "Rex SSS Campus (08:15 AM)",
      currentStopIndex: 1,
      stops: [
        { name: "Ketti Valley View", time: "07:10 AM", status: "passed", distanceMeters: 7400 },
        { name: "Dodabetta Crossing", time: "07:32 AM", status: "approaching", distanceMeters: 3100 },
        { name: "Snowdon Road Crossing", time: "07:50 AM", status: "pending", distanceMeters: 1200, isStudentStop: true },
        { name: "Rex SSS Campus Main Gate", time: "08:15 AM", status: "pending", distanceMeters: 0 }
      ]
    },
    evening: {
      title: "Evening Drop-off Schedule",
      departs: "03:45 PM",
      destination: "Ketti Valley View (04:50 PM)",
      currentStopIndex: 1,
      stops: [
        { name: "Rex SSS Campus Main Gate", time: "03:45 PM", status: "passed", distanceMeters: 0 },
        { name: "Snowdon Road Crossing", time: "04:10 PM", status: "pending", distanceMeters: 1200, isStudentStop: true },
        { name: "Dodabetta Crossing", time: "04:28 PM", status: "pending", distanceMeters: 3100 },
        { name: "Ketti Valley View", time: "04:50 PM", status: "pending", distanceMeters: 7400 }
      ]
    }
  }
];

// Seed Data for Digital Homework & Daily Diary
const SEED_HOMEWORK = [
  {
    id: "hw-101",
    subject: "Mathematics",
    grade: "10-A",
    teacher: "Mr. Amit Sen",
    title: "Exercise 4.2: Quadratic Equations",
    description: "Solve Questions 3 to 10 from NCERT Textbook in class workbook. Show factorization and discriminant checks.",
    assignedDate: "2026-09-22",
    dueDate: "2026-09-24",
    status: "Pending",
    priority: "High"
  },
  {
    id: "hw-102",
    subject: "Science (Physics)",
    grade: "10-A",
    teacher: "Mrs. Sunita Rao",
    title: "Ray Diagrams: Spherical Mirrors",
    description: "Draw focal ray paths for concave mirror when object is at C and between F and P. Submit practical worksheet.",
    assignedDate: "2026-09-22",
    dueDate: "2026-09-25",
    status: "Pending",
    priority: "Normal"
  },
  {
    id: "hw-103",
    subject: "English Communicative",
    grade: "10-A",
    teacher: "Rev. Fr. Principal",
    title: "Formal Letter: Nilgiris Eco-Conservation",
    description: "Draft a 150-word letter requesting preservation of native shola forest trees in Ootacamund.",
    assignedDate: "2026-09-21",
    dueDate: "2026-09-23",
    status: "Completed",
    priority: "Normal"
  },
  {
    id: "hw-104",
    subject: "Social Science",
    grade: "10-A",
    teacher: "Mrs. Lakshmi Menon",
    title: "Map Marking: Indian Soil Reserves",
    description: "Mark Black, Alluvial, and Mountain soil belts on the outline map of India.",
    assignedDate: "2026-09-20",
    dueDate: "2026-09-22",
    status: "Completed",
    priority: "Normal"
  }
];

// Seed Data for Online Student Leave Applications & Approvals
const SEED_LEAVE_REQUESTS = [
  {
    id: "lev-301",
    studentId: "STU-1001",
    studentName: "Aarav Sharma",
    grade: "10-A",
    parentName: "Rajesh Sharma",
    parentPhone: "+91 98765 43210",
    category: "Medical / Illness",
    fromDate: "2026-09-25",
    toDate: "2026-09-26",
    days: 2,
    reason: "Doctor advises bed rest due to seasonal viral flu. Prescription will be presented upon recovery.",
    status: "Pending",
    appliedOn: "22 Sep 2026, 09:15 AM",
    remarks: "Awaiting Class Teacher & Principal approval"
  },
  {
    id: "lev-302",
    studentId: "STU-1002",
    studentName: "Ananya Iyer",
    grade: "10-A",
    parentName: "Suresh Iyer",
    parentPhone: "+91 98451 23456",
    category: "Sports Tournament",
    fromDate: "2026-09-18",
    toDate: "2026-09-19",
    days: 2,
    reason: "Representing Nilgiris District in State Badminton Trials at Coimbatore.",
    status: "Approved",
    appliedOn: "15 Sep 2026, 11:30 AM",
    remarks: "Duty leave granted by Rev. Fr. Principal"
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
    BUS_ROUTES: 'rex_bus_routes_v3',
    HOMEWORK: 'rex_homework_v3',
    LEAVE_REQUESTS: 'rex_leave_requests_v3',
    THEME: 'neverskip_theme',
    CURRENT_ROLE: 'neverskip_role',
    ACTIVITY_LOG: 'neverskip_activity'
  },

  init() {
    if (!localStorage.getItem(this.KEYS.STUDENTS) || localStorage.getItem('rex_school_v3') !== 'true') {
      this.resetAll();
      localStorage.setItem('rex_school_v3', 'true');
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
    localStorage.setItem(this.KEYS.BUS_ROUTES, JSON.stringify(SEED_BUS_ROUTES));
    localStorage.setItem(this.KEYS.HOMEWORK, JSON.stringify(SEED_HOMEWORK));
    localStorage.setItem(this.KEYS.LEAVE_REQUESTS, JSON.stringify(SEED_LEAVE_REQUESTS));
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
  },

  // Bus Routes & Live GPS Accessors
  getBusRoutes() {
    const raw = localStorage.getItem(this.KEYS.BUS_ROUTES);
    return raw ? JSON.parse(raw) : SEED_BUS_ROUTES;
  },

  saveBusRoutes(routes) {
    localStorage.setItem(this.KEYS.BUS_ROUTES, JSON.stringify(routes));
  },

  getBusRouteById(id) {
    const routes = this.getBusRoutes();
    return routes.find(r => r.id === id) || routes[0];
  },

  // Digital Homework Diary Accessors
  getHomework() {
    const raw = localStorage.getItem(this.KEYS.HOMEWORK);
    return raw ? JSON.parse(raw) : SEED_HOMEWORK;
  },

  saveHomework(hw) {
    localStorage.setItem(this.KEYS.HOMEWORK, JSON.stringify(hw));
  },

  addHomework(item) {
    const hw = this.getHomework();
    item.id = 'hw-' + Date.now();
    item.assignedDate = item.assignedDate || new Date().toISOString().split('T')[0];
    item.status = item.status || 'Pending';
    hw.unshift(item);
    this.saveHomework(hw);
    this.addActivity(`New homework assigned: ${item.subject} (${item.title})`);
    return item;
  },

  toggleHomeworkStatus(id) {
    const hw = this.getHomework();
    const item = hw.find(h => h.id === id);
    if (item) {
      item.status = item.status === 'Completed' ? 'Pending' : 'Completed';
      this.saveHomework(hw);
      this.addActivity(`Homework marked ${item.status}: ${item.title}`);
    }
    return item;
  },

  // Online Student Leave Workflow Accessors
  getLeaveRequests() {
    const raw = localStorage.getItem(this.KEYS.LEAVE_REQUESTS);
    return raw ? JSON.parse(raw) : SEED_LEAVE_REQUESTS;
  },

  saveLeaveRequests(reqs) {
    localStorage.setItem(this.KEYS.LEAVE_REQUESTS, JSON.stringify(reqs));
  },

  submitLeaveRequest(req) {
    const reqs = this.getLeaveRequests();
    req.id = 'lev-' + Date.now();
    req.status = 'Pending';
    req.appliedOn = new Date().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
    reqs.unshift(req);
    this.saveLeaveRequests(reqs);
    this.addActivity(`New leave application submitted for ${req.studentName} (${req.days} days)`);
    return req;
  },

  updateLeaveStatus(id, status, remarks) {
    const reqs = this.getLeaveRequests();
    const item = reqs.find(l => l.id === id);
    if (item) {
      item.status = status;
      if (remarks) item.remarks = remarks;
      this.saveLeaveRequests(reqs);
      this.addActivity(`Leave application for ${item.studentName} marked ${status}`);
    }
    return item;
  }
};
