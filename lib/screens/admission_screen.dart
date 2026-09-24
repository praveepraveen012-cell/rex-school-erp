import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AdmissionScreen extends StatefulWidget {
  const AdmissionScreen({super.key});
  @override
  State<AdmissionScreen> createState() => _AdmissionScreenState();
}

class _AdmissionScreenState extends State<AdmissionScreen> with SingleTickerProviderStateMixin {
  late TabController _tabCtrl;

  @override
  void initState() {
    super.initState();
    _tabCtrl = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF0F4FF),
      appBar: AppBar(
        title: const Text('Admission'),
        backgroundColor: const Color(0xFF5C35AD),
        foregroundColor: Colors.white,
        bottom: TabBar(
          controller: _tabCtrl,
          indicatorColor: Colors.amber,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white60,
          tabs: const [Tab(text: 'New Enquiry'), Tab(text: 'Applications'), Tab(text: 'Admitted')],
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
              Text('New Admission Enquiry', style: GoogleFonts.poppins(fontSize: 16, fontWeight: FontWeight.bold, color: const Color(0xFF5C35AD))),
              const SizedBox(height: 20),
              _buildField('Student Name', Icons.person_outline),
              _buildField('Date of Birth', Icons.cake_outlined),
              _buildField("Father's Name", Icons.person_2_outlined),
              _buildField("Mother's Name", Icons.person_3_outlined),
              _buildField('Contact Number', Icons.phone_outlined),
              _buildField('Email Address', Icons.email_outlined),
              _buildField('Previous School', Icons.school_outlined),
              _buildField('Applying for Class', Icons.class_outlined),
              const SizedBox(height: 16),
              DropdownButtonFormField<String>(
                decoration: const InputDecoration(labelText: 'Stream', border: OutlineInputBorder()),
                items: ['Science', 'Commerce', 'Arts', 'SSLC', 'Upper Primary'].map((s) => DropdownMenuItem(value: s, child: Text(s))).toList(),
                onChanged: (_) {},
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () => ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Enquiry submitted successfully!'), backgroundColor: Color(0xFF5C35AD)),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF5C35AD),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: Text('Submit Enquiry', style: GoogleFonts.poppins(fontSize: 15, fontWeight: FontWeight.w600)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildField(String label, IconData icon) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: TextFormField(
        decoration: InputDecoration(
          labelText: label,
          prefixIcon: Icon(icon, size: 20),
          border: const OutlineInputBorder(),
          contentPadding: const EdgeInsets.symmetric(vertical: 12, horizontal: 12),
        ),
      ),
    );
  }

  Widget _buildApplicationList() {
    final apps = [
      {'name': 'Arun Kumar S', 'class': 'XI', 'stream': 'Science', 'date': '20 Sep 2026', 'status': 'Under Review'},
      {'name': 'Deepika Rajan', 'class': 'X', 'stream': 'SSLC', 'date': '18 Sep 2026', 'status': 'Interview Scheduled'},
      {'name': 'Mohammed Rizwan', 'class': 'XII', 'stream': 'Commerce', 'date': '15 Sep 2026', 'status': 'Documents Pending'},
    ];
    return ListView.builder(
      padding: const EdgeInsets.all(12),
      itemCount: apps.length,
      itemBuilder: (_, i) {
        final app = apps[i];
        final statusColors = {
          'Under Review': Colors.orange,
          'Interview Scheduled': Colors.blue,
          'Documents Pending': Colors.red,
        };
        final color = statusColors[app['status']] ?? Colors.grey;
        return Card(
          margin: const EdgeInsets.only(bottom: 10),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          child: ListTile(
            leading: CircleAvatar(
              backgroundColor: const Color(0xFF5C35AD),
              child: Text(app['name']![0], style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            ),
            title: Text(app['name']!, style: GoogleFonts.poppins(fontWeight: FontWeight.w600, fontSize: 14)),
            subtitle: Text('Class ${app['class']} - ${app['stream']} | ${app['date']}', style: GoogleFonts.poppins(fontSize: 11, color: Colors.grey)),
            trailing: Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(8), border: Border.all(color: color)),
              child: Text(app['status']!, style: GoogleFonts.poppins(fontSize: 10, color: color, fontWeight: FontWeight.w600)),
            ),
          ),
        );
      },
    );
  }

  Widget _buildAdmittedList() {
    final admitted = [
      {'name': 'Aarav Sharma', 'class': 'XII-A', 'rollNo': 'REX/2026/001', 'date': '1 Jun 2026'},
      {'name': 'Priya Nair', 'class': 'XII-A', 'rollNo': 'REX/2026/002', 'date': '1 Jun 2026'},
      {'name': 'Rohit Verma', 'class': 'XI-B', 'rollNo': 'REX/2026/003', 'date': '3 Jun 2026'},
    ];
    return ListView.builder(
      padding: const EdgeInsets.all(12),
      itemCount: admitted.length,
      itemBuilder: (_, i) {
        final a = admitted[i];
        return Card(
          margin: const EdgeInsets.only(bottom: 10),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          child: ListTile(
            leading: CircleAvatar(
              backgroundColor: const Color(0xFF2D6A4F),
              child: Text(a['name']![0], style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            ),
            title: Text(a['name']!, style: GoogleFonts.poppins(fontWeight: FontWeight.w600, fontSize: 14)),
            subtitle: Text('${a['class']} | ${a['rollNo']}', style: GoogleFonts.poppins(fontSize: 11, color: Colors.grey)),
            trailing: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                const Icon(Icons.check_circle, color: Color(0xFF2D6A4F), size: 18),
                Text(a['date']!, style: GoogleFonts.poppins(fontSize: 10, color: Colors.grey)),
              ],
            ),
          ),
        );
      },
    );
  }
}
