import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/erp_provider.dart';

class ReportCardScreen extends StatelessWidget {
  const ReportCardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final erp = Provider.of<ERPProvider>(context);
    final student = erp.currentStudent;

    final subjects = [
      {
        "code": "184",
        "name": "English Language & Lit.",
        "theory": "76/80",
        "internal": "20/20",
        "total": "96",
        "grade": "A1"
      },
      {
        "code": "041",
        "name": "Mathematics Standard",
        "theory": "78/80",
        "internal": "20/20",
        "total": "98",
        "grade": "A1"
      },
      {
        "code": "086",
        "name": "Science & Technology",
        "theory": "75/80",
        "internal": "19/20",
        "total": "94",
        "grade": "A1"
      },
      {
        "code": "087",
        "name": "Social Science",
        "theory": "73/80",
        "internal": "20/20",
        "total": "93",
        "grade": "A1"
      },
      {
        "code": "006",
        "name": "Tamil / Second Language",
        "theory": "77/80",
        "internal": "20/20",
        "total": "97",
        "grade": "A1"
      },
      {
        "code": "417",
        "name": "Artificial Intelligence (Skill)",
        "theory": "49/50",
        "internal": "50/50",
        "total": "99",
        "grade": "A1"
      },
    ];

    return Scaffold(
      backgroundColor: const Color(0xFFF1F5F9),
      appBar: AppBar(
        title: const Text(
          "Official CBSE Marksheet",
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
        ),
        backgroundColor: Colors.white,
        foregroundColor: const Color(0xFF0F172A),
        elevation: 0,
        actions: [
          IconButton(
            tooltip: "Export PDF",
            icon: const Icon(Icons.download, color: Color(0xFF1E3A8A)),
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text(
                    "CBSE Grade 10 Official Report Card exported successfully!",
                  ),
                  backgroundColor: Color(0xFF1E3A8A),
                ),
              );
            },
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFFCBD5E1), width: 1.5),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.05),
                blurRadius: 15,
                offset: const Offset(0, 5),
              ),
            ],
          ),
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // School Header with Crest
              Center(
                child: Column(
                  children: [
                    Image.asset(
                      'assets/logo.png',
                      height: 54,
                      errorBuilder: (ctx, err, stack) => const Icon(
                        Icons.school,
                        size: 48,
                        color: Color(0xFF1E3A8A),
                      ),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      "REX SENIOR SECONDARY SCHOOL",
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 0.5,
                        color: Color(0xFF0F172A),
                      ),
                    ),
                    const Text(
                      "OOTACAMUND, THE NILGIRIS - 643001, TAMIL NADU",
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF64748B),
                        letterSpacing: 0.5,
                      ),
                    ),
                    const SizedBox(height: 2),
                    const Text(
                      "(Affiliated to Central Board of Secondary Education, New Delhi)",
                      style: TextStyle(
                        fontSize: 10,
                        fontStyle: FontStyle.italic,
                        color: Color(0xFF64748B),
                      ),
                    ),
                    const SizedBox(height: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: const Color(0xFFEFF6FF),
                        borderRadius: BorderRadius.circular(4),
                        border: Border.all(color: const Color(0xFFBFDBFE)),
                      ),
                      child: const Text(
                        "CBSE AFFILIATION NO. 1930000 • SCHOOL CODE: 55120",
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF1E40AF),
                          letterSpacing: 0.5,
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(vertical: 6),
                      decoration: BoxDecoration(
                        color: const Color(0xFF1E3A8A),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: const Center(
                        child: Text(
                          "ACADEMIC PERFORMANCE ASSESSMENT • MID-TERM 2026",
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 0.8,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 16),

              // Student details grid
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: Column(
                  children: [
                    _buildMetaRow("Student Name", student.name, "Roll No",
                        student.rollNo),
                    _buildMetaRow("Class & Section", "Grade 10 - Section A",
                        "Admission No", student.id),
                    _buildMetaRow("Date of Birth", student.dob, "Father's Name",
                        student.parentName),
                    _buildMetaRow(
                        "Mother's Name", "Priya Sharma", "Attendance", "96.4%"),
                  ],
                ),
              ),

              const SizedBox(height: 16),

              // Academic Marks Table
              const Text(
                "Part 1: Scholastic Performance",
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF0F172A),
                ),
              ),
              const SizedBox(height: 8),

              Table(
                border: TableBorder.all(
                  color: const Color(0xFFCBD5E1),
                  width: 1,
                  borderRadius: BorderRadius.circular(6),
                ),
                columnWidths: const {
                  0: FlexColumnWidth(1.2),
                  1: FlexColumnWidth(3.5),
                  2: FlexColumnWidth(1.5),
                  3: FlexColumnWidth(1.5),
                  4: FlexColumnWidth(1.3),
                  5: FlexColumnWidth(1.2),
                },
                children: [
                  TableRow(
                    decoration: const BoxDecoration(
                      color: Color(0xFFE2E8F0),
                    ),
                    children: [
                      _buildHeaderCell("Code"),
                      _buildHeaderCell("Subject"),
                      _buildHeaderCell("Theory"),
                      _buildHeaderCell("Internal"),
                      _buildHeaderCell("Total"),
                      _buildHeaderCell("Grade"),
                    ],
                  ),
                  ...subjects.map((sub) {
                    return TableRow(
                      children: [
                        _buildDataCell(sub["code"]!),
                        _buildDataCell(sub["name"]!, align: TextAlign.left),
                        _buildDataCell(sub["theory"]!),
                        _buildDataCell(sub["internal"]!),
                        _buildDataCell(sub["total"]!, isBold: true),
                        _buildDataCell(
                          sub["grade"]!,
                          isBold: true,
                          color: const Color(0xFF16A34A),
                        ),
                      ],
                    );
                  }),
                ],
              ),

              const SizedBox(height: 14),

              // Overall Result Banner
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFF0FDF4),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: const Color(0xFFBBF7D0)),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: [
                    _buildResultMetric("Total Marks", "483 / 500"),
                    _buildResultMetric("Percentage", "96.6%"),
                    _buildResultMetric("CGPA", "10.0 / 10.0"),
                    _buildResultMetric("Rank", "#2 in Class"),
                    _buildResultMetric("Result", "DISTINCTION",
                        color: const Color(0xFF16A34A)),
                  ],
                ),
              ),

              const SizedBox(height: 14),

              // Co-Scholastic & Discipline
              const Text(
                "Part 2: Co-Scholastic & Discipline (3-Point Scale)",
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF0F172A),
                ),
              ),
              const SizedBox(height: 8),

              Table(
                border: TableBorder.all(
                  color: const Color(0xFFCBD5E1),
                  width: 1,
                  borderRadius: BorderRadius.circular(6),
                ),
                columnWidths: const {
                  0: FlexColumnWidth(4),
                  1: FlexColumnWidth(1.5),
                  2: FlexColumnWidth(4),
                  3: FlexColumnWidth(1.5),
                },
                children: [
                  TableRow(
                    children: [
                      _buildDataCell("Work Education (Pre-Vocational)",
                          align: TextAlign.left),
                      _buildDataCell("Grade A",
                          isBold: true, color: const Color(0xFF16A34A)),
                      _buildDataCell("Health & Physical Education",
                          align: TextAlign.left),
                      _buildDataCell("Grade A",
                          isBold: true, color: const Color(0xFF16A34A)),
                    ],
                  ),
                  TableRow(
                    children: [
                      _buildDataCell("Discipline & Values",
                          align: TextAlign.left),
                      _buildDataCell("Grade A",
                          isBold: true, color: const Color(0xFF16A34A)),
                      _buildDataCell("Social & Community Service",
                          align: TextAlign.left),
                      _buildDataCell("Grade A",
                          isBold: true, color: const Color(0xFF16A34A)),
                    ],
                  ),
                ],
              ),

              const SizedBox(height: 24),

              // Signature footer
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    children: const [
                      Text(
                        "Mrs. K. Malarvizhi, M.Sc., B.Ed.",
                        style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF0F172A)),
                      ),
                      Text(
                        "Class Teacher Signature",
                        style: TextStyle(fontSize: 10, color: Color(0xFF64748B)),
                      ),
                    ],
                  ),
                  Column(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFEF3C7),
                          borderRadius: BorderRadius.circular(4),
                          border: Border.all(color: const Color(0xFFFDE68A)),
                        ),
                        child: const Text(
                          "SEAL OF INSTITUTION",
                          style: TextStyle(
                            fontSize: 9,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFFB45309),
                          ),
                        ),
                      ),
                      const SizedBox(height: 4),
                      const Text(
                        "Rex SSS Ootacamund",
                        style: TextStyle(fontSize: 9, color: Color(0xFF94A3B8)),
                      ),
                    ],
                  ),
                  Column(
                    children: const [
                      Text(
                        "Rev. Fr. Principal, M.A., Ph.D.",
                        style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF0F172A)),
                      ),
                      Text(
                        "Principal & Head of Institution",
                        style: TextStyle(fontSize: 10, color: Color(0xFF64748B)),
                      ),
                    ],
                  ),
                ],
              ),

              const SizedBox(height: 20),

              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text("Preparing CBSE Printable Document..."),
                        backgroundColor: Color(0xFF1E3A8A),
                      ),
                    );
                  },
                  icon: const Icon(Icons.print, size: 18),
                  label: const Text("Print Official CBSE Grade 10 Marksheet"),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF1E3A8A),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildMetaRow(
      String label1, String val1, String label2, String val2) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        children: [
          Expanded(
            child: RichText(
              text: TextSpan(
                text: "$label1: ",
                style: const TextStyle(
                  fontSize: 11,
                  color: Color(0xFF64748B),
                ),
                children: [
                  TextSpan(
                    text: val1,
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF0F172A),
                    ),
                  ),
                ],
              ),
            ),
          ),
          Expanded(
            child: RichText(
              text: TextSpan(
                text: "$label2: ",
                style: const TextStyle(
                  fontSize: 11,
                  color: Color(0xFF64748B),
                ),
                children: [
                  TextSpan(
                    text: val2,
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF0F172A),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHeaderCell(String text) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
      child: Text(
        text,
        textAlign: TextAlign.center,
        style: const TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.bold,
          color: Color(0xFF1E293B),
        ),
      ),
    );
  }

  Widget _buildDataCell(String text,
      {bool isBold = false,
      Color? color,
      TextAlign align = TextAlign.center}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 6),
      child: Text(
        text,
        textAlign: align,
        style: TextStyle(
          fontSize: 11,
          fontWeight: isBold ? FontWeight.bold : FontWeight.normal,
          color: color ?? const Color(0xFF334155),
        ),
      ),
    );
  }

  Widget _buildResultMetric(String label, String value, {Color? color}) {
    return Column(
      children: [
        Text(
          value,
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.bold,
            color: color ?? const Color(0xFF0F172A),
          ),
        ),
        const SizedBox(height: 2),
        Text(
          label,
          style: const TextStyle(
            fontSize: 10,
            color: Color(0xFF64748B),
          ),
        ),
      ],
    );
  }
}
