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

  // Parent form
  final _parentAdmissionCtrl = TextEditingController(text: 'REX-2024-001');
  final _parentMobileCtrl = TextEditingController(text: '9876543210');

  // Teacher form
  final _teacherMobileCtrl = TextEditingController(text: '9876500004');
  final _teacherOtpCtrl = TextEditingController();
  bool _otpSent = false;
  String? _otpDevHint;

  // Admin form
  final _adminUserCtrl = TextEditingController(text: 'admin');
  final _adminPassCtrl = TextEditingController(text: 'AdminPassword123!');
  bool _obscureAdminPass = true;

  bool _isLoading = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    _parentAdmissionCtrl.dispose();
    _parentMobileCtrl.dispose();
    _teacherMobileCtrl.dispose();
    _teacherOtpCtrl.dispose();
    _adminUserCtrl.dispose();
    _adminPassCtrl.dispose();
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
  // Teacher OTP Flow
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
    final user = _adminUserCtrl.text.trim();
    final pass = _adminPassCtrl.text;

    if (user.isEmpty || pass.isEmpty) {
      setState(() => _errorMessage = "Please enter Admin username and password.");
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final res = await ApiService.loginAdmin(user, pass);
    setState(() => _isLoading = false);

    if (res['success'] == true) {
      _onLoginSuccess('admin', isOffline: res['isOffline'] == true);
    } else {
      setState(() => _errorMessage = res['error'] ?? "Invalid admin credentials.");
    }
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

              // Main Auth Card
              Container(
                margin: const EdgeInsets.fromLTRB(16, 12, 16, 16),
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
                        labelColor: const Color(0xFF1E3A8A),
                        unselectedLabelColor: const Color(0xFF64748B),
                        indicatorColor: const Color(0xFF1E3A8A),
                        indicatorWeight: 3,
                        labelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                        tabs: const [
                          Tab(
                            icon: Icon(Icons.family_restroom, size: 20),
                            text: "Parent",
                          ),
                          Tab(
                            icon: Icon(Icons.school, size: 20),
                            text: "Teacher (OTP)",
                          ),
                          Tab(
                            icon: Icon(Icons.admin_panel_settings, size: 20),
                            text: "Admin",
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

                    // Tab View Content
                    SizedBox(
                      height: 380,
                      child: TabBarView(
                        controller: _tabController,
                        children: [
                          _buildParentTab(),
                          _buildTeacherTab(),
                          _buildAdminTab(),
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
                          label: const Text("Teacher (Sarah - 10-A)"),
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
                          label: const Text("Super Admin"),
                          onPressed: () {
                            ApiService.loginDemo('SUPER_ADMIN');
                            _onLoginSuccess('admin', isOffline: true);
                          },
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
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
  // Parent Form View
  // --------------------------------------------------------------------------
  Widget _buildParentTab() {
    return Padding(
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
  // Teacher Form View (Mobile + SMS OTP)
  // --------------------------------------------------------------------------
  Widget _buildTeacherTab() {
    return Padding(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text(
            "Teacher Mobile OTP Verification",
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
          ),
          const SizedBox(height: 4),
          const Text(
            "Enter your registered teacher phone number. An automated 6-digit OTP will be dispatched via SMS.",
            style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
          ),
          const SizedBox(height: 16),
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
          const SizedBox(height: 8),
          Center(
            child: TextButton.icon(
              icon: const Icon(Icons.touch_app, size: 16),
              label: const Text("Auto-fill Teacher Sarah Jenkins (9876500004)", style: TextStyle(fontSize: 11)),
              onPressed: () {
                _teacherMobileCtrl.text = "9876500004";
                _teacherOtpCtrl.text = "123456";
                setState(() => _otpSent = true);
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
            "Super Admin Management",
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
          ),
          const SizedBox(height: 4),
          const Text(
            "Enter administrative credentials for school-wide control and master records.",
            style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
          ),
          const SizedBox(height: 16),
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
          const SizedBox(height: 12),
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
          const SizedBox(height: 20),
          ElevatedButton(
            onPressed: _isLoading ? null : _handleAdminLogin,
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF1E3A8A),
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            child: _isLoading
                ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                : const Text("Login as Super Admin", style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Colors.white)),
          ),
          const SizedBox(height: 12),
          Center(
            child: TextButton.icon(
              icon: const Icon(Icons.touch_app, size: 16),
              label: const Text("Auto-fill Super Admin Credentials", style: TextStyle(fontSize: 12)),
              onPressed: () {
                _adminUserCtrl.text = "admin";
                _adminPassCtrl.text = "AdminPassword123!";
              },
            ),
          ),
        ],
      ),
    );
  }
}
