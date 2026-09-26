import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

/// Production-ready API service connecting Flutter App to the Rex Management Backend
class ApiService {
  // Configurable base URL: Change to your local LAN IP (e.g. http://192.168.1.34:3000/api) or 10.0.2.2 for emulator
  static String baseUrl = 'http://10.0.2.2:3000/api';

  static String? _authToken;
  static Map<String, dynamic>? _currentUser;
  static Map<String, dynamic>? _activeStudent;
  static List<dynamic> _linkedStudents = [];
  static bool _isDemoMode = false;
  static String _demoRole = 'PARENT';

  static bool get isAuthenticated => _authToken != null || _isDemoMode;
  static String? get token => _authToken;
  static Map<String, dynamic>? get currentUser => _currentUser;
  static String get activeRole => (_currentUser?['role'] as String?)?.toUpperCase() ?? (_isDemoMode ? _demoRole : 'PARENT');
  static Map<String, dynamic>? get activeStudent => _activeStudent;
  static List<dynamic> get linkedStudents => _linkedStudents;
  static bool get isDemoMode => _isDemoMode;

  static void setBaseUrl(String url) {
    var clean = url.trim();
    if (clean.endsWith('/')) {
      clean = clean.substring(0, clean.length - 1);
    }
    if (!clean.endsWith('/api')) {
      clean = '$clean/api';
    }
    baseUrl = clean;
  }

  static Map<String, String> _headers() {
    final headers = {'Content-Type': 'application/json'};
    if (_authToken != null) {
      headers['Authorization'] = 'Bearer $_authToken';
    }
    return headers;
  }

  // --------------------------------------------------------------------------
  // Server Health / Ping
  // --------------------------------------------------------------------------
  static Future<Map<String, dynamic>> pingServer() async {
    final stopwatch = Stopwatch()..start();
    try {
      final uri = Uri.parse('$baseUrl/health');
      final res = await http.get(uri).timeout(const Duration(seconds: 4));
      stopwatch.stop();
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        return {
          'ok': true,
          'latencyMs': stopwatch.elapsedMilliseconds,
          'service': data['service'] ?? 'Rex School ERP Backend',
          'version': data['version'] ?? '2.4.0',
        };
      }
      return {'ok': false, 'error': 'Server responded with status ${res.statusCode}'};
    } catch (e) {
      return {'ok': false, 'error': e.toString()};
    }
  }

  // --------------------------------------------------------------------------
  // Authentication
  // --------------------------------------------------------------------------
  static Future<Map<String, dynamic>> loginAdmin(String emailOrUsername, String password) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/auth/admin/login'),
        headers: _headers(),
        body: jsonEncode({'emailOrUsername': emailOrUsername, 'password': password}),
      ).timeout(const Duration(seconds: 8));

      final data = jsonDecode(response.body);
      if (response.statusCode == 200 && data['success'] == true) {
        _isDemoMode = false;
        _authToken = data['token'];
        _currentUser = data['user'];
        _activeStudent = null;
        _linkedStudents = [];
        return {'success': true, 'user': _currentUser};
      }
      return {'success': false, 'error': data['error'] ?? 'Login failed. Please check credentials.'};
    } catch (e) {
      debugPrint("API Error during admin login: $e");
      return {'success': false, 'error': 'Unable to reach backend server ($baseUrl). Please check server settings or use Demo Mode.'};
    }
  }

  static Future<Map<String, dynamic>> sendTeacherOtp(String mobile) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/auth/teacher/send-otp'),
        headers: _headers(),
        body: jsonEncode({'mobile': mobile}),
      ).timeout(const Duration(seconds: 8));

      final data = jsonDecode(response.body);
      return data;
    } catch (e) {
      debugPrint("API Error during teacher send-otp: $e");
      return {'success': false, 'error': 'Unable to connect to server. Check server URL or try Demo Mode.'};
    }
  }

  static Future<Map<String, dynamic>> verifyTeacherOtp(String mobile, String otp) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/auth/teacher/verify-otp'),
        headers: _headers(),
        body: jsonEncode({'mobile': mobile, 'otp': otp}),
      ).timeout(const Duration(seconds: 8));

      final data = jsonDecode(response.body);
      if (response.statusCode == 200 && data['success'] == true) {
        _isDemoMode = false;
        _authToken = data['token'];
        _currentUser = data['user'];
        _activeStudent = null;
        _linkedStudents = [];
        return {'success': true, 'user': _currentUser};
      }
      return {'success': false, 'error': data['error'] ?? 'Invalid or expired verification code.'};
    } catch (e) {
      debugPrint("API Error during teacher verify-otp: $e");
      return {'success': false, 'error': 'Connection error. Check backend server status.'};
    }
  }

  static Future<Map<String, dynamic>> loginParent(String admissionNo, String parentMobile) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/auth/parent/login'),
        headers: _headers(),
        body: jsonEncode({'admissionNo': admissionNo, 'parentMobile': parentMobile}),
      ).timeout(const Duration(seconds: 8));

      final data = jsonDecode(response.body);
      if (response.statusCode == 200 && data['success'] == true) {
        _isDemoMode = false;
        _authToken = data['token'];
        _currentUser = data['user'];
        _activeStudent = data['activeStudent'];
        _linkedStudents = data['students'] ?? [];
        return {'success': true, 'user': _currentUser, 'activeStudent': _activeStudent, 'students': _linkedStudents};
      }
      return {'success': false, 'error': data['error'] ?? 'Student record or parent mobile does not match school records.'};
    } catch (e) {
      debugPrint("API Error during parent login: $e");
      return {'success': false, 'error': 'Unable to connect to backend server. Verify server IP address or use Demo Mode.'};
    }
  }

  // Demo / Offline Login matching SQLite seed records
  static void loginDemo(String role) {
    _isDemoMode = true;
    _demoRole = role.toUpperCase();
    _authToken = 'demo_token_${DateTime.now().millisecondsSinceEpoch}';

    if (_demoRole == 'PARENT') {
      _currentUser = {
        'id': 3,
        'username': 'parent_rajesh',
        'role': 'PARENT',
        'name': 'Rajesh Sharma',
        'mobile': '9876543210',
        'email': 'rajesh.sharma@example.com'
      };
      _linkedStudents = [
        {
          'id': 1,
          'admission_no': 'REX-2024-001',
          'first_name': 'Aarav',
          'last_name': 'Sharma',
          'roll_no': '1',
          'class_name': 'Grade 10',
          'section_name': 'A',
          'gender': 'male',
          'dob': '2010-04-12',
          'parent_mobile': '9876543210'
        },
        {
          'id': 7,
          'admission_no': 'REX-2024-007',
          'first_name': 'Ananya',
          'last_name': 'Sharma',
          'roll_no': '7',
          'class_name': 'Grade 8',
          'section_name': 'B',
          'gender': 'female',
          'dob': '2012-07-22',
          'parent_mobile': '9876543210'
        }
      ];
      _activeStudent = _linkedStudents[0];
    } else if (_demoRole == 'TEACHER') {
      _currentUser = {
        'id': 2,
        'username': 'teacher_sarah',
        'role': 'TEACHER',
        'name': 'Sarah Jenkins',
        'employee_id': 'EMP-2024-001',
        'mobile': '9876500004',
        'email': 'sarah.jenkins@rexschool.edu',
        'department': 'Science',
        'assignments': [
          {'class_name': 'Grade 10', 'section_name': 'A', 'subject_name': 'Physics'},
          {'class_name': 'Grade 9', 'section_name': 'A', 'subject_name': 'General Science'}
        ]
      };
      _activeStudent = null;
      _linkedStudents = [];
    } else {
      _currentUser = {
        'id': 1,
        'username': 'admin',
        'role': 'SUPER_ADMIN',
        'name': 'Rev. Fr. Principal & Administrator',
        'email': 'principal@rexschool.edu'
      };
      _activeStudent = null;
      _linkedStudents = [];
    }
  }

  static void switchChild(Map<String, dynamic> student) {
    _activeStudent = student;
  }

  static void logout() {
    _authToken = null;
    _currentUser = null;
    _activeStudent = null;
    _linkedStudents = [];
    _isDemoMode = false;
  }

  // --------------------------------------------------------------------------
  // Core Endpoints
  // --------------------------------------------------------------------------
  static Future<Map<String, dynamic>> getDashboardStats({int? studentId}) async {
    if (_isDemoMode) {
      return {
        'success': true,
        'stats': {
          'totalStudents': 1010,
          'totalTeachers': 72,
          'presentToday': 974,
          'absentToday': 36,
          'attendancePercentage': 96.4,
          'upcomingEventsCount': 4,
          'unreadNotificationsCount': 3
        }
      };
    }
    final query = studentId != null ? '?studentId=$studentId' : '';
    final response = await http.get(Uri.parse('$baseUrl/dashboard/stats$query'), headers: _headers());
    return jsonDecode(response.body);
  }

  static Future<Map<String, dynamic>> getStudents({int? classId, int? sectionId}) async {
    var uri = '$baseUrl/students';
    final params = <String>[];
    if (classId != null) params.add('classId=$classId');
    if (sectionId != null) params.add('sectionId=$sectionId');
    if (params.isNotEmpty) uri += '?${params.join('&')}';
    final response = await http.get(Uri.parse(uri), headers: _headers());
    return jsonDecode(response.body);
  }

  static Future<Map<String, dynamic>> getAttendance({int? classId, int? sectionId, String? date, int? studentId}) async {
    var uri = '$baseUrl/attendance';
    final params = <String>[];
    if (classId != null) params.add('classId=$classId');
    if (sectionId != null) params.add('sectionId=$sectionId');
    if (date != null) params.add('date=$date');
    if (studentId != null) params.add('studentId=$studentId');
    if (params.isNotEmpty) uri += '?${params.join('&')}';
    final response = await http.get(Uri.parse(uri), headers: _headers());
    return jsonDecode(response.body);
  }

  static Future<Map<String, dynamic>> submitAttendance({
    required int classId,
    required int sectionId,
    required String date,
    required List<Map<String, dynamic>> records,
  }) async {
    final response = await http.post(
      Uri.parse('$baseUrl/attendance'),
      headers: _headers(),
      body: jsonEncode({
        'classId': classId,
        'sectionId': sectionId,
        'date': date,
        'records': records,
      }),
    );
    return jsonDecode(response.body);
  }

  static Future<Map<String, dynamic>> getEvents() async {
    final response = await http.get(Uri.parse('$baseUrl/events'), headers: _headers());
    return jsonDecode(response.body);
  }

  static Future<Map<String, dynamic>> getNotifications() async {
    final response = await http.get(Uri.parse('$baseUrl/notifications'), headers: _headers());
    return jsonDecode(response.body);
  }

  static Future<Map<String, dynamic>> getUnreadNotificationCount() async {
    final response = await http.get(Uri.parse('$baseUrl/notifications/unread-count'), headers: _headers());
    return jsonDecode(response.body);
  }

  static Future<Map<String, dynamic>> markNotificationRead(int id) async {
    final response = await http.put(Uri.parse('$baseUrl/notifications/$id/read'), headers: _headers());
    return jsonDecode(response.body);
  }

  static Future<Map<String, dynamic>> getSettings() async {
    final response = await http.get(Uri.parse('$baseUrl/settings'), headers: _headers());
    return jsonDecode(response.body);
  }
}
