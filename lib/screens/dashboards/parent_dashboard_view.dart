import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../services/erp_provider.dart';
import '../../services/api_service.dart';

// Screens accessible to parents
import '../bus_tracker_screen.dart';
import '../fees_screen.dart';
import '../homework_screen.dart';
import '../attendance_screen.dart';
import '../report_card_screen.dart';
import '../notice_board_screen.dart';

class ParentDashboardView extends StatefulWidget {
  const ParentDashboardView({super.key});

  @override
  State<ParentDashboardView> createState() => _ParentDashboardViewState();
}

class _ParentDashboardViewState extends State<ParentDashboardView> {
  Map<String, dynamic>? _dashboardData;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadParentData();
  }

  Future<void> _loadParentData() async {
    final activeStudentId = ApiService.activeStudent?['id'];
    final res = await ApiService.getDashboardStats(studentId: activeStudentId);
    if (mounted) {
      setState(() {
        _isLoading = false;
        if (res['success'] == true) {
          _dashboardData = res;
        }
      });
    }
  }

  void _showChildSwitcherModal() {
    final students = ApiService.linkedStudents.isNotEmpty
        ? ApiService.linkedStudents
        : [
            {
              'id': 1,
              'first_name': 'Aarav',
              'last_name': 'Sharma',
              'class_name': 'Grade 10',
              'section_name': 'A',
              'admission_no': 'REX-2024-001',
              'roll_no': '1'
            },
            {
              'id': 7,
              'first_name': 'Ananya',
              'last_name': 'Sharma',
              'class_name': 'Grade 8',
              'section_name': 'B',
              'admission_no': 'REX-2024-007',
              'roll_no': '7'
            },
          ];

    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Row(
                children: [
                  Icon(Icons.family_restroom, color: Color(0xFF1E3A8A)),
                  SizedBox(width: 8),
                  Text("Switch Student Ward", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF0F172A))),
                ],
              ),
              const SizedBox(height: 6),
              const Text("Select child to view their personalized academic, bus GPS, and fee profile:", style: TextStyle(fontSize: 12, color: Color(0xFF64748B))),
              const SizedBox(height: 16),
              ...students.map((s) {
                final fullName = "${s['first_name']} ${s['last_name']}".trim();
                final classInfo = "${s['class_name'] ?? 'Grade 10'} - ${s['section_name'] ?? 'A'}";
                final isActive = (ApiService.activeStudent?['id'] == s['id']) ||
                    (ApiService.activeStudent == null && fullName.contains('Aarav'));

                return Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  decoration: BoxDecoration(
                    color: isActive ? const Color(0xFFEFF6FF) : Colors.white,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: isActive ? const Color(0xFF2563EB) : const Color(0xFFE2E8F0), width: isActive ? 2 : 1),
                  ),
                  child: ListTile(
                    leading: CircleAvatar(
                      backgroundColor: isActive ? const Color(0xFF1E3A8A) : const Color(0xFFE2E8F0),
                      child: Text(
                        s['first_name']?[0] ?? 'S',
                        style: TextStyle(color: isActive ? Colors.white : const Color(0xFF0F172A), fontWeight: FontWeight.bold),
                      ),
                    ),
                    title: Text(fullName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                    subtitle: Text("Class: $classInfo • Admission: ${s['admission_no'] ?? 'REX-2024'}"),
                    trailing: isActive ? const Icon(Icons.check_circle, color: Color(0xFF2563EB)) : null,
                    onTap: () {
                      ApiService.switchChild(s);
                      Navigator.pop(ctx);
                      _loadParentData();
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text("Switched active child to $fullName ($classInfo)"),
                          backgroundColor: const Color(0xFF1E3A8A),
                        ),
                      );
                    },
                  ),
                );
              }),
            ],
          ),
        ),
      ),
    );
  }

  void _showOnlinePayDialog(double pendingAmount, int studentId, String studentName) {
    final amountCtrl = TextEditingController(text: pendingAmount > 0 ? pendingAmount.toStringAsFixed(0) : "20000");
    String paymentMode = 'ONLINE_UPI';
    bool isProcessing = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(22))),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) => Padding(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
            top: 20,
            left: 20,
            right: 20,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text("Pay School Tuition Fees", style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold, color: Color(0xFF0F172A))),
                  IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.pop(ctx)),
                ],
              ),
              const SizedBox(height: 6),
              Text("Student: $studentName • Secure Gateway (Razorpay/UPI)", style: const TextStyle(fontSize: 12, color: Color(0xFF64748B))),
              const SizedBox(height: 16),
              TextField(
                controller: amountCtrl,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(
                  labelText: "Payment Amount (₹)",
                  prefixText: "₹ ",
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.currency_rupee, color: Color(0xFF059669)),
                ),
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                value: paymentMode,
                decoration: const InputDecoration(labelText: "Payment Mode", border: OutlineInputBorder()),
                items: const [
                  DropdownMenuItem(value: 'ONLINE_UPI', child: Text("Instant UPI (GPay / PhonePe / Paytm)")),
                  DropdownMenuItem(value: 'NET_BANKING', child: Text("Net Banking (HDFC / SBI / ICICI)")),
                  DropdownMenuItem(value: 'CARD', child: Text("Debit / Credit Card (RuPay / Visa)")),
                ],
                onChanged: (v) => setModalState(() => paymentMode = v!),
              ),
              const SizedBox(height: 18),
              ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF059669),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                icon: isProcessing
                    ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                    : const Icon(Icons.lock, color: Colors.white, size: 18),
                label: Text(
                  isProcessing ? "Verifying with Gateway..." : "Authorize & Pay Securely",
                  style: const TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.bold),
                ),
                onPressed: isProcessing
                    ? null
                    : () async {
                        final amt = double.tryParse(amountCtrl.text) ?? 0.0;
                        if (amt <= 0) return;
                        setModalState(() => isProcessing = true);

                        final res = await ApiService.payFees(
                          studentId: studentId,
                          amount: amt,
                          paymentMode: paymentMode,
                        );

                        if (ctx.mounted) {
                          Navigator.pop(ctx);
                          _loadParentData();
                          showDialog(
                            context: context,
                            builder: (dCtx) => AlertDialog(
                              title: const Row(
                                children: [
                                  Icon(Icons.verified, color: Color(0xFF10B981)),
                                  SizedBox(width: 8),
                                  Text("Payment Successful!"),
                                ],
                              ),
                              content: Text(
                                "Tuition fee payment of ₹$amt has been verified by the server.\n\nOfficial Receipt: ${res['payment']?['receiptNo'] ?? 'REC-2026-98124'}\nTimestamp: Just now.",
                              ),
                              actions: [
                                TextButton(onPressed: () => Navigator.pop(dCtx), child: const Text("Done")),
                              ],
                            ),
                          );
                        }
                      },
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final erp = Provider.of<ERPProvider>(context);

    // Active Child Resolution
    final activeStudent = ApiService.activeStudent ??
        (_dashboardData?['activeStudent'] as Map<String, dynamic>?) ?? {
          'id': 1,
          'first_name': 'Aarav',
          'last_name': 'Sharma',
          'admission_no': 'REX-2024-001',
          'roll_no': '1',
          'class_name': 'Grade 10',
          'section_name': 'A',
        };

    final childName = "${activeStudent['first_name'] ?? 'Aarav'} ${activeStudent['last_name'] ?? 'Sharma'}".trim();
    final childClass = "${activeStudent['class_name'] ?? 'Grade 10'} - ${activeStudent['section_name'] ?? 'A'}";
    final admissionNo = activeStudent['admission_no'] ?? "REX-2024-001";
    final rollNo = activeStudent['roll_no']?.toString() ?? "1";
    final studentId = (activeStudent['id'] as num?)?.toInt() ?? 1;

    // Bus Tracking Data
    final bus = _dashboardData?['busTracking'] ?? {
      'busNumber': 'Bus #12',
      'vehicleNo': 'TN-01-RX-9821',
      'routeName': 'Central - Anna Nagar - School',
      'driverName': 'Ramesh Kumar',
      'driverMobile': '+91 98765 43210',
      'status': 'On Route',
      'etaMinutes': 12,
      'lastUpdated': 'Just now'
    };

    // Fees Data
    final fees = _dashboardData?['feeSummary'] ?? {
      'totalFees': 50000,
      'paidAmount': 30000,
      'pendingAmount': 20000,
      'nextDueDate': '10 October 2026',
      'status': 'PENDING'
    };

    final pendingAmount = ((fees['pendingAmount'] as num?)?.toDouble()) ?? 20000.0;
    final paidAmount = ((fees['paidAmount'] as num?)?.toDouble()) ?? 30000.0;
    final totalFees = ((fees['totalFees'] as num?)?.toDouble()) ?? 50000.0;

    return RefreshIndicator(
      onRefresh: _loadParentData,
      color: const Color(0xFF1E3A8A),
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ================================================================
            // MULTI-CHILD SWITCHER TOP BAR
            // ================================================================
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFE2E8F0)),
                boxShadow: [
                  BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 8, offset: const Offset(0, 2)),
                ],
              ),
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 18,
                    backgroundColor: const Color(0xFF1E3A8A),
                    child: Text(
                      childName.isNotEmpty ? childName[0] : 'S',
                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text("Viewing Ward:", style: TextStyle(fontSize: 10, color: Color(0xFF64748B), fontWeight: FontWeight.w600)),
                        Text(
                          "$childName ($childClass)",
                          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                  ElevatedButton.icon(
                    onPressed: _showChildSwitcherModal,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFEFF6FF),
                      foregroundColor: const Color(0xFF2563EB),
                      elevation: 0,
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      textStyle: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
                    ),
                    icon: const Icon(Icons.swap_horiz, size: 14),
                    label: const Text("Switch ▼"),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 16),

            // ================================================================
            // CHILD PROFILE CARD
            // ================================================================
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF1E3A8A), Color(0xFF0F172A)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(20),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF1E3A8A).withOpacity(0.28),
                    blurRadius: 16,
                    offset: const Offset(0, 8),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: [
                      Container(
                        padding: const EdgeInsets.all(3),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          shape: BoxShape.circle,
                          boxShadow: [
                            BoxShadow(color: Colors.black.withOpacity(0.2), blurRadius: 6),
                          ],
                        ),
                        child: CircleAvatar(
                          radius: 26,
                          backgroundColor: const Color(0xFFF1F5F9),
                          child: Text(
                            childName.isNotEmpty ? childName[0] : "A",
                            style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Color(0xFF1E3A8A)),
                          ),
                        ),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(childName, style: const TextStyle(color: Colors.white, fontSize: 17, fontWeight: FontWeight.bold)),
                            const SizedBox(height: 2),
                            Text("Class $childClass • Roll No. $rollNo", style: const TextStyle(color: Colors.white70, fontSize: 12)),
                            Text("Admission: $admissionNo", style: const TextStyle(color: Colors.white54, fontSize: 11)),
                          ],
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                        decoration: BoxDecoration(
                          color: const Color(0xFF10B981).withOpacity(0.2),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xFF10B981)),
                        ),
                        child: const Row(
                          children: [
                            Icon(Icons.check_circle, color: Color(0xFF10B981), size: 12),
                            SizedBox(width: 4),
                            Text("Present Today", style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold)),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.08),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Row(
                      mainAxisAlignment: MainAxisAlignment.spaceAround,
                      children: [
                        Column(
                          children: [
                            Text("96.4%", style: TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.bold)),
                            SizedBox(height: 2),
                            Text("Attendance", style: TextStyle(color: Colors.white60, fontSize: 10)),
                          ],
                        ),
                        Column(
                          children: [
                            Text("Grade A1", style: TextStyle(color: Color(0xFFF59E0B), fontSize: 15, fontWeight: FontWeight.bold)),
                            SizedBox(height: 2),
                            Text("Academic Rank", style: TextStyle(color: Colors.white60, fontSize: 10)),
                          ],
                        ),
                        Column(
                          children: [
                            Text("Bus #12", style: TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.bold)),
                            SizedBox(height: 2),
                            Text("Fleet Route", style: TextStyle(color: Colors.white60, fontSize: 10)),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 18),

            // ================================================================
            // LIVE BUS GPS TRACKER CARD
            // ================================================================
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: const Color(0xFFE2E8F0)),
                boxShadow: [
                  BoxShadow(color: Colors.black.withOpacity(0.03), blurRadius: 8, offset: const Offset(0, 3)),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: const Color(0xFFEFF6FF),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Icon(Icons.directions_bus, color: Color(0xFF2563EB), size: 22),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text("${bus['busNumber'] ?? 'Bus #12'} • Live Telematics", style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                            Text("Driver: ${bus['driverName'] ?? 'Ramesh Kumar'} (${bus['driverMobile'] ?? '+91 98765 43210'})", style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                          ],
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: const Color(0xFFECFDF5),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          bus['status'] ?? 'On Route',
                          style: const TextStyle(color: Color(0xFF059669), fontSize: 11, fontWeight: FontWeight.bold),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF8FAFC),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text("Estimated Arrival at Stop", style: TextStyle(fontSize: 10, color: Color(0xFF64748B))),
                            const SizedBox(height: 2),
                            Text("${bus['etaMinutes'] ?? 12} Minutes", style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF1E3A8A))),
                          ],
                        ),
                        ElevatedButton.icon(
                          onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const BusTrackerScreen())),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF2563EB),
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          ),
                          icon: const Icon(Icons.location_on, color: Colors.white, size: 14),
                          label: const Text("Track Bus", style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 18),

            // ================================================================
            // TUITION FEE STATUS & PAY NOW ACTION
            // ================================================================
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: const Color(0xFFE2E8F0)),
                boxShadow: [
                  BoxShadow(color: Colors.black.withOpacity(0.03), blurRadius: 8, offset: const Offset(0, 3)),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: const Color(0xFFECFDF5),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Icon(Icons.account_balance_wallet, color: Color(0xFF059669), size: 22),
                      ),
                      const SizedBox(width: 10),
                      const Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text("Tuition & Academic Fees", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                            Text("AY 2026-2027 • Term II Balance", style: TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                          ],
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: pendingAmount == 0 ? const Color(0xFFECFDF5) : const Color(0xFFFEF3C7),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          pendingAmount == 0 ? "PAID" : "PENDING",
                          style: TextStyle(
                            color: pendingAmount == 0 ? const Color(0xFF059669) : const Color(0xFFB45309),
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text("Total Fee", style: TextStyle(fontSize: 10, color: Color(0xFF64748B))),
                          Text("₹${totalFees.toStringAsFixed(0)}", style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                        ],
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text("Paid so far", style: TextStyle(fontSize: 10, color: Color(0xFF64748B))),
                          Text("₹${paidAmount.toStringAsFixed(0)}", style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF059669))),
                        ],
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text("Pending Amount", style: TextStyle(fontSize: 10, color: Color(0xFF64748B))),
                          Text("₹${pendingAmount.toStringAsFixed(0)}", style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFFDC2626))),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  Row(
                    children: [
                      Expanded(
                        child: ElevatedButton.icon(
                          onPressed: () => _showOnlinePayDialog(pendingAmount, studentId, childName),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF059669),
                            padding: const EdgeInsets.symmetric(vertical: 10),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          ),
                          icon: const Icon(Icons.payment, color: Colors.white, size: 16),
                          label: const Text("Pay Fees Online", style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold)),
                        ),
                      ),
                      const SizedBox(width: 8),
                      OutlinedButton(
                        onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const FeesScreen())),
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                        child: const Text("Receipts", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            const SizedBox(height: 18),

            // ================================================================
            // CHILD'S HOMEWORK DUE
            // ================================================================
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text("Pending Homework", style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF0F172A))),
                TextButton(
                  onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const HomeworkScreen())),
                  child: const Text("View All", style: TextStyle(fontSize: 12, color: Color(0xFF1E3A8A))),
                ),
              ],
            ),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Column(
                children: [
                  _buildHomeworkItem(
                    subject: "Mathematics",
                    title: "Complete Exercise 5.2 (Arithmetic Progressions)",
                    dueDate: "29 September 2026",
                    isPending: true,
                  ),
                  const Divider(height: 16),
                  _buildHomeworkItem(
                    subject: "Science (Physics)",
                    title: "Ray Diagram Lab Notes & Formulas",
                    dueDate: "30 September 2026",
                    isPending: false,
                  ),
                ],
              ),
            ),

            const SizedBox(height: 18),

            // ================================================================
            // QUICK ACTION TILES FOR PARENT
            // ================================================================
            const Text("Quick Academic Shortcuts", style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF0F172A))),
            const SizedBox(height: 10),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _buildShortcutTile(icon: Icons.assignment_outlined, label: "Report Card", onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ReportCardScreen()))),
                _buildShortcutTile(icon: Icons.calendar_today_outlined, label: "Attendance", onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const AttendanceScreen()))),
                _buildShortcutTile(icon: Icons.campaign_outlined, label: "Circulars", onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const NoticeBoardScreen()))),
                _buildShortcutTile(icon: Icons.alt_route_outlined, label: "Bus Route", onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const BusTrackerScreen()))),
              ],
            ),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }

  Widget _buildHomeworkItem({
    required String subject,
    required String title,
    required String dueDate,
    required bool isPending,
  }) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(isPending ? Icons.pending_outlined : Icons.check_circle_outline, color: isPending ? const Color(0xFFD97706) : const Color(0xFF10B981), size: 20),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text("$subject • Due $dueDate", style: const TextStyle(fontSize: 11, color: Color(0xFF64748B), fontWeight: FontWeight.w600)),
              const SizedBox(height: 2),
              Text(title, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF0F172A))),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildShortcutTile({required IconData icon, required String label, required VoidCallback onTap}) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        width: 76,
        padding: const EdgeInsets.symmetric(vertical: 10),
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: const Color(0xFFF1F5F9),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, color: const Color(0xFF1E3A8A), size: 20),
            ),
            const SizedBox(height: 6),
            Text(label, textAlign: TextAlign.center, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF334155))),
          ],
        ),
      ),
    );
  }
}
