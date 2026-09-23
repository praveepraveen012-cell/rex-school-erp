import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/erp_provider.dart';
import 'dashboard_screen.dart';
import 'attendance_screen.dart';
import 'fees_screen.dart';
import 'bus_tracker_screen.dart';
import 'parent_portal_screen.dart';
import 'homework_screen.dart';
import 'leave_screen.dart';
import 'report_card_screen.dart';

class MainNavigationScreen extends StatefulWidget {
  const MainNavigationScreen({super.key});

  @override
  State<MainNavigationScreen> createState() => _MainNavigationScreenState();
}

class _MainNavigationScreenState extends State<MainNavigationScreen> {
  int _currentIndex = 0;

  final List<Widget> _pages = const [
    DashboardScreen(),
    AttendanceScreen(),
    FeesScreen(),
    BusTrackerScreen(),
    ParentPortalScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    final erp = Provider.of<ERPProvider>(context);

    return Scaffold(
      appBar: AppBar(
        backgroundColor: const Color(0xFF0F172A),
        foregroundColor: Colors.white,
        elevation: 0,
        leading: Builder(
          builder: (ctx) => IconButton(
            icon: const Icon(Icons.menu_rounded, color: Colors.white),
            onPressed: () => Scaffold.of(ctx).openDrawer(),
          ),
        ),
        title: Row(
          children: [
            Image.asset(
              'assets/logo.png',
              height: 28,
              errorBuilder: (ctx, err, stack) => const Icon(
                Icons.school,
                color: Color(0xFFF59E0B),
                size: 24,
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: const [
                  Text(
                    "Rex SSS ERP",
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.bold,
                      letterSpacing: -0.2,
                    ),
                  ),
                  Text(
                    "CBSE #1930000 • Nilgiris",
                    style: TextStyle(
                      fontSize: 10,
                      color: Colors.white70,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          // Audio chime mute/unmute button
          IconButton(
            tooltip: erp.soundEnabled ? "Sound Alerts On" : "Muted",
            icon: Icon(
              erp.soundEnabled ? Icons.volume_up : Icons.volume_off,
              color: erp.soundEnabled ? const Color(0xFFF59E0B) : Colors.white38,
              size: 20,
            ),
            onPressed: () => erp.toggleSound(),
          ),

          // Role Switcher Popup Menu
          PopupMenuButton<String>(
            tooltip: "Switch Role Perspective",
            initialValue: erp.currentRole,
            onSelected: (role) {
              erp.switchRole(role);
              if (role == 'parent') {
                setState(() => _currentIndex = 4); // Go to parent portal
              }
            },
            itemBuilder: (ctx) => [
              const PopupMenuItem(
                value: 'admin',
                child: Row(
                  children: [
                    Icon(Icons.admin_panel_settings,
                        color: Color(0xFF1E3A8A), size: 18),
                    SizedBox(width: 8),
                    Text("Principal (Admin)"),
                  ],
                ),
              ),
              const PopupMenuItem(
                value: 'teacher',
                child: Row(
                  children: [
                    Icon(Icons.edit_note, color: Color(0xFF059669), size: 18),
                    SizedBox(width: 8),
                    Text("Teacher (10-A)"),
                  ],
                ),
              ),
              const PopupMenuItem(
                value: 'parent',
                child: Row(
                  children: [
                    Icon(Icons.family_restroom,
                        color: Color(0xFF7C3AED), size: 18),
                    SizedBox(width: 8),
                    Text("Parent (Aarav Sharma)"),
                  ],
                ),
              ),
            ],
            child: Container(
              margin: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.12),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.white.withOpacity(0.2)),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    erp.currentRole == 'admin'
                        ? Icons.admin_panel_settings
                        : erp.currentRole == 'teacher'
                            ? Icons.edit_note
                            : Icons.family_restroom,
                    color: const Color(0xFFFCD34D),
                    size: 14,
                  ),
                  const SizedBox(width: 6),
                  Text(
                    erp.currentRole == 'admin'
                        ? "Principal"
                        : erp.currentRole == 'teacher'
                            ? "Teacher"
                            : "Parent",
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(width: 4),
                  const Icon(Icons.arrow_drop_down,
                      color: Colors.white70, size: 16),
                ],
              ),
            ),
          ),
          const SizedBox(width: 4),
        ],
      ),

      drawer: Drawer(
        child: Column(
          children: [
            // Drawer Header
            Container(
              width: double.infinity,
              padding: const EdgeInsets.fromLTRB(20, 50, 20, 24),
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  colors: [Color(0xFF0F172A), Color(0xFF1E3A8A)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Image.asset(
                          'assets/logo.png',
                          height: 38,
                          errorBuilder: (ctx, err, stack) => const Icon(
                            Icons.school,
                            size: 32,
                            color: Color(0xFF1E3A8A),
                          ),
                        ),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: const [
                            Text(
                              "Rex Senior Sec. School",
                              style: TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.bold,
                                fontSize: 15,
                              ),
                            ),
                            Text(
                              "Christus Rex • Ootacamund",
                              style: TextStyle(
                                color: Colors.white70,
                                fontSize: 11,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.12),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: const Text(
                      "CBSE Affiliation #1930000 • Code 55120",
                      style: TextStyle(
                        color: Color(0xFFFCD34D),
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ],
              ),
            ),

            // Navigation List Items
            Expanded(
              child: ListView(
                padding: EdgeInsets.zero,
                children: [
                  _buildDrawerSectionHeader("PRIMARY MODULES"),
                  _buildDrawerItem(
                    icon: Icons.dashboard_outlined,
                    title: "Principal Pulse Dashboard",
                    isSelected: _currentIndex == 0,
                    onTap: () {
                      Navigator.pop(context);
                      setState(() => _currentIndex = 0);
                    },
                  ),
                  _buildDrawerItem(
                    icon: Icons.how_to_reg_outlined,
                    title: "Smart Attendance Register",
                    isSelected: _currentIndex == 1,
                    onTap: () {
                      Navigator.pop(context);
                      setState(() => _currentIndex = 1);
                    },
                  ),
                  _buildDrawerItem(
                    icon: Icons.account_balance_wallet_outlined,
                    title: "Fee Cashier & Ledger",
                    isSelected: _currentIndex == 2,
                    onTap: () {
                      Navigator.pop(context);
                      setState(() => _currentIndex = 2);
                    },
                  ),
                  _buildDrawerItem(
                    icon: Icons.directions_bus_outlined,
                    title: "Live GPS Bus Fleet",
                    isSelected: _currentIndex == 3,
                    onTap: () {
                      Navigator.pop(context);
                      setState(() => _currentIndex = 3);
                    },
                  ),
                  _buildDrawerItem(
                    icon: Icons.family_restroom_outlined,
                    title: "Parent Portal & 500m Radar",
                    isSelected: _currentIndex == 4,
                    onTap: () {
                      Navigator.pop(context);
                      setState(() => _currentIndex = 4);
                    },
                  ),

                  _buildDrawerSectionHeader("STUDENT SERVICES"),
                  _buildDrawerItem(
                    icon: Icons.menu_book_outlined,
                    title: "Digital Homework Diary",
                    onTap: () {
                      Navigator.pop(context);
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                            builder: (_) => const HomeworkScreen()),
                      );
                    },
                  ),
                  _buildDrawerItem(
                    icon: Icons.event_note_outlined,
                    title: "Student Leave Desk",
                    onTap: () {
                      Navigator.pop(context);
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const LeaveScreen()),
                      );
                    },
                  ),
                  _buildDrawerItem(
                    icon: Icons.grade_outlined,
                    title: "Official CBSE Marksheet",
                    onTap: () {
                      Navigator.pop(context);
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                            builder: (_) => const ReportCardScreen()),
                      );
                    },
                  ),

                  _buildDrawerSectionHeader("TELEMATICS"),
                  ListTile(
                    leading: const Icon(Icons.radar, color: Color(0xFF2563EB)),
                    title: const Text(
                      "Test 500m Geofence Alarm",
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF2563EB),
                      ),
                    ),
                    subtitle: const Text(
                      "Plays chime & opens proximity modal",
                      style: TextStyle(fontSize: 11),
                    ),
                    onTap: () {
                      Navigator.pop(context);
                      setState(() => _currentIndex = 4); // Go to parent portal
                      erp.trigger500mProximity();
                    },
                  ),
                ],
              ),
            ),

            // Footer
            Container(
              padding: const EdgeInsets.all(16),
              color: const Color(0xFFF8FAFC),
              child: Row(
                children: [
                  const Icon(Icons.shield_outlined,
                      color: Color(0xFF16A34A), size: 18),
                  const SizedBox(width: 8),
                  const Expanded(
                    child: Text(
                      "Rex SSS Safe Campus ERP • v2.4",
                      style: TextStyle(
                        fontSize: 11,
                        color: Color(0xFF64748B),
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),

      body: IndexedStack(
        index: _currentIndex,
        children: _pages,
      ),

      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.06),
              blurRadius: 10,
              offset: const Offset(0, -3),
            ),
          ],
        ),
        child: BottomNavigationBar(
          currentIndex: _currentIndex,
          onTap: (index) => setState(() => _currentIndex = index),
          type: BottomNavigationBarType.fixed,
          backgroundColor: Colors.white,
          selectedItemColor: const Color(0xFF1E3A8A),
          unselectedItemColor: const Color(0xFF94A3B8),
          selectedLabelStyle:
              const TextStyle(fontWeight: FontWeight.bold, fontSize: 11),
          unselectedLabelStyle: const TextStyle(fontSize: 11),
          elevation: 0,
          items: const [
            BottomNavigationBarItem(
              icon: Icon(Icons.dashboard_outlined),
              activeIcon: Icon(Icons.dashboard_rounded),
              label: "Pulse",
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.how_to_reg_outlined),
              activeIcon: Icon(Icons.how_to_reg_rounded),
              label: "Attendance",
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.account_balance_wallet_outlined),
              activeIcon: Icon(Icons.account_balance_wallet_rounded),
              label: "Fees",
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.directions_bus_outlined),
              activeIcon: Icon(Icons.directions_bus_filled_rounded),
              label: "Bus GPS",
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.family_restroom_outlined),
              activeIcon: Icon(Icons.family_restroom_rounded),
              label: "Parent Portal",
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDrawerSectionHeader(String title) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 6),
      child: Text(
        title,
        style: const TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.bold,
          color: Color(0xFF94A3B8),
          letterSpacing: 0.8,
        ),
      ),
    );
  }

  Widget _buildDrawerItem({
    required IconData icon,
    required String title,
    bool isSelected = false,
    required VoidCallback onTap,
  }) {
    return ListTile(
      leading: Icon(
        icon,
        color: isSelected ? const Color(0xFF1E3A8A) : const Color(0xFF64748B),
        size: 20,
      ),
      title: Text(
        title,
        style: TextStyle(
          fontSize: 13,
          fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
          color:
              isSelected ? const Color(0xFF1E3A8A) : const Color(0xFF334155),
        ),
      ),
      dense: true,
      selected: isSelected,
      selectedTileColor: const Color(0xFFEFF6FF),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      onTap: onTap,
    );
  }
}
