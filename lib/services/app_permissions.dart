enum AppRole { superAdmin, teacher, parent }

/// Centralized Role-Based Access Control (RBAC) and Permission Engine for Rex Management
class AppPermissions {
  final AppRole role;
  final String roleString;

  const AppPermissions._(this.role, this.roleString);

  static AppPermissions of(String? roleName) {
    final clean = (roleName ?? 'PARENT').toUpperCase().trim();
    if (clean == 'SUPER_ADMIN' || clean == 'ADMIN') {
      return const AppPermissions._(AppRole.superAdmin, 'SUPER_ADMIN');
    } else if (clean == 'TEACHER') {
      return const AppPermissions._(AppRole.teacher, 'TEACHER');
    } else {
      return const AppPermissions._(AppRole.parent, 'PARENT');
    }
  }

  bool get isSuperAdmin => role == AppRole.superAdmin;
  bool get isTeacher => role == AppRole.teacher;
  bool get isParent => role == AppRole.parent;

  // --------------------------------------------------------------------------
  // Homework Permissions
  // --------------------------------------------------------------------------
  /// Super Admin and Teachers can create new homework
  bool get canCreateHomework => isSuperAdmin || isTeacher;

  /// Super Admin and assigned Teacher can edit homework
  bool get canEditHomework => isSuperAdmin || isTeacher;

  /// Super Admin and assigned Teacher can delete homework
  bool get canDeleteHomework => isSuperAdmin || isTeacher;

  /// All roles can view homework (Parents strictly see their own child's homework)
  bool get canViewHomework => true;

  // --------------------------------------------------------------------------
  // Fee Management Permissions
  // --------------------------------------------------------------------------
  /// Only Super Admin can manage school fees, view cashier ledgers, and audit finances
  bool get canManageFees => isSuperAdmin;

  /// Only Super Admin can view all students' fee records
  bool get canViewAllStudentFees => isSuperAdmin;

  /// Parents can view fee details strictly for their own linked child/children
  bool get canViewOwnChildFees => isParent;

  /// Parents can initiate fee payments for their own child
  bool get canMakeFeePayment => isParent;

  /// Only Super Admin can dispatch fee reminders
  bool get canSendFeeReminders => isSuperAdmin;

  /// Teachers are strictly forbidden from all fee modules
  bool get canAccessFees => isSuperAdmin || isParent;

  // --------------------------------------------------------------------------
  // Attendance Permissions
  // --------------------------------------------------------------------------
  /// Super Admin and Teachers can record/mark class attendance
  bool get canMarkAttendance => isSuperAdmin || isTeacher;

  /// Super Admin and Teachers can view class-wide roll call registers
  bool get canViewClassAttendanceRegister => isSuperAdmin || isTeacher;

  /// Parents can only view their own child's attendance percentage and logs
  bool get canViewOwnChildAttendance => isParent;

  // --------------------------------------------------------------------------
  // Student & Faculty Records
  // --------------------------------------------------------------------------
  /// Super Admin can add/edit/delete students and change class allocations
  bool get canManageStudents => isSuperAdmin;

  /// Super Admin sees all students; Teacher sees assigned students; Parent sees own children
  bool get canViewAllStudents => isSuperAdmin;
  bool get canViewAssignedStudents => isTeacher;
  bool get canViewOwnChildOnly => isParent;

  /// Only Super Admin can manage teacher and parent user accounts
  bool get canManageAccounts => isSuperAdmin;

  // --------------------------------------------------------------------------
  // Events, Notices & Automated SMS
  // --------------------------------------------------------------------------
  /// Super Admin can create and delete school-wide events
  bool get canManageEvents => isSuperAdmin;
  bool get canViewEvents => true;

  /// Super Admin and Teachers can publish announcements
  bool get canPublishNotices => isSuperAdmin || isTeacher;

  /// Only Super Admin can broadcast school-wide automated SMS
  bool get canSendAutomatedSMS => isSuperAdmin;

  // --------------------------------------------------------------------------
  // Transport & Bus Telematics
  // --------------------------------------------------------------------------
  /// Super Admin can manage the entire 4-bus fleet
  bool get canManageFleet => isSuperAdmin;

  /// Parents can view real-time GPS and proximity alerts for their child's bus
  bool get canTrackChildBus => isParent || isSuperAdmin;
}
