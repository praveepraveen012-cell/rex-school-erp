class LeaveRequest {
  final String id;
  final String studentId;
  final String studentName;
  final String grade;
  final String parentName;
  final String parentPhone;
  final String category;
  final String fromDate;
  final String toDate;
  final int days;
  final String reason;
  String status; // 'Pending', 'Approved', 'Rejected'
  final String appliedOn;
  String remarks;

  LeaveRequest({
    required this.id,
    required this.studentId,
    required this.studentName,
    required this.grade,
    required this.parentName,
    required this.parentPhone,
    required this.category,
    required this.fromDate,
    required this.toDate,
    required this.days,
    required this.reason,
    this.status = 'Pending',
    required this.appliedOn,
    this.remarks = 'Awaiting Class Teacher & Principal approval',
  });
}
