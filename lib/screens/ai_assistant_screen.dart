import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/api_service.dart';
import '../services/erp_provider.dart';

class AiAssistantScreen extends StatefulWidget {
  const AiAssistantScreen({super.key});

  @override
  State<AiAssistantScreen> createState() => _AiAssistantScreenState();
}

class _AiAssistantScreenState extends State<AiAssistantScreen> {
  final TextEditingController _queryController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final List<Map<String, dynamic>> _messages = [];
  bool _isLoading = false;
  List<dynamic> _alerts = [];
  List<dynamic> _predictions = [];
  bool _loadingAlerts = true;

  @override
  void initState() {
    super.initState();
    _loadAlerts();
    _initWelcomeMessage();
  }

  void _initWelcomeMessage() {
    final role = ApiService.activeRole;
    final activeStudent = ApiService.activeStudent;
    String greeting;
    if (role == 'SUPER_ADMIN') {
      greeting = "Hello Administrator. I am your AI Principal Assistant. You can ask me natural language queries about overall school operations, fee dues, attendance patterns, and staff metrics.";
    } else if (role == 'TEACHER') {
      greeting = "Hello Teacher. I am your AI Academic Assistant. Ask me about student progress in your assigned classes, missing homework submissions, or lesson preparation.";
    } else {
      final childName = activeStudent?['name'] ?? 'your child';
      greeting = "Hello Parent! I am your AI Parent Assistant for $childName. Ask me about $childName's attendance, pending homework, fee dues, or upcoming exams.";
    }

    _messages.add({
      'role': 'assistant',
      'text': greeting,
      'time': _formatCurrentTime(),
    });
  }

  String _formatCurrentTime() {
    final now = DateTime.now();
    return "${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')}";
  }

  Future<void> _loadAlerts() async {
    final res = await ApiService.getAiAlerts();
    if (mounted) {
      setState(() {
        _loadingAlerts = false;
        if (res['success'] == true) {
          _alerts = res['alerts'] ?? [];
          _predictions = res['predictions'] ?? [];
        }
      });
    }
  }

  Future<void> _sendQuery([String? predefinedQuery]) async {
    final queryText = predefinedQuery ?? _queryController.text.trim();
    if (queryText.isEmpty || _isLoading) return;

    if (predefinedQuery == null) {
      _queryController.clear();
    }

    setState(() {
      _messages.add({
        'role': 'user',
        'text': queryText,
        'time': _formatCurrentTime(),
      });
      _isLoading = true;
    });

    _scrollToBottom();

    int? activeStudentId;
    if (ApiService.activeRole == 'PARENT' && ApiService.activeStudent != null) {
      activeStudentId = (ApiService.activeStudent!['id'] as num?)?.toInt();
    }

    final res = await ApiService.askAiAssistant(
      query: queryText,
      studentId: activeStudentId,
    );

    if (mounted) {
      setState(() {
        _isLoading = false;
        if (res['success'] == true) {
          _messages.add({
            'role': 'assistant',
            'text': res['answer'] ?? 'Information retrieved from school records.',
            'time': _formatCurrentTime(),
            'scope': res['scope'],
            'student': res['student'],
          });
        } else {
          _messages.add({
            'role': 'assistant',
            'text': res['message'] ?? res['error'] ?? 'Unable to process query within authorized scope.',
            'time': _formatCurrentTime(),
            'isError': true,
          });
        }
      });
      _scrollToBottom();
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  List<String> _getQuickPrompts() {
    final role = ApiService.activeRole;
    if (role == 'SUPER_ADMIN') {
      return [
        "How many students were absent today?",
        "What are the pending fees this month?",
        "Which students have low attendance?",
        "Show staff attendance today",
      ];
    } else if (role == 'TEACHER') {
      return [
        "Which students are missing homework?",
        "Summarize Class 10 attendance",
        "Generate assignment ideas",
        "Who needs academic assistance?",
      ];
    } else {
      return [
        "What is my child attendance rate?",
        "What homework is pending?",
        "What fees are due?",
        "When is the next exam?",
      ];
    }
  }

  @override
  Widget build(BuildContext context) {
    final role = ApiService.activeRole;
    final activeStudent = ApiService.activeStudent;

    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: const Color(0xFFF59E0B).withOpacity(0.2),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.auto_awesome, color: Color(0xFFF59E0B), size: 18),
            ),
            const SizedBox(width: 8),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  role == 'SUPER_ADMIN'
                      ? 'AI Principal Assistant'
                      : role == 'TEACHER'
                          ? 'AI Teacher Assistant'
                          : 'AI Parent Assistant',
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
                ),
                Text(
                  role == 'PARENT' && activeStudent != null
                      ? 'Scoped to: ${activeStudent['name']} (Grade ${activeStudent['className'] ?? '10-A'})'
                      : 'Powered by Grexotix Intelligence',
                  style: const TextStyle(fontSize: 10, color: Colors.white70),
                ),
              ],
            ),
          ],
        ),
        backgroundColor: const Color(0xFF1E3A8A),
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: Column(
        children: [
          // Intelligence Alerts Banner (Collapsible/Preview)
          if (_alerts.isNotEmpty)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              color: const Color(0xFFFEF3C7),
              child: Row(
                children: [
                  const Icon(Icons.warning_amber_rounded, color: Color(0xFFD97706), size: 18),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      "${_alerts.length} AI Alerts: ${_alerts.first['alert'] ?? ''}",
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF92400E)),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
            ),

          // Chat Messages
          Expanded(
            child: ListView.builder(
              controller: _scrollController,
              padding: const EdgeInsets.all(16),
              itemCount: _messages.length,
              itemBuilder: (context, index) {
                final msg = _messages[index];
                final isUser = msg['role'] == 'user';
                final isError = msg['isError'] == true;

                return Align(
                  alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
                  child: Container(
                    margin: const EdgeInsets.only(bottom: 12),
                    constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.8),
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: isUser
                          ? const Color(0xFF1E3A8A)
                          : isError
                              ? const Color(0xFFFEE2E2)
                              : Colors.white,
                      borderRadius: BorderRadius.circular(16).copyWith(
                        bottomRight: isUser ? const Radius.circular(0) : const Radius.circular(16),
                        bottomLeft: !isUser ? const Radius.circular(0) : const Radius.circular(16),
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.04),
                          blurRadius: 6,
                          offset: const Offset(0, 2),
                        ),
                      ],
                      border: !isUser ? Border.all(color: const Color(0xFFE2E8F0)) : null,
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          msg['text'] ?? '',
                          style: TextStyle(
                            fontSize: 13,
                            color: isUser
                                ? Colors.white
                                : isError
                                    ? const Color(0xFF991B1B)
                                    : const Color(0xFF1E293B),
                            height: 1.4,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            if (!isUser) ...[
                              const Icon(Icons.auto_awesome, size: 10, color: Color(0xFFF59E0B)),
                              const SizedBox(width: 4),
                            ],
                            Text(
                              msg['time'] ?? '',
                              style: TextStyle(
                                fontSize: 10,
                                color: isUser ? Colors.white60 : const Color(0xFF94A3B8),
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
          ),

          if (_isLoading)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Row(
                children: const [
                  SizedBox(
                    width: 14,
                    height: 14,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF1E3A8A)),
                  ),
                  SizedBox(width: 10),
                  Text(
                    "Analyzing school database & formulating response...",
                    style: TextStyle(fontSize: 11, color: Color(0xFF64748B), fontStyle: FontStyle.italic),
                  ),
                ],
              ),
            ),

          // Quick Prompts Chips
          Container(
            height: 40,
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: _getQuickPrompts().length,
              separatorBuilder: (_, __) => const SizedBox(width: 8),
              itemBuilder: (context, i) {
                final prompt = _getQuickPrompts()[i];
                return ActionChip(
                  label: Text(prompt, style: const TextStyle(fontSize: 11, color: Color(0xFF1E3A8A))),
                  backgroundColor: const Color(0xFFEEF2FF),
                  side: const BorderSide(color: Color(0xFFC7D2FE)),
                  onPressed: () => _sendQuery(prompt),
                );
              },
            ),
          ),

          const SizedBox(height: 6),

          // Input field
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.white,
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.05),
                  blurRadius: 10,
                  offset: const Offset(0, -2),
                ),
              ],
            ),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _queryController,
                    decoration: InputDecoration(
                      hintText: role == 'PARENT'
                          ? "Ask about ${activeStudent?['name'] ?? 'your child'}..."
                          : "Ask school intelligence query...",
                      hintStyle: const TextStyle(fontSize: 13, color: Color(0xFF94A3B8)),
                      filled: true,
                      fillColor: const Color(0xFFF8FAFC),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(24),
                        borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(24),
                        borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                      ),
                    ),
                    onSubmitted: (_) => _sendQuery(),
                  ),
                ),
                const SizedBox(width: 8),
                CircleAvatar(
                  backgroundColor: const Color(0xFF1E3A8A),
                  radius: 22,
                  child: IconButton(
                    icon: const Icon(Icons.send_rounded, color: Colors.white, size: 18),
                    onPressed: () => _sendQuery(),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
