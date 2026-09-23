import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/erp_provider.dart';
import '../models/leave_request.dart';

class LeaveScreen extends StatelessWidget {
  const LeaveScreen({super.key});

  void _showApplyDialog(BuildContext context, ERPProvider erp) {
    String category = 'Medical / Illness';
    final reasonController = TextEditingController(text: "Doctor advises bed rest due to seasonal viral fever.");
    DateTime fromDate = DateTime.now().add(const Duration(days: 2));
    DateTime toDate = DateTime.now().add(const Duration(days: 3));

    showDialog(
      context: context,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setState) {
            final days = toDate.difference(fromDate).inDays + 1;
            return AlertDialog(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              title: const Text("📝 Student Leave Application"),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    DropdownButtonFormField<String>(
                      value: category,
                      decoration: const InputDecoration(labelText: "Leave Category", border: OutlineInputBorder()),
                      items: [
                        "Medical / Illness",
                        "Family Function",
                        "Sports Tournament",
                        "Out of Town Travel",
                        "Personal Emergency"
                      ].map((c) => DropdownMenuItem(value: c, child: Text(c))).toList(),
                      onChanged: (v) => setState(() => category = v!),
                    ),
                    const SizedBox(height: 12),
                    ListTile(
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                        side: BorderSide(color: Colors.grey.withOpacity(0.3)),
                      ),
                      title: Text("From: ${fromDate.toLocal().toString().split(' ')[0]}"),
                      trailing: const Icon(Icons.calendar_today, size: 18),
                      onTap: () async {
                        final picked = await showDatePicker(
                          context: context,
                          initialDate: fromDate,
                          firstDate: DateTime.now(),
                          lastDate: DateTime.now().add(const Duration(days: 60)),
                        );
                        if (picked != null) setState(() => fromDate = picked);
                      },
                    ),
                    const SizedBox(height: 8),
                    ListTile(
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                        side: BorderSide(color: Colors.grey.withOpacity(0.3)),
                      ),
                      title: Text("To: ${toDate.toLocal().toString().split(' ')[0]}"),
                      trailing: const Icon(Icons.calendar_today, size: 18),
                      onTap: () async {
                        final picked = await showDatePicker(
                          context: context,
                          initialDate: toDate,
                          firstDate: fromDate,
                          lastDate: DateTime.now().add(const Duration(days: 60)),
                        );
                        if (picked != null) setState(() => toDate = picked);
                      },
                    ),
                    const SizedBox(height: 8),
                    Text("Total Days: $days day(s)", style: const TextStyle(fontWeight: FontWeight.bold)),
                    const SizedBox(height: 12),
                    TextField(
                      controller: reasonController,
                      maxLines: 2,
                      decoration: const InputDecoration(labelText: "Reason for Absence", border: OutlineInputBorder()),
                    ),
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(ctx),
                  child: const Text("Cancel"),
                ),
                ElevatedButton(
                  onPressed: () {
                    erp.submitLeaveRequest(LeaveRequest(
                      id: "lev-${DateTime.now().millisecondsSinceEpoch}",
                      studentId: "STU-1001",
                      studentName: "Aarav Sharma",
                      grade: "10-A",
                      parentName: "Rajesh Sharma",
                      parentPhone: "+91 98765 43210",
                      category: category,
                      fromDate: fromDate.toLocal().toString().split(' ')[0],
                      toDate: toDate.toLocal().toString().split(' ')[0],
                      days: days,
                      reason: reasonController.text.trim(),
                      appliedOn: "Today, 10:30 AM",
                    ));
                    Navigator.pop(ctx);
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text("✓ Leave application submitted successfully"),
                        backgroundColor: Color(0xFF10B981),
                      ),
                    );
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF1E3A8A),
                    foregroundColor: Colors.white,
                  ),
                  child: const Text("Submit Application"),
                ),
              ],
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final erp = Provider.of<ERPProvider>(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text("Student Leave Desk"),
        backgroundColor: const Color(0xFF1E3A8A),
        foregroundColor: Colors.white,
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showApplyDialog(context, erp),
        icon: const Icon(Icons.add),
        label: const Text("Apply Leave"),
        backgroundColor: const Color(0xFF1E3A8A),
        foregroundColor: Colors.white,
      ),
      body: ListView.builder(
        padding: const EdgeInsets.all(14),
        itemCount: erp.leaveRequests.length,
        itemBuilder: (context, i) {
          final req = erp.leaveRequests[i];
          final isApproved = req.status == 'Approved';
          final isPending = req.status == 'Pending';

          return Card(
            elevation: 1,
            margin: const EdgeInsets.only(bottom: 12),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
              side: BorderSide(
                color: isApproved ? const Color(0xFF10B981) : (isPending ? const Color(0xFFF59E0B) : Colors.red),
                width: 1.5,
              ),
            ),
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        "${req.studentName} (${req.grade})",
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: isApproved ? const Color(0xFFD1FAE5) : (isPending ? const Color(0xFFFEF3C7) : const Color(0xFFFEE2E2)),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          req.status,
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            color: isApproved ? const Color(0xFF065F46) : (isPending ? const Color(0xFF92400E) : Colors.red),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text("Category: ${req.category}", style: const TextStyle(fontSize: 12, color: Colors.grey)),
                  const SizedBox(height: 4),
                  Text('"${req.reason}"', style: const TextStyle(fontSize: 13, fontStyle: FontStyle.italic)),
                  const SizedBox(height: 8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text("Period: ${req.fromDate} to ${req.toDate} (${req.days} days)", style: const TextStyle(fontSize: 11, color: Colors.grey)),
                      Text("Applied: ${req.appliedOn}", style: const TextStyle(fontSize: 11, color: Colors.grey)),
                    ],
                  ),
                  if (isPending) ...[
                    const Divider(height: 18),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        OutlinedButton(
                          onPressed: () => erp.rejectLeave(req.id),
                          style: OutlinedButton.styleFrom(foregroundColor: Colors.red),
                          child: const Text("Reject"),
                        ),
                        const SizedBox(width: 8),
                        ElevatedButton(
                          onPressed: () => erp.approveLeave(req.id),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF10B981),
                            foregroundColor: Colors.white,
                          ),
                          child: const Text("✓ Approve"),
                        ),
                      ],
                    ),
                  ] else ...[
                    const SizedBox(height: 6),
                    Text("Remarks: ${req.remarks}", style: const TextStyle(fontSize: 11, color: Color(0xFF10B981), fontWeight: FontWeight.bold)),
                  ],
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}
