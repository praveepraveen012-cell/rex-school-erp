import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/erp_provider.dart';
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
    String priority = 'Normal';

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
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
              const Text("Assign New Homework", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 14),
              DropdownButtonFormField<String>(
                value: subject,
                decoration: const InputDecoration(labelText: "Subject", border: OutlineInputBorder()),
                items: ["Mathematics", "Science (Physics)", "English Communicative", "Social Science"]
                    .map((s) => DropdownMenuItem(value: s, child: Text(s)))
                    .toList(),
                onChanged: (v) => subject = v!,
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
                decoration: const InputDecoration(labelText: "Instructions / Description", border: OutlineInputBorder()),
              ),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () {
                  if (titleController.text.trim().isEmpty) return;
                  erp.addHomework(HomeworkItem(
                    id: "hw-${DateTime.now().millisecondsSinceEpoch}",
                    subject: subject,
                    grade: "10-A",
                    teacher: "Mrs. Sunita Rao",
                    title: titleController.text.trim(),
                    description: descController.text.trim(),
                    assignedDate: "2026-09-23",
                    dueDate: "2026-09-26",
                    priority: priority,
                  ));
                  Navigator.pop(ctx);
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text("Homework assigned to Grade 10-A")),
                  );
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF1E3A8A),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
                child: const Text("Assign Homework"),
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
    final items = erp.homeworkList.where((h) {
      if (_filter == 'Pending') return !h.isCompleted;
      if (_filter == 'Completed') return h.isCompleted;
      return true;
    }).toList();

    return Scaffold(
      appBar: AppBar(
        title: const Text("Digital Homework & Diary"),
        backgroundColor: const Color(0xFF1E3A8A),
        foregroundColor: Colors.white,
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showAddHomeworkSheet(context, erp),
        icon: const Icon(Icons.add),
        label: const Text("Add Homework"),
        backgroundColor: const Color(0xFF1E3A8A),
        foregroundColor: Colors.white,
      ),
      body: Column(
        children: [
          // Filter Chips
          Padding(
            padding: const EdgeInsets.all(12),
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
                    labelStyle: TextStyle(color: isSelected ? Colors.white : Colors.black87),
                  ),
                );
              }).toList(),
            ),
          ),
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
              itemCount: items.length,
              itemBuilder: (context, i) {
                final hw = items[i];
                return Card(
                  elevation: 1,
                  margin: const EdgeInsets.only(bottom: 10),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                    side: BorderSide(
                      color: hw.isCompleted ? const Color(0xFF10B981) : Colors.grey.withOpacity(0.2),
                    ),
                  ),
                  child: CheckboxListTile(
                    value: hw.isCompleted,
                    onChanged: (_) => erp.toggleHomework(hw.id),
                    title: Text(
                      "${hw.subject}: ${hw.title}",
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        decoration: hw.isCompleted ? TextDecoration.lineThrough : null,
                      ),
                    ),
                    subtitle: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const SizedBox(height: 4),
                        Text(
                          hw.description,
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.grey[700],
                            decoration: hw.isCompleted ? TextDecoration.lineThrough : null,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text("Due: ${hw.dueDate}", style: const TextStyle(fontSize: 11, color: Colors.grey)),
                            Text("Teacher: ${hw.teacher}", style: const TextStyle(fontSize: 11, color: Colors.grey)),
                          ],
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
