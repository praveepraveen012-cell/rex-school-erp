import 'dart:convert';
import 'package:http/http.dart' as http;

/// Production-ready API service connecting Flutter App to the Rex Management Backend
class ApiService {
  // Configurable base URL: Change to your local LAN IP (e.g. http://192.168.1.34:3000/api) for testing on physical devices
  static String baseUrl = 'http://localhost:3000/api';

  static String? _authToken;
  static Map<String, dynamic>? _currentUser;
  static Map<String, dynamic>? _activeStudent;
  static List<dynamic> _linkedStudents = [];

  static String? get token => _authToken;
  static Map<String, dynamic>? get currentUser => _currentUser;
  static Map<String, dynamic>? get activeStudent => _activeStudent;
  static List<dynamic> get linkedStudents => _linkedStudents;

  static void setBaseUrl(String url) {
    baseUrl = url;
  }

  static Map<String, String> _headers() {
    final headers = {'Content-Type': 'application/json'};
    if (_authToken != null) {
      headers['Authorization'] = 'Bearer $_authToken';
    }
    return headers;
  }

  // --------------------------------------------------------------------------
  // Authentication
  // --------------------------------------------------------------------------
  static Future<Map<String, dynamic>> loginAdmin(String emailOrUsername, String password) async {
    final response = await http.post(
      Uri.parse('$baseUrl/auth/admin/login'),
      headers: _headers(),
      body: jsonEncode({'emailOrUsername': emailOrUsername, 'password': password}),
    );
    final data = jsonDecode(response.body);
    if (response.statusCode == 200 && data['success'] == true) {
      _authToken = data['token'];
      _currentUser = data['user'];
    }
    return data;
  }

  static Future<Map<String, dynamic>> sendTeacherOtp(String mobile) async {
    final response = await http.post(
      Uri.parse('$baseUrl/auth/teacher/send-otp'),
      headers: _headers(),
      body: jsonEncode({'mobile': mobile}),
    );
    return jsonDecode(response.body);
  }

  static Future<Map<String, dynamic>> verifyTeacherOtp(String mobile, String otp) async {
    final response = await http.post(
      Uri.parse('$baseUrl/auth/teacher/verify-otp'),
      headers: _headers(),
      body: jsonEncode({'mobile': mobile, 'otp': otp}),
    );
    final data = jsonDecode(response.body);
    if (response.statusCode == 200 && data['success'] == true) {
      _authToken = data['token'];
      _currentUser = data['user'];
    }
    return data;
  }

  static Future<Map<String, dynamic>> loginParent(String admissionNo, String parentMobile) async {
    final response = await http.post(
      Uri.parse('$baseUrl/auth/parent/login'),
      headers: _headers(),
      body: jsonEncode({'admissionNo': admissionNo, 'parentMobile': parentMobile}),
    );
    final data = jsonDecode(response.body);
    if (response.statusCode == 200 && data['success'] == true) {
      _authToken = data['token'];
      _currentUser = data['user'];
      _activeStudent = data['activeStudent'];
      _linkedStudents = data['students'] ?? [];
    }
    return data;
  }

  static void switchChild(Map<String, dynamic> student) {
    _activeStudent = student;
  }

  static void logout() {
    _authToken = null;
    _currentUser = null;
    _activeStudent = null;
    _linkedStudents = [];
  }

  // --------------------------------------------------------------------------
  // Core Endpoints
  // --------------------------------------------------------------------------
  static Future<Map<String, dynamic>> getDashboardStats({int? studentId}) async {
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
