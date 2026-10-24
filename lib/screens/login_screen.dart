import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/api_service.dart';
import '../services/erp_provider.dart';
import 'main_navigation_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  // Register School form
  final _regSchoolNameCtrl = TextEditingController();
  final _regSchoolEmailCtrl = TextEditingController();
  final _regSchoolPhoneCtrl = TextEditingController();
  final _regAddressCtrl = TextEditingController(text: 'Main Campus');
  final _regCityCtrl = TextEditingController(text: 'Bangalore');
  final _regAdminNameCtrl = TextEditingController();
  final _regAdminPassCtrl = TextEditingController();
  final _regConfirmPassCtrl = TextEditingController();
  bool _obscureRegPass = true;
  bool _obscureRegConfirmPass = true;

  // Phone OTP State
  final _regPhoneOtpCtrl = TextEditingController();
  bool _regPhoneOtpSent = false;
  bool _regPhoneVerified = false;
  bool _regPhoneSending = false;
  bool _regPhoneVerifying = false;
  int _regPhoneCooldown = 0;
  String? _regPhoneDevHint;
  Timer? _phoneTimer;

  // Email OTP State
  final _regEmailOtpCtrl = TextEditingController();
  bool _regEmailOtpSent = false;
  bool _regEmailVerified = false;
  bool _regEmailSending = false;
  bool _regEmailVerifying = false;
  int _regEmailCooldown = 0;
  String? _regEmailDevHint;
  Timer? _emailTimer;

  // Admin form
  final _adminSchoolIdCtrl = TextEditingController();
  final _adminUserCtrl = TextEditingController(text: 'admin');
  final _adminPassCtrl = TextEditingController(text: 'AdminPassword123!');
  bool _obscureAdminPass = true;

  // Teacher form (Username & Password default, Mobile OTP secondary)
  final _teacherUserCtrl = TextEditingController(text: 'anitha.math');
  final _teacherPassCtrl = TextEditingController(text: 'Teacher123!');
  final _teacherSchoolIdCtrl = TextEditingController();
  bool _obscureTeacherPass = true;
  bool _teacherUseOtp = false;
  final _teacherMobileCtrl = TextEditingController(text: '9876500004');
  final _teacherOtpCtrl = TextEditingController();
  bool _otpSent = false;
  String? _otpDevHint;

  // Parent form
  final _parentAdmissionCtrl = TextEditingController(text: 'REX-2024-001');
  final _parentMobileCtrl = TextEditingController(text: '9876543210');

  bool _isLoading = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    _phoneTimer?.cancel();
    _emailTimer?.cancel();
    _regSchoolNameCtrl.dispose();
    _regSchoolEmailCtrl.dispose();
    _regSchoolPhoneCtrl.dispose();
    _regAddressCtrl.dispose();
    _regCityCtrl.dispose();
    _regAdminNameCtrl.dispose();
    _regAdminPassCtrl.dispose();
    _regConfirmPassCtrl.dispose();
    _regPhoneOtpCtrl.dispose();
    _regEmailOtpCtrl.dispose();
    _adminSchoolIdCtrl.dispose();
    _adminUserCtrl.dispose();
    _adminPassCtrl.dispose();
    _teacherUserCtrl.dispose();
    _teacherPassCtrl.dispose();
    _teacherSchoolIdCtrl.dispose();
    _teacherMobileCtrl.dispose();
    _teacherOtpCtrl.dispose();
    _parentAdmissionCtrl.dispose();
    _parentMobileCtrl.dispose();
    super.dispose();
  }

  void _onLoginSuccess(String role, {bool isOffline = false}) {
    final erp = Provider.of<ERPProvider>(context, listen: false);
    erp.switchRole(role.toLowerCase());

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            Icon(isOffline ? Icons.offline_bolt : Icons.cloud_done, color: Colors.white, size: 18),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                isOffline
                    ? "Welcome to Grexotix School Management (Offline Engine active)"
                    : "Connected to Grexotix School Management Server (${role.toUpperCase()})",
                style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 12),
              ),
            ),
          ],
        ),
        backgroundColor: const Color(0xFF0F766E),
        duration: const Duration(seconds: 3),
      ),
    );

    Navigator.of(context).pushReplacement(
      MaterialPageRoute(builder: (_) => const MainNavigationScreen()),
    );
  }

  // --------------------------------------------------------------------------
  // Parent Login
  // --------------------------------------------------------------------------
  Future<void> _handleParentLogin() async {
    final admission = _parentAdmissionCtrl.text.trim();
    final mobile = _parentMobileCtrl.text.trim();

    if (mobile.isEmpty) {
      setState(() => _errorMessage = "Please enter your registered mobile number.");
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final res = await ApiService.loginParent(mobile, admission.isNotEmpty ? admission : null);
    setState(() => _isLoading = false);

    if (res['success'] == true) {
      _onLoginSuccess('parent', isOffline: res['isOffline'] == true);
    } else {
      setState(() => _errorMessage = res['error'] ?? "Parent login failed.");
    }
  }

  // --------------------------------------------------------------------------
  // Register School (7-Day Free Trial) with Phone & Email OTP Verification
  // --------------------------------------------------------------------------
  void _startPhoneCooldown() {
    _phoneTimer?.cancel();
    _phoneTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_regPhoneCooldown <= 1) {
        timer.cancel();
        if (mounted) setState(() => _regPhoneCooldown = 0);
      } else {
        if (mounted) setState(() => _regPhoneCooldown--);
      }
    });
  }

  void _startEmailCooldown() {
    _emailTimer?.cancel();
    _emailTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_regEmailCooldown <= 1) {
        timer.cancel();
        if (mounted) setState(() => _regEmailCooldown = 0);
      } else {
        if (mounted) setState(() => _regEmailCooldown--);
      }
    });
  }

  Future<void> _handleSendPhoneOtp() async {
    final mobile = _regSchoolPhoneCtrl.text.trim();
    if (mobile.length < 10) {
      setState(() => _errorMessage = "Please enter a valid 10-digit mobile number.");
      return;
    }
    setState(() {
      _regPhoneSending = true;
      _errorMessage = null;
    });
    final res = await ApiService.sendRegistrationPhoneOtp(mobile);
    setState(() => _regPhoneSending = false);
    if (res['success'] == true) {
      setState(() {
        _regPhoneOtpSent = true;
        _regPhoneCooldown = 60;
        _regPhoneDevHint = res['devOtpHint'];
      });
      _startPhoneCooldown();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(res['message'] ?? "Phone OTP sent successfully!"),
            backgroundColor: const Color(0xFF059669),
          ),
        );
      }
    } else {
      setState(() => _errorMessage = res['error'] ?? "Failed to send phone OTP.");
    }
  }

  Future<void> _handleVerifyPhoneOtp() async {
    final mobile = _regSchoolPhoneCtrl.text.trim();
    final otp = _regPhoneOtpCtrl.text.trim();
    if (otp.length != 6) {
      setState(() => _errorMessage = "Please enter the 6-digit phone OTP.");
      return;
    }
    setState(() {
      _regPhoneVerifying = true;
      _errorMessage = null;
    });
    final res = await ApiService.verifyRegistrationPhoneOtp(mobile, otp);
    setState(() => _regPhoneVerifying = false);
    if (res['success'] == true) {
      setState(() {
        _regPhoneVerified = true;
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text("✓ Mobile Number Verified Successfully!"),
            backgroundColor: Color(0xFF059669),
          ),
        );
      }
    } else {
      setState(() => _errorMessage = res['error'] ?? "Invalid or expired Phone OTP.");
    }
  }

  Future<void> _handleSendEmailOtp() async {
    final email = _regSchoolEmailCtrl.text.trim();
    final name = _regAdminNameCtrl.text.trim();
    if (!email.contains('@') || !email.contains('.')) {
      setState(() => _errorMessage = "Please enter a valid administrator email address.");
      return;
    }
    setState(() {
      _regEmailSending = true;
      _errorMessage = null;
    });
    final res = await ApiService.sendRegistrationEmailOtp(email, adminName: name);
    setState(() => _regEmailSending = false);
    if (res['success'] == true) {
      setState(() {
        _regEmailOtpSent = true;
        _regEmailCooldown = 60;
        _regEmailDevHint = res['devOtpHint'];
      });
      _startEmailCooldown();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(res['message'] ?? "Email verification code sent!"),
            backgroundColor: const Color(0xFF059669),
          ),
        );
      }
    } else {
      setState(() => _errorMessage = res['error'] ?? "Failed to send email verification code.");
    }
  }

  Future<void> _handleVerifyEmailOtp() async {
    final email = _regSchoolEmailCtrl.text.trim();
    final code = _regEmailOtpCtrl.text.trim();
    if (code.length != 6) {
      setState(() => _errorMessage = "Please enter the 6-digit email code.");
      return;
    }
    setState(() {
      _regEmailVerifying = true;
      _errorMessage = null;
    });
    final res = await ApiService.verifyRegistrationEmailOtp(email, code);
    setState(() => _regEmailVerifying = false);
    if (res['success'] == true) {
      setState(() {
        _regEmailVerified = true;
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text("✓ Email Address Verified Successfully!"),
            backgroundColor: Color(0xFF059669),
          ),
        );
      }
    } else {
      setState(() => _errorMessage = res['error'] ?? "Invalid or expired email code.");
    }
  }

  Future<void> _handleSchoolRegister() async {
    final schoolName = _regSchoolNameCtrl.text.trim();
    final address = _regAddressCtrl.text.trim();
    final city = _regCityCtrl.text.trim();
    final adminName = _regAdminNameCtrl.text.trim();
    final mobile = _regSchoolPhoneCtrl.text.trim();
    final email = _regSchoolEmailCtrl.text.trim();
    final pass = _regAdminPassCtrl.text;
    final confirmPass = _regConfirmPassCtrl.text;

    if (schoolName.isEmpty || address.isEmpty || adminName.isEmpty || mobile.isEmpty || email.isEmpty || pass.isEmpty || confirmPass.isEmpty) {
      setState(() => _errorMessage = "Please fill in all required registration fields.");
      return;
    }

    if (pass != confirmPass) {
      setState(() => _errorMessage = "Passwords do not match.");
      return;
    }

    if (pass.length < 8) {
      setState(() => _errorMessage = "Password must be at least 8 characters long.");
      return;
    }

    if (!_regPhoneVerified) {
      setState(() => _errorMessage = "Please verify administrator mobile number with Phone OTP first.");
      return;
    }

    if (!_regEmailVerified) {
      setState(() => _errorMessage = "Please verify administrator email address with verification code first.");
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final res = await ApiService.registerSchool({
      'schoolName': schoolName,
      'displayName': schoolName,
      'schoolEmail': email,
      'schoolPhone': mobile,
      'address': address,
      'city': city.isNotEmpty ? city : 'Bangalore',
      'state': 'Karnataka',
      'postalCode': '560001',
      'country': 'India',
      'schoolType': 'K-12 Private Institution',
      'adminName': adminName,
      'adminEmail': email,
      'adminMobile': mobile,
      'password': pass,
      'confirmPassword': confirmPass,
      'phoneOtp': _regPhoneOtpCtrl.text.trim(),
      'emailOtp': _regEmailOtpCtrl.text.trim(),
    });

    setState(() => _isLoading = false);

    if (res['success'] == true) {
      _showCelebrationDialog(res);
    } else {
      setState(() => _errorMessage = res['error'] ?? "School registration failed.");
    }
  }

  // --------------------------------------------------------------------------
  // Teacher Username & Password Authentication
  // --------------------------------------------------------------------------
  Future<void> _handleTeacherPasswordLogin() async {
    final user = _teacherUserCtrl.text.trim();
    final pass = _teacherPassCtrl.text;
    final schoolCode = _teacherSchoolIdCtrl.text.trim();

    if (user.isEmpty || pass.isEmpty) {
      setState(() => _errorMessage = "Please enter teacher username and password.");
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final res = await ApiService.loginTeacherPassword(user, pass, schoolCode.isNotEmpty ? schoolCode : null);
    setState(() => _isLoading = false);

    if (res['success'] == true) {
      _onLoginSuccess('teacher', isOffline: res['isOffline'] == true);
    } else {
      setState(() => _errorMessage = res['error'] ?? "Teacher authentication failed.");
    }
  }

  // --------------------------------------------------------------------------
  // Teacher OTP Flow (Optional Alternate Mode)
  // --------------------------------------------------------------------------
  Future<void> _handleTeacherSendOtp() async {
    final mobile = _teacherMobileCtrl.text.trim();
    if (mobile.isEmpty || mobile.length < 10) {
      setState(() => _errorMessage = "Please enter a valid 10-digit mobile number.");
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final res = await ApiService.sendTeacherOtp(mobile);
    setState(() => _isLoading = false);

    if (res['success'] == true) {
      setState(() {
        _otpSent = true;
        _otpDevHint = res['devOtp'] != null ? "Dev OTP: ${res['devOtp']}" : null;
      });
      if (res['devOtp'] != null) {
        _teacherOtpCtrl.text = res['devOtp'];
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text("Automated SMS verification code sent to +91 $mobile"),
          backgroundColor: const Color(0xFF059669),
        ),
      );
    } else {
      setState(() => _errorMessage = res['error'] ?? "Failed to send OTP.");
    }
  }

  Future<void> _handleTeacherVerifyOtp() async {
    final mobile = _teacherMobileCtrl.text.trim();
    final otp = _teacherOtpCtrl.text.trim();

    if (otp.isEmpty || otp.length < 6) {
      setState(() => _errorMessage = "Please enter the 6-digit OTP received via SMS.");
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final res = await ApiService.verifyTeacherOtp(mobile, otp);
    setState(() => _isLoading = false);

    if (res['success'] == true) {
      _onLoginSuccess('teacher', isOffline: res['isOffline'] == true);
    } else {
      setState(() => _errorMessage = res['error'] ?? "Invalid or expired OTP.");
    }
  }

  // --------------------------------------------------------------------------
  // Super Admin Login
  // --------------------------------------------------------------------------
  Future<void> _handleAdminLogin() async {
    final schoolId = _adminSchoolIdCtrl.text.trim();
    final user = _adminUserCtrl.text.trim();
    final pass = _adminPassCtrl.text;

    if (user.isEmpty || pass.isEmpty) {
      setState(() => _errorMessage = "Please enter Admin username/email and password.");
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    Map<String, dynamic> res;
    if (schoolId.isNotEmpty) {
      res = await ApiService.loginSchool(schoolId.toUpperCase(), pass, identifier: user);
    } else {
      res = await ApiService.loginAdmin(user, pass);
    }
    setState(() => _isLoading = false);

    if (res['success'] == true) {
      _onLoginSuccess('admin', isOffline: res['isOffline'] == true);
    } else {
      setState(() => _errorMessage = res['error'] ?? "Invalid admin credentials or School ID.");
    }
  }

  void _showRegisterSchoolDialog() {
    final nameCtrl = TextEditingController();
    final emailCtrl = TextEditingController();
    final phoneCtrl = TextEditingController();
    final cityCtrl = TextEditingController();
    final adminNameCtrl = TextEditingController();
    final adminEmailCtrl = TextEditingController();
    final adminPhoneCtrl = TextEditingController();
    final passCtrl = TextEditingController();
    final confirmPassCtrl = TextEditingController();
    String? dialogError;
    bool isRegistering = false;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: const Row(
            children: [
              Icon(Icons.rocket_launch, color: Color(0xFF7C3AED)),
              SizedBox(width: 8),
              Text("Register Your School", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            ],
          ),
          content: SingleChildScrollView(
            child: SizedBox(
              width: 360,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: const Color(0xFFEDE9FE),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Text(
                      "7-Day Free Trial Activated Immediately • Unique School ID Generated",
                      style: TextStyle(color: Color(0xFF5B21B6), fontSize: 11, fontWeight: FontWeight.w600),
                    ),
                  ),
                  if (dialogError != null) ...[
                    const SizedBox(height: 8),
                    Text(dialogError!, style: const TextStyle(color: Colors.red, fontSize: 12)),
                  ],
                  const SizedBox(height: 12),
                  TextField(controller: nameCtrl, decoration: const InputDecoration(labelText: "Official School Name *", isDense: true)),
                  const SizedBox(height: 8),
                  TextField(controller: emailCtrl, decoration: const InputDecoration(labelText: "School Official Email *", isDense: true)),
                  const SizedBox(height: 8),
                  TextField(controller: phoneCtrl, decoration: const InputDecoration(labelText: "School Phone *", isDense: true)),
                  const SizedBox(height: 8),
                  TextField(controller: cityCtrl, decoration: const InputDecoration(labelText: "City & State *", isDense: true)),
                  const Divider(height: 24),
                  const Text("Administrator Account", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Color(0xFF475569))),
                  const SizedBox(height: 8),
                  TextField(controller: adminNameCtrl, decoration: const InputDecoration(labelText: "Admin Full Name *", isDense: true)),
                  const SizedBox(height: 8),
                  TextField(controller: adminEmailCtrl, decoration: const InputDecoration(labelText: "Admin Email (Login ID) *", isDense: true)),
                  const SizedBox(height: 8),
                  TextField(controller: adminPhoneCtrl, decoration: const InputDecoration(labelText: "Admin Mobile *", isDense: true)),
                  const SizedBox(height: 8),
                  TextField(controller: passCtrl, obscureText: true, decoration: const InputDecoration(labelText: "Password * (Min 8 chars)", isDense: true)),
                  const SizedBox(height: 8),
                  TextField(controller: confirmPassCtrl, obscureText: true, decoration: const InputDecoration(labelText: "Confirm Password *", isDense: true)),
                ],
              ),
            ),
          ),
          actions: [
            TextButton(
              onPressed: isRegistering ? null : () => Navigator.pop(ctx),
              child: const Text("Cancel"),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF7C3AED),
                foregroundColor: Colors.white,
              ),
              onPressed: isRegistering ? null : () async {
                if (passCtrl.text != confirmPassCtrl.text) {
                  setDialogState(() => dialogError = "Passwords do not match.");
                  return;
                }
                setDialogState(() {
                  isRegistering = true;
                  dialogError = null;
                });
                final res = await ApiService.registerSchool({
                  'schoolName': nameCtrl.text.trim(),
                  'displayName': nameCtrl.text.trim(),
                  'schoolEmail': emailCtrl.text.trim(),
                  'schoolPhone': phoneCtrl.text.trim(),
                  'address': 'Main Campus',
                  'city': cityCtrl.text.trim(),
                  'state': 'State',
                  'postalCode': '560001',
                  'adminName': adminNameCtrl.text.trim(),
                  'adminEmail': adminEmailCtrl.text.trim(),
                  'adminMobile': adminPhoneCtrl.text.trim(),
                  'password': passCtrl.text,
                  'confirmPassword': confirmPassCtrl.text,
                });
                setDialogState(() => isRegistering = false);
                if (res['success'] == true) {
                  Navigator.pop(ctx);
                  _showCelebrationDialog(res);
                } else {
                  setDialogState(() => dialogError = res['error'] ?? "Registration failed.");
                }
              },
              child: isRegistering
                  ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                  : const Text("Start 7-Day Trial"),
            ),
          ],
        ),
      ),
    );
  }

  void _showCelebrationDialog(Map<String, dynamic> data) {
    final schoolId = data['schoolId'] ?? data['school']?['code'] ?? 'GRX-SCH-NEW';
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Row(
          children: [
            Icon(Icons.check_circle, color: Color(0xFF059669), size: 28),
            SizedBox(width: 8),
            Expanded(child: Text("Trial Activated!", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold))),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text("Your school has been registered with a 7-day free trial on Grexotix SaaS."),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: const Color(0xFFF5F3FF),
                border: Border.all(color: const Color(0xFF7C3AED), width: 2),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                children: [
                  const Text("PERMANENT SCHOOL ID", style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF6D28D9))),
                  const SizedBox(height: 4),
                  Text(schoolId, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: Color(0xFF5B21B6), letterSpacing: 1.5)),
                  const SizedBox(height: 6),
                  const Text("● 7-Day Free Trial Active", style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF047857))),
                ],
              ),
            ),
          ],
        ),
        actions: [
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF7C3AED), foregroundColor: Colors.white),
            onPressed: () {
              Navigator.pop(ctx);
              _onLoginSuccess('admin');
            },
            child: const Text("Enter School Workspace"),
          ),
        ],
      ),
    );
  }

  void _showPlatformAdminDialog() {
    final passCtrl = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF0F172A),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Row(
          children: [
            Icon(Icons.shield, color: Color(0xFFC084FC), size: 22),
            SizedBox(width: 8),
            Text("Platform Governance", style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              "Restricted to Grexotix Platform Superadministrators. Enter Platform Key:",
              style: TextStyle(fontSize: 12, color: Colors.white70),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: passCtrl,
              obscureText: true,
              style: const TextStyle(color: Colors.white),
              decoration: const InputDecoration(
                labelText: "Platform Access Key",
                labelStyle: TextStyle(color: Colors.white70),
                enabledBorder: OutlineInputBorder(borderSide: BorderSide(color: Colors.white24)),
                focusedBorder: OutlineInputBorder(borderSide: BorderSide(color: Color(0xFFC084FC))),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text("Cancel", style: TextStyle(color: Colors.white60)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF7C3AED), foregroundColor: Colors.white),
            onPressed: () async {
              Navigator.pop(ctx);
              final res = await ApiService.loginAdmin('platform.admin@grexotix.edu', passCtrl.text);
              if (res['success'] == true) {
                _onLoginSuccess('platform_admin', isOffline: res['isOffline'] == true);
              } else {
                setState(() => _errorMessage = "Invalid Platform Superadmin authorization.");
              }
            },
            child: const Text("Authenticate"),
          ),
        ],
      ),
    );
  }

  // Server Settings Dialog
  void _showServerSettings() {
    final serverCtrl = TextEditingController(text: ApiService.baseUrl);
    String? pingStatus;
    bool isPinging = false;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: const Row(
            children: [
              Icon(Icons.dns, color: Color(0xFF1E3A8A)),
              SizedBox(width: 8),
              Text("Server Connection", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                "Backend API URL (Ensure phone and PC are on the same Wi-Fi, or test with built-in resilient engine):",
                style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: serverCtrl,
                decoration: const InputDecoration(
                  labelText: "API Base URL",
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.link),
                  hintText: "http://192.168.1.33:3000/api",
                ),
              ),
              const SizedBox(height: 10),
              Wrap(
                spacing: 8,
                runSpacing: 6,
                children: [
                  ActionChip(
                    label: const Text("PC Wi-Fi (192.168.1.33)", style: TextStyle(fontSize: 11)),
                    onPressed: () {
                      setDialogState(() {
                        serverCtrl.text = "http://192.168.1.33:3000/api";
                      });
                    },
                  ),
                  ActionChip(
                    label: const Text("Emulator (10.0.2.2)", style: TextStyle(fontSize: 11)),
                    onPressed: () {
                      setDialogState(() {
                        serverCtrl.text = "http://10.0.2.2:3000/api";
                      });
                    },
                  ),
                  ActionChip(
                    label: const Text("PC Localhost (3000)", style: TextStyle(fontSize: 11)),
                    onPressed: () {
                      setDialogState(() {
                        serverCtrl.text = "http://localhost:3000/api";
                      });
                    },
                  ),
                ],
              ),
              const SizedBox(height: 12),
              if (pingStatus != null)
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: pingStatus!.startsWith("Connected") ? const Color(0xFFECFDF5) : const Color(0xFFFEF2F2),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: pingStatus!.startsWith("Connected") ? const Color(0xFF10B981) : const Color(0xFFEF4444),
                    ),
                  ),
                  child: Text(
                    pingStatus!,
                    style: TextStyle(
                      fontSize: 11,
                      color: pingStatus!.startsWith("Connected") ? const Color(0xFF065F46) : const Color(0xFF991B1B),
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: isPinging
                  ? null
                  : () async {
                      setDialogState(() {
                        isPinging = true;
                        pingStatus = "Pinging server...";
                      });
                      ApiService.setBaseUrl(serverCtrl.text);
                      final res = await ApiService.pingServer();
                      setDialogState(() {
                        isPinging = false;
                        if (res['ok'] == true) {
                          pingStatus = "Connected! Latency: ${res['latencyMs']}ms (${res['service']})";
                        } else {
                          pingStatus = "Cannot reach server. Resilient offline engine will automatically handle logins.";
                        }
                      });
                    },
              child: isPinging
                  ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Text("Test Ping"),
            ),
            ElevatedButton(
              onPressed: () {
                ApiService.setBaseUrl(serverCtrl.text);
                Navigator.of(ctx).pop();
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text("Base URL updated: ${ApiService.baseUrl}")),
                );
              },
              child: const Text("Save"),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 580),
            child: SingleChildScrollView(
              child: Column(
                children: [
              // Top Bar with App Name and Settings Button
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      "Grexotix Platform",
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        color: Colors.white70,
                        letterSpacing: -0.2,
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.settings, color: Colors.white70, size: 22),
                      tooltip: "Server Configuration",
                      onPressed: _showServerSettings,
                    ),
                  ],
                ),
              ),

              // ================================================================
              // OFFICIAL GREXOTIX BRANDING HEADER (LOGO ON PURE WHITE)
              // ================================================================
              Center(
                child: Container(
                  width: double.infinity,
                  margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                  padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 16),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFF1E1B4B), Color(0xFF0F172A)],
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                    ),
                    borderRadius: BorderRadius.circular(22),
                    border: Border.all(color: Colors.white.withOpacity(0.14), width: 1.2),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.35),
                        blurRadius: 18,
                        offset: const Offset(0, 6),
                      ),
                    ],
                  ),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: [
                      // Official Grexotix Logo on Pure White Container
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFFFFFF),
                          borderRadius: BorderRadius.circular(16),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withOpacity(0.25),
                              blurRadius: 12,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        child: Image.asset(
                          'assets/grexotix_logo.png',
                          height: 44,
                          fit: BoxFit.contain,
                          alignment: Alignment.center,
                          errorBuilder: (ctx, err, stack) => const Icon(
                            Icons.school,
                            size: 44,
                            color: Color(0xFF7928CA),
                          ),
                        ),
                      ),
                      const SizedBox(height: 14),
                      const Text(
                        "Grexotix School Management",
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 18,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 0.3,
                        ),
                      ),
                      const SizedBox(height: 4),
                      const Text(
                        "Empowering Schools with Smart Management",
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          color: Color(0xFFC084FC),
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          letterSpacing: 0.2,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.12),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Text(
                          "Multi-School SaaS Platform • Product of Grexotix",
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            color: Color(0xFFE2E8F0),
                            fontSize: 11,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              // Visible “7 Days Free Trial” Button on First Screen
              Container(
                margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: () {
                    _tabController.animateTo(0);
                  },
                  icon: const Text("🎁", style: TextStyle(fontSize: 20)),
                  label: const Text(
                    "Start Your 7-Day Free Trial",
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w800,
                      color: Colors.white,
                      letterSpacing: 0.3,
                    ),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF7C3AED),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    elevation: 5,
                    shadowColor: const Color(0x667C3AED),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                ),
              ),

              // Main Auth Card
              Container(
                margin: const EdgeInsets.fromLTRB(16, 8, 16, 16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.25),
                      blurRadius: 20,
                      offset: const Offset(0, 8),
                    ),
                  ],
                ),
                child: Column(
                  children: [
                    // Tab Bar Role Selector
                    Container(
                      decoration: const BoxDecoration(
                        color: Color(0xFFF1F5F9),
                        borderRadius: BorderRadius.only(
                          topLeft: Radius.circular(20),
                          topRight: Radius.circular(20),
                        ),
                      ),
                      child: TabBar(
                        controller: _tabController,
                        labelColor: const Color(0xFF1D2F80),
                        unselectedLabelColor: const Color(0xFF596579),
                        indicatorColor: const Color(0xFF1D2F80),
                        indicatorWeight: 3,
                        isScrollable: true,
                        tabAlignment: TabAlignment.start,
                        labelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
                        tabs: const [
                          Tab(
                            icon: Icon(Icons.card_giftcard, size: 18),
                            text: "Register School (7-Day Trial)",
                          ),
                          Tab(
                            icon: Icon(Icons.admin_panel_settings, size: 18),
                            text: "Existing School Login",
                          ),
                          Tab(
                            icon: Icon(Icons.school, size: 18),
                            text: "Teacher Login",
                          ),
                          Tab(
                            icon: Icon(Icons.family_restroom, size: 18),
                            text: "Parent Login",
                          ),
                        ],
                      ),
                    ),

                    // Error Alert Banner (if any)
                    if (_errorMessage != null)
                      Container(
                        margin: const EdgeInsets.all(16),
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFEF2F2),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: const Color(0xFFFCA5A5)),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.error_outline, color: Color(0xFFDC2626), size: 20),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                _errorMessage!,
                                style: const TextStyle(color: Color(0xFF991B1B), fontSize: 12, fontWeight: FontWeight.w500),
                              ),
                            ),
                          ],
                        ),
                      ),

                    // Tab View Content (SizedBox with adequate height and scrollability)
                    SizedBox(
                      height: 600,
                      child: TabBarView(
                        controller: _tabController,
                        children: [
                          _buildRegisterTab(),
                          _buildAdminTab(),
                          _buildTeacherTab(),
                          _buildParentTab(),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              // Direct Demo Quick Login Pill Footer
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                child: Column(
                  children: [
                    const Text(
                      "⚡ Instant Demo Access (Preloaded Relational Data)",
                      style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11, fontWeight: FontWeight.w600),
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      runSpacing: 6,
                      alignment: WrapAlignment.center,
                      children: [
                        ElevatedButton.icon(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF1E293B),
                            foregroundColor: const Color(0xFFFCD34D),
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                            textStyle: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
                          ),
                          icon: const Icon(Icons.family_restroom, size: 14),
                          label: const Text("Parent (Aarav & Ananya)"),
                          onPressed: () {
                            ApiService.loginDemo('PARENT');
                            _onLoginSuccess('parent', isOffline: true);
                          },
                        ),
                        ElevatedButton.icon(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF1E293B),
                            foregroundColor: const Color(0xFF34D399),
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                            textStyle: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
                          ),
                          icon: const Icon(Icons.school, size: 14),
                          label: const Text("Teacher (Anitha)"),
                          onPressed: () {
                            ApiService.loginDemo('TEACHER');
                            _onLoginSuccess('teacher', isOffline: true);
                          },
                        ),
                        ElevatedButton.icon(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF1E293B),
                            foregroundColor: const Color(0xFF60A5FA),
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                            textStyle: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
                          ),
                          icon: const Icon(Icons.admin_panel_settings, size: 14),
                          label: const Text("School Admin"),
                          onPressed: () {
                            ApiService.loginDemo('SUPER_ADMIN');
                            _onLoginSuccess('admin', isOffline: true);
                          },
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Center(
                      child: TextButton.icon(
                        style: TextButton.styleFrom(foregroundColor: Colors.white38),
                        icon: const Icon(Icons.shield_outlined, size: 14),
                        label: const Text(
                          "Platform Superadmin Governance",
                          style: TextStyle(fontSize: 11, decoration: TextDecoration.underline),
                        ),
                        onPressed: _showPlatformAdminDialog,
                      ),
                    ),
                    const SizedBox(height: 12),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    ),
  ),
);
  }

  // --------------------------------------------------------------------------
  // Register School Form View (7-Day Trial)
  // --------------------------------------------------------------------------
  Widget _buildRegisterTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFFEDE9FE), Color(0xFFDDD6FE)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFC4B5FD)),
            ),
            child: const Row(
              children: [
                Text("🎁", style: TextStyle(fontSize: 24)),
                SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        "Start Your 7-Day Free Trial",
                        style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF5B21B6)),
                      ),
                      SizedBox(height: 2),
                      Text(
                        "Instant onboarding with full platform access. No credit card required.",
                        style: TextStyle(fontSize: 11, color: Color(0xFF6D28D9)),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),

          // 1. School Information
          const Text("School Details", style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF334155))),
          const SizedBox(height: 6),
          TextField(
            controller: _regSchoolNameCtrl,
            decoration: const InputDecoration(
              labelText: "Official School Name *",
              hintText: "e.g. St. Xavier International Academy",
              prefixIcon: Icon(Icons.apartment, color: Color(0xFF7C3AED)),
              border: OutlineInputBorder(),
              contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 12),
            ),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                flex: 3,
                child: TextField(
                  controller: _regAddressCtrl,
                  decoration: const InputDecoration(
                    labelText: "School Address *",
                    hintText: "Campus Road / Street",
                    prefixIcon: Icon(Icons.pin_drop, color: Color(0xFF7C3AED)),
                    border: OutlineInputBorder(),
                    contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                flex: 2,
                child: TextField(
                  controller: _regCityCtrl,
                  decoration: const InputDecoration(
                    labelText: "City *",
                    hintText: "Bangalore",
                    border: OutlineInputBorder(),
                    contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),

          // 2. Administrator Account & OTP Verifications
          const Text("Administrator Credentials & Verification", style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF334155))),
          const SizedBox(height: 6),
          TextField(
            controller: _regAdminNameCtrl,
            decoration: const InputDecoration(
              labelText: "Admin Full Name *",
              hintText: "e.g. Dr. Arthur Pendelton",
              prefixIcon: Icon(Icons.person, color: Color(0xFF7C3AED)),
              border: OutlineInputBorder(),
              contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 12),
            ),
          ),
          const SizedBox(height: 8),

          // Mobile & Phone OTP Verification
          Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Expanded(
                child: TextField(
                  controller: _regSchoolPhoneCtrl,
                  keyboardType: TextInputType.phone,
                  enabled: !_regPhoneVerified,
                  decoration: const InputDecoration(
                    labelText: "Admin Mobile Number *",
                    hintText: "10-digit mobile",
                    prefixIcon: Icon(Icons.phone_android, color: Color(0xFF7C3AED)),
                    border: OutlineInputBorder(),
                    contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              SizedBox(
                height: 48,
                child: ElevatedButton(
                  onPressed: _regPhoneVerified || _regPhoneSending || _regPhoneCooldown > 0
                      ? null
                      : _handleSendPhoneOtp,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: _regPhoneVerified ? const Color(0xFF059669) : const Color(0xFF7C3AED),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  child: _regPhoneSending
                      ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                      : Text(
                          _regPhoneVerified
                              ? "✓ Verified"
                              : (_regPhoneCooldown > 0 ? "${_regPhoneCooldown}s" : (_regPhoneOtpSent ? "Resend OTP" : "Send OTP")),
                          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                        ),
                ),
              ),
            ],
          ),

          // Phone OTP Input Row
          if (_regPhoneOtpSent && !_regPhoneVerified) ...[
            const SizedBox(height: 6),
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: const Color(0xFFCBD5E1)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _regPhoneOtpCtrl,
                          keyboardType: TextInputType.number,
                          maxLength: 6,
                          decoration: const InputDecoration(
                            counterText: "",
                            labelText: "Enter 6-Digit Phone OTP *",
                            hintText: "••••••",
                            prefixIcon: Icon(Icons.sms, color: Color(0xFF7C3AED), size: 18),
                            border: OutlineInputBorder(),
                            contentPadding: EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                            isDense: true,
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      SizedBox(
                        height: 38,
                        child: ElevatedButton(
                          onPressed: _regPhoneVerifying ? null : _handleVerifyPhoneOtp,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF059669),
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                          ),
                          child: _regPhoneVerifying
                              ? const SizedBox(width: 12, height: 12, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                              : const Text("Verify OTP", style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                        ),
                      ),
                    ],
                  ),
                  if (_regPhoneDevHint != null) ...[
                    const SizedBox(height: 4),
                    Text(
                      "Sandbox Hint: Use OTP ${_regPhoneDevHint}",
                      style: const TextStyle(fontSize: 10, color: Color(0xFF6D28D9), fontWeight: FontWeight.w600),
                    ),
                  ],
                ],
              ),
            ),
          ],
          if (_regPhoneVerified) ...[
            const SizedBox(height: 4),
            const Row(
              children: [
                Icon(Icons.check_circle, color: Color(0xFF059669), size: 14),
                SizedBox(width: 4),
                Text("Phone Verified via OTP", style: TextStyle(color: Color(0xFF059669), fontSize: 11, fontWeight: FontWeight.bold)),
              ],
            ),
          ],
          const SizedBox(height: 10),

          // Email & Email OTP Verification
          Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Expanded(
                child: TextField(
                  controller: _regSchoolEmailCtrl,
                  keyboardType: TextInputType.emailAddress,
                  enabled: !_regEmailVerified,
                  decoration: const InputDecoration(
                    labelText: "Admin Email Address *",
                    hintText: "admin@school.edu",
                    prefixIcon: Icon(Icons.email, color: Color(0xFF7C3AED)),
                    border: OutlineInputBorder(),
                    contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              SizedBox(
                height: 48,
                child: ElevatedButton(
                  onPressed: _regEmailVerified || _regEmailSending || _regEmailCooldown > 0
                      ? null
                      : _handleSendEmailOtp,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: _regEmailVerified ? const Color(0xFF059669) : const Color(0xFF7C3AED),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  child: _regEmailSending
                      ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                      : Text(
                          _regEmailVerified
                              ? "✓ Verified"
                              : (_regEmailCooldown > 0 ? "${_regEmailCooldown}s" : (_regEmailOtpSent ? "Resend Code" : "Send Code")),
                          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                        ),
                ),
              ),
            ],
          ),

          // Email OTP Input Row
          if (_regEmailOtpSent && !_regEmailVerified) ...[
            const SizedBox(height: 6),
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: const Color(0xFFCBD5E1)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _regEmailOtpCtrl,
                          keyboardType: TextInputType.number,
                          maxLength: 6,
                          decoration: const InputDecoration(
                            counterText: "",
                            labelText: "Enter 6-Digit Email Code *",
                            hintText: "••••••",
                            prefixIcon: Icon(Icons.mark_email_read, color: Color(0xFF7C3AED), size: 18),
                            border: OutlineInputBorder(),
                            contentPadding: EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                            isDense: true,
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      SizedBox(
                        height: 38,
                        child: ElevatedButton(
                          onPressed: _regEmailVerifying ? null : _handleVerifyEmailOtp,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF059669),
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                          ),
                          child: _regEmailVerifying
                              ? const SizedBox(width: 12, height: 12, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                              : const Text("Verify Code", style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                        ),
                      ),
                    ],
                  ),
                  if (_regEmailDevHint != null) ...[
                    const SizedBox(height: 4),
                    Text(
                      "Sandbox Hint: Use Code ${_regEmailDevHint}",
                      style: const TextStyle(fontSize: 10, color: Color(0xFF6D28D9), fontWeight: FontWeight.w600),
                    ),
                  ],
                ],
              ),
            ),
          ],
          if (_regEmailVerified) ...[
            const SizedBox(height: 4),
            const Row(
              children: [
                Icon(Icons.check_circle, color: Color(0xFF059669), size: 14),
                SizedBox(width: 4),
                Text("Email Verified via Code", style: TextStyle(color: Color(0xFF059669), fontSize: 11, fontWeight: FontWeight.bold)),
              ],
            ),
          ],
          const SizedBox(height: 10),

          // Password & Confirm Password
          TextField(
            controller: _regAdminPassCtrl,
            obscureText: _obscureRegPass,
            decoration: InputDecoration(
              labelText: "Password * (Min 8 chars)",
              prefixIcon: const Icon(Icons.lock, color: Color(0xFF7C3AED)),
              border: const OutlineInputBorder(),
              contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
              suffixIcon: IconButton(
                icon: Icon(_obscureRegPass ? Icons.visibility_off : Icons.visibility),
                onPressed: () => setState(() => _obscureRegPass = !_obscureRegPass),
              ),
            ),
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _regConfirmPassCtrl,
            obscureText: _obscureRegConfirmPass,
            decoration: InputDecoration(
              labelText: "Confirm Password *",
              prefixIcon: const Icon(Icons.lock_outline, color: Color(0xFF7C3AED)),
              border: const OutlineInputBorder(),
              contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
              suffixIcon: IconButton(
                icon: Icon(_obscureRegConfirmPass ? Icons.visibility_off : Icons.visibility),
                onPressed: () => setState(() => _obscureRegConfirmPass = !_obscureRegConfirmPass),
              ),
            ),
          ),
          const SizedBox(height: 16),

          ElevatedButton(
            onPressed: _isLoading ? null : _handleSchoolRegister,
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF7C3AED),
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            child: _isLoading
                ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                : const Text("🎁 Start 7-Day Free Trial", style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Colors.white)),
          ),
        ],
      ),
    );
  }

  // --------------------------------------------------------------------------
  // Parent Form View
  // --------------------------------------------------------------------------
  Widget _buildParentTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text(
            "Parent Account Login",
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
          ),
          const SizedBox(height: 4),
          const Text(
            "Enter your registered mobile number to automatically access all your enrolled children under one account.",
            style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _parentMobileCtrl,
            keyboardType: TextInputType.phone,
            decoration: const InputDecoration(
              labelText: "Registered Parent Mobile Number",
              hintText: "e.g. 9876543210 or +91 9876543210",
              prefixIcon: Icon(Icons.phone_android, color: Color(0xFF1E3A8A)),
              border: OutlineInputBorder(),
              contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 14),
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _parentAdmissionCtrl,
            decoration: const InputDecoration(
              labelText: "Student Admission Number (Optional)",
              hintText: "e.g. REX-2024-001 (Optional)",
              prefixIcon: Icon(Icons.badge, color: Color(0xFF1E3A8A)),
              border: OutlineInputBorder(),
              contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 14),
            ),
          ),
          const SizedBox(height: 20),
          ElevatedButton(
            onPressed: _isLoading ? null : _handleParentLogin,
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF1E3A8A),
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            child: _isLoading
                ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                : const Text("Sign In to Parent Account", style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Colors.white)),
          ),
          const SizedBox(height: 12),
          Center(
            child: TextButton.icon(
              icon: const Icon(Icons.touch_app, size: 16),
              label: const Text("Auto-fill Parent (+91 98765 43210 • 2 Wards)", style: TextStyle(fontSize: 12)),
              onPressed: () {
                _parentAdmissionCtrl.text = "";
                _parentMobileCtrl.text = "9876543210";
              },
            ),
          ),
        ],
      ),
    );
  }

  // --------------------------------------------------------------------------
  // Teacher Form View (Username & Password default, Mobile OTP secondary)
  // --------------------------------------------------------------------------
  Widget _buildTeacherTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                _teacherUseOtp ? "Teacher Mobile OTP Sign In" : "Teacher Username & Password",
                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
              ),
              TextButton(
                onPressed: () => setState(() => _teacherUseOtp = !_teacherUseOtp),
                child: Text(
                  _teacherUseOtp ? "Use Password" : "Use SMS OTP",
                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF059669)),
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            _teacherUseOtp
                ? "Dispatches a 6-digit verification code to your registered mobile number."
                : "Enter your staff username/email and password to access your teaching dashboard.",
            style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
          ),
          const SizedBox(height: 14),

          if (!_teacherUseOtp) ...[
            TextField(
              controller: _teacherSchoolIdCtrl,
              textCapitalization: TextCapitalization.characters,
              decoration: const InputDecoration(
                labelText: "School ID (Optional)",
                hintText: "e.g. GRX-SCH-XXXXXX (Optional)",
                prefixIcon: Icon(Icons.apartment, color: Color(0xFF059669)),
                border: OutlineInputBorder(),
                contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 14),
              ),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: _teacherUserCtrl,
              decoration: const InputDecoration(
                labelText: "Teacher Username or Email *",
                hintText: "e.g. anitha.math or anitha@school.edu",
                prefixIcon: Icon(Icons.person, color: Color(0xFF059669)),
                border: OutlineInputBorder(),
                contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 14),
              ),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: _teacherPassCtrl,
              obscureText: _obscureTeacherPass,
              decoration: InputDecoration(
                labelText: "Password *",
                prefixIcon: const Icon(Icons.lock, color: Color(0xFF059669)),
                border: const OutlineInputBorder(),
                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
                suffixIcon: IconButton(
                  icon: Icon(_obscureTeacherPass ? Icons.visibility_off : Icons.visibility),
                  onPressed: () => setState(() => _obscureTeacherPass = !_obscureTeacherPass),
                ),
              ),
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: _isLoading ? null : _handleTeacherPasswordLogin,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF059669),
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              child: _isLoading
                  ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                  : const Text("Sign In with Username & Password", style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Colors.white)),
            ),
          ] else ...[
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _teacherMobileCtrl,
                    keyboardType: TextInputType.phone,
                    enabled: !_otpSent,
                    decoration: const InputDecoration(
                      labelText: "Teacher Mobile Number",
                      hintText: "9876500004",
                      prefixIcon: Icon(Icons.phone_iphone, color: Color(0xFF059669)),
                      border: OutlineInputBorder(),
                      contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 14),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                ElevatedButton(
                  onPressed: _isLoading ? null : _handleTeacherSendOtp,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF059669),
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  child: Text(
                    _otpSent ? "Resend" : "Send OTP",
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white),
                  ),
                ),
              ],
            ),
            if (_otpDevHint != null) ...[
              const SizedBox(height: 6),
              Text(_otpDevHint!, style: const TextStyle(color: Color(0xFF059669), fontSize: 11, fontWeight: FontWeight.w600)),
            ],
            const SizedBox(height: 12),
            TextField(
              controller: _teacherOtpCtrl,
              keyboardType: TextInputType.number,
              maxLength: 6,
              enabled: _otpSent,
              decoration: const InputDecoration(
                labelText: "Enter 6-Digit OTP Code",
                hintText: "123456",
                prefixIcon: Icon(Icons.password, color: Color(0xFF059669)),
                border: OutlineInputBorder(),
                contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 14),
                counterText: "",
              ),
            ),
            const SizedBox(height: 14),
            ElevatedButton(
              onPressed: (_isLoading || !_otpSent) ? null : _handleTeacherVerifyOtp,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF059669),
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              child: _isLoading
                  ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                  : const Text("Verify OTP & Sign In", style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Colors.white)),
            ),
          ],

          const SizedBox(height: 10),
          Center(
            child: TextButton.icon(
              icon: const Icon(Icons.touch_app, size: 16),
              label: const Text("Auto-fill Teacher (anitha.math • Teacher123!)", style: TextStyle(fontSize: 11)),
              onPressed: () {
                _teacherUserCtrl.text = "anitha.math";
                _teacherPassCtrl.text = "Teacher123!";
                _teacherMobileCtrl.text = "9876500004";
                _teacherOtpCtrl.text = "123456";
                setState(() => _teacherUseOtp = false);
              },
            ),
          ),
        ],
      ),
    );
  }

  // --------------------------------------------------------------------------
  // Super Admin Form View
  // --------------------------------------------------------------------------
  Widget _buildAdminTab() {
    return Padding(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text(
            "School Admin Workspace Access",
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
          ),
          const SizedBox(height: 4),
          const Text(
            "Sign in with your permanent School ID and administrator credentials.",
            style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
          ),
          const SizedBox(height: 14),
          TextField(
            controller: _adminSchoolIdCtrl,
            textCapitalization: TextCapitalization.characters,
            decoration: const InputDecoration(
              labelText: "School ID (e.g. GRX-SCH-XXXXXX)",
              hintText: "Optional for default campus",
              prefixIcon: Icon(Icons.apartment, color: Color(0xFF1E3A8A)),
              border: OutlineInputBorder(),
              contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 14),
            ),
          ),
          const SizedBox(height: 10),
          TextField(
            controller: _adminUserCtrl,
            decoration: const InputDecoration(
              labelText: "Username or Email",
              hintText: "admin",
              prefixIcon: Icon(Icons.admin_panel_settings, color: Color(0xFF1E3A8A)),
              border: OutlineInputBorder(),
              contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 14),
            ),
          ),
          const SizedBox(height: 10),
          TextField(
            controller: _adminPassCtrl,
            obscureText: _obscureAdminPass,
            decoration: InputDecoration(
              labelText: "Admin Password",
              prefixIcon: const Icon(Icons.lock, color: Color(0xFF1E3A8A)),
              border: const OutlineInputBorder(),
              contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
              suffixIcon: IconButton(
                icon: Icon(_obscureAdminPass ? Icons.visibility_off : Icons.visibility),
                onPressed: () => setState(() => _obscureAdminPass = !_obscureAdminPass),
              ),
            ),
          ),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: _isLoading ? null : _handleAdminLogin,
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF1E3A8A),
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            child: _isLoading
                ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                : const Text("Sign In to School Workspace", style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Colors.white)),
          ),
          const SizedBox(height: 8),
          OutlinedButton.icon(
            icon: const Icon(Icons.rocket_launch, size: 16, color: Color(0xFF7C3AED)),
            label: const Text("Register School (7-Day Free Trial)", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF7C3AED))),
            style: OutlinedButton.styleFrom(
              side: const BorderSide(color: Color(0xFF7C3AED)),
              padding: const EdgeInsets.symmetric(vertical: 10),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            onPressed: _showRegisterSchoolDialog,
          ),
        ],
      ),
    );
  }
}
