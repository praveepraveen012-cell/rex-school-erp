import 'package:flutter/material.dart';
import '../services/api_service.dart';

class QuestionBankScreen extends StatefulWidget {
  const QuestionBankScreen({super.key});

  @override
  State<QuestionBankScreen> createState() => _QuestionBankScreenState();
}

class _QuestionBankScreenState extends State<QuestionBankScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  // Question Bank State
  List<dynamic> _questions = [];
  bool _loadingQuestions = true;

  // Exams State
  List<dynamic> _exams = [];
  bool _loadingExams = true;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _fetchQuestions();
    _fetchExams();
  }

  Future<void> _fetchQuestions() async {
    final res = await ApiService.getQuestionBank();
    if (mounted) {
      setState(() {
        _loadingQuestions = false;
        if (res['success'] == true) _questions = res['questions'] ?? [];
      });
    }
  }

  Future<void> _fetchExams() async {
    final res = await ApiService.getExams();
    if (mounted) {
      setState(() {
        _loadingExams = false;
        if (res['success'] == true) _exams = res['exams'] ?? [];
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text(
          "Question Bank & Assessments",
          style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white, fontSize: 17),
        ),
        backgroundColor: const Color(0xFF1E3A8A),
        iconTheme: const IconThemeData(color: Colors.white),
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: const Color(0xFFF59E0B),
          indicatorWeight: 3,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white70,
          tabs: const [
            Tab(icon: Icon(Icons.quiz_rounded, size: 18), text: "Question Bank"),
            Tab(icon: Icon(Icons.assignment_turned_in_rounded, size: 18), text: "Examinations"),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildQuestionBankTab(),
          _buildExamsTab(),
        ],
      ),
    );
  }

  Widget _buildQuestionBankTab() {
    if (_loadingQuestions) {
      return const Center(child: CircularProgressIndicator(color: Color(0xFF1E3A8A)));
    }
    return RefreshIndicator(
      onRefresh: _fetchQuestions,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text("Curated Questions (${_questions.length})", style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Color(0xFF0F172A))),
              ElevatedButton.icon(
                onPressed: () => _showAddQuestionDialog(),
                icon: const Icon(Icons.add, size: 16),
                label: const Text("Add Question", style: TextStyle(fontSize: 12)),
                style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF1E3A8A), foregroundColor: Colors.white),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ..._questions.map((q) => Card(
                margin: const EdgeInsets.only(bottom: 12),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                child: Padding(
                  padding: const EdgeInsets.all(14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(color: const Color(0xFFEEF2FF), borderRadius: BorderRadius.circular(6)),
                            child: Text("${q['subject']} • Class ${q['classId'] ?? '10'}", style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF1E3A8A))),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(color: const Color(0xFFFEF3C7), borderRadius: BorderRadius.circular(6)),
                            child: Text(q['difficulty'] ?? 'MEDIUM', style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF92400E))),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      Text(q['questionText'] ?? '', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF1E293B))),
                      const SizedBox(height: 6),
                      Text("Type: ${q['questionType']} • Marks: ${q['marks'] ?? 1}", style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                      if (q['explanation'] != null) ...[
                        const SizedBox(height: 4),
                        Text("Sol: ${q['explanation']}", style: const TextStyle(fontSize: 11, color: Color(0xFF16A34A), fontStyle: FontStyle.italic)),
                      ],
                    ],
                  ),
                ),
              )),
        ],
      ),
    );
  }

  void _showAddQuestionDialog() {
    final textCtrl = TextEditingController();
    final subjectCtrl = TextEditingController(text: "Mathematics");
    final ansCtrl = TextEditingController();

    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text("Create Question Bank Item", style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(controller: subjectCtrl, decoration: const InputDecoration(labelText: "Subject")),
            TextField(controller: textCtrl, decoration: const InputDecoration(labelText: "Question Text"), maxLines: 2),
            TextField(controller: ansCtrl, decoration: const InputDecoration(labelText: "Correct Answer")),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text("Cancel")),
          ElevatedButton(
            onPressed: () async {
              if (textCtrl.text.isEmpty) return;
              await ApiService.createQuestion({
                'subject': subjectCtrl.text.trim(),
                'questionText': textCtrl.text.trim(),
                'correctAnswer': ansCtrl.text.trim(),
                'questionType': 'MCQ',
                'difficulty': 'MEDIUM',
                'marks': 2,
              });
              Navigator.pop(context);
              _fetchQuestions();
            },
            child: const Text("Save to Bank"),
          ),
        ],
      ),
    );
  }

  Widget _buildExamsTab() {
    if (_loadingExams) {
      return const Center(child: CircularProgressIndicator(color: Color(0xFF1E3A8A)));
    }
    return RefreshIndicator(
      onRefresh: _fetchExams,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text("Scheduled School Examinations (${_exams.length})", style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Color(0xFF0F172A))),
          const SizedBox(height: 12),
          ..._exams.map((e) => Card(
                margin: const EdgeInsets.only(bottom: 12),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                child: Padding(
                  padding: const EdgeInsets.all(14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(e['title'] ?? '', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(color: const Color(0xFFDCFCE7), borderRadius: BorderRadius.circular(6)),
                            child: Text(e['status'] ?? 'SCHEDULED', style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF166534))),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Text("Class: Grade ${e['classId'] ?? '10'} • Exam Type: ${e['examType'] ?? 'Mid-Term'}", style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                      Text("Total Marks: ${e['totalMarks']} • Duration: ${e['durationMinutes']} Mins", style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                      const SizedBox(height: 4),
                      Text("Window: ${e['startTime']} to ${e['endTime']}", style: const TextStyle(fontSize: 11, color: Color(0xFF1E3A8A), fontWeight: FontWeight.w500)),
                    ],
                  ),
                ),
              )),
        ],
      ),
    );
  }
}
