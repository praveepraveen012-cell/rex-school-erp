const express = require('express');
const router = express.Router();
const db = require('../database/db');
const authenticate = require('../middleware/auth');

router.use(authenticate);

// ----------------------------------------------------------------------------
// GET /api/dashboard/stats - Returns role-customized dashboard metrics
// ----------------------------------------------------------------------------
router.get('/stats', (req, res) => {
  const role = req.user.role;
  const todayStr = new Date().toISOString().split('T')[0];

  // ==========================================================================
  // 1. SUPER ADMIN DASHBOARD
  // ==========================================================================
  if (role === 'SUPER_ADMIN') {
    const studentCount = db.get(`SELECT COUNT(*) as count FROM students WHERE status = 'active'`).count;
    const teacherCount = db.get(`SELECT COUNT(*) as count FROM teachers WHERE status = 'active'`).count;
    const parentCount = db.get(`SELECT COUNT(*) as count FROM parents`).count;
    const classCount = db.get(`SELECT COUNT(*) as count FROM classes`).count;
    const sectionCount = db.get(`SELECT COUNT(*) as count FROM sections`).count;

    // Today's attendance aggregate
    const todayAtt = db.get(
      `SELECT
         COUNT(*) as total_marked,
         SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present,
         SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent,
         SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late
       FROM attendance
       WHERE date = ?`,
      [todayStr]
    );

    const totalMarked = todayAtt.total_marked || 0;
    const present = todayAtt.present || 0;
    const absent = todayAtt.absent || 0;
    const late = todayAtt.late || 0;
    const attendancePercentage = totalMarked > 0 ? Math.round((present / totalMarked) * 100) : 96;

    // Grade-wise attendance distribution
    const classAttendance = db.query(
      `SELECT c.name as class_name,
              COUNT(a.id) as total,
              SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present
       FROM classes c
       LEFT JOIN attendance a ON c.id = a.class_id AND a.date = ?
       GROUP BY c.id
       ORDER BY c.grade_level ASC`,
      [todayStr]
    );

    // Upcoming events
    const upcomingEvents = db.query(
      `SELECT * FROM events WHERE event_date >= ? AND is_published = 1 ORDER BY event_date ASC LIMIT 5`,
      [todayStr]
    );

    // Active notifications
    const activeNotifications = db.query(
      `SELECT * FROM notifications WHERE status = 'active' ORDER BY publish_date DESC LIMIT 5`
    );

    // Recent audit logs
    const recentAudit = db.query(
      `SELECT a.*, u.username
       FROM audit_logs a
       LEFT JOIN users u ON a.user_id = u.id
       ORDER BY a.created_at DESC
       LIMIT 6`
    );

    // Pending fees & financial summary
    const totalCollectedRow = db.get(`SELECT SUM(amount_paid) as collected FROM fee_payments WHERE status = 'PAID'`);
    const totalCollected = (totalCollectedRow && totalCollectedRow.collected) || 0;
    const estimatedTotalFees = studentCount * 45000;
    const pendingFees = Math.max(0, estimatedTotalFees - totalCollected);

    // Homework count
    const activeHomeworkCountRow = db.get(`SELECT COUNT(*) as count FROM homework WHERE status = 'published'`);
    const activeHomeworkCount = (activeHomeworkCountRow && activeHomeworkCountRow.count) || 0;

    return res.json({
      success: true,
      role: 'SUPER_ADMIN',
      stats: {
        totalStudents: studentCount,
        totalTeachers: teacherCount,
        totalParents: parentCount,
        totalClasses: classCount,
        totalSections: sectionCount,
        pendingFees,
        totalCollected,
        activeHomeworkCount,
        todayAttendance: {
          date: todayStr,
          totalMarked,
          present,
          absent,
          late,
          percentage: attendancePercentage
        },
        classAttendance,
        upcomingEvents,
        activeNotifications,
        recentAudit
      }
    });
  }

  // ==========================================================================
  // 2. TEACHER DASHBOARD
  // ==========================================================================
  if (role === 'TEACHER') {
    if (!req.teacher) {
      return res.status(404).json({ success: false, error: 'Teacher profile not found.' });
    }

    const teacher = req.teacher;
    const assignments = teacher.assignments || [];

    // Distinct assigned classes & sections
    const assignedClassIds = [...new Set(assignments.map(a => a.class_id))];

    // Total assigned students
    let totalAssignedStudents = 0;
    if (assignments.length > 0) {
      const secIds = [...new Set(assignments.map(a => a.section_id))];
      const countRes = db.get(
        `SELECT COUNT(*) as count FROM students
         WHERE section_id IN (${secIds.map(() => '?').join(',')}) AND status = 'active'`,
        secIds
      );
      totalAssignedStudents = countRes.count || 0;
    }

    // Today's attendance status in teacher's sections
    const sectionAttendanceStatus = assignments.map(a => {
      const att = db.get(
        `SELECT
           COUNT(*) as marked_count,
           SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present,
           SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent
         FROM attendance
         WHERE class_id = ? AND section_id = ? AND date = ?`,
        [a.class_id, a.section_id, todayStr]
      );
      return {
        classId: a.class_id,
        className: a.class_name,
        sectionId: a.section_id,
        sectionName: a.section_name,
        subjectName: a.subject_name,
        isMarked: (att.marked_count || 0) > 0,
        present: att.present || 0,
        absent: att.absent || 0
      };
    });

    const upcomingEvents = db.query(
      `SELECT * FROM events
       WHERE event_date >= ? AND is_published = 1 AND target_audience IN ('all', 'teachers')
       ORDER BY event_date ASC LIMIT 5`,
      [todayStr]
    );

    const notifications = db.query(
      `SELECT n.*, COALESCE(nr.is_read, 0) as is_read
       FROM notifications n
       LEFT JOIN notification_recipients nr ON n.id = nr.notification_id AND nr.user_id = ?
       WHERE n.status = 'active' AND n.target_audience IN ('all', 'teachers')
       ORDER BY n.publish_date DESC LIMIT 5`,
      [req.user.id]
    );

    // Pending homework created by teacher
    const pendingHomework = db.query(
      `SELECT h.*, sub.name as subject_name, c.name as class_name, sec.name as section_name,
              (SELECT COUNT(*) FROM homework_submissions hs WHERE hs.homework_id = h.id AND hs.status = 'completed') as completed_count,
              (SELECT COUNT(*) FROM students s WHERE s.class_id = h.class_id AND s.section_id = h.section_id) as total_students
       FROM homework h
       JOIN subjects sub ON h.subject_id = sub.id
       JOIN classes c ON h.class_id = c.id
       JOIN sections sec ON h.section_id = sec.id
       WHERE h.teacher_id = ?
       ORDER BY h.due_date ASC LIMIT 5`,
      [teacher.id]
    );

    // Today's schedule / periods
    const todaySchedule = assignments.map((a, idx) => ({
      period: idx + 1,
      time: ['09:00 AM - 09:45 AM', '10:00 AM - 10:45 AM', '11:15 AM - 12:00 PM', '01:30 PM - 02:15 PM'][idx % 4],
      className: a.class_name,
      sectionName: a.section_name,
      subjectName: a.subject_name,
      roomNo: `Room ${101 + idx}`
    }));

    return res.json({
      success: true,
      role: 'TEACHER',
      teacher: {
        id: teacher.id,
        name: teacher.name,
        employeeId: teacher.employee_id,
        department: teacher.department,
        qualification: teacher.qualification,
        assignedSections: assignments
      },
      stats: {
        totalAssignedStudents,
        sectionAttendanceStatus,
        pendingHomework,
        todaySchedule,
        upcomingEvents,
        notifications
      }
    });
  }

  // ==========================================================================
  // 3. PARENT DASHBOARD
  // ==========================================================================
  if (role === 'PARENT') {
    if (!req.parent) {
      return res.status(404).json({ success: false, error: 'Parent profile not found.' });
    }

    const students = req.parent.students || [];
    if (req.query.studentId) {
      const requestedId = parseInt(req.query.studentId, 10);
      const child = students.find(s => s.id === requestedId);
      if (!child) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden: You do not have permission to view dashboard for this student.'
        });
      }
    }

    const selectedStudentId = req.query.studentId
      ? parseInt(req.query.studentId, 10)
      : (students[0] ? students[0].id : null);

    const activeStudent = students.find(s => s.id === selectedStudentId) || students[0] || null;

    let attendanceSummary = { totalDays: 0, presentDays: 0, absentDays: 0, lateDays: 0, percentage: 100 };
    let recentAttendance = [];
    let activeHomework = [];
    let feeSummary = { totalFees: 50000, paidAmount: 30000, pendingAmount: 20000, nextDueDate: '2026-10-15', status: 'PENDING' };
    let busTracking = {
      busNumber: 'Bus #12',
      vehicleNo: 'TN-01-RX-9821',
      routeName: 'Central - Anna Nagar - School',
      driverName: 'Ramesh Kumar',
      driverMobile: '+91 98765 43210',
      status: 'On Route',
      etaMinutes: 12,
      lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    if (activeStudent) {
      const stats = db.get(
        `SELECT
           COUNT(*) as total,
           SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present,
           SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent,
           SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late
         FROM attendance
         WHERE student_id = ?`,
        [activeStudent.id]
      );

      const total = stats.total || 0;
      const present = stats.present || 0;
      const absent = stats.absent || 0;
      const late = stats.late || 0;
      attendanceSummary = {
        totalDays: total,
        presentDays: present,
        absentDays: absent,
        lateDays: late,
        percentage: total > 0 ? Math.round((present / total) * 100) : 100
      };

      recentAttendance = db.query(
        `SELECT * FROM attendance WHERE student_id = ? ORDER BY date DESC LIMIT 7`,
        [activeStudent.id]
      );

      // Child's homework
      activeHomework = db.query(
        `SELECT h.*, sub.name as subject_name, sub.code as subject_code,
                t.name as teacher_name, hs.status as submission_status
         FROM homework h
         JOIN subjects sub ON h.subject_id = sub.id
         JOIN teachers t ON h.teacher_id = t.id
         LEFT JOIN homework_submissions hs ON h.id = hs.homework_id AND hs.student_id = ?
         WHERE h.class_id = ? AND h.section_id = ? AND h.status = 'published'
         ORDER BY h.due_date ASC LIMIT 5`,
        [activeStudent.id, activeStudent.class_id, activeStudent.section_id]
      );

      // Child's fees
      const paidRow = db.get(
        `SELECT SUM(amount_paid) as total_paid FROM fee_payments WHERE student_id = ? AND status = 'PAID'`,
        [activeStudent.id]
      );
      const paid = (paidRow && paidRow.total_paid) || 0;
      const totalF = 50000;
      const pendingF = Math.max(0, totalF - paid);
      feeSummary = {
        totalFees: totalF,
        paidAmount: paid,
        pendingAmount: pendingF,
        nextDueDate: '2026-10-15',
        status: pendingF === 0 ? 'PAID' : (paid > 0 ? 'PARTIAL' : 'PENDING')
      };

      // Child's bus assignment
      const transportRow = db.get(
        `SELECT b.bus_number, b.vehicle_no, br.name as route_name, br.live_status, br.eta_minutes,
                d.name as driver_name, d.mobile as driver_mobile
         FROM student_transport_assignments sta
         JOIN buses b ON sta.bus_id = b.id
         JOIN bus_routes br ON sta.route_id = br.id
         LEFT JOIN drivers d ON b.id = d.assigned_bus_id
         WHERE sta.student_id = ?`,
        [activeStudent.id]
      );

      if (transportRow) {
        busTracking = {
          busNumber: transportRow.bus_number,
          vehicleNo: transportRow.vehicle_no,
          routeName: transportRow.route_name,
          driverName: transportRow.driver_name,
          driverMobile: transportRow.driver_mobile,
          status: transportRow.live_status,
          etaMinutes: transportRow.eta_minutes,
          lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
      }
    }

    const upcomingEvents = db.query(
      `SELECT * FROM events
       WHERE event_date >= ? AND is_published = 1 AND target_audience IN ('all', 'parents')
       ORDER BY event_date ASC LIMIT 5`,
      [todayStr]
    );

    const notifications = db.query(
      `SELECT n.*, COALESCE(nr.is_read, 0) as is_read
       FROM notifications n
       LEFT JOIN notification_recipients nr ON n.id = nr.notification_id AND nr.user_id = ?
       WHERE n.status = 'active' AND n.target_audience IN ('all', 'parents')
       ORDER BY n.publish_date DESC LIMIT 5`,
      [req.user.id]
    );

    return res.json({
      success: true,
      role: 'PARENT',
      parent: req.parent,
      linkedStudents: students,
      activeStudent,
      attendanceSummary,
      recentAttendance,
      activeHomework,
      feeSummary,
      busTracking,
      upcomingEvents,
      notifications
    });
  }

  return res.status(400).json({ success: false, error: 'Unknown role.' });
});

module.exports = router;
