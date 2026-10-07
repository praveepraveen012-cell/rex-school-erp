import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../services/api_service.dart';

class AdmissionScreen extends StatefulWidget {
  const AdmissionScreen({super.key});
  @override
  State<AdmissionScreen> createState() => _AdmissionScreenState();
}

class _AdmissionScreenState extends State<AdmissionScreen> with SingleTickerProviderStateMixin {
  late TabController _tabCtrl;

  final _nameCtrl = TextEditingController();
  final _dobCtrl = TextEditingController(text: "2012-05-10");
  final _parentCtrl = TextEditingController();
  final _mobileCtrl = TextEditingController();
  final _prevSchoolCtrl = TextEditingController();
  int _targetGrade = 10;
  bool _isSubmitting = false;

  List<dynamic> _backendApplications = [];
  bool _loadingApps = true;

  @override
  void initState() {
    super.initState();
    _tabCtrl = TabController(length: 3, vsync: this);
    _fetchApplications();
  }

  Future<void> _fetchApplications() async {
    final res = await ApiService.getAdmissions();
    if (mounted) {
      setState(() {
        _loadingApps = false;
        if (res['success'] == true) {
          _backendApplications = res['applications'] ?? [];
        }
      });
    }
  }

  Future<void> _submitApplication() async {
    if (_nameCtrl.text.isEmpty || _mobileCtrl.text.isEmpty || _parentCtrl.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please fill all required admission fields.')),
      );
      return;
    }

    setState(() => _isSubmitting = true);
    final names = _nameCtrl.text.trim().split(' ');
    final firstName = names[0];
    final lastName = names.length > 1 ? names.sublist(1).join(' ') : 'Applicant';

    final res = await ApiService.submitAdmission({
      'studentFirstName': firstName,
      'studentLastName': lastName,
      'dob': _dobCtrl.text.trim(),
      'targetGradeLevel': _targetGrade,
      'parentName': _parentCtrl.text.trim(),
      'parentMobile': _mobileCtrl.text.trim(),
      'previousSchool': _prevSchoolCtrl.text.trim(),
    });

    if (mounted) {
      setState(() => _isSubmitting = false);
      if (res['success'] == true) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text("Application submitted! App No: ${res['application']?['applicationNo'] ?? ''}")),
        );
        _nameCtrl.clear();
        _parentCtrl.clear();
        _mobileCtrl.clear();
        _prevSchoolCtrl.clear();
        _fetchApplications();
        _tabCtrl.animateTo(1);
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(res['error'] ?? 'Submission failed')),
        );
      }
    }
  }

  Future<void> _enrollApplicant(int id) async {
    final res = await ApiService.enrollAdmission(id, 1, 1);
    if (mounted) {
      if (res['success'] == true) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text("Enrolled as active student! Adm No: ${res['student']?['admissionNo'] ?? ''}")),
        );
        _fetchApplications();
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(res['error'] ?? 'Enrollment failed')),
        );
      }
    }
  }

  @override
  void dispose() {
    _tabCtrl.dispose();
    _nameCtrl.dispose();
    _dobCtrl.dispose();
    _parentCtrl.dispose();
    _mobileCtrl.dispose();
    _prevSchoolCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF0F4FF),
      appBar: AppBar(
        title: const Text('Admissions & Enrolment Management', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
        backgroundColor: const Color(0xFF1E3A8A),
        foregroundColor: Colors.white,
        bottom: TabBar(
          controller: _tabCtrl,
          indicatorColor: const Color(0xFFF59E0B),
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white70,
          tabs: const [Tab(text: 'New Application'), Tab(text: 'Applications'), Tab(text: 'Enrolled Students')],
        ),
      ),
      body: TabBarView(
        controller: _tabCtrl,
        children: [
          _buildEnquiryForm(),
          _buildApplicationList(),
          _buildAdmittedList(),
        ],
      ),
    );
  }

  Widget _buildEnquiryForm() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Card(
        elevation: 2,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Student Admission Application', style: GoogleFonts.poppins(fontSize: 16, fontWeight: FontWeight.bold, color: const Color(0xFF1E3A8A))),
              const SizedBox(height: 20),
              TextField(controller: _nameCtrl, decoration: const InputDecoration(labelText: 'Student Full Name *', prefixIcon: Icon(Icons.person_outline), border: OutlineInputBorder())),
              const SizedBox(height: 12),
              TextField(controller: _dobCtrl, decoration: const InputDecoration(labelText: 'Date of Birth (YYYY-MM-DD)', prefixIcon: Icon(Icons.cake_outlined), border: OutlineInputBorder())),
              const SizedBox(height: 12),
              TextField(controller: _parentCtrl, decoration: const InputDecoration(labelText: "Parent / Guardian Name *", prefixIcon: Icon(Icons.family_restroom), border: OutlineInputBorder())),
              const SizedBox(height: 12),
              TextField(controller: _mobileCtrl, decoration: const InputDecoration(labelText: 'Parent Mobile Number *', prefixIcon: Icon(Icons.phone_outlined), border: OutlineInputBorder())),
              const SizedBox(height: 12),
              TextField(controller: _prevSchoolCtrl, decoration: const InputDecoration(labelText: 'Previous School', prefixIcon: Icon(Icons.school_outlined), border: OutlineInputBorder())),
              const SizedBox(height: 12),
              DropdownButtonFormField<int>(
                value: _targetGrade,
                decoration: const InputDecoration(labelText: 'Applying for Grade', border: OutlineInputBorder()),
                items: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((g) => DropdownMenuItem(value: g, child: Text('Grade $g'))).toList(),
                onChanged: (v) {
                  if (v != null) setState(() => _targetGrade = v);
                },
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _isSubmitting ? null : _submitApplication,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF1E3A8A),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: _isSubmitting
                      ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                      : Text('Submit Application', style: GoogleFonts.poppins(fontSize: 15, fontWeight: FontWeight.w600)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildApplicationList() {
    if (_loadingApps) {
      return const Center(child: CircularProgressIndicator(color: Color(0xFF1E3A8A)));
    }
    final pending = _backendApplications.where((a) => a['status'] != 'ENROLLED').toList();
    if (pending.isEmpty) {
      return const Center(child: Text("No pending admission applications."));
    }
    return RefreshIndicator(
      onRefresh: _fetchApplications,
      child: ListView.builder(
        padding: const EdgeInsets.all(12),
        itemCount: pending.length,
        itemBuilder: (_, i) {
          final app = pending[i];
          final isApproved = app['status'] == 'APPROVED';
          return Card(
            margin: const EdgeInsets.only(bottom: 10),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        "${app['studentFirstName']} ${app['studentLastName']}",
                        style: GoogleFonts.poppins(fontWeight: FontWeight.bold, fontSize: 14),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFEF3C7),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          app['status'] ?? 'PENDING',
                          style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF92400E)),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text("App No: ${app['applicationNo']} • Target Grade: ${app['targetGradeLevel'] ?? '10'}", style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                  Text("Parent: ${app['parentName']} (${app['parentMobile']})", style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                  const Divider(height: 16),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      ElevatedButton.icon(
                        onPressed: () => _enrollApplicant(app['id']),
                        icon: const Icon(Icons.how_to_reg, size: 14),
                        label: const Text("Approve & Enroll", style: TextStyle(fontSize: 11)),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF16A34A),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildAdmittedList() {
    final enrolled = _backendApplications.where((a) => a['status'] == 'ENROLLED').toList();
    return RefreshIndicator(
      onRefresh: _fetchApplications,
      child: ListView.builder(
        padding: const EdgeInsets.all(12),
        itemCount: enrolled.length,
        itemBuilder: (_, i) {
          final a = enrolled[i];
          return Card(
            margin: const EdgeInsets.only(bottom: 10),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
            child: ListTile(
              leading: const CircleAvatar(
                backgroundColor: Color(0xFFDCFCE7),
                child: Icon(Icons.check, color: Color(0xFF16A34A)),
              ),
              title: Text("${a['studentFirstName']} ${a['studentLastName']}", style: GoogleFonts.poppins(fontWeight: FontWeight.w600, fontSize: 14)),
              subtitle: Text("App No: ${a['applicationNo']} • Grade: ${a['targetGradeLevel']}", style: const TextStyle(fontSize: 11, color: Colors.grey)),
              trailing: Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(color: const Color(0xFFDCFCE7), borderRadius: BorderRadius.circular(6)),
                child: const Text("Enrolled", style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF166534))),
              ),
            ),
          );
        },
      ),
    );
  }
}
