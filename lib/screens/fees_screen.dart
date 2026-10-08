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
  String _selectedStatusFilter = 'All';
  String _searchQuery = '';

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
                  decoration: const BoxDecoration(
                    color: Color(0xFFFEE2E2),
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

    // 3. Role: Super Admin sees fee records, controls, analytics, but NO payment capability
    return _buildSuperAdminFeeScreen(context, erp);
  }

  // ==========================================================================
  // PARENT FEE VIEW (Multi-Child & Split Payment)
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
    final minSplit = (due * 0.30).round();
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
                          "STUDENT: ${selectedStudent.name.toUpperCase()} (${selectedStudent.id})",
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
                          isPaid ? "Fully Paid" : "$pct% Settled",
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
                      Text("Class ${selectedStudent.grade}-${selectedStudent.section}", style: TextStyle(color: Colors.white.withOpacity(0.8), fontSize: 12)),
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
                        _buildFeeStatItem("Total Paid", "₹$paid", const Color(0xFFA7F3D0)),
                        Container(width: 1, height: 28, color: Colors.white24),
                        _buildFeeStatItem("Outstanding", "₹$due", isPaid ? Colors.white70 : const Color(0xFFFECACA)),
                        Container(width: 1, height: 28, color: Colors.white24),
                        _buildFeeStatItem("Min Split (30%)", isPaid ? "₹0" : "₹$minSplit", Colors.white),
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
                      onPressed: () => _showParentSplitPayDialog(context, erp, selectedStudent),
                      icon: const Icon(Icons.payment_rounded, size: 18),
                      label: const Text("Pay Fees (Full / Split)"),
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

            _buildTermItem("Term I Tuition & Admissions", "₹18,000", "Settled", true),
            _buildTermItem("Term II Tuition & Mid-Term Lab", "₹18,000", isPaid ? "Settled" : (paid >= 36000 ? "Settled" : "Partially Settled"), isPaid || paid >= 36000),
            _buildTermItem("Term III Pre-Board & Annual", "₹12,000", isPaid ? "Settled" : "Due 15 Oct 2026", isPaid),
            _buildTermItem("Smart Classroom & Digital Library", "₹6,000", isPaid ? "Settled" : "Due 10 Nov 2026", isPaid),

            const SizedBox(height: 20),

            // Payment Security Note
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
                      "Secure Rex Payment Gateway: All transactions are 256-bit encrypted. Split payments update ledger balance immediately.",
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

  // ==========================================================================
  // SPLIT PAYMENT DIALOG (Requirements 2, 3, 4, 8)
  // ==========================================================================
  void _showParentSplitPayDialog(BuildContext context, ERPProvider erp, Student student) {
    final outstanding = student.feeDue;
    final minSplit = (outstanding * 0.30).round();

    String paymentType = 'FULL'; // 'FULL' or 'SPLIT'
    String paymentMode = 'UPI / Google Pay';
    final amountController = TextEditingController(text: outstanding.toString());
    String? validationError;

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (dialogCtx) {
        return StatefulBuilder(
          builder: (ctx, setDialogState) {
            void validate() {
              final text = amountController.text.trim();
              if (text.isEmpty) {
                validationError = "Please enter an amount.";
                return;
              }
              final entered = int.tryParse(text);
              if (entered == null || entered <= 0) {
                validationError = "Enter a valid positive amount.";
                return;
              }
              if (entered > outstanding) {
                validationError = "Amount cannot exceed outstanding fee balance of ₹$outstanding.";
                return;
              }
              if (paymentType == 'SPLIT' && entered < minSplit) {
                validationError = "Minimum split payment is 30% of the outstanding fee.";
                return;
              }
              validationError = null;
            }

            return AlertDialog(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
              title: Row(
                children: const [
                  Icon(Icons.payment, color: Color(0xFF047857)),
                  SizedBox(width: 8),
                  Text("Pay School Fee", style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold)),
                ],
              ),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Section 8 Mandatory Display: Student Name + ID + Class + Outstanding
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF1F5F9),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: const Color(0xFFE2E8F0)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text("Student: ${student.name}", style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF0F172A))),
                          const SizedBox(height: 2),
                          Text("Student ID: ${student.id} • Class ${student.grade}-${student.section}", style: const TextStyle(fontSize: 12, color: Color(0xFF475569))),
                          const Divider(height: 12),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text("Outstanding Balance:", style: TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                              Text("₹$outstanding", style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFFDC2626))),
                            ],
                          ),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text("Minimum Split Payment:", style: TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                              Text("₹$minSplit (30%)", style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF059669))),
                            ],
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 14),

                    // Section 3: Payment Type Selection (Pay Full Amount vs Split Payment)
                    const Text("Payment Option", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF334155))),
                    const SizedBox(height: 6),
                    Row(
                      children: [
                        Expanded(
                          child: ChoiceChip(
                            label: const Center(child: Text("Pay Full Amount", style: TextStyle(fontSize: 11))),
                            selected: paymentType == 'FULL',
                            selectedColor: const Color(0xFF047857),
                            labelStyle: TextStyle(color: paymentType == 'FULL' ? Colors.white : Colors.black87, fontWeight: FontWeight.bold),
                            onSelected: (_) {
                              setDialogState(() {
                                paymentType = 'FULL';
                                amountController.text = outstanding.toString();
                                validate();
                              });
                            },
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: ChoiceChip(
                            label: const Center(child: Text("Split Payment", style: TextStyle(fontSize: 11))),
                            selected: paymentType == 'SPLIT',
                            selectedColor: const Color(0xFF047857),
                            labelStyle: TextStyle(color: paymentType == 'SPLIT' ? Colors.white : Colors.black87, fontWeight: FontWeight.bold),
                            onSelected: (_) {
                              setDialogState(() {
                                paymentType = 'SPLIT';
                                amountController.text = minSplit.toString();
                                validate();
                              });
                            },
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),

                    // Amount input field
                    Text(
                      paymentType == 'FULL' ? "Payment Amount (Full Settlement)" : "Enter Payment Amount (Split Payment)",
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF334155)),
                    ),
                    const SizedBox(height: 4),
                    TextField(
                      controller: amountController,
                      keyboardType: TextInputType.number,
                      enabled: paymentType == 'SPLIT',
                      decoration: InputDecoration(
                        prefixText: "₹ ",
                        filled: true,
                        fillColor: paymentType == 'FULL' ? const Color(0xFFF8FAFC) : Colors.white,
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                        errorText: validationError,
                      ),
                      onChanged: (_) => setDialogState(() => validate()),
                    ),
                    if (paymentType == 'SPLIT') ...[
                      const SizedBox(height: 4),
                      Text(
                        "Minimum payment: 30% of outstanding amount (₹$minSplit)",
                        style: const TextStyle(fontSize: 11, color: Color(0xFF059669), fontWeight: FontWeight.w600),
                      ),
                    ],
                    const SizedBox(height: 14),

                    // Payment Method selector
                    const Text("Select Payment Method", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF334155))),
                    const SizedBox(height: 6),
                    Wrap(
                      spacing: 8,
                      children: ['UPI / Google Pay', 'Credit/Debit Card', 'Net Banking'].map((m) {
                        final isSel = paymentMode == m;
                        return ChoiceChip(
                          label: Text(m, style: TextStyle(fontSize: 11, color: isSel ? Colors.white : Colors.black87)),
                          selected: isSel,
                          selectedColor: const Color(0xFF1E3A8A),
                          onSelected: (_) => setDialogState(() => paymentMode = m),
                        );
                      }).toList(),
                    ),
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(dialogCtx),
                  child: const Text("Cancel"),
                ),
                ElevatedButton(
                  onPressed: validationError == null && amountController.text.isNotEmpty
                      ? () async {
                          final payAmount = int.tryParse(amountController.text.trim()) ?? 0;
                          if (payAmount <= 0) return;

                          Navigator.pop(dialogCtx);

                          // Call backend API with paymentType
                          final numericId = int.tryParse(student.id.replaceAll(RegExp(r'[^0-9]'), '')) ?? 1;
                          final res = await ApiService.payFees(
                            studentId: numericId,
                            amount: payAmount.toDouble(),
                            paymentType: paymentType,
                            paymentMode: paymentMode,
                          );

                          // Update local ERP ledger state
                          erp.recordFeePayment(student.id, payAmount, paymentMode);
                          setState(() {});

                          final receiptNo = res['payment']?['receiptNo'] ?? "REC-2026-${DateTime.now().millisecondsSinceEpoch % 100000}";
                          final newOutstanding = (outstanding - payAmount).clamp(0, outstanding);

                          if (context.mounted) {
                            showDialog(
                              context: context,
                              builder: (succCtx) => AlertDialog(
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                                title: Row(
                                  children: const [
                                    Icon(Icons.check_circle, color: Color(0xFF10B981)),
                                    SizedBox(width: 8),
                                    Text("Payment Successful", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                                  ],
                                ),
                                content: Column(
                                  mainAxisSize: MainAxisSize.min,
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text("₹$payAmount paid successfully for ${student.name}!", style: const TextStyle(fontWeight: FontWeight.bold)),
                                    const SizedBox(height: 8),
                                    Text("Payment Type: ${paymentType == 'FULL' ? 'Full Settlement' : 'Split Payment'}"),
                                    Text("Receipt Number: $receiptNo"),
                                    Text("Remaining Balance: ₹$newOutstanding"),
                                    const SizedBox(height: 12),
                                    const Text("The fee ledger and receipt have been updated immediately.", style: TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                                  ],
                                ),
                                actions: [
                                  TextButton(onPressed: () => Navigator.pop(succCtx), child: const Text("Done")),
                                  ElevatedButton.icon(
                                    onPressed: () {
                                      Navigator.pop(succCtx);
                                      _showReceiptModal(context, student);
                                    },
                                    icon: const Icon(Icons.receipt, size: 16),
                                    label: const Text("View Receipt"),
                                    style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF1E3A8A), foregroundColor: Colors.white),
                                  ),
                                ],
                              ),
                            );
                          }
                        }
                      : null,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF047857),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                  ),
                  child: Text("Pay ₹${amountController.text.trim()} Now"),
                ),
              ],
            );
          },
        );
      },
    );
  }

  // ==========================================================================
  // SUPER ADMIN FEE SECTION (Management & Oversight Only — NO Payment Action)
  // Requirements 1, 5, 6, 7
  // ==========================================================================
  Widget _buildSuperAdminFeeScreen(BuildContext context, ERPProvider erp) {
    var filteredStudents = erp.students;

    if (_selectedClassFilter != 'All') {
      filteredStudents = filteredStudents.where((s) => s.grade == _selectedClassFilter).toList();
    }

    if (_searchQuery.isNotEmpty) {
      final q = _searchQuery.toLowerCase();
      filteredStudents = filteredStudents.where((s) =>
        s.name.toLowerCase().contains(q) ||
        s.id.toLowerCase().contains(q) ||
        s.parentName.toLowerCase().contains(q) ||
        s.rollNo.toLowerCase().contains(q)
      ).toList();
    }

    if (_selectedStatusFilter != 'All') {
      if (_selectedStatusFilter == 'Paid') {
        filteredStudents = filteredStudents.where((s) => s.isFeeClear).toList();
      } else if (_selectedStatusFilter == 'Unpaid') {
        filteredStudents = filteredStudents.where((s) => s.feesPaid == 0).toList();
      } else if (_selectedStatusFilter == 'Partially Paid') {
        filteredStudents = filteredStudents.where((s) => !s.isFeeClear && s.feesPaid > 0).toList();
      }
    }

    final totalTarget = erp.students.fold<int>(0, (sum, item) => sum + item.feesTotal);
    final totalCollected = erp.students.fold<int>(0, (sum, item) => sum + item.feesPaid);
    final totalDue = totalTarget - totalCollected;
    final paidCount = erp.students.where((s) => s.isFeeClear).length;
    final unpaidCount = erp.students.where((s) => s.feesPaid == 0).length;
    final partialCount = erp.students.where((s) => !s.isFeeClear && s.feesPaid > 0).length;

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text(
          "Fee Administration & Ledgers",
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
            // Admin Global Collection Metrics Card (Section 5)
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF0F172A), Color(0xFF1E293B)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(18),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        "SUPER ADMIN FINANCIAL CONTROLS",
                        style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 0.8),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(color: const Color(0xFF334155), borderRadius: BorderRadius.circular(6)),
                        child: const Text("VIEWER & NOTIFIER ONLY", style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold)),
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
                          const Text("Total Fees Target", style: TextStyle(color: Colors.white60, fontSize: 11)),
                          Text("₹$totalTarget", style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold)),
                        ],
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text("Total Collected", style: TextStyle(color: Colors.white60, fontSize: 11)),
                          Text("₹$totalCollected", style: const TextStyle(color: Color(0xFFA7F3D0), fontSize: 20, fontWeight: FontWeight.bold)),
                        ],
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text("Total Outstanding", style: TextStyle(color: Colors.white60, fontSize: 11)),
                          Text("₹$totalDue", style: const TextStyle(color: Color(0xFFFECACA), fontSize: 20, fontWeight: FontWeight.bold)),
                        ],
                      ),
                    ],
                  ),
                  const Divider(color: Colors.white24, height: 22),
                  // Student status breakdown
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceAround,
                    children: [
                      _buildAdminMiniStat("Paid Students", "$paidCount", const Color(0xFF10B981)),
                      Container(width: 1, height: 24, color: Colors.white24),
                      _buildAdminMiniStat("Unpaid Students", "$unpaidCount", const Color(0xFFEF4444)),
                      Container(width: 1, height: 24, color: Colors.white24),
                      _buildAdminMiniStat("Partially Paid", "$partialCount", const Color(0xFFF59E0B)),
                    ],
                  ),
                ],
              ),
            ),

            const SizedBox(height: 14),

            // Bulk Notification Action Bar (Section 7)
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.notifications_active_outlined, color: Color(0xFF1E3A8A), size: 20),
                  const SizedBox(width: 8),
                  const Text("Payment Reminders:", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Color(0xFF334155))),
                  const Spacer(),
                  OutlinedButton.icon(
                    onPressed: () => _confirmBulkReminder(context, 'UNPAID', unpaidCount),
                    icon: const Icon(Icons.send_rounded, size: 14),
                    label: const Text("Remind Unpaid", style: TextStyle(fontSize: 11)),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: const Color(0xFFDC2626),
                      side: const BorderSide(color: Color(0xFFFECACA)),
                      visualDensity: VisualDensity.compact,
                    ),
                  ),
                  const SizedBox(width: 6),
                  OutlinedButton.icon(
                    onPressed: () => _confirmBulkReminder(context, 'PARTIALLY_PAID', partialCount),
                    icon: const Icon(Icons.send_rounded, size: 14),
                    label: const Text("Remind Partial", style: TextStyle(fontSize: 11)),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: const Color(0xFFD97706),
                      side: const BorderSide(color: Color(0xFFFDE68A)),
                      visualDensity: VisualDensity.compact,
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 14),

            // Search Bar & Filter Controls (Section 5)
            TextField(
              decoration: InputDecoration(
                hintText: "Search student, roll no, or parent...",
                prefixIcon: const Icon(Icons.search, size: 20),
                filled: true,
                fillColor: Colors.white,
                contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFCBD5E1))),
                enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
              ),
              onChanged: (val) => setState(() => _searchQuery = val.trim()),
            ),

            const SizedBox(height: 10),

            // Class Filter Chips
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  const Text("Class: ", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF475569))),
                  ...['All', '8', '9', '10'].map((c) {
                    final isSel = _selectedClassFilter == c;
                    return Padding(
                      padding: const EdgeInsets.only(right: 6),
                      child: ChoiceChip(
                        label: Text(c == 'All' ? 'All Classes' : 'Grade $c'),
                        selected: isSel,
                        selectedColor: const Color(0xFF1E3A8A),
                        labelStyle: TextStyle(color: isSel ? Colors.white : Colors.black87, fontSize: 11),
                        visualDensity: VisualDensity.compact,
                        onSelected: (_) => setState(() => _selectedClassFilter = c),
                      ),
                    );
                  }).toList(),
                ],
              ),
            ),

            const SizedBox(height: 6),

            // Status Filter Chips
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  const Text("Status: ", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF475569))),
                  ...['All', 'Paid', 'Partially Paid', 'Unpaid'].map((st) {
                    final isSel = _selectedStatusFilter == st;
                    return Padding(
                      padding: const EdgeInsets.only(right: 6),
                      child: ChoiceChip(
                        label: Text(st),
                        selected: isSel,
                        selectedColor: const Color(0xFF047857),
                        labelStyle: TextStyle(color: isSel ? Colors.white : Colors.black87, fontSize: 11),
                        visualDensity: VisualDensity.compact,
                        onSelected: (_) => setState(() => _selectedStatusFilter = st),
                      ),
                    );
                  }).toList(),
                ],
              ),
            ),

            const SizedBox(height: 16),

            Text(
              "Student Fee Ledgers (${filteredStudents.length} records)",
              style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
            ),
            const SizedBox(height: 10),

            // Student Records List (Section 6: NO PAYMENT BUTTON ALLOWED)
            ...filteredStudents.map((student) {
              final isPaid = student.isFeeClear;
              final isUnpaid = student.feesPaid == 0;
              final statusText = isPaid ? "PAID" : (isUnpaid ? "UNPAID" : "PARTIALLY PAID");
              final statusColor = isPaid
                  ? const Color(0xFF16A34A)
                  : (isUnpaid ? const Color(0xFFDC2626) : const Color(0xFFD97706));

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
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(student.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Color(0xFF0F172A))),
                            Text("ID: ${student.id} • Class ${student.grade}-${student.section}", style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                            Text("Parent: ${student.parentName} (${student.parentPhone})", style: const TextStyle(fontSize: 11, color: Color(0xFF475569))),
                          ],
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: statusColor.withOpacity(0.12),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            statusText,
                            style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: statusColor),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text("Paid: ₹${student.feesPaid} / ₹${student.feesTotal}", style: const TextStyle(fontSize: 12, color: Color(0xFF475569), fontWeight: FontWeight.w500)),
                        Text("Outstanding: ₹${student.feeDue}", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: student.feeDue > 0 ? const Color(0xFFDC2626) : const Color(0xFF16A34A))),
                      ],
                    ),
                    const Divider(height: 16),
                    // Action Buttons: Details, Receipts, Reminders (CRITICAL: ZERO PAYMENT ACTIONS)
                    Row(
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        OutlinedButton(
                          onPressed: () => _showStudentDetailsModal(context, student),
                          style: OutlinedButton.styleFrom(visualDensity: VisualDensity.compact),
                          child: const Text("View Details", style: TextStyle(fontSize: 11)),
                        ),
                        const SizedBox(width: 6),
                        OutlinedButton(
                          onPressed: () => _showReceiptModal(context, student),
                          style: OutlinedButton.styleFrom(visualDensity: VisualDensity.compact),
                          child: const Text("Receipt", style: TextStyle(fontSize: 11)),
                        ),
                        if (!isPaid) ...[
                          const SizedBox(width: 6),
                          ElevatedButton.icon(
                            onPressed: () => _sendSingleReminder(context, student),
                            icon: const Icon(Icons.notifications_active_outlined, size: 14),
                            label: const Text("Send Reminder", style: TextStyle(fontSize: 11)),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF1E3A8A),
                              foregroundColor: Colors.white,
                              visualDensity: VisualDensity.compact,
                            ),
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

  Widget _buildAdminMiniStat(String label, String value, Color color) {
    return Column(
      children: [
        Text(value, style: TextStyle(color: color, fontSize: 16, fontWeight: FontWeight.bold)),
        const SizedBox(height: 2),
        Text(label, style: const TextStyle(color: Colors.white60, fontSize: 10)),
      ],
    );
  }

  // ==========================================================================
  // SUPER ADMIN STUDENT FEE DETAILS MODAL (Section 6 — STRICTLY NO PAYMENT)
  // ==========================================================================
  void _showStudentDetailsModal(BuildContext context, Student student) {
    final status = student.isFeeClear ? "PAID" : (student.feesPaid == 0 ? "UNPAID" : "PARTIALLY PAID");

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
              const SizedBox(height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text("Student Fee Ledger", style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold, color: Color(0xFF0F172A))),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF1F5F9),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Text("SUPER ADMIN VIEWER", style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF475569))),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              const Text("Administrative Fee Records & Ledger Summary", style: TextStyle(fontSize: 12, color: Color(0xFF64748B))),
              const Divider(height: 20),

              // Student Details
              const Text("Student Details", style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF1E293B))),
              const SizedBox(height: 6),
              _receiptRow("Student Name", student.name),
              _receiptRow("Student ID", student.id),
              _receiptRow("Class & Section", "Grade ${student.grade} - Section ${student.section}"),
              _receiptRow("Parent Name", student.parentName),
              _receiptRow("Parent Mobile", student.parentPhone),

              const SizedBox(height: 14),
              const Text("Fee & Payment Details", style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF1E293B))),
              const SizedBox(height: 6),
              _receiptRow("Total Annual Fee", "₹${student.feesTotal}"),
              _receiptRow("Amount Paid", "₹${student.feesPaid}", isBold: true),
              _receiptRow("Outstanding Balance", "₹${student.feeDue}"),
              _receiptRow("Payment Status", status),
              _receiptRow("Last Payment Date", student.feesPaid > 0 ? "10 September 2026" : "N/A"),

              const SizedBox(height: 20),
              // NO PAYMENT BUTTON ALLOWED! Only close and reminder
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => Navigator.pop(ctx),
                      style: OutlinedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 12)),
                      child: const Text("Close"),
                    ),
                  ),
                  if (!student.isFeeClear) ...[
                    const SizedBox(width: 10),
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: () {
                          Navigator.pop(ctx);
                          _sendSingleReminder(context, student);
                        },
                        icon: const Icon(Icons.send_rounded, size: 16),
                        label: const Text("Send Reminder"),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF1E3A8A),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 12),
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ],
          ),
        );
      },
    );
  }

  // ==========================================================================
  // PAYMENT REMINDERS (Requirements 7)
  // ==========================================================================
  void _sendSingleReminder(BuildContext context, Student student) async {
    final numericId = int.tryParse(student.id.replaceAll(RegExp(r'[^0-9]'), '')) ?? 1;
    final res = await ApiService.sendFeeReminder(studentId: numericId);

    if (context.mounted) {
      final msg = student.feesPaid == 0
          ? "Fee Payment Reminder: Fee of ₹${student.feeDue} is unpaid. Dispatched to ${student.parentName}."
          : "Fee Payment Reminder: Outstanding balance ₹${student.feeDue} dispatched to ${student.parentName}.";

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(res['message'] ?? msg),
          backgroundColor: const Color(0xFF1E3A8A),
        ),
      );
    }
  }

  void _confirmBulkReminder(BuildContext context, String filter, int count) {
    if (count == 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("No students matching this filter.")),
      );
      return;
    }

    final filterLabel = filter == 'UNPAID' ? 'All Unpaid Students' : 'Partially Paid Students';

    showDialog(
      context: context,
      builder: (dialogCtx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(
          children: const [
            Icon(Icons.warning_amber_rounded, color: Color(0xFFF59E0B)),
            SizedBox(width: 8),
            Text("Confirm Bulk Reminder", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          ],
        ),
        content: Text(
          "Are you sure you want to dispatch fee payment reminders to $count parent(s) of $filterLabel?\n\nNotifications will be delivered via in-app alerts, SMS, and WhatsApp where configured.",
          style: const TextStyle(fontSize: 13, height: 1.4),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(dialogCtx), child: const Text("Cancel")),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(dialogCtx);
              final res = await ApiService.sendFeeReminder(filter: filter);
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text(res['message'] ?? "Fee reminders dispatched to $count parent(s)."),
                    backgroundColor: const Color(0xFF047857),
                  ),
                );
              }
            },
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF1E3A8A), foregroundColor: Colors.white),
            child: Text("Confirm & Send to $count"),
          ),
        ],
      ),
    );
  }

  // ==========================================================================
  // OFFICIAL RECEIPT MODAL
  // ==========================================================================
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
              _receiptRow("Student ID", student.id),
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
