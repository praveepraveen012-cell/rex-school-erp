import 'package:flutter/material.dart';
import '../services/api_service.dart';

class HrManagementScreen extends StatefulWidget {
  final int initialTab;
  const HrManagementScreen({super.key, this.initialTab = 0});

  @override
  State<HrManagementScreen> createState() => _HrManagementScreenState();
}

class _HrManagementScreenState extends State<HrManagementScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  // Staff Attendance State
  List<dynamic> _staffAttendance = [];
  Map<String, dynamic> _attendanceStats = {};
  bool _loadingAttendance = true;

  // Staff Leaves State
  List<dynamic> _leaves = [];
  bool _loadingLeaves = true;

  // Payroll State
  List<dynamic> _payroll = [];
  num _totalDisbursed = 0;
  bool _loadingPayroll = true;

  // Staff Evaluations State
  List<dynamic> _evaluations = [];
  bool _loadingEvaluations = true;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this, initialIndex: widget.initialTab);
    _loadAll();
  }

  void _loadAll() {
    _fetchAttendance();
    _fetchLeaves();
    _fetchPayroll();
    _fetchEvaluations();
  }

  Future<void> _fetchAttendance() async {
    final res = await ApiService.getStaffAttendance();
    if (mounted) {
      setState(() {
        _loadingAttendance = false;
        if (res['success'] == true) {
          _staffAttendance = res['attendance'] ?? [];
          _attendanceStats = res['stats'] ?? {};
        }
      });
    }
  }

  Future<void> _fetchLeaves() async {
    final res = await ApiService.getStaffLeaves();
    if (mounted) {
      setState(() {
        _loadingLeaves = false;
        if (res['success'] == true) _leaves = res['leaves'] ?? [];
      });
    }
  }

  Future<void> _fetchPayroll() async {
    final res = await ApiService.getPayroll(month: '2026-09');
    if (mounted) {
      setState(() {
        _loadingPayroll = false;
        if (res['success'] == true) {
          _payroll = res['payroll'] ?? [];
          _totalDisbursed = res['totalDisbursed'] ?? 0;
        }
      });
    }
  }

  Future<void> _fetchEvaluations() async {
    final res = await ApiService.getStaffEvaluations();
    if (mounted) {
      setState(() {
        _loadingEvaluations = false;
        if (res['success'] == true) _evaluations = res['evaluations'] ?? [];
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text(
          "HR & Staff Operations",
          style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white, fontSize: 17),
        ),
        backgroundColor: const Color(0xFF1E3A8A),
        iconTheme: const IconThemeData(color: Colors.white),
        bottom: TabBar(
          controller: _tabController,
          isScrollable: true,
          indicatorColor: const Color(0xFFF59E0B),
          indicatorWeight: 3,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white70,
          tabs: const [
            Tab(icon: Icon(Icons.co_present_rounded, size: 18), text: "Attendance"),
            Tab(icon: Icon(Icons.beach_access_rounded, size: 18), text: "Leaves"),
            Tab(icon: Icon(Icons.payments_rounded, size: 18), text: "Payroll & Payslips"),
            Tab(icon: Icon(Icons.star_rate_rounded, size: 18), text: "Performance"),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildAttendanceTab(),
          _buildLeavesTab(),
          _buildPayrollTab(),
          _buildEvaluationsTab(),
        ],
      ),
    );
  }

  // --------------------------------------------------------------------------
  // 1. Staff Attendance Tab
  // --------------------------------------------------------------------------
  Widget _buildAttendanceTab() {
    if (_loadingAttendance) {
      return const Center(child: CircularProgressIndicator(color: Color(0xFF1E3A8A)));
    }
    return RefreshIndicator(
      onRefresh: _fetchAttendance,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Stat Cards
          Row(
            children: [
              Expanded(
                child: _buildAttendanceStatCard("Present", "${_attendanceStats['present'] ?? 0}", const Color(0xFF16A34A), Icons.check_circle),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _buildAttendanceStatCard("Absent", "${_attendanceStats['absent'] ?? 0}", const Color(0xFFDC2626), Icons.cancel),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _buildAttendanceStatCard("On Leave", "${_attendanceStats['leave'] ?? 0}", const Color(0xFFF59E0B), Icons.beach_access),
              ),
            ],
          ),
          const SizedBox(height: 18),
          const Text("Today's Staff Log", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Color(0xFF0F172A))),
          const SizedBox(height: 10),
          ..._staffAttendance.map((s) {
            final status = s['status'] ?? 'PRESENT';
            final isP = status == 'PRESENT';
            final isA = status == 'ABSENT';
            return Card(
              margin: const EdgeInsets.only(bottom: 8),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              child: ListTile(
                leading: CircleAvatar(
                  backgroundColor: const Color(0xFFEEF2FF),
                  child: Text(s['staffName']?[0] ?? 'S', style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF1E3A8A))),
                ),
                title: Text(s['staffName'] ?? '', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                subtitle: Text("Emp ID: ${s['empId']} • Dept: ${s['department'] ?? 'Academic'}", style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                trailing: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: isP ? const Color(0xFFDCFCE7) : (isA ? const Color(0xFFFEE2E2) : const Color(0xFFFEF3C7)),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    status,
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      color: isP ? const Color(0xFF166534) : (isA ? const Color(0xFF991B1B) : const Color(0xFF92400E)),
                    ),
                  ),
                ),
              ),
            );
          }),
        ],
      ),
    );
  }

  Widget _buildAttendanceStatCard(String label, String value, Color color, IconData icon) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withOpacity(0.08),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withOpacity(0.2)),
      ),
      child: Column(
        children: [
          Icon(icon, color: color, size: 20),
          const SizedBox(height: 4),
          Text(value, style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: color)),
          Text(label, style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
        ],
      ),
    );
  }

  // --------------------------------------------------------------------------
  // 2. Staff Leaves Tab
  // --------------------------------------------------------------------------
  Widget _buildLeavesTab() {
    if (_loadingLeaves) {
      return const Center(child: CircularProgressIndicator(color: Color(0xFF1E3A8A)));
    }
    return RefreshIndicator(
      onRefresh: _fetchLeaves,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text("Staff Leave Applications (${_leaves.length})", style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Color(0xFF0F172A))),
          const SizedBox(height: 12),
          ..._leaves.map((l) {
            final isPending = l['status'] == 'PENDING';
            return Card(
              margin: const EdgeInsets.only(bottom: 12),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(l['staffName'] ?? '', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: isPending ? const Color(0xFFFEF3C7) : const Color(0xFFDCFCE7),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            l['status'] ?? 'PENDING',
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                              color: isPending ? const Color(0xFF92400E) : const Color(0xFF166534),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      "Type: ${l['leaveType']} • Duration: ${l['startDate']} to ${l['endDate']} (${l['days'] ?? 1} Days)",
                      style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                    ),
                    const SizedBox(height: 6),
                    Text("Reason: ${l['reason'] ?? 'Not specified'}", style: const TextStyle(fontSize: 12, color: Color(0xFF334155))),
                    if (isPending) ...[
                      const Divider(height: 16),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.end,
                        children: [
                          OutlinedButton(
                            onPressed: () async {
                              await ApiService.reviewStaffLeave(l['id'], 'REJECTED');
                              _fetchLeaves();
                            },
                            child: const Text("Reject", style: TextStyle(color: Color(0xFFDC2626), fontSize: 11)),
                          ),
                          const SizedBox(width: 8),
                          ElevatedButton(
                            onPressed: () async {
                              await ApiService.reviewStaffLeave(l['id'], 'APPROVED');
                              _fetchLeaves();
                            },
                            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF16A34A), foregroundColor: Colors.white),
                            child: const Text("Approve", style: TextStyle(fontSize: 11)),
                          ),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
            );
          }),
        ],
      ),
    );
  }

  // --------------------------------------------------------------------------
  // 3. Payroll & Payslips Tab
  // --------------------------------------------------------------------------
  Widget _buildPayrollTab() {
    if (_loadingPayroll) {
      return const Center(child: CircularProgressIndicator(color: Color(0xFF1E3A8A)));
    }
    return RefreshIndicator(
      onRefresh: _fetchPayroll,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: const LinearGradient(colors: [Color(0xFF1E3A8A), Color(0xFF2563EB)]),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text("September 2026 Payroll", style: TextStyle(color: Colors.white70, fontSize: 12)),
                    const SizedBox(height: 4),
                    Text("₹${_totalDisbursed.toStringAsFixed(0)}", style: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 2),
                    const Text("100% Calculated & Disbursed", style: TextStyle(color: Color(0xFFF59E0B), fontSize: 11, fontWeight: FontWeight.w600)),
                  ],
                ),
                const Icon(Icons.account_balance_wallet_rounded, color: Colors.white24, size: 48),
              ],
            ),
          ),
          const SizedBox(height: 18),
          const Text("Monthly Salary Disbursals", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Color(0xFF0F172A))),
          const SizedBox(height: 10),
          ..._payroll.map((p) => Card(
                margin: const EdgeInsets.only(bottom: 10),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                child: Padding(
                  padding: const EdgeInsets.all(14),
                  child: Column(
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(p['staffName'] ?? '', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                              Text("Emp ID: ${p['empId']} • ${p['designation'] ?? 'Teacher'}", style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                            ],
                          ),
                          Text("₹${p['netSalary']}", style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Color(0xFF16A34A))),
                        ],
                      ),
                      const Divider(height: 16),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text("Basic: ₹${p['basicSalary']}", style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                          Text("Allowances: +₹${p['allowances']}", style: const TextStyle(fontSize: 11, color: Color(0xFF16A34A))),
                          Text("Deductions: -₹${p['deductions']}", style: const TextStyle(fontSize: 11, color: Color(0xFFDC2626))),
                        ],
                      ),
                    ],
                  ),
                ),
              )),
        ],
      ),
    );
  }

  // --------------------------------------------------------------------------
  // 4. Staff Evaluations Tab
  // --------------------------------------------------------------------------
  Widget _buildEvaluationsTab() {
    if (_loadingEvaluations) {
      return const Center(child: CircularProgressIndicator(color: Color(0xFF1E3A8A)));
    }
    return RefreshIndicator(
      onRefresh: _fetchEvaluations,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text("Faculty Appraisals & Performance (${_evaluations.length})", style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Color(0xFF0F172A))),
          const SizedBox(height: 12),
          ..._evaluations.map((e) => Card(
                margin: const EdgeInsets.only(bottom: 10),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                child: ListTile(
                  leading: CircleAvatar(
                    backgroundColor: const Color(0xFFFEF3C7),
                    child: const Icon(Icons.star_rounded, color: Color(0xFFD97706)),
                  ),
                  title: Text(e['staffName'] ?? '', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                  subtitle: Text("Cycle: ${e['evaluationPeriod']}\nRemarks: ${e['comments'] ?? 'Good performance'}", style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                  trailing: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(color: const Color(0xFFEEF2FF), borderRadius: BorderRadius.circular(8)),
                    child: Text("${e['rating']} / 5.0", style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF1E3A8A), fontSize: 12)),
                  ),
                ),
              )),
        ],
      ),
    );
  }
}
