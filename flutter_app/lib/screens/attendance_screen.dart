import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/erp_provider.dart';

class AttendanceScreen extends StatelessWidget {
  const AttendanceScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final erp = Provider.of<ERPProvider>(context);
    final students = erp.students;

    final presentCount =
        students.where((s) => s.todayStatus == 'Present').length;
    final absentCount =
        students.where((s) => s.todayStatus == 'Absent').length;
    final lateCount = students.where((s) => s.todayStatus == 'Late').length;
    final total = students.length;
    final attendancePct =
        total > 0 ? ((presentCount + lateCount) / total * 100).toStringAsFixed(1) : "0.0";

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text(
          "Smart Attendance Register",
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
        ),
        backgroundColor: Colors.white,
        foregroundColor: const Color(0xFF0F172A),
        elevation: 0,
        actions: [
          IconButton(
            tooltip: "Mark All Present",
            icon: const Icon(Icons.done_all, color: Color(0xFF16A34A)),
            onPressed: () {
              for (final s in students) {
                erp.updateStudentAttendance(s.id, 'Present');
              }
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text("All students marked Present for today!"),
                  backgroundColor: Color(0xFF16A34A),
                ),
              );
            },
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Class Selector & Date Banner
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: const Color(0xFFEFF6FF),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(
                      Icons.calendar_today_outlined,
                      color: Color(0xFF2563EB),
                      size: 20,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: const [
                        Text(
                          "Grade 10 - Section A (CBSE)",
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF0F172A),
                          ),
                        ),
                        Text(
                          "Academic Year 2026-2027 • Today's Roll Call",
                          style: TextStyle(
                            fontSize: 12,
                            color: Color(0xFF64748B),
                          ),
                        ),
                      ],
                    ),
                  ),
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF1F5F9),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Text(
                      "RFID Sync: Active",
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF334155),
                      ),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 16),

            // Statistics Summary Cards
            Row(
              children: [
                Expanded(
                  child: _buildStatChip(
                    "Total",
                    total.toString(),
                    const Color(0xFF0F172A),
                    const Color(0xFFF1F5F9),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: _buildStatChip(
                    "Present",
                    presentCount.toString(),
                    const Color(0xFF16A34A),
                    const Color(0xFFDCFCE7),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: _buildStatChip(
                    "Late",
                    lateCount.toString(),
                    const Color(0xFFD97706),
                    const Color(0xFFFEF3C7),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: _buildStatChip(
                    "Absent",
                    absentCount.toString(),
                    const Color(0xFFDC2626),
                    const Color(0xFFFEE2E2),
                  ),
                ),
              ],
            ),

            const SizedBox(height: 20),

            // Students Register List
            const Text(
              "Student Roll Register",
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: Color(0xFF0F172A),
              ),
            ),
            const SizedBox(height: 4),
            const Text(
              "Tap status chips below to update student attendance status in real time",
              style: TextStyle(
                fontSize: 12,
                color: Color(0xFF64748B),
              ),
            ),

            const SizedBox(height: 16),

            ...students.map((student) {
              final isPresent = student.todayStatus == 'Present';
              final isLate = student.todayStatus == 'Late';
              final isAbsent = student.todayStatus == 'Absent';

              return Container(
                margin: const EdgeInsets.only(bottom: 12),
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(
                    color: isAbsent
                        ? const Color(0xFFFCA5A5)
                        : const Color(0xFFE2E8F0),
                    width: isAbsent ? 1.5 : 1.0,
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.02),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        CircleAvatar(
                          radius: 20,
                          backgroundColor: const Color(0xFF1E3A8A),
                          child: Text(
                            student.rollNo.split('-').last,
                            style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                              fontSize: 13,
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                student.name,
                                style: const TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 15,
                                  color: Color(0xFF0F172A),
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                "Roll: ${student.rollNo} • Parent: ${student.parentName} (${student.parentPhone})",
                                style: const TextStyle(
                                  fontSize: 11,
                                  color: Color(0xFF64748B),
                                ),
                              ),
                            ],
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF8FAFC),
                            borderRadius: BorderRadius.circular(6),
                            border: Border.all(color: const Color(0xFFE2E8F0)),
                          ),
                          child: Text(
                            "${student.attendanceRate}% avg",
                            style: const TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              color: Color(0xFF2563EB),
                            ),
                          ),
                        ),
                      ],
                    ),

                    const SizedBox(height: 12),
                    const Divider(height: 1, color: Color(0xFFF1F5F9)),
                    const SizedBox(height: 12),

                    Row(
                      children: [
                        Icon(
                          Icons.access_time_rounded,
                          size: 14,
                          color: isAbsent
                              ? const Color(0xFFDC2626)
                              : const Color(0xFF64748B),
                        ),
                        const SizedBox(width: 6),
                        Text(
                          student.checkInTime,
                          style: TextStyle(
                            fontSize: 11,
                            color: isAbsent
                                ? const Color(0xFFDC2626)
                                : const Color(0xFF64748B),
                            fontWeight: isAbsent ? FontWeight.bold : FontWeight.normal,
                          ),
                        ),
                        const Spacer(),
                        // Status action buttons
                        _buildStatusButton(
                          label: "Present",
                          isSelected: isPresent,
                          color: const Color(0xFF16A34A),
                          bgColor: const Color(0xFFDCFCE7),
                          onTap: () =>
                              erp.updateStudentAttendance(student.id, 'Present'),
                        ),
                        const SizedBox(width: 6),
                        _buildStatusButton(
                          label: "Late",
                          isSelected: isLate,
                          color: const Color(0xFFD97706),
                          bgColor: const Color(0xFFFEF3C7),
                          onTap: () =>
                              erp.updateStudentAttendance(student.id, 'Late'),
                        ),
                        const SizedBox(width: 6),
                        _buildStatusButton(
                          label: "Absent",
                          isSelected: isAbsent,
                          color: const Color(0xFFDC2626),
                          bgColor: const Color(0xFFFEE2E2),
                          onTap: () =>
                              erp.updateStudentAttendance(student.id, 'Absent'),
                        ),
                      ],
                    ),
                  ],
                ),
              );
            }),

            const SizedBox(height: 16),

            // Absent Parent SMS Trigger Card
            if (absentCount > 0)
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0xFFFEF2F2),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: const Color(0xFFFECACA)),
                ),
                child: Row(
                  children: [
                    const Icon(
                      Icons.warning_amber_rounded,
                      color: Color(0xFFDC2626),
                      size: 24,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            "$absentCount Student(s) Unaccounted For",
                            style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 13,
                              color: Color(0xFF991B1B),
                            ),
                          ),
                          const Text(
                            "Tap to dispatch instant SMS & WhatsApp notification to parent phones.",
                            style: TextStyle(
                              fontSize: 11,
                              color: Color(0xFFB91C1C),
                            ),
                          ),
                        ],
                      ),
                    ),
                    ElevatedButton(
                      onPressed: () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text(
                              "Automated SMS dispatched to guardians of $absentCount absent student(s).",
                            ),
                            backgroundColor: const Color(0xFFDC2626),
                          ),
                        );
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFFDC2626),
                        foregroundColor: Colors.white,
                        elevation: 0,
                        padding: const EdgeInsets.symmetric(
                            horizontal: 12, vertical: 8),
                      ),
                      child: const Text("Dispatch SMS", style: TextStyle(fontSize: 11)),
                    ),
                  ],
                ),
              ),

            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }

  Widget _buildStatChip(
      String label, String value, Color textColor, Color bgColor) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 12),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        children: [
          Text(
            value,
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: textColor,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: textColor.withOpacity(0.8),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatusButton({
    required String label,
    required bool isSelected,
    required Color color,
    required Color bgColor,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(6),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: isSelected ? color : bgColor,
          borderRadius: BorderRadius.circular(6),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.bold,
            color: isSelected ? Colors.white : color,
          ),
        ),
      ),
    );
  }
}
