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
  String _selectedGrade = "10";
  String _selectedSection = "A";
  bool _isSaving = false;

  String get _dateKey =>
      "${_selectedDate.year}-${_selectedDate.month.toString().padLeft(2, '0')}-${_selectedDate.day.toString().padLeft(2, '0')}";

  String _formatDate(DateTime d) {
    const months = [
      "", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];
    return "${d.day} ${months[d.month]} ${d.year}";
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate,
      firstDate: DateTime(2025, 1, 1),
      lastDate: DateTime(2027, 12, 31),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.light(
              primary: Color(0xFF1E3A8A),
              onPrimary: Colors.white,
              onSurface: Color(0xFF0F172A),
            ),
          ),
          child: child!,
        );
      },
    );
    if (picked != null && picked != _selectedDate) {
      setState(() {
        _selectedDate = picked;
      });
    }
  }

  Future<void> _saveAttendance(ERPProvider erp) async {
    if (_isSaving) return;
    setState(() => _isSaving = true);
    try {
      await erp.saveAttendanceRegister(
        date: _dateKey,
        grade: _selectedGrade,
        section: _selectedSection,
      );
      final students = erp.getStudentsByClass(_selectedGrade, _selectedSection);
      int present = 0, absent = 0, late = 0;
      for (final s in students) {
        final st = erp.getStudentAttendanceStatus(
          studentId: s.id,
          date: _dateKey,
          grade: _selectedGrade,
          section: _selectedSection,
        );
        if (st == 'Present') present++;
        else if (st == 'Absent') absent++;
        else if (st == 'Late') late++;
      }
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text("Attendance saved for Grade $_selectedGrade-$_selectedSection (${_formatDate(_selectedDate)}): $present Present, $absent Absent"),
            backgroundColor: const Color(0xFF16A34A),
            duration: const Duration(seconds: 3),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text("Failed to save attendance: $e"),
            backgroundColor: const Color(0xFFDC2626),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  void _confirmMarkAllPresent(ERPProvider erp) {
    final students = erp.getStudentsByClass(_selectedGrade, _selectedSection);
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Row(
          children: [
            Icon(Icons.done_all, color: Color(0xFF10B981)),
            SizedBox(width: 8),
            Text("Mark All Present?"),
          ],
        ),
        content: Text(
          "Are you sure you want to mark all ${students.length} students in Grade $_selectedGrade-$_selectedSection as Present for ${_formatDate(_selectedDate)}?\n\nThis will overwrite individual selections for this date.",
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text("Cancel"),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF10B981),
              foregroundColor: Colors.white,
            ),
            onPressed: () {
              Navigator.pop(ctx);
              erp.markAllPresentForDate(
                date: _dateKey,
                grade: _selectedGrade,
                section: _selectedSection,
              );
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text("All ${students.length} students marked Present for ${_formatDate(_selectedDate)}"),
                  backgroundColor: const Color(0xFF16A34A),
                ),
              );
            },
            child: const Text("Confirm All Present"),
          ),
        ],
      ),
    );
  }

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
    final students = erp.getStudentsByClass(_selectedGrade, _selectedSection);

    final presentCount = students.where((s) => erp.getStudentAttendanceStatus(
      studentId: s.id,
      date: _dateKey,
      grade: _selectedGrade,
      section: _selectedSection,
    ) == 'Present').length;

    final absentCount = students.where((s) => erp.getStudentAttendanceStatus(
      studentId: s.id,
      date: _dateKey,
      grade: _selectedGrade,
      section: _selectedSection,
    ) == 'Absent').length;

    final lateCount = students.where((s) => erp.getStudentAttendanceStatus(
      studentId: s.id,
      date: _dateKey,
      grade: _selectedGrade,
      section: _selectedSection,
    ) == 'Late').length;

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
          Padding(
            padding: const EdgeInsets.only(right: 12, top: 8, bottom: 8),
            child: ElevatedButton.icon(
              icon: _isSaving
                  ? const SizedBox(
                      width: 14,
                      height: 14,
                      child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                    )
                  : const Icon(Icons.save_rounded, size: 16),
              label: Text(_isSaving ? "Saving..." : "Save"),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF2563EB),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                elevation: 0,
              ),
              onPressed: _isSaving ? null : () => _saveAttendance(erp),
            ),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 1. Date Selector Bar
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Row(
                children: [
                  IconButton(
                    icon: const Icon(Icons.chevron_left),
                    tooltip: "Previous Day",
                    onPressed: () {
                      setState(() {
                        _selectedDate = _selectedDate.subtract(const Duration(days: 1));
                      });
                    },
                  ),
                  Expanded(
                    child: InkWell(
                      onTap: _pickDate,
                      borderRadius: BorderRadius.circular(10),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 12),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF1F5F9),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(Icons.calendar_today, size: 16, color: Color(0xFF1E3A8A)),
                            const SizedBox(width: 8),
                            Text(
                              _formatDate(_selectedDate),
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Color(0xFF0F172A)),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.chevron_right),
                    tooltip: "Next Day",
                    onPressed: () {
                      setState(() {
                        _selectedDate = _selectedDate.add(const Duration(days: 1));
                      });
                    },
                  ),
                ],
              ),
            ),

            const SizedBox(height: 12),

            // 2. Class & Section Selector
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text("Select Class & Section:", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF475569))),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      // Grade selector
                      Expanded(
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF8FAFC),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: const Color(0xFFCBD5E1)),
                          ),
                          child: DropdownButtonHideUnderline(
                            child: DropdownButton<String>(
                              value: _selectedGrade,
                              isExpanded: true,
                              icon: const Icon(Icons.arrow_drop_down, color: Color(0xFF1E3A8A)),
                              items: const [
                                DropdownMenuItem(value: "10", child: Text("Grade 10")),
                                DropdownMenuItem(value: "9", child: Text("Grade 9")),
                                DropdownMenuItem(value: "8", child: Text("Grade 8")),
                              ],
                              onChanged: (val) {
                                if (val != null) setState(() => _selectedGrade = val);
                              },
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      // Section selector
                      Expanded(
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF8FAFC),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: const Color(0xFFCBD5E1)),
                          ),
                          child: DropdownButtonHideUnderline(
                            child: DropdownButton<String>(
                              value: _selectedSection,
                              isExpanded: true,
                              icon: const Icon(Icons.arrow_drop_down, color: Color(0xFF1E3A8A)),
                              items: const [
                                DropdownMenuItem(value: "A", child: Text("Section A")),
                                DropdownMenuItem(value: "B", child: Text("Section B")),
                              ],
                              onChanged: (val) {
                                if (val != null) setState(() => _selectedSection = val);
                              },
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            const SizedBox(height: 14),

            // 3. Metric Counters
            Row(
              children: [
                _buildCountChip("Present", presentCount, const Color(0xFF10B981), const Color(0xFFDCFCE7)),
                const SizedBox(width: 8),
                _buildCountChip("Absent", absentCount, const Color(0xFFDC2626), const Color(0xFFFEE2E2)),
                const SizedBox(width: 8),
                _buildCountChip("Late", lateCount, const Color(0xFFF59E0B), const Color(0xFFFEF3C7)),
                const SizedBox(width: 8),
                _buildCountChip("Rate", "$attendancePct%", const Color(0xFF2563EB), const Color(0xFFEFF6FF)),
              ],
            ),

            const SizedBox(height: 16),

            // 4. Roster Header with Separate Mark All Present Action
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  "Student Roll Call ($total Students)",
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                ),
                TextButton.icon(
                  onPressed: () => _confirmMarkAllPresent(erp),
                  icon: const Icon(Icons.done_all, size: 16, color: Color(0xFF10B981)),
                  label: const Text(
                    "Mark All Present",
                    style: TextStyle(color: Color(0xFF10B981), fontWeight: FontWeight.bold, fontSize: 12),
                  ),
                  style: TextButton.styleFrom(
                    backgroundColor: const Color(0xFFECFDF5),
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                ),
              ],
            ),

            const SizedBox(height: 10),

            if (students.isEmpty) ...[
              Container(
                padding: const EdgeInsets.all(32),
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: Column(
                  children: [
                    const Icon(Icons.groups_outlined, size: 40, color: Colors.grey),
                    const SizedBox(height: 10),
                    Text(
                      "No students registered in Grade $_selectedGrade-$_selectedSection",
                      style: const TextStyle(color: Color(0xFF64748B), fontWeight: FontWeight.w600),
                    ),
                  ],
                ),
              ),
            ] else ...[
              ...students.map((student) {
                final status = erp.getStudentAttendanceStatus(
                  studentId: student.id,
                  date: _dateKey,
                  grade: _selectedGrade,
                  section: _selectedSection,
                );

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
                        child: Text(
                          student.rollNo.split('-').last,
                          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF1E3A8A)),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(student.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                            Text("Parent: ${student.parentPhone}", style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                          ],
                        ),
                      ),
                      Row(
                        children: ['Present', 'Absent', 'Late'].map((stOption) {
                          final isSel = status == stOption;
                          final color = stOption == 'Present'
                              ? const Color(0xFF16A34A)
                              : (stOption == 'Absent' ? const Color(0xFFDC2626) : const Color(0xFFD97706));
                          return Padding(
                            padding: const EdgeInsets.only(left: 4),
                            child: InkWell(
                              onTap: () {
                                erp.setStudentAttendanceStatus(
                                  studentId: student.id,
                                  date: _dateKey,
                                  grade: _selectedGrade,
                                  section: _selectedSection,
                                  status: stOption,
                                );
                              },
                              borderRadius: BorderRadius.circular(8),
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                decoration: BoxDecoration(
                                  color: isSel ? color : Colors.grey.shade100,
                                  borderRadius: BorderRadius.circular(8),
                                  border: Border.all(
                                    color: isSel ? color : Colors.grey.shade300,
                                    width: isSel ? 1.5 : 1,
                                  ),
                                ),
                                child: Text(
                                  stOption[0],
                                  style: TextStyle(
                                    fontWeight: FontWeight.bold,
                                    fontSize: 12,
                                    color: isSel ? Colors.white : Colors.grey.shade700,
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

            const SizedBox(height: 16),

            // Bottom Full-width Save Button
            ElevatedButton.icon(
              onPressed: _isSaving ? null : () => _saveAttendance(erp),
              icon: _isSaving
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                    )
                  : const Icon(Icons.check_circle_outline),
              label: Text(_isSaving
                  ? "Saving Attendance..."
                  : "Save Attendance Register for ${_formatDate(_selectedDate)}"),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF1E3A8A),
                foregroundColor: Colors.white,
                minimumSize: const Size(double.infinity, 48),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  Widget _buildCountChip(String label, dynamic count, Color color, Color bg) {
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
