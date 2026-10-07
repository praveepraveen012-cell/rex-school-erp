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

  void _showSendNowConfirmation(BuildContext context, ERPProvider erp, HomeworkItem hw) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Row(
          children: [
            Icon(Icons.send_rounded, color: Color(0xFF1E3A8A)),
            SizedBox(width: 8),
            Text("Send Homework Now"),
          ],
        ),
        content: Text(
          "Send this homework to all eligible parents in ${hw.grade} now via WhatsApp and in-app alert?",
          style: const TextStyle(fontSize: 14),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text("Cancel"),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF059669),
              foregroundColor: Colors.white,
            ),
            onPressed: () async {
              Navigator.pop(ctx);
              final res = await erp.sendHomeworkNow(hw.id);
              if (res['success'] == true) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text("Homework dispatched to ${res['sentCount']} parents!"),
                    backgroundColor: const Color(0xFF059669),
                  ),
                );
              } else {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text(res['error'] ?? "Failed to send"), backgroundColor: Colors.red),
                );
              }
            },
            child: const Text("Confirm & Send"),
          ),
        ],
      ),
    );
  }

  void _showDeliveryLogsDialog(BuildContext context, HomeworkItem hw) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Row(
          children: [
            const Icon(Icons.receipt_long, color: Color(0xFF1E3A8A)),
            const SizedBox(width: 8),
            Expanded(child: Text("Delivery Logs: ${hw.title}", style: const TextStyle(fontSize: 16))),
          ],
        ),
        content: SizedBox(
          width: double.maxFinite,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  _statChip("Sent: ${hw.sentDeliveriesCount > 0 ? hw.sentDeliveriesCount : (hw.status == 'SENT' ? 42 : 0)}", Colors.green),
                  const SizedBox(width: 8),
                  _statChip("Failed: ${hw.failedDeliveriesCount}", Colors.red),
                  const SizedBox(width: 8),
                  _statChip("Mode: ${hw.sendMode == 'AUTO_5PM' ? 'Auto 5 PM' : 'Manual'}", Colors.blue),
                ],
              ),
              const Divider(height: 24),
              const Text("Recipient Breakdown:", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
              const SizedBox(height: 8),
              Flexible(
                child: ListView(
                  shrinkWrap: true,
                  children: const [
                    ListTile(
                      dense: true,
                      leading: Icon(Icons.check_circle, color: Colors.green, size: 18),
                      title: Text("Mr. Rajesh Sharma (Aarav Sharma)", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                      subtitle: Text("WhatsApp: +91 98765 43210 • 5:00 PM", style: TextStyle(fontSize: 11)),
                      trailing: Text("Delivered", style: TextStyle(color: Colors.green, fontSize: 11, fontWeight: FontWeight.bold)),
                    ),
                    ListTile(
                      dense: true,
                      leading: Icon(Icons.check_circle, color: Colors.green, size: 18),
                      title: Text("Dr. Sunita Menon (Rohan Menon)", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                      subtitle: Text("WhatsApp: +91 98765 43211 • 5:00 PM", style: TextStyle(fontSize: 11)),
                      trailing: Text("Delivered", style: TextStyle(color: Colors.green, fontSize: 11, fontWeight: FontWeight.bold)),
                    ),
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

  Widget _statChip(String text, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(color: color.withOpacity(0.12), borderRadius: BorderRadius.circular(6)),
      child: Text(text, style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.bold)),
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
      body: Column(
        children: [
          // Banner with role information & 5 PM lock notice
          Container(
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
                            ? "Review teacher assignments, trigger Send Now, or configure 5:00 PM Auto Send."
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

          // Filter Chips
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
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

          // Homework List
          Expanded(
            child: items.isEmpty
                ? Center(
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
                  )
                : ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                    itemCount: items.length,
                    itemBuilder: (context, i) {
                      final hw = items[i];
                      final isLocked = hw.isEditLocked || _isPast5PM(hw.assignedDate) || hw.status == 'SENT';

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
                                      // Status Badge
                                      _buildStatusBadge(hw),
                                      if (!isParent && hw.sendMode == 'AUTO_5PM') ...[
                                        const SizedBox(width: 6),
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                                          decoration: BoxDecoration(
                                            color: const Color(0xFFDBEAFE),
                                            borderRadius: BorderRadius.circular(6),
                                          ),
                                          child: const Text(
                                            "Auto 5 PM",
                                            style: TextStyle(fontSize: 10, color: Color(0xFF1E40AF), fontWeight: FontWeight.bold),
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
                                          style: const TextStyle(fontSize: 11, color: Color(0xFF64748B), fontWeight: FontWeight.w600),
                                        ),
                                      ],
                                    ),
                                    Row(
                                      children: [
                                        const Icon(Icons.calendar_today_outlined, size: 13, color: Color(0xFF64748B)),
                                        const SizedBox(width: 4),
                                        Text(
                                          "Due: ${hw.dueDate}",
                                          style: const TextStyle(fontSize: 11, color: Color(0xFF64748B), fontWeight: FontWeight.w600),
                                        ),
                                      ],
                                    ),
                                    Row(
                                      children: [
                                        const Icon(Icons.person_pin_outlined, size: 14, color: Color(0xFF64748B)),
                                        const SizedBox(width: 4),
                                        Text(
                                          hw.teacher,
                                          style: const TextStyle(fontSize: 11, color: Color(0xFF64748B), fontWeight: FontWeight.w600),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                              ),

                              // ============================================================
                              // SUPER ADMIN WORKFLOW ACTIONS (Send Now & Auto Send at 5 PM)
                              // ============================================================
                              if (isSuperAdmin) ...[
                                const Divider(height: 20),
                                Row(
                                  children: [
                                    // Send Now Button
                                    ElevatedButton.icon(
                                      onPressed: hw.status == 'SENT'
                                          ? null
                                          : () => _showSendNowConfirmation(context, erp, hw),
                                      icon: const Icon(Icons.send_rounded, size: 14),
                                      label: Text(hw.status == 'SENT' ? "Already Sent" : "Send Now"),
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor: const Color(0xFF059669),
                                        foregroundColor: Colors.white,
                                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                                      ),
                                    ),
                                    const SizedBox(width: 10),

                                    // Auto Send at 5 PM Toggle
                                    Row(
                                      children: [
                                        const Text("Auto 5 PM:", style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600)),
                                        Switch(
                                          value: hw.autoSendEnabled,
                                          activeColor: const Color(0xFF1E3A8A),
                                          onChanged: hw.status == 'SENT'
                                              ? null
                                              : (val) {
                                                  final err = erp.toggleAutoSend(hw.id, val);
                                                  if (err != null) {
                                                    showDialog(
                                                      context: context,
                                                      builder: (ctx) => AlertDialog(
                                                        title: const Text("Auto Send Notice"),
                                                        content: Text(err),
                                                        actions: [
                                                          TextButton(
                                                            onPressed: () => Navigator.pop(ctx),
                                                            child: const Text("OK"),
                                                          ),
                                                        ],
                                                      ),
                                                    );
                                                  }
                                                },
                                        ),
                                      ],
                                    ),

                                    const Spacer(),
                                    // Delivery Logs Button
                                    IconButton(
                                      tooltip: "View Delivery Logs",
                                      icon: const Icon(Icons.history_edu, color: Color(0xFF64748B)),
                                      onPressed: () => _showDeliveryLogsDialog(context, hw),
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
      label = 'Auto Scheduled (5 PM)';
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
