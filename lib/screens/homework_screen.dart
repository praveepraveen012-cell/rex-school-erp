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
  String _filter = 'All'; // 'All', 'Pending', 'Completed'

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
              const SizedBox(height: 14),
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

                  final teacherName = ApiService.currentUser?['name'] ?? "Mrs. Sunita Rao";
                  erp.addHomework(HomeworkItem(
                    id: "hw-${DateTime.now().millisecondsSinceEpoch}",
                    subject: subject,
                    grade: targetClass,
                    teacher: teacherName,
                    title: title,
                    description: descController.text.trim(),
                    assignedDate: DateTime.now().toString().split(' ')[0],
                    dueDate: DateTime.now().add(const Duration(days: 3)).toString().split(' ')[0],
                    priority: priority,
                  ));
                  Navigator.pop(ctx);
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text("Homework assigned to $targetClass successfully"),
                      backgroundColor: const Color(0xFF059669),
                    ),
                  );
                },
                icon: const Icon(Icons.send_rounded),
                label: const Text("Publish Homework to Class"),
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

  @override
  Widget build(BuildContext context) {
    final erp = Provider.of<ERPProvider>(context);
    final role = ApiService.activeRole;
    final permissions = AppPermissions.of(role);
    final isParent = permissions.isParent;

    // Filter items
    final items = erp.homeworkList.where((h) {
      if (_filter == 'Pending') return !h.isCompleted;
      if (_filter == 'Completed') return h.isCompleted;
      return true;
    }).toList();

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: Text(
          isParent ? "Ward Homework & Tasks" : "Digital Homework Desk",
          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
        ),
        backgroundColor: const Color(0xFF0F172A),
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      // STRICT RBAC: Never show Add Homework FAB to Parents
      floatingActionButton: permissions.canCreateHomework
          ? FloatingActionButton.extended(
              onPressed: () => _showAddHomeworkSheet(context, erp),
              icon: const Icon(Icons.add),
              label: const Text("Assign Homework"),
              backgroundColor: const Color(0xFF1E3A8A),
              foregroundColor: Colors.white,
            )
          : null,
      body: Column(
        children: [
          // Banner tailored by role
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            color: isParent ? const Color(0xFFEFF6FF) : const Color(0xFFF1F5F9),
            child: Row(
              children: [
                Icon(
                  isParent ? Icons.child_care_rounded : Icons.edit_note_rounded,
                  color: isParent ? const Color(0xFF2563EB) : const Color(0xFF475569),
                  size: 20,
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    isParent
                      ? "Showing assigned coursework for ${erp.currentStudent.name} (${erp.currentStudent.grade}-${erp.currentStudent.section})"
                      : "Managing class assignments across Nilgiris curriculum sections",
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: isParent ? const Color(0xFF1E40AF) : const Color(0xFF334155),
                    ),
                  ),
                ),
              ],
            ),
          ),

          // Filter Chips
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
            child: Row(
              children: ["All", "Pending", "Completed"].map((f) {
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
                      return Card(
                        elevation: 0,
                        margin: const EdgeInsets.only(bottom: 12),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                          side: BorderSide(
                            color: hw.isCompleted
                                ? const Color(0xFF10B981).withOpacity(0.6)
                                : const Color(0xFFE2E8F0),
                            width: 1.2,
                          ),
                        ),
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              // Subject & Status Badge
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
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                    decoration: BoxDecoration(
                                      color: hw.isCompleted
                                          ? const Color(0xFFDCFCE7)
                                          : const Color(0xFFFEF3C7),
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    child: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Icon(
                                          hw.isCompleted ? Icons.check_circle : Icons.schedule,
                                          size: 13,
                                          color: hw.isCompleted
                                              ? const Color(0xFF16A34A)
                                              : const Color(0xFFD97706),
                                        ),
                                        const SizedBox(width: 4),
                                        Text(
                                          hw.isCompleted ? "Completed" : "Pending",
                                          style: TextStyle(
                                            fontSize: 10,
                                            fontWeight: FontWeight.bold,
                                            color: hw.isCompleted
                                                ? const Color(0xFF16A34A)
                                                : const Color(0xFFD97706),
                                          ),
                                        ),
                                      ],
                                    ),
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

                              // Parent Check-off toggle / Student completion toggle
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
}
