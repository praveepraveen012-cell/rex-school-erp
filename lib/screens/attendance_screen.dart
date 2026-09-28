import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/erp_provider.dart';
import '../services/api_service.dart';
import '../services/app_permissions.dart';
import '../models/student.dart';
import 'leave_screen.dart';

class AttendanceScreen extends StatefulWidget {
  const AttendanceScreen({super.key});

  @override
  State<AttendanceScreen> createState() => _AttendanceScreenState();
}

class _AttendanceScreenState extends State<AttendanceScreen> {
  DateTime _selectedDate = DateTime.now();

  @override
  Widget build(BuildContext context) {
    final erp = Provider.of<ERPProvider>(context);
    final role = ApiService.activeRole;
    final permissions = AppPermissions.of(role);

    // 1. Parent Access: Strictly isolated to linked child attendance
    if (permissions.isParent) {
      return _buildParentAttendanceView(context, erp);
    }

    // 2. Teacher & Super Admin Access: Class Attendance Register
    return _buildTeacherAttendanceView(context, erp);
  }

  // ==========================================================================
  // PARENT ATTENDANCE VIEW (Child Only)
  // ==========================================================================
  Widget _buildParentAttendanceView(BuildContext context, ERPProvider erp) {
    final children = erp.linkedParentStudents.isNotEmpty
        ? erp.linkedParentStudents
        : [erp.currentStudent];
    final selectedStudent = erp.currentStudent;

    final rate = selectedStudent.attendanceRate;
    final totalDays = 84;
    final presentDays = (totalDays * (rate / 100)).round();
    final absentDays = totalDays - presentDays;

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text(
          "Ward Attendance Record",
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
            // Multi-Child Selector
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
                    const Text("Select Child:", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
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

            // Child Attendance Summary Banner
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF1E3A8A), Color(0xFF0284C7)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(20),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF1E3A8A).withOpacity(0.25),
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
                          color: const Color(0xFF10B981),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          "CBSE Safe (${rate}%)",
                          style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Text(
                    "$rate%",
                    style: const TextStyle(color: Colors.white, fontSize: 36, fontWeight: FontWeight.bold),
                  ),
                  Text(
                    "Cumulative Attendance Rate for Academic Year 2026-27",
                    style: TextStyle(color: Colors.white.withOpacity(0.85), fontSize: 12),
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
                        _buildAttStat("Working Days", "$totalDays"),
                        Container(width: 1, height: 26, color: Colors.white24),
                        _buildAttStat("Days Present", "$presentDays"),
                        Container(width: 1, height: 26, color: Colors.white24),
                        _buildAttStat("Days Absent", "$absentDays"),
                        Container(width: 1, height: 26, color: Colors.white24),
                        _buildAttStat("Today's Status", selectedStudent.todayStatus),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 16),

            // Leave Desk Action
            Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () {
                      Navigator.push(context, MaterialPageRoute(builder: (_) => const LeaveScreen()));
                    },
                    icon: const Icon(Icons.event_busy, size: 18),
                    label: const Text("Apply Online Leave for Ward"),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF1E3A8A),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      elevation: 0,
                    ),
                  ),
                ),
              ],
            ),

            const SizedBox(height: 22),

            // Recent Daily Logs for this child
            const Text(
              "Recent RFID Scan & Attendance Logs",
              style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
            ),
            const SizedBox(height: 10),

            _buildDayLog("26 September 2026", selectedStudent.todayStatus, selectedStudent.checkInTime, true),
            _buildDayLog("25 September 2026", "Present", "08:04 AM (RFID Gate A)", true),
            _buildDayLog("24 September 2026", "Present", "08:10 AM (RFID Gate A)", true),
            _buildDayLog("23 September 2026", "Present", "08:02 AM (RFID Gate A)", true),
            _buildDayLog("22 September 2026", "Present", "08:08 AM (RFID Gate A)", true),
          ],
        ),
      ),
    );
  }

  Widget _buildAttStat(String label, String value) {
    return Column(
      children: [
        Text(label, style: const TextStyle(color: Colors.white70, fontSize: 10)),
        const SizedBox(height: 2),
        Text(value, style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold)),
      ],
    );
  }

  Widget _buildDayLog(String date, String status, String time, bool isPresent) {
    final isAbs = status == 'Absent';
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              Icon(
                isAbs ? Icons.cancel : Icons.check_circle,
                color: isAbs ? const Color(0xFFDC2626) : const Color(0xFF16A34A),
                size: 20,
              ),
              const SizedBox(width: 10),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(date, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF0F172A))),
                  Text(time, style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                ],
              ),
            ],
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: BoxDecoration(
              color: isAbs ? const Color(0xFFFEE2E2) : const Color(0xFFDCFCE7),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              status,
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.bold,
                color: isAbs ? const Color(0xFFDC2626) : const Color(0xFF16A34A),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ==========================================================================
  // TEACHER / SUPER ADMIN ATTENDANCE REGISTER
  // ==========================================================================
  Widget _buildTeacherAttendanceView(BuildContext context, ERPProvider erp) {
    final students = erp.students;

    final presentCount = students.where((s) => s.todayStatus == 'Present').length;
    final absentCount = students.where((s) => s.todayStatus == 'Absent').length;
    final lateCount = students.where((s) => s.todayStatus == 'Late').length;
    final total = students.length;
    final attendancePct = total > 0 ? ((presentCount + lateCount) / total * 100).toStringAsFixed(1) : "0.0";

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text(
          "Smart Attendance Register",
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
        ),
        backgroundColor: const Color(0xFF0F172A),
        foregroundColor: Colors.white,
        elevation: 0,
        actions: [
          IconButton(
            tooltip: "Mark All Present",
            icon: const Icon(Icons.done_all, color: Color(0xFF10B981)),
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
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Class & Date Header
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
                    child: const Icon(Icons.calendar_today_outlined, color: Color(0xFF2563EB), size: 20),
                  ),
                  const SizedBox(width: 12),
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text("Grade 10 - Section A (CBSE)", style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
                        Text("Faculty Attendance Roll Call", style: TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                      ],
                    ),
                  ),
                  Text("$attendancePct%", style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Color(0xFF16A34A))),
                ],
              ),
            ),

            const SizedBox(height: 16),

            // Metric Counters
            Row(
              children: [
                _buildCountChip("Present", presentCount, const Color(0xFF10B981), const Color(0xFFDCFCE7)),
                const SizedBox(width: 8),
                _buildCountChip("Absent", absentCount, const Color(0xFFDC2626), const Color(0xFFFEE2E2)),
                const SizedBox(width: 8),
                _buildCountChip("Late", lateCount, const Color(0xFFF59E0B), const Color(0xFFFEF3C7)),
              ],
            ),

            const SizedBox(height: 16),

            const Text("Student Roll Call", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF0F172A))),
            const SizedBox(height: 10),

            ...students.map((student) {
              return Container(
                margin: const EdgeInsets.only(bottom: 10),
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: Row(
                  children: [
                    CircleAvatar(
                      radius: 18,
                      backgroundColor: const Color(0xFF1E3A8A).withOpacity(0.08),
                      child: Text(student.rollNo.split('-').last, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF1E3A8A))),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(student.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                          Text(student.checkInTime, style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                        ],
                      ),
                    ),
                    Row(
                      children: ['Present', 'Absent', 'Late'].map((status) {
                        final isSel = student.todayStatus == status;
                        final color = status == 'Present'
                            ? const Color(0xFF16A34A)
                            : (status == 'Absent' ? const Color(0xFFDC2626) : const Color(0xFFD97706));
                        return Padding(
                          padding: const EdgeInsets.only(left: 4),
                          child: InkWell(
                            onTap: () => erp.updateStudentAttendance(student.id, status),
                            borderRadius: BorderRadius.circular(8),
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: isSel ? color : Colors.grey.shade100,
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(
                                status[0],
                                style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 11,
                                  color: isSel ? Colors.white : Colors.grey.shade600,
                                ),
                              ),
                            ),
                          ),
                        );
                      }).toList(),
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

  Widget _buildCountChip(String label, int count, Color color, Color bg) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 8),
        decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(10)),
        child: Column(
          children: [
            Text("$count", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: color)),
            Text(label, style: TextStyle(fontSize: 10, color: color, fontWeight: FontWeight.w600)),
          ],
        ),
      ),
    );
  }
}
