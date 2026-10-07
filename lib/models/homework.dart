class HomeworkItem {
  final String id;
  final String subject;
  final String grade;
  final String teacher;
  String title;
  String description;
  final String assignedDate;
  String dueDate;
  bool isCompleted;
  final String priority; // 'High', 'Normal'

  // Super Admin & 5 PM Lock Workflow fields
  String status; // 'DRAFT', 'READY_FOR_REVIEW', 'SCHEDULED', 'SENT', 'EDIT_LOCKED', 'FAILED'
  String sendMode; // 'MANUAL', 'AUTO_5PM'
  bool autoSendEnabled;
  bool isEditLocked;
  String? sentAt;
  String? sentBy;
  String? scheduledSendAt;
  int sentDeliveriesCount;
  int failedDeliveriesCount;
  int totalStudentsCount;
  List<Map<String, dynamic>> deliveries;

  HomeworkItem({
    required this.id,
    required this.subject,
    required this.grade,
    required this.teacher,
    required this.title,
    required this.description,
    required this.assignedDate,
    required this.dueDate,
    this.isCompleted = false,
    this.priority = 'Normal',
    this.status = 'READY_FOR_REVIEW',
    this.sendMode = 'MANUAL',
    this.autoSendEnabled = false,
    this.isEditLocked = false,
    this.sentAt,
    this.sentBy,
    this.scheduledSendAt,
    this.sentDeliveriesCount = 0,
    this.failedDeliveriesCount = 0,
    this.totalStudentsCount = 0,
    this.deliveries = const [],
  });

  factory HomeworkItem.fromJson(Map<String, dynamic> json) {
    return HomeworkItem(
      id: json['id']?.toString() ?? '',
      subject: json['subject_name'] ?? json['subject'] ?? 'General',
      grade: json['class_name'] != null && json['section_name'] != null
          ? "${json['class_name']} ${json['section_name']}"
          : (json['grade'] ?? '10-A'),
      teacher: json['teacher_name'] ?? json['teacher'] ?? 'Subject Teacher',
      title: json['title'] ?? '',
      description: json['description'] ?? '',
      assignedDate: json['assigned_date'] ?? json['assignedDate'] ?? '',
      dueDate: json['due_date'] ?? json['dueDate'] ?? '',
      isCompleted: json['submission_status'] == 'completed' || json['isCompleted'] == true,
      priority: json['priority'] ?? 'Normal',
      status: json['status'] ?? 'READY_FOR_REVIEW',
      sendMode: json['send_mode'] ?? json['sendMode'] ?? 'MANUAL',
      autoSendEnabled: json['auto_send_enabled'] == 1 || json['autoSendEnabled'] == true,
      isEditLocked: json['is_edit_locked'] == true || json['isEditLocked'] == true,
      sentAt: json['sent_at'] ?? json['sentAt'],
      sentBy: json['sent_by']?.toString() ?? json['sentBy'],
      scheduledSendAt: json['scheduled_send_at'] ?? json['scheduledSendAt'],
      sentDeliveriesCount: json['sent_count'] ?? json['sentDeliveriesCount'] ?? 0,
      failedDeliveriesCount: json['failed_count'] ?? json['failedDeliveriesCount'] ?? 0,
      totalStudentsCount: json['target_students_count'] ?? json['totalStudentsCount'] ?? 0,
      deliveries: (json['deliveries'] as List<dynamic>?)
              ?.map((d) => Map<String, dynamic>.from(d as Map))
              .toList() ??
          [],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'subject': subject,
      'grade': grade,
      'teacher': teacher,
      'title': title,
      'description': description,
      'assignedDate': assignedDate,
      'dueDate': dueDate,
      'isCompleted': isCompleted,
      'priority': priority,
      'status': status,
      'sendMode': sendMode,
      'autoSendEnabled': autoSendEnabled,
      'isEditLocked': isEditLocked,
      'sentAt': sentAt,
      'sentBy': sentBy,
      'scheduledSendAt': scheduledSendAt,
      'sentDeliveriesCount': sentDeliveriesCount,
      'failedDeliveriesCount': failedDeliveriesCount,
      'totalStudentsCount': totalStudentsCount,
    };
  }
}
