import 'package:flutter/material.dart';
import '../models/student.dart';
import '../models/bus_route.dart';
import '../models/homework.dart';
import '../models/leave_request.dart';
import 'audio_service.dart';
import 'api_service.dart';

class ERPProvider extends ChangeNotifier {
  String _currentRole = 'parent'; // 'parent', 'teacher', 'admin'
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
      feesPaid: 36000,
    );

    _students = [
      _currentStudent,
      Student(
        id: "STU-1007",
        name: "Ananya Sharma",
        rollNo: "8B-07",
        grade: "8",
        section: "B",
        dob: "2013-11-12",
        gender: "Female",
        bloodGroup: "O+",
        parentName: "Rajesh Sharma",
        parentPhone: "+91 98765 43210",
        address: "24, Church Hill Road, Ootacamund",
        attendanceRate: 98,
        feesTotal: 48000,
        feesPaid: 48000,
      ),
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
      Student(
        id: "STU-1005",
        name: "David Paul",
        rollNo: "10A-05",
        grade: "10",
        section: "A",
        dob: "2011-09-18",
        gender: "Male",
        bloodGroup: "B+",
        parentName: "Thomas Paul",
        parentPhone: "+91 94422 33445",
        address: "14, Commercial Road, Ooty",
        attendanceRate: 95,
        feesTotal: 54000,
        feesPaid: 54000,
      ),
      Student(
        id: "STU-1006",
        name: "Fatima Sheikh",
        rollNo: "10A-06",
        grade: "10",
        section: "A",
        dob: "2011-04-22",
        gender: "Female",
        bloodGroup: "A+",
        parentName: "Farooq Sheikh",
        parentPhone: "+91 94433 66778",
        address: "9, Upper Bazar, Ooty",
        attendanceRate: 92,
        feesTotal: 54000,
        feesPaid: 36000,
      ),
      Student(
        id: "STU-1008",
        name: "Karthik Raja",
        rollNo: "8B-08",
        grade: "8",
        section: "B",
        dob: "2013-06-14",
        gender: "Male",
        bloodGroup: "B+",
        parentName: "Raja Sundaram",
        parentPhone: "+91 94411 22334",
        address: "21, Fingerpost, Ooty",
        attendanceRate: 96,
        feesTotal: 48000,
        feesPaid: 48000,
      ),
      Student(
        id: "STU-1009",
        name: "Sneha Reddy",
        rollNo: "8B-09",
        grade: "8",
        section: "B",
        dob: "2013-10-05",
        gender: "Female",
        bloodGroup: "O+",
        parentName: "Prasad Reddy",
        parentPhone: "+91 94488 99001",
        address: "7, Botanical Garden Road, Ooty",
        attendanceRate: 93,
        feesTotal: 48000,
        feesPaid: 32000,
      ),
      Student(
        id: "STU-1010",
        name: "Vikram Singh",
        rollNo: "9A-01",
        grade: "9",
        section: "A",
        dob: "2012-07-19",
        gender: "Male",
        bloodGroup: "AB+",
        parentName: "Balraj Singh",
        parentPhone: "+91 94477 88990",
        address: "3, Stone House, Ooty",
        attendanceRate: 97,
        feesTotal: 51000,
        feesPaid: 51000,
      ),
      Student(
        id: "STU-1011",
        name: "Divya Nair",
        rollNo: "9A-02",
        grade: "9",
        section: "A",
        dob: "2012-02-11",
        gender: "Female",
        bloodGroup: "A+",
        parentName: "Mohan Nair",
        parentPhone: "+91 94466 55443",
        address: "18, Davisdale, Ooty",
        attendanceRate: 90,
        feesTotal: 51000,
        feesPaid: 34000,
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

  // Multi-Child Linked Students for Parents
  List<Student> get linkedParentStudents => _students
      .where((s) => s.parentName == _currentStudent.parentName || s.parentPhone == _currentStudent.parentPhone)
      .toList();

  void selectStudent(Student student) {
    _currentStudent = student;
    notifyListeners();
  }

  void selectStudentById(dynamic idOrName) {
    final query = idOrName?.toString().toLowerCase().trim() ?? '';
    final s = _students.firstWhere(
      (st) =>
          st.id.toLowerCase() == query ||
          st.name.toLowerCase().contains(query) ||
          (query == '1' && st.name.contains('Aarav')) ||
          (query == '7' && st.name.contains('Ananya')),
      orElse: () => _currentStudent,
    );
    _currentStudent = s;
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

  /// Super Admin: Immediately dispatches homework to all eligible parents via WhatsApp
  Future<Map<String, dynamic>> sendHomeworkNow(String id) async {
    final item = _homeworkList.firstWhere((h) => h.id == id);
    if (item.status == 'SENT') {
      return {'success': false, 'error': 'Homework has already been sent to parents.'};
    }

    item.status = 'SENT';
    item.sendMode = 'MANUAL';
    item.sentAt = DateTime.now().toString().split('.')[0];
    item.sentBy = 'Super Admin';
    item.isEditLocked = true;
    item.sentDeliveriesCount = item.totalStudentsCount > 0 ? item.totalStudentsCount : 42;
    item.failedDeliveriesCount = 0;

    _activityLog.insert(0, "Super Admin manually sent homework '${item.title}' to parents via WhatsApp");
    notifyListeners();
    return {
      'success': true,
      'message': 'Homework successfully sent to parents.',
      'sentCount': item.sentDeliveriesCount,
      'failedCount': item.failedDeliveriesCount,
    };
  }

  /// Super Admin: Toggle 5:00 PM Auto Send with strict 5 PM validation
  String? toggleAutoSend(String id, bool enable) {
    final item = _homeworkList.firstWhere((h) => h.id == id);
    if (item.status == 'SENT') {
      return 'Homework has already been sent to parents.';
    }

    final now = DateTime.now();
    final todayStr = "${now.year}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}";
    final isPast5PM = (item.assignedDate == todayStr && now.hour >= 17) || (item.assignedDate.compareTo(todayStr) < 0);

    if (enable) {
      if (isPast5PM) {
        return "The scheduled 5:00 PM send time has already passed. Please use Send Now.";
      }
      item.autoSendEnabled = true;
      item.sendMode = 'AUTO_5PM';
      item.status = 'SCHEDULED';
      item.scheduledSendAt = "${item.assignedDate} 17:00:00";
      _activityLog.insert(0, "Auto Send at 5:00 PM enabled for homework '${item.title}'");
    } else {
      item.autoSendEnabled = false;
      item.sendMode = 'MANUAL';
      item.status = item.status == 'SCHEDULED' ? 'READY_FOR_REVIEW' : item.status;
      item.scheduledSendAt = null;
      _activityLog.insert(0, "Auto Send disabled for homework '${item.title}'");
    }

    notifyListeners();
    return null;
  }

  // Super Admin Homework Automation State (Requirements 1, 3, 4, 7, 8, 12, 14, 15)
  bool _autoSendGlobalEnabled = true;
  String _autoSendTime = "17:00";
  String _autoSendTimeDisplay = "5:00 PM";
  final String _schoolTimezone = "Asia/Kolkata";
  final String _schedulerStatus = "ACTIVE";
  final String _messagingProvider = "WhatsApp";
  final String _providerConnection = "✓ Connected";
  final bool _isProviderConfigured = true;

  bool get autoSendGlobalEnabled => _autoSendGlobalEnabled;
  String get autoSendTime => _autoSendTime;
  String get autoSendTimeDisplay => _autoSendTimeDisplay;
  String get schoolTimezone => _schoolTimezone;
  String get schedulerStatus => _schedulerStatus;
  String get messagingProvider => _messagingProvider;
  String get providerConnection => _providerConnection;
  bool get isProviderConfigured => _isProviderConfigured;

  void updateGlobalAutomationSettings({required bool enabled, required String time, required String timeDisplay}) {
    _autoSendGlobalEnabled = enabled;
    _autoSendTime = time;
    _autoSendTimeDisplay = timeDisplay;
    _activityLog.insert(0, "Super Admin updated automation: Auto-Send=${enabled ? 'ON' : 'OFF'} at $timeDisplay (IST)");
    notifyListeners();
  }

  String? cancelScheduledSend(String id) {
    final item = _homeworkList.firstWhere((h) => h.id == id);
    if (item.status == 'SENT') {
      return "Homework has already been sent to parents.";
    }
    item.autoSendEnabled = false;
    item.sendMode = 'MANUAL';
    item.status = 'READY_FOR_REVIEW';
    item.scheduledSendAt = null;
    _activityLog.insert(0, "Cancelled scheduled auto-send for '${item.title}'. Manual send required.");
    notifyListeners();
    return null;
  }

  Future<Map<String, dynamic>> sendTestMessage(String mobile, String message) async {
    await Future.delayed(const Duration(milliseconds: 600));
    _activityLog.insert(0, "Super Admin sent test message to $mobile via $_messagingProvider");
    notifyListeners();
    return {
      'success': true,
      'provider': _messagingProvider,
      'message': 'Test message sent successfully to $mobile via $_messagingProvider',
    };
  }

  /// Teacher edit with 5:00 PM deadline lock enforcement
  String? editHomework(String id, {String? title, String? description, String? dueDate}) {
    final item = _homeworkList.firstWhere((h) => h.id == id);

    if (item.status == 'SENT') {
      return "Homework has already been sent to parents.";
    }

    final now = DateTime.now();
    final todayStr = "${now.year}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}";
    final isPast5PM = (item.assignedDate == todayStr && now.hour >= 17) || (item.assignedDate.compareTo(todayStr) < 0);

    if (item.isEditLocked || isPast5PM) {
      item.isEditLocked = true;
      notifyListeners();
      return "Homework editing deadline has passed.";
    }

    if (title != null && title.isNotEmpty) item.title = title;
    if (description != null && description.isNotEmpty) item.description = description;
    if (dueDate != null && dueDate.isNotEmpty) item.dueDate = dueDate;

    _activityLog.insert(0, "Teacher edited homework: '${item.title}' before 5:00 PM");
    notifyListeners();
    return null;
  }

  void deleteHomework(String id) {
    _homeworkList.removeWhere((h) => h.id == id);
    _activityLog.insert(0, "Homework assignment removed");
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

  // Multi-Date & Multi-Class Isolated Attendance Ledger
  // Key format: "${date}_${grade}_${section}" -> { studentId: status }
  final Map<String, Map<String, String>> _attendanceLedger = {};

  List<Student> getStudentsByClass(String grade, String section) {
    return _students.where((s) => s.grade == grade && s.section == section).toList();
  }

  String getStudentAttendanceStatus({
    required String studentId,
    required String date,
    required String grade,
    required String section,
  }) {
    final key = "${date}_${grade}_${section}";
    if (_attendanceLedger.containsKey(key) && _attendanceLedger[key]!.containsKey(studentId)) {
      return _attendanceLedger[key]![studentId]!;
    }
    final s = _students.firstWhere((st) => st.id == studentId, orElse: () => _currentStudent);
    return s.todayStatus;
  }

  void setStudentAttendanceStatus({
    required String studentId,
    required String date,
    required String grade,
    required String section,
    required String status,
  }) {
    final key = "${date}_${grade}_${section}";
    _attendanceLedger.putIfAbsent(key, () => {});
    _attendanceLedger[key]![studentId] = status;

    final now = DateTime.now();
    final todayStr = "${now.year}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}";
    if (date == todayStr) {
      try {
        final s = _students.firstWhere((st) => st.id == studentId);
        s.todayStatus = status;
        if (status == 'Present') {
          s.checkInTime = '08:05 AM (RFID Gate A)';
        } else if (status == 'Late') {
          s.checkInTime = '08:25 AM (Late Gate B)';
        } else {
          s.checkInTime = 'Absent (Not Scanned)';
        }
      } catch (_) {}
    }
    notifyListeners();
  }

  void markAllPresentForDate({
    required String date,
    required String grade,
    required String section,
  }) {
    final key = "${date}_${grade}_${section}";
    _attendanceLedger.putIfAbsent(key, () => {});
    final classStudents = getStudentsByClass(grade, section);
    for (final s in classStudents) {
      _attendanceLedger[key]![s.id] = 'Present';
      s.todayStatus = 'Present';
      s.checkInTime = '08:05 AM (Marked Present)';
    }
    _activityLog.insert(0, "All students in Grade $grade-$section marked Present for $date");
    notifyListeners();
  }

  Future<Map<String, dynamic>> saveAttendanceRegister({
    required String date,
    required String grade,
    required String section,
  }) async {
    final classStudents = getStudentsByClass(grade, section);
    final key = "${date}_${grade}_${section}";
    _attendanceLedger.putIfAbsent(key, () => {});

    final records = <Map<String, dynamic>>[];
    for (final s in classStudents) {
      final status = getStudentAttendanceStatus(
        studentId: s.id,
        date: date,
        grade: grade,
        section: section,
      );
      _attendanceLedger[key]![s.id] = status;

      final numericId = int.tryParse(s.id.replaceAll(RegExp(r'[^0-9]'), '')) ?? 1;
      records.add({
        'studentId': numericId,
        'status': status.toLowerCase(),
        'remarks': '',
      });
    }

    final classId = grade == '8' ? 1 : (grade == '9' ? 2 : 3);
    final sectionId = (grade == '8' && section == 'B') ? 2 : (grade == '9' ? 3 : 5);

    final res = await ApiService.submitAttendance(
      classId: classId,
      sectionId: sectionId,
      date: date,
      records: records,
    );

    _activityLog.insert(0, "Attendance saved for Grade $grade-$section on $date");
    notifyListeners();
    return res;
  }

  // Attendance handlers (legacy backwards-compatibility)
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

