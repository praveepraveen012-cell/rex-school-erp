class Student {
  final String id;
  final String name;
  final String rollNo;
  final String grade;
  final String section;
  final String dob;
  final String gender;
  final String bloodGroup;
  final String parentName;
  final String parentPhone;
  final String address;
  int attendanceRate;
  int feesTotal;
  int feesPaid;
  final String rank;
  final double cgpa;
  String todayStatus;
  String checkInTime;

  Student({
    required this.id,
    required this.name,
    required this.rollNo,
    required this.grade,
    required this.section,
    required this.dob,
    required this.gender,
    required this.bloodGroup,
    required this.parentName,
    required this.parentPhone,
    required this.address,
    this.attendanceRate = 96,
    this.feesTotal = 54000,
    this.feesPaid = 54000,
    this.rank = '#2 in Class 10-A',
    this.cgpa = 10.0,
    this.todayStatus = 'Present',
    this.checkInTime = '08:05 AM (RFID Gate A)',
  });

  int get feeDue => (feesTotal - feesPaid) > 0 ? (feesTotal - feesPaid) : 0;
  bool get isFeeClear => feeDue == 0;
}

