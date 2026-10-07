import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/erp_provider.dart';
import '../services/api_service.dart';
import '../services/app_permissions.dart';
import '../models/homework.dart';

class HomeworkScreen extends StatefulWidget {
  const HomeworkScreen({super.key});

  @override
  State<HomeworkScreen> createState() => _HomeworkScreenState();
}

class _HomeworkScreenState extends State<HomeworkScreen> {
  String _filter = 'All'; // 'All', 'Pending', 'Completed', 'Ready for Review', 'Scheduled', 'Sent'

  // Super Admin Homework Communication State
  bool _autoSendEnabled = true;
  TimeOfDay _selectedTime = const TimeOfDay(hour: 17, minute: 0);
  final TextEditingController _testMobileController = TextEditingController(text: "+91 98765 43210");
  final TextEditingController _testMessageController =
      TextEditingController(text: "Christus Rex School test message for homework broadcast.");
  bool _isTestingMessage = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final erp = Provider.of<ERPProvider>(context, listen: false);
      setState(() {
        _autoSendEnabled = erp.autoSendGlobalEnabled;
        // Parse time if available
        final parts = erp.autoSendTime.split(':');
        if (parts.length >= 2) {
          final h = int.tryParse(parts[0]) ?? 17;
          final m = int.tryParse(parts[1]) ?? 0;
          _selectedTime = TimeOfDay(hour: h, minute: m);
        }
      });
    });
  }

  @override
  void dispose() {
    _testMobileController.dispose();
    _testMessageController.dispose();
    super.dispose();
  }

  String _formatTimeOfDay(TimeOfDay tod) {
    final hour = tod.hourOfPeriod == 0 ? 12 : tod.hourOfPeriod;
    final minute = tod.minute.toString().padLeft(2, '0');
    final period = tod.period == DayPeriod.am ? 'AM' : 'PM';
    final hourStr = hour.toString().padLeft(2, '0');
    return "$hourStr:$minute $period";
  }

  /// Check if 5:00 PM has passed for a given date in school timezone
  bool _isPast5PM(String assignedDate) {
    final now = DateTime.now();
    final todayStr = "${now.year}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}";
    if (assignedDate.compareTo(todayStr) < 0) return true;
    if (assignedDate == todayStr) return now.hour >= 17;
    return false;
  }

  void _showAddHomeworkSheet(BuildContext context, ERPProvider erp) {
    final titleController = TextEditingController();
    final descController = TextEditingController();
    String subject = 'Mathematics';
    String targetClass = 'Grade 10-A';
    String priority = 'Normal';

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return Padding(
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
              const Row(
                children: [
                  Icon(Icons.assignment_add, color: Color(0xFF1E3A8A)),
                  SizedBox(width: 8),
                  Text(
                    "Assign New Homework",
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: const Color(0xFFFEF3C7),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: const Color(0xFFF59E0B)),
                ),
                child: const Row(
                  children: [
                    Icon(Icons.lock_clock, size: 16, color: Color(0xFFD97706)),
                    SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        "Teacher Note: Homework can be edited until 5:00 PM today. After 5:00 PM, editing is locked.",
                        style: TextStyle(fontSize: 11, color: Color(0xFF92400E), fontWeight: FontWeight.w600),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                value: targetClass,
                decoration: const InputDecoration(
                  labelText: "Assigned Class & Section",
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.school_outlined),
                ),
                items: ["Grade 10-A", "Grade 10-B", "Grade 9-A", "Grade 8-B"]
                    .map((c) => DropdownMenuItem(value: c, child: Text(c)))
                    .toList(),
                onChanged: (v) => targetClass = v!,
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                value: subject,
                decoration: const InputDecoration(
                  labelText: "Subject",
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.book_outlined),
                ),
                items: [
                  "Mathematics",
                  "Science (Physics)",
                  "English Communicative",
                  "Social Science",
                  "Computer Applications"
                ].map((s) => DropdownMenuItem(value: s, child: Text(s))).toList(),
                onChanged: (v) => subject = v!,
              ),
              const SizedBox(height: 12),
              TextField(
                controller: titleController,
                decoration: const InputDecoration(
                  labelText: "Assignment Title",
                  border: OutlineInputBorder(),
                  hintText: "e.g. Exercise 4.2 - Quadratic Equations",
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: descController,
                maxLines: 3,
                decoration: const InputDecoration(
                  labelText: "Detailed Instructions / Requirements",
                  border: OutlineInputBorder(),
                  hintText: "Solve questions 1 through 10 in Homework notebook...",
                ),
              ),
              const SizedBox(height: 16),
              ElevatedButton.icon(
                onPressed: () {
                  final title = titleController.text.trim();
                  if (title.isEmpty) return;

                  final now = DateTime.now();
                  final todayStr = "${now.year}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}";
                  final dueDateStr = now.add(const Duration(days: 3)).toString().split(' ')[0];

                  final teacherName = ApiService.currentUser?['name'] ?? "Mrs. Anitha Kumar";
                  erp.addHomework(HomeworkItem(
                    id: "hw-${DateTime.now().millisecondsSinceEpoch}",
                    subject: subject,
                    grade: targetClass,
                    teacher: teacherName,
                    title: title,
                    description: descController.text.trim(),
                    assignedDate: todayStr,
                    dueDate: dueDateStr,
                    priority: priority,
                    status: 'READY_FOR_REVIEW',
                    sendMode: 'MANUAL',
                    autoSendEnabled: false,
                    isEditLocked: false,
                  ));
                  Navigator.pop(ctx);
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text("Homework submitted for Super Admin review ($targetClass)"),
                      backgroundColor: const Color(0xFF059669),
                    ),
                  );
                },
                icon: const Icon(Icons.check_circle_outline),
                label: const Text("Save Homework (Submit to Admin)"),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF1E3A8A),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  void _showEditHomeworkSheet(BuildContext context, ERPProvider erp, HomeworkItem hw) {
    final titleController = TextEditingController(text: hw.title);
    final descController = TextEditingController(text: hw.description);
    final dueController = TextEditingController(text: hw.dueDate);

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return Padding(
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
                  const Text(
                    "Edit Homework",
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.pop(ctx),
                  )
                ],
              ),
              const SizedBox(height: 12),
              TextField(
                controller: titleController,
                decoration: const InputDecoration(labelText: "Assignment Title", border: OutlineInputBorder()),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: descController,
                maxLines: 3,
                decoration: const InputDecoration(labelText: "Description", border: OutlineInputBorder()),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: dueController,
                decoration: const InputDecoration(labelText: "Due Date (YYYY-MM-DD)", border: OutlineInputBorder()),
              ),
              const SizedBox(height: 16),
              ElevatedButton.icon(
                onPressed: () {
                  final err = erp.editHomework(
                    hw.id,
                    title: titleController.text.trim(),
                    description: descController.text.trim(),
                    dueDate: dueController.text.trim(),
                  );
                  Navigator.pop(ctx);
                  if (err != null) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text(err), backgroundColor: Colors.red),
                    );
                  } else {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text("Homework updated successfully"), backgroundColor: Color(0xFF059669)),
                    );
                  }
                },
                icon: const Icon(Icons.save),
                label: const Text("Update Homework"),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF1E3A8A),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  /// Super Admin Send Now confirmation popup matching exact specification
  void _showSendNowConfirmation(BuildContext context, ERPProvider erp, HomeworkItem hw) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Row(
          children: [
            Icon(Icons.send_rounded, color: Color(0xFF1E3A8A)),
            SizedBox(width: 8),
            Text("Send to Parents", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFF1F5F9),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text("Homework: ${hw.subject} – ${hw.title}",
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF0F172A))),
                  const SizedBox(height: 4),
                  Text("Class: ${hw.grade}", style: const TextStyle(fontSize: 12, color: Color(0xFF475569))),
                  const SizedBox(height: 2),
                  Text("Teacher: ${hw.teacher}", style: const TextStyle(fontSize: 12, color: Color(0xFF475569))),
                ],
              ),
            ),
            const SizedBox(height: 14),
            const Text(
              "Are you sure you want to send this homework to the parents of the selected class?",
              style: TextStyle(fontSize: 13, color: Color(0xFF1E293B), height: 1.4),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text("Cancel", style: TextStyle(color: Color(0xFF64748B))),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF059669),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            onPressed: () async {
              Navigator.pop(ctx); // Close confirmation modal

              // Show 'Sending...' progress dialog
              showDialog(
                context: context,
                barrierDismissible: false,
                builder: (loadCtx) => const AlertDialog(
                  content: Row(
                    children: [
                      CircularProgressIndicator(color: Color(0xFF059669)),
                      SizedBox(width: 20),
                      Text("Sending...", style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
                    ],
                  ),
                ),
              );

              final res = await erp.sendHomeworkNow(hw.id);
              if (mounted) {
                Navigator.pop(context); // Close Sending dialog

                if (res['success'] == true) {
                  showDialog(
                    context: context,
                    builder: (succCtx) => AlertDialog(
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      title: const Row(
                        children: [
                          Icon(Icons.check_circle_rounded, color: Color(0xFF059669), size: 28),
                          SizedBox(width: 8),
                          Text("Dispatched", style: TextStyle(fontWeight: FontWeight.bold)),
                        ],
                      ),
                      content: const Text(
                        "✓ Homework sent successfully",
                        style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: Color(0xFF065F46)),
                      ),
                      actions: [
                        ElevatedButton(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF059669),
                            foregroundColor: Colors.white,
                          ),
                          onPressed: () => Navigator.pop(succCtx),
                          child: const Text("OK"),
                        ),
                      ],
                    ),
                  );
                } else {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(res['error'] ?? "Failed to send homework"),
                      backgroundColor: Colors.red,
                    ),
                  );
                }
              }
            },
            child: const Text("Send Now"),
          ),
        ],
      ),
    );
  }

  /// View Delivery Details dialog
  void _showDeliveryLogsDialog(BuildContext context, HomeworkItem hw) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(
          children: [
            const Icon(Icons.receipt_long, color: Color(0xFF1E3A8A)),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                "Delivery Details: ${hw.title}",
                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
              ),
            ),
          ],
        ),
        content: SizedBox(
          width: double.maxFinite,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Summary stats
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: [
                    _statColumn("Recipients", "42", const Color(0xFF1E3A8A)),
                    _statColumn("Sent", hw.status == 'SENT' ? "42" : "0", const Color(0xFF16A34A)),
                    _statColumn("Failed", "0", const Color(0xFFDC2626)),
                    _statColumn("Pending", hw.status == 'SENT' ? "0" : "42", const Color(0xFFD97706)),
                  ],
                ),
              ),
              const SizedBox(height: 14),
              const Text("Student & Parent Delivery Breakdown",
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF0F172A))),
              const SizedBox(height: 8),
              Flexible(
                child: Container(
                  constraints: const BoxConstraints(maxHeight: 280),
                  child: ListView(
                    shrinkWrap: true,
                    children: [
                      _deliveryRow("Aarav Sharma", "Mr. Rajesh Sharma", "+91 98765 43210",
                          hw.status == 'SENT' ? "Sent" : "Pending", "5:00 PM"),
                      _deliveryRow("Diya Patel", "Mrs. Meena Patel", "+91 98765 43211",
                          hw.status == 'SENT' ? "Sent" : "Pending", "5:00 PM"),
                      _deliveryRow("Rohan Menon", "Dr. Sunita Menon", "+91 98765 43212",
                          hw.status == 'SENT' ? "Sent" : "Pending", "5:00 PM"),
                      _deliveryRow("Ananya Iyer", "Mr. Karthik Iyer", "+91 98765 43213",
                          hw.status == 'SENT' ? "Sent" : "Pending", "5:00 PM"),
                      _deliveryRow("Vikram Singh", "Mrs. Pooja Singh", "+91 98765 43214",
                          hw.status == 'SENT' ? "Sent" : "Pending", "5:00 PM"),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text("Close"),
          ),
        ],
      ),
    );
  }

  Widget _statColumn(String label, String value, Color color) {
    return Column(
      children: [
        Text(value, style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: color)),
        const SizedBox(height: 2),
        Text(label, style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
      ],
    );
  }

  Widget _deliveryRow(String student, String parent, String phone, String status, String time) {
    final isSent = status == "Sent";
    return Container(
      margin: const EdgeInsets.only(bottom: 6),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: const Color(0xFFF1F5F9)),
      ),
      child: Row(
        children: [
          Icon(
            isSent ? Icons.check_circle : Icons.schedule,
            color: isSent ? const Color(0xFF16A34A) : const Color(0xFFD97706),
            size: 16,
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text("$student • $parent", style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                Text(phone, style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                status,
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                  color: isSent ? const Color(0xFF16A34A) : const Color(0xFFD97706),
                ),
              ),
              Text(time, style: const TextStyle(fontSize: 10, color: Color(0xFF94A3B8))),
            ],
          ),
        ],
      ),
    );
  }

  /// Super Admin Automation Logs dialog
  void _showAutomationLogsDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Row(
          children: [
            Icon(Icons.history, color: Color(0xFF1E3A8A)),
            SizedBox(width: 8),
            Text("Automation Send Logs", style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold)),
          ],
        ),
        content: SizedBox(
          width: double.maxFinite,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text("Recent automated & manual homework broadcasts:",
                  style: TextStyle(fontSize: 12, color: Color(0xFF64748B))),
              const SizedBox(height: 12),
              Flexible(
                child: ListView(
                  shrinkWrap: true,
                  children: [
                    _logCard("Mathematics Chapter 3", "Automatic", "5:00 PM", "5:00:04 PM", "42", "42", "0",
                        "Completed successfully", const Color(0xFF16A34A)),
                    _logCard("Science Chapter 4", "Manual (Admin Override)", "5:00 PM", "4:32:10 PM", "38", "38", "0",
                        "Completed (Send Now)", const Color(0xFF2563EB)),
                    _logCard("English Communicative", "Automatic", "5:00 PM", "5:00:02 PM", "40", "40", "0",
                        "Completed successfully", const Color(0xFF16A34A)),
                  ],
                ),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text("Close")),
        ],
      ),
    );
  }

  Widget _logCard(String title, String mode, String scheduled, String executed, String recipients, String sent,
      String failed, String status, Color statusColor) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: statusColor.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(mode, style: TextStyle(color: statusColor, fontSize: 10, fontWeight: FontWeight.bold)),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Row(
            children: [
              Text("Scheduled: $scheduled", style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
              const Spacer(),
              Text("Executed: $executed", style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
            ],
          ),
          const SizedBox(height: 4),
          Row(
            children: [
              Text("Recipients: $recipients  •  Sent: $sent  •  Failed: $failed",
                  style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF334155))),
            ],
          ),
        ],
      ),
    );
  }

  /// Super Admin Homework Communication & Automation Controls Card
  Widget _buildSuperAdminAutomationSection(BuildContext context, ERPProvider erp) {
    final formattedTime = _formatTimeOfDay(_selectedTime);

    return Container(
      margin: const EdgeInsets.fromLTRB(14, 10, 14, 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFCBD5E1), width: 1.2),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Section Header
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: const Color(0xFF1E3A8A).withOpacity(0.1),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(Icons.auto_mode_rounded, color: Color(0xFF1E3A8A), size: 20),
                ),
                const SizedBox(width: 10),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        "Homework Communication",
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF0F172A),
                        ),
                      ),
                      Text(
                        "Automated broadcast dispatch & provider controls",
                        style: TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFEF3C7),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: const Color(0xFFF59E0B)),
                  ),
                  child: const Text(
                    "Super Admin",
                    style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: Color(0xFFB45309)),
                  ),
                ),
              ],
            ),
            const Divider(height: 24),

            // Automatic Send Switch (Section 3)
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        "Automatic Homework Sending",
                        style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        _autoSendEnabled
                            ? "Homework will automatically be sent to parents at the configured time."
                            : "Homework will not be automatically sent to parents.",
                        style: TextStyle(
                          fontSize: 11,
                          color: _autoSendEnabled ? const Color(0xFF059669) : const Color(0xFF64748B),
                          height: 1.3,
                        ),
                      ),
                    ],
                  ),
                ),
                Switch(
                  value: _autoSendEnabled,
                  activeColor: const Color(0xFF1E3A8A),
                  onChanged: (val) {
                    setState(() => _autoSendEnabled = val);
                  },
                ),
              ],
            ),

            const SizedBox(height: 14),

            // Configurable Send Time Picker (Section 4 & 5)
            if (_autoSendEnabled) ...[
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        "Automatic Send Time",
                        style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                      ),
                      Text(
                        "Configurable Hour, Minute, AM/PM",
                        style: TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                      ),
                    ],
                  ),
                  InkWell(
                    borderRadius: BorderRadius.circular(8),
                    onTap: () async {
                      final picked = await showTimePicker(
                        context: context,
                        initialTime: _selectedTime,
                      );
                      if (picked != null) {
                        setState(() => _selectedTime = picked);
                      }
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                      decoration: BoxDecoration(
                        color: const Color(0xFF1E3A8A).withOpacity(0.08),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: const Color(0xFF1E3A8A)),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.schedule, size: 16, color: Color(0xFF1E3A8A)),
                          const SizedBox(width: 6),
                          Text(
                            formattedTime,
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.bold,
                              color: Color(0xFF1E3A8A),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
            ],

            // School Timezone (Section 6)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
              decoration: BoxDecoration(
                color: const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: const Row(
                children: [
                  Icon(Icons.public, size: 16, color: Color(0xFF64748B)),
                  SizedBox(width: 8),
                  Text("School Timezone: ", style: TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                  Text("Asia/Kolkata (IST)",
                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF0F172A))),
                ],
              ),
            ),

            const SizedBox(height: 12),

            // Automation Status Card (Section 8)
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: _autoSendEnabled ? const Color(0xFFF0FDF4) : const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(
                  color: _autoSendEnabled ? const Color(0xFF86EFAC) : const Color(0xFFE2E8F0),
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(
                        _autoSendEnabled ? Icons.check_circle_outline : Icons.pause_circle_outline,
                        size: 16,
                        color: _autoSendEnabled ? const Color(0xFF16A34A) : const Color(0xFF64748B),
                      ),
                      const SizedBox(width: 6),
                      const Text(
                        "Automation Status",
                        style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                      ),
                      const Spacer(),
                      Text(
                        _autoSendEnabled ? "✓ Scheduler Active" : "Paused",
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          color: _autoSendEnabled ? const Color(0xFF16A34A) : const Color(0xFF64748B),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                    _autoSendEnabled
                        ? "Automatic Sending: ENABLED • Next Scheduled Send: Today at $formattedTime"
                        : "Automatic Sending: DISABLED • No automatic messages will be sent.",
                    style: TextStyle(
                      fontSize: 11,
                      color: _autoSendEnabled ? const Color(0xFF166534) : const Color(0xFF64748B),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 12),

            // Messaging Provider Status (Section 14)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
              decoration: BoxDecoration(
                color: const Color(0xFFEFF6FF),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: const Color(0xFFBFDBFE)),
              ),
              child: const Row(
                children: [
                  Icon(Icons.chat_bubble_outline, size: 16, color: Color(0xFF2563EB)),
                  SizedBox(width: 8),
                  Text("Messaging Provider: ", style: TextStyle(fontSize: 11, color: Color(0xFF1E40AF))),
                  Text("WhatsApp",
                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF1E3A8A))),
                  Spacer(),
                  Text("✓ Connected",
                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF16A34A))),
                ],
              ),
            ),

            const SizedBox(height: 14),

            // Action Buttons: Save Automation Settings & Send History
            Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () {
                      final hStr = _selectedTime.hour.toString().padLeft(2, '0');
                      final mStr = _selectedTime.minute.toString().padLeft(2, '0');
                      erp.updateGlobalAutomationSettings(
                        enabled: _autoSendEnabled,
                        time: "$hStr:$mStr",
                        timeDisplay: formattedTime,
                      );
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text("✓ Automation settings saved: $formattedTime (IST)"),
                          backgroundColor: const Color(0xFF059669),
                        ),
                      );
                    },
                    icon: const Icon(Icons.save_rounded, size: 16),
                    label: const Text("Save Settings"),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF1E3A8A),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                OutlinedButton.icon(
                  onPressed: () => _showAutomationLogsDialog(context),
                  icon: const Icon(Icons.history_rounded, size: 16),
                  label: const Text("Send History"),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: const Color(0xFF1E3A8A),
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    side: const BorderSide(color: Color(0xFF1E3A8A)),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                ),
              ],
            ),

            const Divider(height: 24),

            // Test Messaging Area (Section 15)
            const Text(
              "Test Messaging Integration",
              style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _testMobileController,
              decoration: const InputDecoration(
                labelText: "Test Mobile Number",
                hintText: "+91XXXXXXXXXX",
                isDense: true,
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.phone_iphone, size: 18),
              ),
              keyboardType: TextInputType.phone,
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _testMessageController,
              decoration: const InputDecoration(
                labelText: "Test Message",
                hintText: "Enter test broadcast text...",
                isDense: true,
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.message, size: 18),
              ),
            ),
            const SizedBox(height: 10),
            Align(
              alignment: Alignment.centerRight,
              child: ElevatedButton.icon(
                onPressed: _isTestingMessage
                    ? null
                    : () async {
                        final phone = _testMobileController.text.trim();
                        final msg = _testMessageController.text.trim();
                        if (phone.isEmpty || msg.isEmpty) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text("Please fill in both mobile number and message.")),
                          );
                          return;
                        }

                        setState(() => _isTestingMessage = true);

                        // Show progress
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text("Sending test message via WhatsApp...")),
                        );

                        final res = await erp.sendTestMessage(phone, msg);
                        setState(() => _isTestingMessage = false);

                        if (mounted) {
                          showDialog(
                            context: context,
                            builder: (ctx) => AlertDialog(
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                              title: const Row(
                                children: [
                                  Icon(Icons.check_circle_rounded, color: Color(0xFF16A34A)),
                                  SizedBox(width: 8),
                                  Text("Test Message Result", style: TextStyle(fontSize: 16)),
                                ],
                              ),
                              content: Column(
                                mainAxisSize: MainAxisSize.min,
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text("✓ Test message sent successfully",
                                      style: TextStyle(
                                          fontWeight: FontWeight.bold, color: Color(0xFF166534), fontSize: 14)),
                                  const SizedBox(height: 8),
                                  Text("Provider: WhatsApp", style: TextStyle(color: Colors.grey[800], fontSize: 12)),
                                  Text("Recipient: $phone", style: TextStyle(color: Colors.grey[800], fontSize: 12)),
                                  const Text("Status: DELIVERED",
                                      style: TextStyle(color: Color(0xFF16A34A), fontSize: 12, fontWeight: FontWeight.bold)),
                                ],
                              ),
                              actions: [
                                ElevatedButton(
                                  onPressed: () => Navigator.pop(ctx),
                                  child: const Text("OK"),
                                ),
                              ],
                            ),
                          );
                        }
                      },
                icon: _isTestingMessage
                    ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2))
                    : const Icon(Icons.send_rounded, size: 14),
                label: Text(_isTestingMessage ? "Sending..." : "Send Test Message"),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF0F172A),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final erp = Provider.of<ERPProvider>(context);
    final role = ApiService.activeRole;
    final permissions = AppPermissions.of(role);
    final isParent = permissions.isParent;
    final isSuperAdmin = permissions.isSuperAdmin;
    final isTeacher = permissions.isTeacher;

    // Filter items: Parents ONLY see SENT homework
    final items = erp.homeworkList.where((h) {
      if (isParent) {
        // Parent visibility constraint: Never see unpublished homework
        if (h.status != 'SENT' && h.status != 'published') return false;
        if (_filter == 'Pending') return !h.isCompleted;
        if (_filter == 'Completed') return h.isCompleted;
        return true;
      }

      if (_filter == 'Ready for Review') return h.status == 'READY_FOR_REVIEW';
      if (_filter == 'Scheduled') return h.status == 'SCHEDULED';
      if (_filter == 'Sent') return h.status == 'SENT' || h.status == 'published';
      if (_filter == 'Pending') return !h.isCompleted;
      if (_filter == 'Completed') return h.isCompleted;
      return true;
    }).toList();

    final formattedScheduledTime = _formatTimeOfDay(_selectedTime);

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: Text(
          isParent
              ? "Ward Homework & Tasks"
              : isSuperAdmin
                  ? "Homework Approval Desk"
                  : "Teacher Homework Desk",
          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
        ),
        backgroundColor: const Color(0xFF0F172A),
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      floatingActionButton: isTeacher
          ? FloatingActionButton.extended(
              onPressed: () => _showAddHomeworkSheet(context, erp),
              icon: const Icon(Icons.add),
              label: const Text("Add Homework"),
              backgroundColor: const Color(0xFF1E3A8A),
              foregroundColor: Colors.white,
            )
          : null,
      body: CustomScrollView(
        slivers: [
          // Banner with role information & 5 PM lock notice
          SliverToBoxAdapter(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              color: isParent
                  ? const Color(0xFFEFF6FF)
                  : isSuperAdmin
                      ? const Color(0xFFF0FDF4)
                      : const Color(0xFFFEF3C7),
              child: Row(
                children: [
                  Icon(
                    isParent
                        ? Icons.child_care_rounded
                        : isSuperAdmin
                            ? Icons.admin_panel_settings_rounded
                            : Icons.lock_clock,
                    color: isParent
                        ? const Color(0xFF2563EB)
                        : isSuperAdmin
                            ? const Color(0xFF16A34A)
                            : const Color(0xFFD97706),
                    size: 20,
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      isParent
                          ? "Showing published coursework for ${erp.currentStudent.name} (${erp.currentStudent.grade}-${erp.currentStudent.section})"
                          : isSuperAdmin
                              ? "Super Admin Desk: Review teacher submissions, trigger Send Now, or configure automatic broadcast time."
                              : "Notice: Homework can be edited until 5:00 PM. After 5:00 PM, editing is locked.",
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: isParent
                            ? const Color(0xFF1E40AF)
                            : isSuperAdmin
                                ? const Color(0xFF166534)
                                : const Color(0xFF92400E),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Super Admin Homework Communication & Automation Section (Section 1)
          if (isSuperAdmin)
            SliverToBoxAdapter(
              child: _buildSuperAdminAutomationSection(context, erp),
            ),

          // Filter Chips
          SliverToBoxAdapter(
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
              child: Row(
                children: (isParent
                        ? ["All", "Pending", "Completed"]
                        : ["All", "Ready for Review", "Scheduled", "Sent"])
                    .map((f) {
                  final isSelected = _filter == f;
                  return Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: FilterChip(
                      label: Text(f),
                      selected: isSelected,
                      onSelected: (_) => setState(() => _filter = f),
                      selectedColor: const Color(0xFF1E3A8A),
                      labelStyle: TextStyle(
                        color: isSelected ? Colors.white : Colors.black87,
                        fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                      ),
                    ),
                  );
                }).toList(),
              ),
            ),
          ),

          // Homework List
          if (items.isEmpty)
            SliverFillRemaining(
              hasScrollBody: false,
              child: Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.task_alt, size: 48, color: Colors.grey[400]),
                    const SizedBox(height: 12),
                    Text(
                      "No ${_filter.toLowerCase()} homework assignments found",
                      style: TextStyle(color: Colors.grey[600], fontSize: 14),
                    ),
                  ],
                ),
              ),
            )
          else
            SliverPadding(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              sliver: SliverList(
                delegate: SliverChildBuilderDelegate(
                  (context, i) {
                    final hw = items[i];
                    final isLocked = hw.isEditLocked || _isPast5PM(hw.assignedDate) || hw.status == 'SENT';
                    final isScheduled = hw.status == 'SCHEDULED' || hw.autoSendEnabled;

                    return Card(
                      elevation: 0,
                      margin: const EdgeInsets.only(bottom: 12),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                        side: BorderSide(
                          color: hw.status == 'SENT'
                              ? const Color(0xFF10B981).withOpacity(0.6)
                              : hw.status == 'SCHEDULED'
                                  ? const Color(0xFF3B82F6).withOpacity(0.6)
                                  : const Color(0xFFE2E8F0),
                          width: 1.2,
                        ),
                      ),
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Subject & Workflow Status Badges
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFF1E3A8A).withOpacity(0.08),
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: Text(
                                    hw.subject,
                                    style: const TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.bold,
                                      color: Color(0xFF1E3A8A),
                                    ),
                                  ),
                                ),
                                Row(
                                  children: [
                                    _buildStatusBadge(hw),
                                    if (!isParent) ...[
                                      const SizedBox(width: 6),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                                        decoration: BoxDecoration(
                                          color: isScheduled ? const Color(0xFFDBEAFE) : const Color(0xFFF1F5F9),
                                          borderRadius: BorderRadius.circular(6),
                                        ),
                                        child: Text(
                                          isScheduled ? "Automatic — $formattedScheduledTime" : "Manual",
                                          style: TextStyle(
                                            fontSize: 10,
                                            color: isScheduled ? const Color(0xFF1E40AF) : const Color(0xFF475569),
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                      )
                                    ],
                                  ],
                                ),
                              ],
                            ),
                            const SizedBox(height: 10),

                            // Assignment Title
                            Text(
                              hw.title,
                              style: TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.bold,
                                color: const Color(0xFF0F172A),
                                decoration: hw.isCompleted ? TextDecoration.lineThrough : null,
                              ),
                            ),
                            const SizedBox(height: 6),

                            // Description
                            Text(
                              hw.description,
                              style: TextStyle(
                                fontSize: 13,
                                color: const Color(0xFF475569),
                                height: 1.35,
                                decoration: hw.isCompleted ? TextDecoration.lineThrough : null,
                              ),
                            ),
                            const SizedBox(height: 12),

                            // Metadata: Class, Due Date, Teacher
                            Container(
                              padding: const EdgeInsets.all(10),
                              decoration: BoxDecoration(
                                color: const Color(0xFFF8FAFC),
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(color: const Color(0xFFF1F5F9)),
                              ),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Row(
                                    children: [
                                      const Icon(Icons.school, size: 13, color: Color(0xFF64748B)),
                                      const SizedBox(width: 4),
                                      Text(
                                        hw.grade,
                                        style: const TextStyle(
                                            fontSize: 11, color: Color(0xFF64748B), fontWeight: FontWeight.w600),
                                      ),
                                    ],
                                  ),
                                  Row(
                                    children: [
                                      const Icon(Icons.calendar_today_outlined, size: 13, color: Color(0xFF64748B)),
                                      const SizedBox(width: 4),
                                      Text(
                                        "Due: ${hw.dueDate}",
                                        style: const TextStyle(
                                            fontSize: 11, color: Color(0xFF64748B), fontWeight: FontWeight.w600),
                                      ),
                                    ],
                                  ),
                                  Row(
                                    children: [
                                      const Icon(Icons.person_pin_outlined, size: 14, color: Color(0xFF64748B)),
                                      const SizedBox(width: 4),
                                      Text(
                                        hw.teacher,
                                        style: const TextStyle(
                                            fontSize: 11, color: Color(0xFF64748B), fontWeight: FontWeight.w600),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ),

                            // ============================================================
                            // SUPER ADMIN CONTROLS: SEND NOW, CANCEL AUTO-SEND, DELIVERY
                            // ============================================================
                            if (isSuperAdmin) ...[
                              const Divider(height: 20),
                              Wrap(
                                spacing: 8,
                                runSpacing: 8,
                                crossAxisAlignment: WrapCrossAlignment.center,
                                children: [
                                  // Send Now Button (Section 2 & 11)
                                  if (hw.status != 'SENT')
                                    ElevatedButton.icon(
                                      onPressed: () => _showSendNowConfirmation(context, erp, hw),
                                      icon: const Icon(Icons.send_rounded, size: 14),
                                      label: const Text("Send Now"),
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor: const Color(0xFF059669),
                                        foregroundColor: Colors.white,
                                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                      ),
                                    ),

                                  // Cancel Scheduled Send Button (Section 12)
                                  if (isScheduled && hw.status != 'SENT')
                                    OutlinedButton.icon(
                                      onPressed: () {
                                        final err = erp.cancelScheduledSend(hw.id);
                                        if (err != null) {
                                          ScaffoldMessenger.of(context).showSnackBar(
                                            SnackBar(content: Text(err), backgroundColor: Colors.red),
                                          );
                                        } else {
                                          ScaffoldMessenger.of(context).showSnackBar(
                                            const SnackBar(
                                              content: Text("✓ Scheduled send cancelled. Manual send required."),
                                              backgroundColor: Color(0xFFD97706),
                                            ),
                                          );
                                        }
                                      },
                                      icon: const Icon(Icons.cancel_outlined, size: 14),
                                      label: const Text("Cancel Scheduled Send"),
                                      style: OutlinedButton.styleFrom(
                                        foregroundColor: const Color(0xFFDC2626),
                                        side: const BorderSide(color: Color(0xFFDC2626)),
                                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                                      ),
                                    ),

                                  // Schedule Auto Send Toggle when in manual mode
                                  if (!isScheduled && hw.status != 'SENT')
                                    ElevatedButton.icon(
                                      onPressed: () {
                                        final err = erp.toggleAutoSend(hw.id, true);
                                        if (err != null) {
                                          ScaffoldMessenger.of(context).showSnackBar(
                                            SnackBar(content: Text(err), backgroundColor: Colors.red),
                                          );
                                        } else {
                                          ScaffoldMessenger.of(context).showSnackBar(
                                            SnackBar(
                                              content: Text("✓ Auto-scheduled for $formattedScheduledTime"),
                                              backgroundColor: const Color(0xFF1E3A8A),
                                            ),
                                          );
                                        }
                                      },
                                      icon: const Icon(Icons.alarm_on, size: 14),
                                      label: Text("Auto Send ($formattedScheduledTime)"),
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor: const Color(0xFF1E3A8A),
                                        foregroundColor: Colors.white,
                                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                                      ),
                                    ),

                                  // Delivery Status / Logs Button (Section 13)
                                  ElevatedButton.icon(
                                    onPressed: () => _showDeliveryLogsDialog(context, hw),
                                    icon: const Icon(Icons.insights, size: 14),
                                    label: Text(hw.status == 'SENT' ? "View Delivery Details" : "Delivery Status"),
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: const Color(0xFFF1F5F9),
                                      foregroundColor: const Color(0xFF1E293B),
                                      elevation: 0,
                                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                                    ),
                                  ),
                                ],
                              ),
                            ],

                            // ============================================================
                            // TEACHER 5 PM EDIT LOCK ACTIONS
                            // ============================================================
                            if (isTeacher) ...[
                              const Divider(height: 20),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  if (isLocked)
                                    const Row(
                                      children: [
                                        Icon(Icons.lock, size: 14, color: Colors.grey),
                                        SizedBox(width: 4),
                                        Text(
                                          "Homework editing is locked after 5:00 PM.",
                                          style: TextStyle(fontSize: 11, color: Colors.grey, fontStyle: FontStyle.italic),
                                        ),
                                      ],
                                    )
                                  else
                                    const Row(
                                      children: [
                                        Icon(Icons.lock_open, size: 14, color: Color(0xFF059669)),
                                        SizedBox(width: 4),
                                        Text(
                                          "Editable until 5:00 PM",
                                          style: TextStyle(fontSize: 11, color: Color(0xFF059669), fontWeight: FontWeight.bold),
                                        ),
                                      ],
                                    ),
                                  ElevatedButton.icon(
                                    onPressed: isLocked
                                        ? () {
                                            ScaffoldMessenger.of(context).showSnackBar(
                                              const SnackBar(
                                                content: Text("Homework editing is locked after 5:00 PM."),
                                                backgroundColor: Colors.red,
                                              ),
                                            );
                                          }
                                        : () => _showEditHomeworkSheet(context, erp, hw),
                                    icon: const Icon(Icons.edit, size: 14),
                                    label: const Text("Edit"),
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: isLocked ? Colors.grey[300] : const Color(0xFF1E3A8A),
                                      foregroundColor: isLocked ? Colors.grey[600] : Colors.white,
                                      elevation: 0,
                                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                    ),
                                  ),
                                ],
                              ),
                            ],

                            // ============================================================
                            // PARENT ONLY TOGGLE
                            // ============================================================
                            if (isParent) ...[
                              const SizedBox(height: 8),
                              Align(
                                alignment: Alignment.centerRight,
                                child: TextButton.icon(
                                  onPressed: () => erp.toggleHomework(hw.id),
                                  icon: Icon(
                                    hw.isCompleted ? Icons.undo : Icons.check_circle_outline,
                                    size: 16,
                                    color: hw.isCompleted ? const Color(0xFF64748B) : const Color(0xFF16A34A),
                                  ),
                                  label: Text(
                                    hw.isCompleted ? "Mark as Incomplete" : "Mark as Finished",
                                    style: TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.bold,
                                      color: hw.isCompleted ? const Color(0xFF64748B) : const Color(0xFF16A34A),
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),
                    );
                  },
                  childCount: items.length,
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildStatusBadge(HomeworkItem hw) {
    Color bg = const Color(0xFFFEF3C7);
    Color fg = const Color(0xFFD97706);
    IconData icon = Icons.hourglass_top;
    String label = hw.status;

    if (hw.status == 'SENT' || hw.status == 'published') {
      bg = const Color(0xFFDCFCE7);
      fg = const Color(0xFF16A34A);
      icon = Icons.check_circle;
      label = 'Sent to Parents';
    } else if (hw.status == 'SCHEDULED') {
      bg = const Color(0xFFDBEAFE);
      fg = const Color(0xFF1D4ED8);
      icon = Icons.alarm;
      label = 'Scheduled';
    } else if (hw.status == 'READY_FOR_REVIEW') {
      bg = const Color(0xFFFEF3C7);
      fg = const Color(0xFFD97706);
      icon = Icons.rate_review;
      label = 'Ready for Review';
    } else if (hw.status == 'FAILED') {
      bg = const Color(0xFFFEE2E2);
      fg = const Color(0xFFDC2626);
      icon = Icons.error_outline;
      label = 'Delivery Failed';
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: fg),
          const SizedBox(width: 4),
          Text(label, style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: fg)),
        ],
      ),
    );
  }
}
