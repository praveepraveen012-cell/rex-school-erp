class HomeworkItem {
  final String id;
  final String subject;
  final String grade;
  final String teacher;
  final String title;
  final String description;
  final String assignedDate;
  final String dueDate;
  bool isCompleted;
  final String priority; // 'High', 'Normal'

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
  });
}
