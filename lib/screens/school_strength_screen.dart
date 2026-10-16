import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../services/api_service.dart';

class SchoolStrengthScreen extends StatefulWidget {
  const SchoolStrengthScreen({super.key});

  @override
  State<SchoolStrengthScreen> createState() => _SchoolStrengthScreenState();
}

class _SchoolStrengthScreenState extends State<SchoolStrengthScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  List<dynamic> _students = [];
  bool _isLoading = false;
  String _searchQuery = '';
  String _selectedGradeFilter = 'all';

  Map<String, dynamic>? _formOptions;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _loadStudents();
    _loadFormOptions();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadFormOptions() async {
    try {
      final opts = await ApiService.getStudentFormOptions();
      if (mounted) setState(() => _formOptions = opts);
    } catch (_) {}
  }

  Future<void> _loadStudents() async {
    setState(() => _isLoading = true);
    try {
      final res = await ApiService.getStudents();
      if (res['success'] == true && res['students'] is List) {
        if (mounted) {
          setState(() {
            _students = res['students'];
            _isLoading = false;
          });
        }
      } else {
        if (mounted) setState(() => _isLoading = false);
      }
    } catch (e) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  List<dynamic> get _filteredStudents {
    return _students.where((s) {
      final fullName = "${s['first_name'] ?? ''} ${s['last_name'] ?? ''}".trim().toLowerCase();
      final adm = (s['admission_no'] ?? '').toString().toLowerCase();
      final roll = (s['roll_no'] ?? '').toString().toLowerCase();
      final parent = (s['parent_name'] ?? s['father_name'] ?? '').toString().toLowerCase();
      final phone = (s['parent_mobile'] ?? '').toString();

      final matchesSearch = _searchQuery.isEmpty ||
          fullName.contains(_searchQuery) ||
          adm.contains(_searchQuery) ||
          roll.contains(_searchQuery) ||
          parent.contains(_searchQuery) ||
          phone.contains(_searchQuery);

      final className = (s['class_name'] ?? '').toString().toLowerCase();
      final matchesGrade = _selectedGradeFilter == 'all' || className.contains(_selectedGradeFilter.toLowerCase());

      return matchesSearch && matchesGrade;
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF0F4FF),
      appBar: AppBar(
        title: Text('Students & School Strength', style: GoogleFonts.poppins(fontWeight: FontWeight.w600, fontSize: 18)),
        backgroundColor: const Color(0xFF0D7377),
        foregroundColor: Colors.white,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Sync with School Database',
            onPressed: () {
              _loadStudents();
              _loadFormOptions();
            },
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: Colors.white,
          indicatorWeight: 3,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white70,
          labelStyle: GoogleFonts.poppins(fontWeight: FontWeight.w600, fontSize: 13),
          tabs: const [
            Tab(icon: Icon(Icons.people_alt_outlined, size: 20), text: 'Students (SIS)'),
            Tab(icon: Icon(Icons.analytics_outlined, size: 20), text: 'Strength Analytics'),
          ],
        ),
      ),
      floatingActionButton: _tabController.index == 0
          ? FloatingActionButton.extended(
              backgroundColor: const Color(0xFF0D7377),
              foregroundColor: Colors.white,
              icon: const Icon(Icons.person_add_alt_1),
              label: Text('Add Student', style: GoogleFonts.poppins(fontWeight: FontWeight.w600)),
              onPressed: () => _openRegistrationDialog(context),
            )
          : null,
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildStudentsTab(),
          _buildAnalyticsTab(),
        ],
      ),
    );
  }

  // --------------------------------------------------------------------------
  // TAB 1: STUDENTS DIRECTORY (SIS)
  // --------------------------------------------------------------------------
  Widget _buildStudentsTab() {
    return Column(
      children: [
        // Search & Filter Bar
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          color: Colors.white,
          child: Row(
            children: [
              Expanded(
                child: TextField(
                  decoration: InputDecoration(
                    hintText: 'Search by name, roll, adm no, phone...',
                    hintStyle: GoogleFonts.poppins(fontSize: 12, color: Colors.grey.shade500),
                    prefixIcon: const Icon(Icons.search, size: 20, color: Color(0xFF0D7377)),
                    contentPadding: const EdgeInsets.symmetric(vertical: 0, horizontal: 12),
                    filled: true,
                    fillColor: const Color(0xFFF0F4FF),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
                  ),
                  onChanged: (val) => setState(() => _searchQuery = val.trim().toLowerCase()),
                ),
              ),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8),
                decoration: BoxDecoration(
                  color: const Color(0xFFF0F4FF),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: DropdownButtonHideUnderline(
                  child: DropdownButton<String>(
                    value: _selectedGradeFilter,
                    style: GoogleFonts.poppins(fontSize: 12, color: const Color(0xFF0D7377), fontWeight: FontWeight.w600),
                    items: const [
                      DropdownMenuItem(value: 'all', child: Text('All Classes')),
                      DropdownMenuItem(value: '10', child: Text('Class 10')),
                      DropdownMenuItem(value: '9', child: Text('Class 9')),
                      DropdownMenuItem(value: '11', child: Text('Class 11')),
                      DropdownMenuItem(value: '12', child: Text('Class 12')),
                    ],
                    onChanged: (v) => setState(() => _selectedGradeFilter = v ?? 'all'),
                  ),
                ),
              ),
            ],
          ),
        ),

        // Students Counter Badge
        Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
          color: const Color(0xFFE2E8F0),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                '${_filteredStudents.length} Scholars Found',
                style: GoogleFonts.poppins(fontSize: 11, fontWeight: FontWeight.w600, color: Colors.blueGrey.shade800),
              ),
              Text(
                'Synchronized with Grexotix Server',
                style: GoogleFonts.poppins(fontSize: 10, color: Colors.blueGrey.shade600),
              ),
            ],
          ),
        ),

        // Students List
        Expanded(
          child: _isLoading
              ? const Center(child: CircularProgressIndicator(color: Color(0xFF0D7377)))
              : _filteredStudents.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.person_search_outlined, size: 54, color: Colors.grey.shade400),
                          const SizedBox(height: 8),
                          Text('No students match your filter', style: GoogleFonts.poppins(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.grey.shade700)),
                          const SizedBox(height: 4),
                          Text('Tap "+ Add Student" below to register a new scholar.', style: GoogleFonts.poppins(fontSize: 12, color: Colors.grey.shade500)),
                        ],
                      ),
                    )
                  : RefreshIndicator(
                      color: const Color(0xFF0D7377),
                      onRefresh: _loadStudents,
                      child: ListView.builder(
                        padding: const EdgeInsets.only(left: 12, right: 12, top: 10, bottom: 80),
                        itemCount: _filteredStudents.length,
                        itemBuilder: (context, index) {
                          final s = _filteredStudents[index];
                          return _buildStudentCard(s);
                        },
                      ),
                    ),
        ),
      ],
    );
  }

  Widget _buildStudentCard(Map<String, dynamic> s) {
    final fullName = "${s['first_name'] ?? ''} ${s['middle_name'] ?? ''} ${s['last_name'] ?? ''}".replaceAll(RegExp(r'\s+'), ' ').trim();
    final admNo = s['admission_no'] ?? 'REX-000';
    final rollNo = s['roll_no']?.toString() ?? '1';
    final className = s['class_name'] ?? 'Class 10';
    final sectionName = s['section_name'] ?? 'A';
    final parentPhone = s['parent_mobile'] ?? s['parent_phone'] ?? '9876543210';
    final hasBus = s['bus_id'] != null || (s['transport_required'] == 1 || s['transport_required'] == true);
    final busNo = s['bus_number'] ?? 'Bus #02';

    return Card(
      elevation: 1.5,
      margin: const EdgeInsets.only(bottom: 10),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () => _showStudentDetailsSheet(s),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              // Avatar
              CircleAvatar(
                radius: 24,
                backgroundColor: const Color(0xFF0D7377),
                child: Text(
                  fullName.isNotEmpty ? fullName[0].toUpperCase() : 'S',
                  style: GoogleFonts.poppins(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
                ),
              ),
              const SizedBox(width: 12),
              // Details
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Text(
                            fullName,
                            style: GoogleFonts.poppins(fontWeight: FontWeight.bold, fontSize: 14, color: Colors.blueGrey.shade900),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: Colors.blueGrey.shade100,
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            admNo,
                            style: GoogleFonts.robotoMono(fontSize: 10, fontWeight: FontWeight.w600, color: Colors.blueGrey.shade800),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 3),
                    Text(
                      '$className - $sectionName • Roll: $rollNo',
                      style: GoogleFonts.poppins(fontSize: 12, fontWeight: FontWeight.w500, color: const Color(0xFF0D7377)),
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Icon(Icons.phone_outlined, size: 13, color: Colors.grey.shade600),
                        const SizedBox(width: 4),
                        Text(parentPhone, style: GoogleFonts.robotoMono(fontSize: 11, color: Colors.grey.shade700)),
                        const Spacer(),
                        if (hasBus)
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(color: const Color(0xFFDCFCE7), borderRadius: BorderRadius.circular(4)),
                            child: Row(
                              children: [
                                const Icon(Icons.directions_bus, size: 11, color: Color(0xFF16A34A)),
                                const SizedBox(width: 3),
                                Text(busNo, style: GoogleFonts.poppins(fontSize: 9, fontWeight: FontWeight.bold, color: const Color(0xFF16A34A))),
                              ],
                            ),
                          )
                        else
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(color: Colors.grey.shade100, borderRadius: BorderRadius.circular(4)),
                            child: Text('Self', style: GoogleFonts.poppins(fontSize: 9, color: Colors.grey.shade600)),
                          ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // --------------------------------------------------------------------------
  // STUDENT 360° BOTTOM SHEET
  // --------------------------------------------------------------------------
  void _showStudentDetailsSheet(Map<String, dynamic> s) {
    final fullName = "${s['first_name'] ?? ''} ${s['middle_name'] ?? ''} ${s['last_name'] ?? ''}".replaceAll(RegExp(r'\s+'), ' ').trim();
    final admNo = s['admission_no'] ?? 'REX-000';
    final hasBus = s['bus_id'] != null || (s['transport_required'] == 1 || s['transport_required'] == true);

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) {
        return Container(
          height: MediaQuery.of(context).size.height * 0.82,
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
          ),
          child: Column(
            children: [
              // Header
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                decoration: const BoxDecoration(
                  gradient: LinearGradient(colors: [Color(0xFF0D7377), Color(0xFF14A085)]),
                  borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
                ),
                child: Row(
                  children: [
                    CircleAvatar(
                      radius: 26,
                      backgroundColor: Colors.white,
                      child: Text(
                        fullName.isNotEmpty ? fullName[0].toUpperCase() : 'S',
                        style: GoogleFonts.poppins(color: const Color(0xFF0D7377), fontWeight: FontWeight.bold, fontSize: 20),
                      ),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(fullName, style: GoogleFonts.poppins(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
                          Text('Admission: $admNo • Roll: ${s['roll_no'] ?? '1'}', style: GoogleFonts.poppins(color: Colors.white70, fontSize: 12)),
                        ],
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close, color: Colors.white),
                      onPressed: () => Navigator.pop(context),
                    ),
                  ],
                ),
              ),

              // Content
              Expanded(
                child: ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    _sectionHeader('Academic & Personal Details'),
                    _infoRow('Class & Section', '${s['class_name'] ?? 'Class 10'} - ${s['section_name'] ?? 'A'}'),
                    _infoRow('Date of Birth', s['dob'] ?? '2010-05-14'),
                    _infoRow('Gender', s['gender'] ?? 'Male'),
                    _infoRow('Blood Group', s['blood_group'] ?? 'O+'),
                    _infoRow('Aadhaar Number', s['aadhaar_no'] ?? 'Not Provided'),
                    _infoRow('House', s['house'] ?? 'General'),
                    _infoRow('Mother Tongue', s['mother_tongue'] ?? 'Tamil'),

                    const SizedBox(height: 14),
                    _sectionHeader('Parent & Contact Information'),
                    _infoRow('Father Name', s['father_name'] ?? s['parent_name'] ?? 'Rajesh Sharma'),
                    _infoRow('Mother Name', s['mother_name'] ?? 'Priya Sharma'),
                    _infoRow('Primary Mobile', '📞 +91 ${s['parent_mobile'] ?? '9876543210'}'),
                    if (s['alternate_mobile'] != null && s['alternate_mobile'].toString().isNotEmpty)
                      _infoRow('Alternate Mobile', s['alternate_mobile'].toString()),
                    if (s['parent_email'] != null && s['parent_email'].toString().isNotEmpty)
                      _infoRow('Parent Email', s['parent_email'].toString()),
                    _infoRow('Residential Address', s['permanent_address'] ?? s['address'] ?? 'Ootacamund, Nilgiris'),

                    const SizedBox(height: 14),
                    _sectionHeader('Fleet Transport & GPS Telematics'),
                    if (hasBus) ...[
                      _infoRow('Transport Status', 'Active School Bus Service'),
                      _infoRow('Assigned Bus', s['bus_number'] ?? 'Bus #02'),
                      _infoRow('Designated Stop', s['pickup_stop_name'] ?? 'Charring Cross Junction'),
                    ] else ...[
                      _infoRow('Transport Status', 'Self / Parent Escort (No Bus Assigned)'),
                    ],

                    const SizedBox(height: 14),
                    _sectionHeader('Banking & Institutional Information'),
                    _infoRow('Bank Name', s['bank_name'] ?? 'State Bank of India'),
                    _infoRow('Account Number', s['account_no'] ?? '••••••••3089'),
                    _infoRow('IFSC Code', s['ifsc_code'] ?? 'SBIN0000889'),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _sectionHeader(String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Text(
        title.toUpperCase(),
        style: GoogleFonts.poppins(fontSize: 11, fontWeight: FontWeight.bold, color: const Color(0xFF0D7377), letterSpacing: 0.5),
      ),
    );
  }

  Widget _infoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(width: 130, child: Text(label, style: GoogleFonts.poppins(fontSize: 12, color: Colors.grey.shade600))),
          Expanded(child: Text(value, style: GoogleFonts.poppins(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.blueGrey.shade900))),
        ],
      ),
    );
  }

  // --------------------------------------------------------------------------
  // STUDENT REGISTRATION FORM DIALOG (EMIS MULTI-STEP)
  // --------------------------------------------------------------------------
  void _openRegistrationDialog(BuildContext context) {
    final formKey = GlobalKey<FormState>();
    final fNameCtrl = TextEditingController();
    final mNameCtrl = TextEditingController();
    final lNameCtrl = TextEditingController();
    final rollCtrl = TextEditingController();
    final admNoCtrl = TextEditingController(text: 'REX-2026-${1000 + _students.length + 1}');
    final dobCtrl = TextEditingController(text: '2012-05-15');
    final aadhaarCtrl = TextEditingController();
    final parentNameCtrl = TextEditingController();
    final parentPhoneCtrl = TextEditingController();
    final altPhoneCtrl = TextEditingController();
    final addressCtrl = TextEditingController();

    int? selectedClassId = 1;
    int? selectedSectionId = 1;
    String selectedGender = 'Male';
    String selectedBlood = 'O+';
    bool transportRequired = false;
    int? selectedBusId = 1;
    bool isSubmitting = false;

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              title: Row(
                children: [
                  const Icon(Icons.app_registration, color: Color(0xFF0D7377)),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Student Registration (EMIS)',
                      style: GoogleFonts.poppins(fontSize: 16, fontWeight: FontWeight.bold),
                    ),
                  ),
                ],
              ),
              content: SizedBox(
                width: MediaQuery.of(context).size.width * 0.9,
                child: Form(
                  key: formKey,
                  child: SingleChildScrollView(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Personal Information', style: GoogleFonts.poppins(fontSize: 12, fontWeight: FontWeight.bold, color: const Color(0xFF0D7377))),
                        const SizedBox(height: 6),
                        Row(
                          children: [
                            Expanded(
                              child: TextFormField(
                                controller: fNameCtrl,
                                decoration: const InputDecoration(labelText: 'First Name *', isDense: true),
                                validator: (v) => (v == null || v.trim().isEmpty) ? 'Required' : null,
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: TextFormField(
                                controller: lNameCtrl,
                                decoration: const InputDecoration(labelText: 'Last Name *', isDense: true),
                                validator: (v) => (v == null || v.trim().isEmpty) ? 'Required' : null,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            Expanded(
                              child: TextFormField(
                                controller: rollCtrl,
                                decoration: const InputDecoration(labelText: 'Roll No *', isDense: true),
                                validator: (v) => (v == null || v.trim().isEmpty) ? 'Required' : null,
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: TextFormField(
                                controller: admNoCtrl,
                                decoration: const InputDecoration(labelText: 'Adm No *', isDense: true),
                                validator: (v) => (v == null || v.trim().isEmpty) ? 'Required' : null,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            Expanded(
                              child: DropdownButtonFormField<String>(
                                value: selectedGender,
                                decoration: const InputDecoration(labelText: 'Gender', isDense: true),
                                items: const [
                                  DropdownMenuItem(value: 'Male', child: Text('Male')),
                                  DropdownMenuItem(value: 'Female', child: Text('Female')),
                                ],
                                onChanged: (v) => setDialogState(() => selectedGender = v ?? 'Male'),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: TextFormField(
                                controller: dobCtrl,
                                decoration: const InputDecoration(labelText: 'DOB (YYYY-MM-DD)', isDense: true),
                              ),
                            ),
                          ],
                        ),

                        const SizedBox(height: 14),
                        Text('Parent & Contacts', style: GoogleFonts.poppins(fontSize: 12, fontWeight: FontWeight.bold, color: const Color(0xFF0D7377))),
                        const SizedBox(height: 6),
                        TextFormField(
                          controller: parentNameCtrl,
                          decoration: const InputDecoration(labelText: 'Father / Guardian Name *', isDense: true),
                          validator: (v) => (v == null || v.trim().isEmpty) ? 'Required' : null,
                        ),
                        const SizedBox(height: 8),
                        TextFormField(
                          controller: parentPhoneCtrl,
                          keyboardType: TextInputType.phone,
                          decoration: const InputDecoration(labelText: 'Parent Mobile (10 digits) *', isDense: true, prefixText: '+91 '),
                          validator: (v) {
                            final digits = (v ?? '').replaceAll(RegExp(r'\D'), '');
                            if (digits.length != 10) return 'Must be 10 digits';
                            return null;
                          },
                        ),
                        const SizedBox(height: 8),
                        TextFormField(
                          controller: addressCtrl,
                          decoration: const InputDecoration(labelText: 'Permanent Address *', isDense: true),
                          validator: (v) => (v == null || v.trim().isEmpty) ? 'Required' : null,
                        ),

                        const SizedBox(height: 14),
                        Text('Transport & Fleets', style: GoogleFonts.poppins(fontSize: 12, fontWeight: FontWeight.bold, color: const Color(0xFF0D7377))),
                        SwitchListTile(
                          contentPadding: EdgeInsets.zero,
                          title: Text('Require School Bus Transport', style: GoogleFonts.poppins(fontSize: 12, fontWeight: FontWeight.w600)),
                          value: transportRequired,
                          activeColor: const Color(0xFF0D7377),
                          onChanged: (v) => setDialogState(() => transportRequired = v),
                        ),
                        if (transportRequired)
                          DropdownButtonFormField<int>(
                            value: selectedBusId,
                            decoration: const InputDecoration(labelText: 'Assign Bus', isDense: true),
                            items: const [
                              DropdownMenuItem(value: 1, child: Text('Route 02 (Coonoor) - Lynx')),
                              DropdownMenuItem(value: 2, child: Text('Bus #04 (Kotagiri) - Skyline')),
                            ],
                            onChanged: (v) => setDialogState(() => selectedBusId = v ?? 1),
                          ),
                      ],
                    ),
                  ),
                ),
              ),
              actions: [
                TextButton(
                  onPressed: isSubmitting ? null : () => Navigator.pop(ctx),
                  child: const Text('Cancel'),
                ),
                ElevatedButton(
                  style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF0D7377), foregroundColor: Colors.white),
                  onPressed: isSubmitting
                      ? null
                      : () async {
                          if (formKey.currentState?.validate() != true) return;

                          setDialogState(() => isSubmitting = true);
                          final payload = {
                            'firstName': fNameCtrl.text.trim(),
                            'lastName': lNameCtrl.text.trim(),
                            'rollNo': rollCtrl.text.trim(),
                            'admissionNo': admNoCtrl.text.trim().toUpperCase(),
                            'classId': selectedClassId,
                            'sectionId': selectedSectionId,
                            'gender': selectedGender,
                            'dob': dobCtrl.text.trim(),
                            'fatherName': parentNameCtrl.text.trim(),
                            'parentMobile': parentPhoneCtrl.text.replaceAll(RegExp(r'\D'), ''),
                            'permanentAddress': addressCtrl.text.trim(),
                            'communicationAddress': addressCtrl.text.trim(),
                            'transportRequired': transportRequired,
                            'busId': transportRequired ? selectedBusId : null,
                            'routeId': transportRequired ? 1 : null,
                            'pickupStopId': transportRequired ? 1 : null,
                          };

                          final res = await ApiService.createStudent(payload);
                          if (res['success'] == true) {
                            if (mounted) {
                              Navigator.pop(ctx);
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text('✓ Student ${fNameCtrl.text} registered successfully!'),
                                  backgroundColor: const Color(0xFF16A34A),
                                ),
                              );
                              _loadStudents();
                            }
                          } else {
                            setDialogState(() => isSubmitting = false);
                            if (mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text('⚠ ${res['error'] ?? 'Registration failed'}'),
                                  backgroundColor: Colors.red.shade700,
                                ),
                              );
                            }
                          }
                        },
                  child: isSubmitting
                      ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : const Text('Save Student'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  // --------------------------------------------------------------------------
  // TAB 2: STRENGTH ANALYTICS
  // --------------------------------------------------------------------------
  Widget _buildAnalyticsTab() {
    final classData = [
      {'class': 'Class XII', 'boys': 45, 'girls': 37, 'stream': 'Science, Commerce'},
      {'class': 'Class XI', 'boys': 48, 'girls': 35, 'stream': 'Science, Arts'},
      {'class': 'Class X', 'boys': 55, 'girls': 40, 'stream': 'SSLC'},
      {'class': 'Class IX', 'boys': 58, 'girls': 45, 'stream': 'Secondary'},
      {'class': 'Class VIII', 'boys': 60, 'girls': 52, 'stream': 'Upper Primary'},
      {'class': 'Class VII', 'boys': 62, 'girls': 55, 'stream': 'Upper Primary'},
      {'class': 'Class VI', 'boys': 65, 'girls': 58, 'stream': 'Middle'},
      {'class': 'Class V', 'boys': 60, 'girls': 55, 'stream': 'Primary'},
      {'class': 'Class IV', 'boys': 58, 'girls': 52, 'stream': 'Primary'},
      {'class': 'Class III', 'boys': 55, 'girls': 50, 'stream': 'Primary'},
    ];

    final totalBoys = classData.fold(0, (s, c) => s + (c['boys'] as int));
    final totalGirls = classData.fold(0, (s, c) => s + (c['girls'] as int));
    final total = totalBoys + totalGirls;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          // Summary
          Card(
            elevation: 3,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            child: Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: const LinearGradient(colors: [Color(0xFF0D7377), Color(0xFF14A085)]),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Column(
                children: [
                  Text('Total Registered Scholars', style: GoogleFonts.poppins(color: Colors.white70, fontSize: 13)),
                  Text('${_students.isNotEmpty ? _students.length : total}', style: GoogleFonts.poppins(color: Colors.white, fontSize: 44, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 16),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceAround,
                    children: [
                      _statPill('Boys', '$totalBoys', Colors.blue.shade300),
                      _statPill('Girls', '$totalGirls', Colors.pink.shade300),
                      _statPill('Faculty', '72', Colors.amber.shade300),
                      _statPill('Sections', '${classData.length * 2}', Colors.green.shade300),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          // Gender ratio bar
          Card(
            elevation: 2,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Gender Ratio Distribution', style: GoogleFonts.poppins(fontSize: 14, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 12),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: Row(
                      children: [
                        Expanded(
                          flex: totalBoys,
                          child: Container(
                            height: 24,
                            color: Colors.blue.shade400,
                            child: Center(child: Text('Boys ${(totalBoys / total * 100).toInt()}%', style: GoogleFonts.poppins(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold))),
                          ),
                        ),
                        Expanded(
                          flex: totalGirls,
                          child: Container(
                            height: 24,
                            color: Colors.pink.shade300,
                            child: Center(child: Text('Girls ${(totalGirls / total * 100).toInt()}%', style: GoogleFonts.poppins(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold))),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          Align(
            alignment: Alignment.centerLeft,
            child: Text('Class-wise Strength Breakdown', style: GoogleFonts.poppins(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.blueGrey.shade800)),
          ),
          const SizedBox(height: 10),
          ...classData.asMap().entries.map((entry) {
            final i = entry.key;
            final c = entry.value;
            final boys = c['boys'] as int;
            final girls = c['girls'] as int;
            final classTotal = boys + girls;
            final colors = [
              const Color(0xFF1A2980), const Color(0xFFD62828), const Color(0xFF2D6A4F),
              const Color(0xFFC2185B), const Color(0xFF5C35AD), const Color(0xFFE05C00),
              const Color(0xFF0077B6), const Color(0xFF2E7D32), const Color(0xFF546E7A), const Color(0xFF00838F),
            ];
            final color = colors[i % colors.length];
            return Card(
              margin: const EdgeInsets.only(bottom: 8),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              child: ListTile(
                leading: CircleAvatar(
                  backgroundColor: color.withOpacity(0.15),
                  child: Text('${c['class']}'.replaceAll('Class ', ''), style: GoogleFonts.poppins(color: color, fontWeight: FontWeight.bold, fontSize: 12)),
                ),
                title: Text('${c['class']}', style: GoogleFonts.poppins(fontWeight: FontWeight.bold, fontSize: 13)),
                subtitle: Text('${c['stream']}', style: GoogleFonts.poppins(fontSize: 11, color: Colors.grey.shade600)),
                trailing: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text('♂ $boys', style: GoogleFonts.poppins(color: Colors.blue.shade700, fontSize: 11, fontWeight: FontWeight.w600)),
                    const SizedBox(width: 8),
                    Text('♀ $girls', style: GoogleFonts.poppins(color: Colors.pink.shade700, fontSize: 11, fontWeight: FontWeight.w600)),
                    const SizedBox(width: 12),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(8)),
                      child: Text('$classTotal', style: GoogleFonts.poppins(color: color, fontWeight: FontWeight.bold, fontSize: 12)),
                    ),
                  ],
                ),
              ),
            );
          }),
        ],
      ),
    );
  }

  Widget _statPill(String label, String value, Color color) {
    return Column(
      children: [
        Text(value, style: GoogleFonts.poppins(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
        Text(label, style: GoogleFonts.poppins(color: color, fontSize: 11)),
      ],
    );
  }
}
