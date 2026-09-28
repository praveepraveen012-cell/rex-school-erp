import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/erp_provider.dart';
import '../services/api_service.dart';
import '../services/app_permissions.dart';
import '../models/student.dart';

class FeesScreen extends StatefulWidget {
  const FeesScreen({super.key});

  @override
  State<FeesScreen> createState() => _FeesScreenState();
}

class _FeesScreenState extends State<FeesScreen> {
  String _selectedClassFilter = 'All';

  @override
  Widget build(BuildContext context) {
    final erp = Provider.of<ERPProvider>(context);
    final role = ApiService.activeRole;
    final permissions = AppPermissions.of(role);

    // 1. Role: Teacher is strictly forbidden from all fee modules
    if (permissions.isTeacher) {
      return Scaffold(
        backgroundColor: const Color(0xFFF8FAFC),
        appBar: AppBar(
          title: const Text("Fees Desk"),
          backgroundColor: const Color(0xFF0F172A),
          foregroundColor: Colors.white,
        ),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFEE2E2),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.lock_person_outlined,
                    color: Color(0xFFDC2626),
                    size: 48,
                  ),
                ),
                const SizedBox(height: 18),
                const Text(
                  "Access Restricted • Financial Privacy",
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                ),
                const SizedBox(height: 8),
                const Text(
                  "Faculty accounts are not authorized to view or manage student fee records, ledgers, or school-wide collection data.",
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 13, color: Color(0xFF64748B), height: 1.4),
                ),
                const SizedBox(height: 24),
                ElevatedButton.icon(
                  onPressed: () => Navigator.pop(context),
                  icon: const Icon(Icons.arrow_back),
                  label: const Text("Return to Dashboard"),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF1E3A8A),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    }

    // 2. Role: Parent strictly sees ONLY their own linked child/children
    if (permissions.isParent) {
      return _buildParentFeeScreen(context, erp);
    }

    // 3. Role: Super Admin sees school-wide cashier desk
    return _buildSuperAdminFeeScreen(context, erp);
  }

  // ==========================================================================
  // PARENT FEE VIEW (Strict Child Data Isolation)
  // ==========================================================================
  Widget _buildParentFeeScreen(BuildContext context, ERPProvider erp) {
    final children = erp.linkedParentStudents.isNotEmpty
        ? erp.linkedParentStudents
        : [erp.currentStudent];
    final selectedStudent = erp.currentStudent;

    final isPaid = selectedStudent.isFeeClear;
    final total = selectedStudent.feesTotal;
    final paid = selectedStudent.feesPaid;
    final due = selectedStudent.feeDue;
    final pct = total > 0 ? (paid / total * 100).toStringAsFixed(0) : "100";

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text(
          "Tuition Fees & Payments",
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
        ),
        backgroundColor: const Color(0xFF0F172A),
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Multi-Child Selector if parent has multiple children
            if (children.length > 1) ...[
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.family_restroom, color: Color(0xFF1E3A8A), size: 20),
                    const SizedBox(width: 8),
                    const Text(
                      "Select Child:",
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF334155)),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: SingleChildScrollView(
                        scrollDirection: Axis.horizontal,
                        child: Row(
                          children: children.map((c) {
                            final isSel = c.id == selectedStudent.id;
                            return Padding(
                              padding: const EdgeInsets.only(right: 6),
                              child: ChoiceChip(
                                label: Text("${c.name} (${c.grade}-${c.section})"),
                                selected: isSel,
                                selectedColor: const Color(0xFF1E3A8A),
                                labelStyle: TextStyle(
                                  fontSize: 11,
                                  fontWeight: isSel ? FontWeight.bold : FontWeight.normal,
                                  color: isSel ? Colors.white : const Color(0xFF1E293B),
                                ),
                                onSelected: (_) {
                                  erp.selectStudent(c);
                                  setState(() {});
                                },
                              ),
                            );
                          }).toList(),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 14),
            ],

            // Selected Child Fee Overview Card
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: isPaid
                      ? const [Color(0xFF065F46), Color(0xFF047857)]
                      : const [Color(0xFF1E3A8A), Color(0xFF1E40AF)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(20),
                boxShadow: [
                  BoxShadow(
                    color: (isPaid ? const Color(0xFF047857) : const Color(0xFF1E3A8A)).withOpacity(0.3),
                    blurRadius: 16,
                    offset: const Offset(0, 6),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.18),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          "WARD: ${selectedStudent.name.toUpperCase()}",
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 0.8,
                          ),
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: isPaid ? const Color(0xFF10B981) : const Color(0xFFF59E0B),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          isPaid ? "Fully Cleared" : "$pct% Settled",
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  const Text("Annual Tuition & Curriculum Fees", style: TextStyle(color: Colors.white70, fontSize: 13)),
                  const SizedBox(height: 4),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.baseline,
                    textBaseline: TextBaseline.alphabetic,
                    children: [
                      Text(
                        "₹$total",
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 28,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text("for Academic Year 2026-27", style: TextStyle(color: Colors.white.withOpacity(0.8), fontSize: 12)),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.black.withOpacity(0.18),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceAround,
                      children: [
                        _buildFeeStatItem("Paid Amount", "₹$paid", const Color(0xFFA7F3D0)),
                        Container(width: 1, height: 28, color: Colors.white24),
                        _buildFeeStatItem("Balance Outstanding", "₹$due", isPaid ? Colors.white70 : const Color(0xFFFECACA)),
                        Container(width: 1, height: 28, color: Colors.white24),
                        _buildFeeStatItem("Next Due Date", isPaid ? "N/A" : "15 Oct 2026", Colors.white),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 16),

            // Pay Now Action / Receipts
            Row(
              children: [
                if (!isPaid) ...[
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () => _showParentPayDialog(context, erp, selectedStudent),
                      icon: const Icon(Icons.payment_rounded, size: 18),
                      label: const Text("Pay Outstanding Fee"),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF047857),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        elevation: 0,
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                ],
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => _showReceiptModal(context, selectedStudent),
                    icon: const Icon(Icons.receipt_long, size: 18),
                    label: const Text("Official Receipt"),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: const Color(0xFF1E3A8A),
                      side: const BorderSide(color: Color(0xFFCBD5E1), width: 1.2),
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                ),
              ],
            ),

            const SizedBox(height: 22),

            // Term Schedule Breakdown for Selected Child
            const Text(
              "Curriculum Installment Breakdown",
              style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
            ),
            const SizedBox(height: 4),
            Text(
              "CBSE Fee Structure for Class ${selectedStudent.grade}-${selectedStudent.section}",
              style: const TextStyle(fontSize: 12, color: Color(0xFF64748B)),
            ),
            const SizedBox(height: 12),

            _buildTermItem("Term I Tuition & Admissions", "₹18,000", "Paid on 12 June 2026", true),
            _buildTermItem("Term II Tuition & Mid-Term Lab", "₹18,000", isPaid ? "Paid on 10 Sept 2026" : "Partially Settled", isPaid || paid >= 36000),
            _buildTermItem("Term III Pre-Board & Annual", "₹12,000", "Due 15 Oct 2026", isPaid),
            _buildTermItem("Smart Classroom & Digital Library", "₹6,000", "Due 10 Nov 2026", isPaid),

            const SizedBox(height: 20),

            // Payment Methods & Support Notice
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: const Color(0xFFF1F5F9),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: const Row(
                children: [
                  Icon(Icons.verified_user_outlined, color: Color(0xFF059669), size: 20),
                  SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      "Secure Rex Payment Gateway: All transactions are 256-bit encrypted and instantly generate digitally stamped school receipts.",
                      style: TextStyle(fontSize: 11, color: Color(0xFF475569)),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFeeStatItem(String label, String value, Color color) {
    return Column(
      children: [
        Text(label, style: const TextStyle(color: Colors.white70, fontSize: 10)),
        const SizedBox(height: 2),
        Text(value, style: TextStyle(color: color, fontSize: 13, fontWeight: FontWeight.bold)),
      ],
    );
  }

  Widget _buildTermItem(String title, String amount, String date, bool isSettled) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: isSettled ? const Color(0xFFE2E8F0) : const Color(0xFFFDE68A)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              Icon(
                isSettled ? Icons.check_circle_rounded : Icons.schedule_rounded,
                color: isSettled ? const Color(0xFF10B981) : const Color(0xFFF59E0B),
                size: 20,
              ),
              const SizedBox(width: 10),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF0F172A))),
                  Text(date, style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                ],
              ),
            ],
          ),
          Text(amount, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Color(0xFF0F172A))),
        ],
      ),
    );
  }

  void _showParentPayDialog(BuildContext context, ERPProvider erp, Student student) {
    String paymentMode = 'UPI / Google Pay';
    int payAmount = student.feeDue;

    showDialog(
      context: context,
      builder: (dialogCtx) {
        return StatefulBuilder(
          builder: (ctx, setDialogState) {
            return AlertDialog(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              title: Row(
                children: [
                  const Icon(Icons.payment, color: Color(0xFF047857)),
                  const SizedBox(width: 8),
                  Text("Pay Fees: ${student.name}", style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                ],
              ),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text("Outstanding Balance: ₹${student.feeDue}", style: const TextStyle(fontSize: 13, color: Color(0xFFDC2626), fontWeight: FontWeight.bold)),
                  const SizedBox(height: 14),
                  const Text("Payment Method", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 6),
                  Wrap(
                    spacing: 8,
                    children: ['UPI / Google Pay', 'Credit/Debit Card', 'Net Banking'].map((m) {
                      final isSel = paymentMode == m;
                      return ChoiceChip(
                        label: Text(m, style: TextStyle(fontSize: 11, color: isSel ? Colors.white : Colors.black87)),
                        selected: isSel,
                        selectedColor: const Color(0xFF047857),
                        onSelected: (_) => setDialogState(() => paymentMode = m),
                      );
                    }).toList(),
                  ),
                ],
              ),
              actions: [
                TextButton(onPressed: () => Navigator.pop(dialogCtx), child: const Text("Cancel")),
                ElevatedButton(
                  onPressed: () {
                    erp.recordFeePayment(student.id, payAmount, paymentMode);
                    Navigator.pop(dialogCtx);
                    setState(() {});
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text("Payment of ₹$payAmount received for ${student.name}! Receipt generated."),
                        backgroundColor: const Color(0xFF059669),
                      ),
                    );
                  },
                  style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF047857), foregroundColor: Colors.white),
                  child: Text("Pay ₹$payAmount Now"),
                ),
              ],
            );
          },
        );
      },
    );
  }

  // ==========================================================================
  // SUPER ADMIN FEE CASHIER VIEW (School-wide management)
  // ==========================================================================
  Widget _buildSuperAdminFeeScreen(BuildContext context, ERPProvider erp) {
    final students = _selectedClassFilter == 'All'
        ? erp.students
        : erp.students.where((s) => s.grade.contains(_selectedClassFilter)).toList();

    final totalTarget = students.fold<int>(0, (sum, item) => sum + item.feesTotal);
    final totalCollected = students.fold<int>(0, (sum, item) => sum + item.feesPaid);
    final totalDue = totalTarget - totalCollected;
    final collectionPct = totalTarget > 0 ? ((totalCollected / totalTarget) * 100).toStringAsFixed(1) : "0.0";

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text(
          "Fee Cashier & Ledger Desk",
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
        ),
        backgroundColor: const Color(0xFF0F172A),
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Admin Global Collection Card
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF065F46), Color(0xFF047857)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        "SUPER ADMIN FINANCIAL LEDGER",
                        style: TextStyle(color: Colors.white70, fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 0.8),
                      ),
                      Text("$collectionPct% Realized", style: const TextStyle(color: Color(0xFFA7F3D0), fontWeight: FontWeight.bold, fontSize: 12)),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Text("₹$totalCollected", style: const TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.bold)),
                  Text("Total Fees Collected of ₹$totalTarget", style: const TextStyle(color: Colors.white70, fontSize: 12)),
                  const SizedBox(height: 14),
                  Row(
                    children: [
                      Text("Pending Receivables: ₹$totalDue", style: const TextStyle(color: Color(0xFFFECACA), fontWeight: FontWeight.w600, fontSize: 12)),
                    ],
                  ),
                ],
              ),
            ),

            const SizedBox(height: 18),

            // Class Filter Chips
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: ['All', '10', '8'].map((c) {
                  final isSel = _selectedClassFilter == c;
                  return Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: ChoiceChip(
                      label: Text(c == 'All' ? 'All Classes' : 'Grade $c'),
                      selected: isSel,
                      selectedColor: const Color(0xFF1E3A8A),
                      labelStyle: TextStyle(color: isSel ? Colors.white : Colors.black87, fontWeight: isSel ? FontWeight.bold : FontWeight.normal),
                      onSelected: (_) => setState(() => _selectedClassFilter = c),
                    ),
                  );
                }).toList(),
              ),
            ),

            const SizedBox(height: 16),

            const Text("Student Ledgers", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF0F172A))),
            const SizedBox(height: 10),

            ...students.map((student) {
              final isPaid = student.isFeeClear;
              return Container(
                margin: const EdgeInsets.only(bottom: 10),
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: isPaid ? const Color(0xFFE2E8F0) : const Color(0xFFFDE68A)),
                ),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(student.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                            Text("Class ${student.grade}-${student.section} • Roll: ${student.rollNo}", style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                          ],
                        ),
                        Text(
                          isPaid ? "Fully Paid" : "₹${student.feeDue} Due",
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            color: isPaid ? const Color(0xFF16A34A) : const Color(0xFFDC2626),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        OutlinedButton(
                          onPressed: () => _showReceiptModal(context, student),
                          style: OutlinedButton.styleFrom(visualDensity: VisualDensity.compact),
                          child: const Text("Receipt", style: TextStyle(fontSize: 11)),
                        ),
                        if (!isPaid) ...[
                          const SizedBox(width: 8),
                          ElevatedButton(
                            onPressed: () => _showParentPayDialog(context, erp, student),
                            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF047857), foregroundColor: Colors.white, visualDensity: VisualDensity.compact),
                            child: const Text("Collect Fee", style: TextStyle(fontSize: 11)),
                          ),
                        ],
                      ],
                    ),
                  ],
                ),
              );
            }),
          ],
        ),
      ),
    );
  }

  void _showReceiptModal(BuildContext context, Student student) {
    final receiptNo = "REC-2026-${student.rollNo.replaceAll(RegExp(r'[^0-9]'), '')}088";
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return Container(
          padding: const EdgeInsets.all(24),
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(2)),
                ),
              ),
              const SizedBox(height: 18),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text("Fee Receipt", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(color: const Color(0xFFDCFCE7), borderRadius: BorderRadius.circular(12)),
                    child: const Text("OFFICIAL CBSE STAMP", style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: Color(0xFF16A34A))),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              Text("Receipt Ref: $receiptNo", style: const TextStyle(fontSize: 12, color: Color(0xFF64748B))),
              const Divider(height: 24),
              _receiptRow("Student Name", student.name),
              _receiptRow("Class & Section", "Grade ${student.grade} - Section ${student.section}"),
              _receiptRow("Roll Number", student.rollNo),
              _receiptRow("Parent / Guardian", student.parentName),
              _receiptRow("Amount Paid", "₹${student.feesPaid}", isBold: true),
              _receiptRow("Outstanding Balance", "₹${student.feeDue}"),
              _receiptRow("Date of Payment", "10 September 2026"),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: () {
                    Navigator.pop(ctx);
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text("Receipt PDF saved to device")),
                    );
                  },
                  icon: const Icon(Icons.download_rounded),
                  label: const Text("Download Stamped Receipt PDF"),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF1E3A8A),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _receiptRow(String label, String value, {bool isBold = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(fontSize: 13, color: Color(0xFF64748B))),
          Text(
            value,
            style: TextStyle(
              fontSize: 13,
              fontWeight: isBold ? FontWeight.bold : FontWeight.w600,
              color: isBold ? const Color(0xFF16A34A) : const Color(0xFF0F172A),
            ),
          ),
        ],
      ),
    );
  }
}
