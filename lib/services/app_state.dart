import 'package:flutter/material.dart';
import 'dart:math';

class Message {
  final String id;
  final String type; // 'birthday', 'absent', 'greeting', 'general'
  final String title;
  final String body;
  final DateTime time;
  final bool isRead;

  Message({
    required this.id,
    required this.type,
    required this.title,
    required this.body,
    required this.time,
    this.isRead = false,
  });
}

class Student {
  final String id;
  final String name;
  final String rollNo;
  final String className;
  final String section;
  final String parentPhone;
  final DateTime dob;
  String attendanceStatus; // 'present', 'absent', 'late'

  Student({
    required this.id,
    required this.name,
    required this.rollNo,
    required this.className,
    required this.section,
    required this.parentPhone,
    required this.dob,
    this.attendanceStatus = 'present',
  });
}

class StaffMember {
  final String id;
  final String name;
  final String designation;
  final String department;
  final String phone;
  final String email;

  StaffMember({
    required this.id,
    required this.name,
    required this.designation,
    required this.department,
    required this.phone,
    required this.email,
  });
}

class Notice {
  final String id;
  final String title;
  final String body;
  final DateTime date;
  final String category;
  bool isPinned;

  Notice({
    required this.id,
    required this.title,
    required this.body,
    required this.date,
    required this.category,
    this.isPinned = false,
  });
}

class AppState extends ChangeNotifier {
  // Messages
  final List<Message> _messages = [
    Message(
      id: '1',
      type: 'birthday',
      title: 'Specific Student (1)',
      body: 'Hope all your birthday wishes come true! "It\'s your special day WISHING YOU A VERY HAPPY BIRTHDAY. FROM CHRISTUS REX SENIOR SECONDARY SCHOOL.',
      time: DateTime.now().subtract(const Duration(hours: 5)),
    ),
    Message(
      id: '2',
      type: 'greeting',
      title: 'Specific Student (1)',
      body: 'GREETINGS FROM CHRISTUS REX SENIOR SECONDARY SCHOOL',
      time: DateTime.now().subtract(const Duration(days: 1, hours: 2)),
    ),
    Message(
      id: '3',
      type: 'absent',
      title: 'Other Message',
      body: 'Aarav is absent to school today. kindly provide a leave letter when the child comes back. Principal - Christus Rex School',
      time: DateTime.now().subtract(const Duration(days: 1, hours: 12)),
    ),
    Message(
      id: '4',
      type: 'absent',
      title: 'Other Message',
      body: 'Priya is absent to school today. kindly provide a leave letter when the child comes back. Principal - Christus Rex School',
      time: DateTime.now().subtract(const Duration(days: 2, hours: 12)),
    ),
    Message(
      id: '5',
      type: 'general',
      title: 'School Announcement',
      body: 'School will remain closed on 2nd October 2026 for Gandhi Jayanti. Classes will resume on 3rd October. - Management',
      time: DateTime.now().subtract(const Duration(days: 3)),
    ),
  ];

  // Students
  final List<Student> _students = [
    Student(id: 's1', name: 'Aarav Sharma', rollNo: '001', className: 'XII', section: 'A', parentPhone: '+91 9876543210', dob: DateTime(2008, 9, 24)),
    Student(id: 's2', name: 'Priya Nair', rollNo: '002', className: 'XII', section: 'A', parentPhone: '+91 9876543211', dob: DateTime(2008, 3, 15)),
    Student(id: 's3', name: 'Rohit Verma', rollNo: '003', className: 'XI', section: 'B', parentPhone: '+91 9876543212', dob: DateTime(2009, 7, 22)),
    Student(id: 's4', name: 'Ananya Das', rollNo: '004', className: 'X', section: 'A', parentPhone: '+91 9876543213', dob: DateTime(2010, 1, 8)),
    Student(id: 's5', name: 'Karthik Raja', rollNo: '005', className: 'X', section: 'B', parentPhone: '+91 9876543214', dob: DateTime(2010, 11, 30)),
    Student(id: 's6', name: 'Meera Joseph', rollNo: '006', className: 'IX', section: 'A', parentPhone: '+91 9876543215', dob: DateTime(2011, 5, 18)),
    Student(id: 's7', name: 'Samuel Thomas', rollNo: '007', className: 'IX', section: 'B', parentPhone: '+91 9876543216', dob: DateTime(2011, 8, 25)),
    Student(id: 's8', name: 'Divya Krishnan', rollNo: '008', className: 'VIII', section: 'A', parentPhone: '+91 9876543217', dob: DateTime(2012, 2, 14)),
  ];

  // Staff
  final List<StaffMember> _staff = [
    StaffMember(id: 'st1', name: 'Fr. Thomas Antony', designation: 'Principal', department: 'Administration', phone: '+91 9876500001', email: 'principal@rex.edu'),
    StaffMember(id: 'st2', name: 'Sr. Mary Josephine', designation: 'Vice Principal', department: 'Administration', phone: '+91 9876500002', email: 'vp@rex.edu'),
    StaffMember(id: 'st3', name: 'Mr. Rajan Pillai', designation: 'HOD - Science', department: 'Science', phone: '+91 9876500003', email: 'science@rex.edu'),
    StaffMember(id: 'st4', name: 'Mrs. Anitha Kumar', designation: 'HOD - Mathematics', department: 'Mathematics', phone: '+91 9876500004', email: 'maths@rex.edu'),
    StaffMember(id: 'st5', name: 'Mr. David Raj', designation: 'HOD - Commerce', department: 'Commerce', phone: '+91 9876500005', email: 'commerce@rex.edu'),
    StaffMember(id: 'st6', name: 'Mrs. Susheela Nair', designation: 'English Teacher', department: 'Languages', phone: '+91 9876500006', email: 'english@rex.edu'),
    StaffMember(id: 'st7', name: 'Mr. Muthu Selvan', designation: 'Tamil Teacher', department: 'Languages', phone: '+91 9876500007', email: 'tamil@rex.edu'),
    StaffMember(id: 'st8', name: 'Mrs. Geetha Rao', designation: 'Social Science', department: 'Social Science', phone: '+91 9876500008', email: 'social@rex.edu'),
  ];

  // Notices
  final List<Notice> _notices = [
    Notice(id: 'n1', title: 'Parent-Teacher Meeting', body: 'PT Meeting scheduled for 28th September 2026. All parents are requested to attend. Venue: School Auditorium. Time: 10:00 AM - 1:00 PM.', date: DateTime.now().subtract(const Duration(hours: 2)), category: 'Event', isPinned: true),
    Notice(id: 'n2', title: 'Annual Sports Day', body: 'Annual Sports Day will be held on 5th October 2026. Students must report in sports uniform. Selection trials on 30th Sep.', date: DateTime.now().subtract(const Duration(days: 1)), category: 'Event'),
    Notice(id: 'n3', title: 'Fee Due Reminder', body: 'Term 2 fees are due by 30th September 2026. Kindly pay at the school cashier or through the app. Late fee applies after due date.', date: DateTime.now().subtract(const Duration(days: 2)), category: 'Finance'),
    Notice(id: 'n4', title: 'Gandhi Jayanti Holiday', body: 'School will remain closed on 2nd October 2026 for Gandhi Jayanti. Classes resume on 3rd October. Online assignments to be completed.', date: DateTime.now().subtract(const Duration(days: 3)), category: 'Holiday'),
    Notice(id: 'n5', title: 'New Library Books', body: 'New NCERT reference books for Classes IX-XII have arrived. Students can borrow from the school library with valid ID.', date: DateTime.now().subtract(const Duration(days: 4)), category: 'Academic'),
  ];

  // Timetable
  final Map<String, List<Map<String, String>>> _timetable = {
    'Monday': [
      {'time': '8:00-8:45', 'subject': 'Mathematics', 'teacher': 'Mrs. Anitha Kumar', 'room': '101'},
      {'time': '8:45-9:30', 'subject': 'Physics', 'teacher': 'Mr. Rajan Pillai', 'room': 'Lab-1'},
      {'time': '9:30-10:15', 'subject': 'English', 'teacher': 'Mrs. Susheela Nair', 'room': '101'},
      {'time': '10:15-10:30', 'subject': 'BREAK', 'teacher': '', 'room': ''},
      {'time': '10:30-11:15', 'subject': 'Chemistry', 'teacher': 'Mr. Rajan Pillai', 'room': 'Lab-2'},
      {'time': '11:15-12:00', 'subject': 'Tamil', 'teacher': 'Mr. Muthu Selvan', 'room': '101'},
      {'time': '12:00-12:45', 'subject': 'Social Science', 'teacher': 'Mrs. Geetha Rao', 'room': '101'},
    ],
    'Tuesday': [
      {'time': '8:00-8:45', 'subject': 'English', 'teacher': 'Mrs. Susheela Nair', 'room': '101'},
      {'time': '8:45-9:30', 'subject': 'Chemistry', 'teacher': 'Mr. Rajan Pillai', 'room': 'Lab-2'},
      {'time': '9:30-10:15', 'subject': 'Mathematics', 'teacher': 'Mrs. Anitha Kumar', 'room': '101'},
      {'time': '10:15-10:30', 'subject': 'BREAK', 'teacher': '', 'room': ''},
      {'time': '10:30-11:15', 'subject': 'Tamil', 'teacher': 'Mr. Muthu Selvan', 'room': '101'},
      {'time': '11:15-12:00', 'subject': 'Physics', 'teacher': 'Mr. Rajan Pillai', 'room': 'Lab-1'},
      {'time': '12:00-12:45', 'subject': 'Computer Science', 'teacher': 'Mr. David Raj', 'room': 'Lab-3'},
    ],
    'Wednesday': [
      {'time': '8:00-8:45', 'subject': 'Social Science', 'teacher': 'Mrs. Geetha Rao', 'room': '101'},
      {'time': '8:45-9:30', 'subject': 'Mathematics', 'teacher': 'Mrs. Anitha Kumar', 'room': '101'},
      {'time': '9:30-10:15', 'subject': 'Physics', 'teacher': 'Mr. Rajan Pillai', 'room': 'Lab-1'},
      {'time': '10:15-10:30', 'subject': 'BREAK', 'teacher': '', 'room': ''},
      {'time': '10:30-11:15', 'subject': 'English', 'teacher': 'Mrs. Susheela Nair', 'room': '101'},
      {'time': '11:15-12:00', 'subject': 'Chemistry', 'teacher': 'Mr. Rajan Pillai', 'room': 'Lab-2'},
      {'time': '12:00-12:45', 'subject': 'Tamil', 'teacher': 'Mr. Muthu Selvan', 'room': '101'},
    ],
    'Thursday': [
      {'time': '8:00-8:45', 'subject': 'Tamil', 'teacher': 'Mr. Muthu Selvan', 'room': '101'},
      {'time': '8:45-9:30', 'subject': 'English', 'teacher': 'Mrs. Susheela Nair', 'room': '101'},
      {'time': '9:30-10:15', 'subject': 'Social Science', 'teacher': 'Mrs. Geetha Rao', 'room': '101'},
      {'time': '10:15-10:30', 'subject': 'BREAK', 'teacher': '', 'room': ''},
      {'time': '10:30-11:15', 'subject': 'Mathematics', 'teacher': 'Mrs. Anitha Kumar', 'room': '101'},
      {'time': '11:15-12:00', 'subject': 'Computer Science', 'teacher': 'Mr. David Raj', 'room': 'Lab-3'},
      {'time': '12:00-12:45', 'subject': 'Physics', 'teacher': 'Mr. Rajan Pillai', 'room': 'Lab-1'},
    ],
    'Friday': [
      {'time': '8:00-8:45', 'subject': 'Chemistry', 'teacher': 'Mr. Rajan Pillai', 'room': 'Lab-2'},
      {'time': '8:45-9:30', 'subject': 'Tamil', 'teacher': 'Mr. Muthu Selvan', 'room': '101'},
      {'time': '9:30-10:15', 'subject': 'Mathematics', 'teacher': 'Mrs. Anitha Kumar', 'room': '101'},
      {'time': '10:15-10:30', 'subject': 'BREAK', 'teacher': '', 'room': ''},
      {'time': '10:30-11:15', 'subject': 'Social Science', 'teacher': 'Mrs. Geetha Rao', 'room': '101'},
      {'time': '11:15-12:00', 'subject': 'English', 'teacher': 'Mrs. Susheela Nair', 'room': '101'},
      {'time': '12:00-12:45', 'subject': 'Physical Education', 'teacher': 'Coach Kumar', 'room': 'Ground'},
    ],
  };

  List<Message> get messages => _messages;
  List<Student> get students => _students;
  List<StaffMember> get staff => _staff;
  List<Notice> get notices => _notices;
  Map<String, List<Map<String, String>>> get timetable => _timetable;

  int get unreadMessages => _messages.where((m) => !m.isRead).length;
  int get absentCount => _students.where((s) => s.attendanceStatus == 'absent').length;
  int get recentNotices => _notices.where((n) => n.date.isAfter(DateTime.now().subtract(const Duration(days: 1)))).length;

  void markMessageRead(String id) {
    final idx = _messages.indexWhere((m) => m.id == id);
    if (idx >= 0) {
      _messages[idx] = Message(
        id: _messages[idx].id,
        type: _messages[idx].type,
        title: _messages[idx].title,
        body: _messages[idx].body,
        time: _messages[idx].time,
        isRead: true,
      );
      notifyListeners();
    }
  }

  void addMessage(Message msg) {
    _messages.insert(0, msg);
    notifyListeners();
  }

  void updateAttendance(String studentId, String status) {
    final idx = _students.indexWhere((s) => s.id == studentId);
    if (idx >= 0) {
      _students[idx].attendanceStatus = status;
      notifyListeners();
    }
  }

  void addNotice(Notice notice) {
    _notices.insert(0, notice);
    notifyListeners();
  }
}
