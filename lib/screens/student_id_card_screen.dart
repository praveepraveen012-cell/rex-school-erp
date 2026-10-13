import 'package:flutter/material.dart';
import 'package:qr_flutter/qr_flutter.dart';
import '../services/api_service.dart';

/// Screen displaying the official digital Student ID Card and Gate Pass
/// Supports single-child and multi-child parent accounts with instant switching.
class StudentIdCardScreen extends StatefulWidget {
  final int? initialStudentId;

  const StudentIdCardScreen({super.key, this.initialStudentId});

  @override
  State<StudentIdCardScreen> createState() => _StudentIdCardScreenState();
}

class _StudentIdCardScreenState extends State<StudentIdCardScreen> {
  int? _selectedStudentId;
  Map<String, dynamic>? _idCard;
  bool _isLoading = true;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _initStudentSelection();
    _loadIdCard();
  }

  void _initStudentSelection() {
    if (widget.initialStudentId != null) {
      _selectedStudentId = widget.initialStudentId;
      return;
    }

    if (ApiService.activeStudent != null && ApiService.activeStudent!['id'] != null) {
      final activeId = ApiService.activeStudent!['id'];
      _selectedStudentId = activeId is num ? activeId.toInt() : int.tryParse(activeId.toString()) ?? 1;
      return;
    }

    if (ApiService.linkedStudents.isNotEmpty) {
      final first = ApiService.linkedStudents[0];
      final fId = first['id'];
      _selectedStudentId = fId is num ? fId.toInt() : int.tryParse(fId?.toString() ?? '') ?? 1;
      return;
    }

    _selectedStudentId = 1;
  }

  Future<void> _loadIdCard() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final targetId = _selectedStudentId ?? 1;
    final res = await ApiService.getStudentIdCard(targetId);

    if (!mounted) return;

    if (res['success'] == true && res['idCard'] != null) {
      setState(() {
        _idCard = Map<String, dynamic>.from(res['idCard']);
        _isLoading = false;
      });
    } else {
      setState(() {
        _errorMessage = res['error'] ?? "Unable to load student ID card. Please check your connection.";
        _isLoading = false;
      });
    }
  }

  void _onSelectChild(dynamic student) {
    final rawId = student['id'];
    final newId = rawId is num ? rawId.toInt() : int.tryParse(rawId?.toString() ?? '') ?? 1;
    if (_selectedStudentId == newId) return;

    ApiService.switchChild(Map<String, dynamic>.from(student));

    setState(() {
      _selectedStudentId = newId;
    });
    _loadIdCard();
  }

  @override
  Widget build(BuildContext context) {
    final linkedChildren = ApiService.linkedStudents;
    final hasMultipleChildren = linkedChildren.length > 1;

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text(
          "Official Student ID Card",
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 17, color: Colors.white),
        ),
        backgroundColor: const Color(0xFF1E3A8A),
        iconTheme: const IconThemeData(color: Colors.white),
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: Colors.white),
            tooltip: "Refresh Card",
            onPressed: _loadIdCard,
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Multi-Child Switcher Tab (Displayed when Parent has multiple registered wards)
            if (hasMultipleChildren) _buildMultiChildSelector(linkedChildren),

            // Main ID Card Content
            Expanded(
              child: _isLoading
                  ? const Center(
                      child: CircularProgressIndicator(color: Color(0xFF1E3A8A)),
                    )
                  : _errorMessage != null
                      ? _buildErrorView()
                      : _buildIdCardBody(),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMultiChildSelector(List<dynamic> children) {
    return Container(
      width: double.infinity,
      color: Colors.white,
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            "SELECT STUDENT WARD",
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w800,
              color: Color(0xFF64748B),
              letterSpacing: 0.6,
            ),
          ),
          const SizedBox(height: 6),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: children.map((child) {
                final rawId = child['id'];
                final cId = rawId is num ? rawId.toInt() : int.tryParse(rawId?.toString() ?? '') ?? 1;
                final isSelected = _selectedStudentId == cId;
                final fName = child['first_name'] ?? child['name'] ?? 'Student';
                final lName = child['last_name'] ?? '';
                final name = "$fName $lName".trim();
                final className = child['class_name'] ?? "Class 10";
                final secName = child['section_name'] ?? "A";

                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: ChoiceChip(
                    avatar: CircleAvatar(
                      backgroundColor: isSelected ? Colors.white : const Color(0xFF1E3A8A),
                      radius: 12,
                      child: Text(
                        name.isNotEmpty ? name[0] : 'S',
                        style: TextStyle(
                          color: isSelected ? const Color(0xFF1E3A8A) : Colors.white,
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    label: Text(
                      "$name ($className-$secName)",
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        color: isSelected ? Colors.white : const Color(0xFF1E293B),
                      ),
                    ),
                    selected: isSelected,
                    selectedColor: const Color(0xFF1E3A8A),
                    backgroundColor: const Color(0xFFF1F5F9),
                    onSelected: (_) => _onSelectChild(child),
                  ),
                );
              }).toList(),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildErrorView() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, size: 48, color: Color(0xFFDC2626)),
            const SizedBox(height: 12),
            Text(
              _errorMessage ?? "Error loading ID card",
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 14, color: Color(0xFF475569)),
            ),
            const SizedBox(height: 16),
            ElevatedButton.icon(
              onPressed: _loadIdCard,
              icon: const Icon(Icons.refresh, size: 16),
              label: const Text("Retry"),
              style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF1E3A8A)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildIdCardBody() {
    final card = _idCard!;
    final studentName = card['studentName'] ?? card['name'] ?? 'Aarav Sharma';
    final admissionNo = card['admissionNo'] ?? 'REX-2024-001';
    final rollNo = card['rollNo']?.toString() ?? '1';
    final classSection = card['classSection'] ?? "${card['class'] ?? 'Class 10'} - ${card['section'] ?? 'A'}";
    final bloodGroup = card['bloodGroup'] ?? 'O+';
    final dob = card['dob'] ?? '2010-05-14';
    final parentName = card['parentName'] ?? 'Rajesh Sharma';
    final emergencyContact = card['emergencyContact'] ?? card['parentMobile'] ?? '+91 98765 43210';
    final address = card['address'] ?? '24, Church Hill Road, Ootacamund';
    final academicYear = card['validAcademicYear'] ?? card['academicYear'] ?? '2026-2027';
    final qrPayload = card['qrPayload'] ?? "REX-STU:$admissionNo:$studentName";

    return SingleChildScrollView(
      padding: const EdgeInsets.all(18),
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 420),
          child: Column(
            children: [
              // Physical Card Frame
              Container(
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFF0284C7), width: 2),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.12),
                      blurRadius: 18,
                      offset: const Offset(0, 8),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // School Header Ribbon
                    Container(
                      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 14),
                      decoration: const BoxDecoration(
                        gradient: LinearGradient(
                          colors: [Color(0xFF1E3A8A), Color(0xFF0369A1)],
                        ),
                        borderRadius: BorderRadius.only(
                          topLeft: Radius.circular(14),
                          topRight: Radius.circular(14),
                        ),
                      ),
                      child: Row(
                        children: [
                          Container(
                            height: 36,
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Image.asset(
                              "assets/grexotix_logo.png",
                              fit: BoxFit.contain,
                              errorBuilder: (_, __, ___) => const Icon(Icons.school, color: Color(0xFF7928CA), size: 22),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  (card['schoolName'] ?? 'GREXOTIX SMART CAMPUS').toString().toUpperCase(),
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontWeight: FontWeight.w900,
                                    fontSize: 12,
                                    letterSpacing: 0.5,
                                  ),
                                ),
                                Text(
                                  card['schoolTagline'] ?? card['schoolAddress'] ?? "Smart Campus • Powered by Grexotix",
                                  style: const TextStyle(color: Colors.white70, fontSize: 10),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),

                    // Card Body
                    Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        children: [
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              // Student Photo Frame
                              Container(
                                width: 76,
                                height: 88,
                                decoration: BoxDecoration(
                                  gradient: const LinearGradient(
                                    colors: [Color(0xFF2563EB), Color(0xFF38BDF8)],
                                  ),
                                  borderRadius: BorderRadius.circular(10),
                                  border: Border.all(color: const Color(0xFFE0F2FE), width: 2),
                                ),
                                child: Column(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Text(
                                      studentName.isNotEmpty ? studentName[0] : "S",
                                      style: const TextStyle(
                                        color: Colors.white,
                                        fontWeight: FontWeight.w900,
                                        fontSize: 34,
                                      ),
                                    ),
                                    const Spacer(),
                                    Container(
                                      width: double.infinity,
                                      color: Colors.black26,
                                      padding: const EdgeInsets.symmetric(vertical: 2),
                                      child: const Text(
                                        "STUDENT",
                                        textAlign: TextAlign.center,
                                        style: TextStyle(color: Colors.white, fontSize: 8, fontWeight: FontWeight.bold),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(width: 14),

                              // Student Details
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      studentName,
                                      style: const TextStyle(
                                        fontWeight: FontWeight.w900,
                                        fontSize: 16,
                                        color: Color(0xFF0F172A),
                                      ),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      "$classSection • Roll: $rollNo",
                                      style: const TextStyle(
                                        color: Color(0xFF2563EB),
                                        fontWeight: FontWeight.bold,
                                        fontSize: 13,
                                      ),
                                    ),
                                    const SizedBox(height: 4),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                      decoration: BoxDecoration(
                                        color: const Color(0xFFF59E0B),
                                        borderRadius: BorderRadius.circular(6),
                                      ),
                                      child: Text(
                                        "Adm No: $admissionNo",
                                        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                                      ),
                                    ),
                                    const SizedBox(height: 4),
                                    Row(
                                      children: [
                                        Text("Blood Group: ", style: TextStyle(fontSize: 11, color: Colors.grey[600])),
                                        Text(bloodGroup, style: const TextStyle(fontSize: 11, color: Colors.red, fontWeight: FontWeight.bold)),
                                      ],
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 14),

                          // Meta info table
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF1F5F9),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Column(
                              children: [
                                _infoRow("Date of Birth:", dob),
                                const SizedBox(height: 4),
                                _infoRow("Parent / Guardian:", parentName),
                                const SizedBox(height: 4),
                                _infoRow("Emergency Contact:", emergencyContact, isPhone: true),
                                const SizedBox(height: 4),
                                _infoRow("Residential Area:", address),
                                const SizedBox(height: 4),
                                _infoRow("Academic Session:", academicYear),
                              ],
                            ),
                          ),
                          const SizedBox(height: 14),

                          // Scannable Gate Pass QR Matrix
                          Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.all(4),
                                decoration: BoxDecoration(
                                  color: Colors.white,
                                  border: Border.all(color: Colors.grey.withOpacity(0.4)),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: QrImageView(
                                  data: qrPayload,
                                  version: QrVersions.auto,
                                  size: 72,
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text(
                                      "OFFICIAL PARENT PICKUP GATE PASS",
                                      style: TextStyle(
                                        fontWeight: FontWeight.w900,
                                        fontSize: 10,
                                        color: Color(0xFF1E3A8A),
                                      ),
                                    ),
                                    const SizedBox(height: 3),
                                    Text(
                                      "Security personnel scan this digital code at campus gate for authorized student handover.",
                                      style: TextStyle(fontSize: 10, color: Colors.grey[700], height: 1.3),
                                    ),
                                    const SizedBox(height: 3),
                                    Row(
                                      children: [
                                        const Icon(Icons.verified, size: 12, color: Color(0xFF16A34A)),
                                        const SizedBox(width: 4),
                                        Text(
                                          "Active Session $academicYear",
                                          style: const TextStyle(fontSize: 9, color: Color(0xFF16A34A), fontWeight: FontWeight.bold),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),

                    // Card Footer Signature Strip
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                      decoration: const BoxDecoration(
                        color: Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.only(
                          bottomLeft: Radius.circular(14),
                          bottomRight: Radius.circular(14),
                        ),
                        border: Border(top: BorderSide(color: Color(0xFFE2E8F0))),
                      ),
                      child: const Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text("Issued: 01-Jun-2026", style: TextStyle(fontSize: 10, color: Colors.grey)),
                          Text(
                            "Authorized Signatory",
                            style: TextStyle(
                              fontFamily: 'serif',
                              fontStyle: FontStyle.italic,
                              fontWeight: FontWeight.bold,
                              fontSize: 13,
                              color: Color(0xFF1E3A8A),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 18),

              // Action buttons
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text("✓ Official Digital ID & Gate Pass verified for $studentName"),
                            backgroundColor: const Color(0xFF10B981),
                          ),
                        );
                      },
                      icon: const Icon(Icons.verified_outlined, size: 16),
                      label: const Text("Verify Status"),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: const Color(0xFF1E3A8A),
                        side: const BorderSide(color: Color(0xFF1E3A8A)),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () => Navigator.pop(context),
                      icon: const Icon(Icons.check, size: 16),
                      label: const Text("Done"),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF1E3A8A),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _infoRow(String label, String value, {bool isPhone = false}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
        Flexible(
          child: Text(
            value,
            textAlign: TextAlign.end,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.bold,
              color: isPhone ? const Color(0xFF0284C7) : const Color(0xFF0F172A),
            ),
          ),
        ),
      ],
    );
  }
}
