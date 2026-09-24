import 'package:flutter/material.dart';
import '../models/student.dart';
import '../models/bus_route.dart';
import '../models/homework.dart';
import '../models/leave_request.dart';
import 'audio_service.dart';

class ERPProvider extends ChangeNotifier {
  String _currentRole = 'admin'; // 'admin', 'teacher', 'parent'
  String _tripMode = 'morning'; // 'morning', 'evening'
  String _selectedRouteId = 'route-02';
  double _busProgress = 0.68; // 68% along route (at 480m mark)
  bool _soundEnabled = true;

  // Active Student (Aarav Sharma)
  late Student _currentStudent;
  late List<Student> _students;
  late List<BusRoute> _busRoutes;
  late List<HomeworkItem> _homeworkList;
  late List<LeaveRequest> _leaveRequests;
  final List<String> _activityLog = [];

  ERPProvider() {
    _initData();
  }

  // Getters
  String get currentRole => _currentRole;
  String get tripMode => _tripMode;
  String get selectedRouteId => _selectedRouteId;
  double get busProgress => _busProgress;
  bool get soundEnabled => _soundEnabled;
  Student get currentStudent => _currentStudent;
  List<Student> get students => _students;
  List<BusRoute> get busRoutes => _busRoutes;
  List<HomeworkItem> get homeworkList => _homeworkList;
  List<LeaveRequest> get leaveRequests => _leaveRequests;
  List<String> get activityLog => _activityLog;

  BusRoute get selectedRoute {
    return _busRoutes.firstWhere(
      (r) => r.id == _selectedRouteId,
      orElse: () => _busRoutes.first,
    );
  }

  BusSchedule get currentSchedule {
    return selectedRoute.getSchedule(_tripMode);
  }

  BusStop get studentStop {
    final stops = currentSchedule.stops;
    return stops.firstWhere(
      (s) => s.isStudentStop,
      orElse: () => stops.length > 2 ? stops[2] : stops.first,
    );
  }

  void _initData() {
    _currentStudent = Student(
      id: "STU-1001",
      name: "Aarav Sharma",
      rollNo: "10A-01",
      grade: "10",
      section: "A",
      dob: "2011-03-15",
      gender: "Male",
      bloodGroup: "O+",
      parentName: "Rajesh Sharma",
      parentPhone: "+91 98765 43210",
      address: "24, Church Hill Road, Ootacamund",
      attendanceRate: 96,
      feesTotal: 54000,
      feesPaid: 54000,
    );

    _students = [
      _currentStudent,
      Student(
        id: "STU-1002",
        name: "Ananya Iyer",
        rollNo: "10A-02",
        grade: "10",
        section: "A",
        dob: "2011-05-20",
        gender: "Female",
        bloodGroup: "A+",
        parentName: "Suresh Iyer",
        parentPhone: "+91 98451 23456",
        address: "12, Coonoor Road, Ooty",
        attendanceRate: 98,
        feesTotal: 54000,
        feesPaid: 54000,
      ),
      Student(
        id: "STU-1003",
        name: "Rohan Verma",
        rollNo: "10A-03",
        grade: "10",
        section: "A",
        dob: "2011-08-11",
        gender: "Male",
        bloodGroup: "B+",
        parentName: "Vikram Verma",
        parentPhone: "+91 98123 77654",
        address: "8, Fernhill Palace Road, Ooty",
        attendanceRate: 91,
        feesTotal: 54000,
        feesPaid: 36000,
      ),
      Student(
        id: "STU-1004",
        name: "Diya Patel",
        rollNo: "10A-04",
        grade: "10",
        section: "A",
        dob: "2011-01-30",
        gender: "Female",
        bloodGroup: "AB+",
        parentName: "Kiran Patel",
        parentPhone: "+91 94455 11223",
        address: "5, Lovedale Junction, Ooty",
        attendanceRate: 94,
        feesTotal: 54000,
        feesPaid: 54000,
      ),
    ];

    _busRoutes = [
      BusRoute(
        id: "route-02",
        routeNumber: "Route 02",
        name: "Coonoor Road - Charring Cross - Rex SSS",
        vehicleNo: "TN-43-A-2104",
        model: "Tata Starbus Ultra (40-Seater GPS Fleet)",
        driverName: "Joseph Selvaraj",
        driverPhone: "+91 94432 10045",
        attendantName: "K. Mariyammal",
        attendantPhone: "+91 94432 10046",
        speed: 34,
        status: "On Transit",
        morning: BusSchedule(
          title: "Morning Pickup Schedule",
          departs: "07:15 AM",
          destination: "Rex SSS Campus Gate (08:15 AM)",
          currentStopIndex: 2,
          stops: [
            BusStop(name: "Coonoor Stand", time: "07:15 AM", status: "passed", distanceMeters: 8200),
            BusStop(name: "Wellington Barracks", time: "07:30 AM", status: "passed", distanceMeters: 5100),
            BusStop(name: "Charring Cross Junction", time: "07:48 AM", status: "approaching", distanceMeters: 480, isStudentStop: true),
            BusStop(name: "Rex SSS Main Gate", time: "08:15 AM", status: "pending", distanceMeters: 0),
          ],
        ),
        evening: BusSchedule(
          title: "Evening Drop-off Schedule",
          departs: "03:45 PM",
          destination: "Coonoor Stand (04:45 PM)",
          currentStopIndex: 1,
          stops: [
            BusStop(name: "Rex SSS Main Gate", time: "03:45 PM", status: "passed", distanceMeters: 0),
            BusStop(name: "Charring Cross Junction", time: "04:05 PM", status: "approaching", distanceMeters: 480, isStudentStop: true),
            BusStop(name: "Wellington Barracks", time: "04:22 PM", status: "pending", distanceMeters: 5100),
            BusStop(name: "Coonoor Stand", time: "04:45 PM", status: "pending", distanceMeters: 8200),
          ],
        ),
      ),
      BusRoute(
        id: "route-01",
        routeNumber: "Route 01",
        name: "Ooty Town - Fingerpost - Rex SSS",
        vehicleNo: "TN-43-A-1980",
        model: "Ashok Leyland Lynx (36-Seater Fleet)",
        driverName: "M. Shanmugam",
        driverPhone: "+91 98421 88310",
        attendantName: "S. Vasanthi",
        attendantPhone: "+91 98421 88311",
        speed: 28,
        status: "Approaching Gate",
        morning: BusSchedule(
          title: "Morning Pickup Schedule",
          departs: "07:20 AM",
          destination: "Rex SSS Campus Gate (08:10 AM)",
          currentStopIndex: 2,
          stops: [
            BusStop(name: "Fingerpost Circle", time: "07:20 AM", status: "passed", distanceMeters: 4200),
            BusStop(name: "Ooty Lake Junction", time: "07:35 AM", status: "passed", distanceMeters: 2800),
            BusStop(name: "Botanical Garden Road", time: "07:52 AM", status: "approaching", distanceMeters: 350),
            BusStop(name: "Rex SSS Campus Gate", time: "08:10 AM", status: "pending", distanceMeters: 0),
          ],
        ),
        evening: BusSchedule(
          title: "Evening Drop-off Schedule",
          departs: "03:45 PM",
          destination: "Fingerpost Circle (04:35 PM)",
          currentStopIndex: 0,
          stops: [
            BusStop(name: "Rex SSS Campus Gate", time: "03:45 PM", status: "passed", distanceMeters: 0),
            BusStop(name: "Botanical Garden Road", time: "04:02 PM", status: "pending", distanceMeters: 350),
            BusStop(name: "Ooty Lake Junction", time: "04:18 PM", status: "pending", distanceMeters: 2800),
            BusStop(name: "Fingerpost Circle", time: "04:35 PM", status: "pending", distanceMeters: 4200),
          ],
        ),
      ),
      BusRoute(
        id: "route-03",
        routeNumber: "Route 03",
        name: "Lovedale - Lawrence Junction - Rex SSS",
        vehicleNo: "TN-43-B-3341",
        model: "Eicher Starline (32-Seater Fleet)",
        driverName: "Anthony Doss",
        driverPhone: "+91 94860 44122",
        attendantName: "R. Lakshmi",
        attendantPhone: "+91 94860 44123",
        speed: 32,
        status: "On Transit",
        morning: BusSchedule(
          title: "Morning Pickup Schedule",
          departs: "07:25 AM",
          destination: "Rex SSS Campus Gate (08:12 AM)",
          currentStopIndex: 1,
          stops: [
            BusStop(name: "Lovedale Junction", time: "07:25 AM", status: "passed", distanceMeters: 5500),
            BusStop(name: "Tiger Hill Crossing", time: "07:42 AM", status: "approaching", distanceMeters: 900),
            BusStop(name: "Church Hill Road", time: "07:58 AM", status: "pending", distanceMeters: 300),
            BusStop(name: "Rex SSS Campus Gate", time: "08:12 AM", status: "pending", distanceMeters: 0),
          ],
        ),
        evening: BusSchedule(
          title: "Evening Drop-off Schedule",
          departs: "03:45 PM",
          destination: "Lovedale Junction (04:30 PM)",
          currentStopIndex: 0,
          stops: [
            BusStop(name: "Rex SSS Campus Gate", time: "03:45 PM", status: "passed", distanceMeters: 0),
            BusStop(name: "Church Hill Road", time: "04:00 PM", status: "pending", distanceMeters: 300),
            BusStop(name: "Tiger Hill Crossing", time: "04:15 PM", status: "pending", distanceMeters: 900),
            BusStop(name: "Lovedale Junction", time: "04:30 PM", status: "pending", distanceMeters: 5500),
          ],
        ),
      ),
      BusRoute(
        id: "route-04",
        routeNumber: "Route 04",
        name: "Kotagiri Ghat Road - Ketti - Rex SSS",
        vehicleNo: "TN-43-A-4492",
        model: "Tata Starbus Ultra (42-Seater Fleet)",
        driverName: "K. Prakash",
        driverPhone: "+91 98432 99014",
        attendantName: "M. Revathi",
        attendantPhone: "+91 98432 99015",
        speed: 30,
        status: "On Transit",
        morning: BusSchedule(
          title: "Morning Pickup Schedule",
          departs: "07:10 AM",
          destination: "Rex SSS Campus Gate (08:15 AM)",
          currentStopIndex: 1,
          stops: [
            BusStop(name: "Ketti Valley View", time: "07:10 AM", status: "passed", distanceMeters: 7400),
            BusStop(name: "Dodabetta Crossing", time: "07:32 AM", status: "approaching", distanceMeters: 3100),
            BusStop(name: "Snowdon Road Crossing", time: "07:50 AM", status: "pending", distanceMeters: 1200),
            BusStop(name: "Rex SSS Main Gate", time: "08:15 AM", status: "pending", distanceMeters: 0),
          ],
        ),
        evening: BusSchedule(
          title: "Evening Drop-off Schedule",
          departs: "03:45 PM",
          destination: "Ketti Valley View (04:50 PM)",
          currentStopIndex: 0,
          stops: [
            BusStop(name: "Rex SSS Main Gate", time: "03:45 PM", status: "passed", distanceMeters: 0),
            BusStop(name: "Snowdon Road Crossing", time: "04:10 PM", status: "pending", distanceMeters: 1200),
            BusStop(name: "Dodabetta Crossing", time: "04:28 PM", status: "pending", distanceMeters: 3100),
            BusStop(name: "Ketti Valley View", time: "04:50 PM", status: "pending", distanceMeters: 7400),
          ],
        ),
      ),
    ];

    _homeworkList = [
      HomeworkItem(
        id: "hw-101",
        subject: "Mathematics",
        grade: "10-A",
        teacher: "Mr. Amit Sen",
        title: "Exercise 4.2: Quadratic Equations",
        description: "Solve Questions 3 to 10 from NCERT Textbook in class workbook. Show factorization and discriminant checks.",
        assignedDate: "2026-09-22",
        dueDate: "2026-09-24",
        isCompleted: false,
        priority: "High",
      ),
      HomeworkItem(
        id: "hw-102",
        subject: "Science (Physics)",
        grade: "10-A",
        teacher: "Mrs. Sunita Rao",
        title: "Ray Diagrams: Spherical Mirrors",
        description: "Draw focal ray paths for concave mirror when object is at C and between F and P. Submit practical worksheet.",
        assignedDate: "2026-09-22",
        dueDate: "2026-09-25",
        isCompleted: false,
        priority: "Normal",
      ),
      HomeworkItem(
        id: "hw-103",
        subject: "English Communicative",
        grade: "10-A",
        teacher: "Rev. Fr. Principal",
        title: "Formal Letter: Nilgiris Eco-Conservation",
        description: "Draft a 150-word letter requesting preservation of native shola forest trees in Ootacamund.",
        assignedDate: "2026-09-21",
        dueDate: "2026-09-23",
        isCompleted: true,
        priority: "Normal",
      ),
      HomeworkItem(
        id: "hw-104",
        subject: "Social Science",
        grade: "10-A",
        teacher: "Mrs. Lakshmi Menon",
        title: "Map Marking: Indian Soil Reserves",
        description: "Mark Black, Alluvial, and Mountain soil belts on the outline map of India.",
        assignedDate: "2026-09-20",
        dueDate: "2026-09-22",
        isCompleted: true,
        priority: "Normal",
      ),
    ];

    _leaveRequests = [
      LeaveRequest(
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
        remarks: "Awaiting Class Teacher & Principal approval",
      ),
      LeaveRequest(
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
        remarks: "Duty leave granted by Rev. Fr. Principal",
      ),
    ];

    _activityLog.addAll([
      "Morning attendance marked for Grade 10-A (96.4%)",
      "500m Bus Geofence active for Route 02 (Charring Cross)",
      "Term II Tuition Fee settled for Aarav Sharma",
      "Pre-Board datesheet circular published to parents",
    ]);
  }

  // Role Switcher
  void switchRole(String role) {
    _currentRole = role;
    notifyListeners();
  }

  // Trip Mode (Morning / Evening)
  void setTripMode(String mode) {
    _tripMode = mode;
    _busProgress = mode == 'morning' ? 0.68 : 0.25;
    notifyListeners();
  }

  // Route selector
  void setSelectedRoute(String routeId) {
    _selectedRouteId = routeId;
    _busProgress = routeId == 'route-02' ? 0.68 : 0.35;
    notifyListeners();
  }

  void toggleSound() {
    _soundEnabled = !_soundEnabled;
    if (_soundEnabled) {
      AudioService.playChime();
    }
    notifyListeners();
  }

  // Homework check toggler
  void toggleHomework(String id) {
    final item = _homeworkList.firstWhere((h) => h.id == id);
    item.isCompleted = !item.isCompleted;
    _activityLog.insert(0, "Homework marked ${item.isCompleted ? 'Completed' : 'Pending'}: ${item.title}");
    notifyListeners();
  }

  void addHomework(HomeworkItem item) {
    _homeworkList.insert(0, item);
    _activityLog.insert(0, "New homework assigned: ${item.subject} (${item.title})");
    notifyListeners();
  }

  // Leave requests
  void submitLeaveRequest(LeaveRequest item) {
    _leaveRequests.insert(0, item);
    _activityLog.insert(0, "New leave applied for ${item.studentName} (${item.days} days)");
    notifyListeners();
  }

  void approveLeave(String id) {
    final req = _leaveRequests.firstWhere((l) => l.id == id);
    req.status = 'Approved';
    req.remarks = 'Approved by Rev. Fr. Principal';
    _activityLog.insert(0, "Leave request for ${req.studentName} approved");
    notifyListeners();
  }

  void rejectLeave(String id) {
    final req = _leaveRequests.firstWhere((l) => l.id == id);
    req.status = 'Rejected';
    req.remarks = 'Rejected due to board exam schedule';
    _activityLog.insert(0, "Leave request for ${req.studentName} rejected");
    notifyListeners();
  }

  // Attendance handlers
  void updateStudentAttendance(String studentId, String status) {
    final student = _students.firstWhere((s) => s.id == studentId);
    student.todayStatus = status;
    if (status == 'Present') {
      student.checkInTime = '08:05 AM (RFID Gate A)';
    } else if (status == 'Late') {
      student.checkInTime = '08:25 AM (Late Gate B)';
    } else {
      student.checkInTime = 'Absent (Not Scanned)';
    }
    _activityLog.insert(0, "Attendance for ${student.name} marked as $status");
    notifyListeners();
  }

  // Fee collection handler
  void recordFeePayment(String studentId, int amount, String mode) {
    final student = _students.firstWhere((s) => s.id == studentId);
    student.feesPaid += amount;
    if (student.feesPaid > student.feesTotal) {
      student.feesPaid = student.feesTotal;
    }
    _activityLog.insert(0, "₹$amount fee received from ${student.name} via $mode");
    notifyListeners();
  }

  // 500m Alert Trigger
  void trigger500mProximity() {
    _busProgress = 0.68;
    if (_soundEnabled) {
      AudioService.playChime();
    }
    _activityLog.insert(0, "500m Proximity Alert triggered: Bus ${selectedRoute.vehicleNo} at ${studentStop.name}");
    notifyListeners();
  }
}

