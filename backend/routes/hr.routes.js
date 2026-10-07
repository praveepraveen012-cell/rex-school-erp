const express = require('express');
const router = express.Router();
const db = require('../database/db');
const authenticate = require('../middleware/auth');
const auditService = require('../services/auditService');

router.use(authenticate);

// ----------------------------------------------------------------------------
// 1. STAFF ATTENDANCE
// ----------------------------------------------------------------------------

// GET /api/hr/attendance - List staff attendance
router.get('/attendance', (req, res) => {
  if (req.user.role === 'PARENT') {
    return res.status(403).json({ success: false, error: 'Forbidden: Staff attendance restricted.' });
  }

  const { date } = req.query;
  const targetDate = date || new Date().toISOString().split('T')[0];

  const attendance = db.query(
    `SELECT t.id as teacher_id, t.name, t.employee_id, t.department,
            COALESCE(sa.status, 'PRESENT') as status,
            sa.check_in_time, sa.check_out_time, sa.remarks
     FROM teachers t
     LEFT JOIN staff_attendance sa ON t.id = sa.teacher_id AND sa.date = ?
     ORDER BY t.department ASC, t.name ASC`,
    [targetDate]
  );

  const presentCount = attendance.filter(a => a.status === 'PRESENT').length;
  const absentCount = attendance.filter(a => a.status === 'ABSENT').length;
  const onLeaveCount = attendance.filter(a => a.status === 'ON_DUTY' || a.status === 'HALF_DAY').length;

  return res.json({
    success: true,
    date: targetDate,
    stats: {
      totalStaff: attendance.length,
      present: presentCount,
      absent: absentCount,
      onLeave: onLeaveCount,
      attendancePercentage: attendance.length > 0 ? Math.round((presentCount / attendance.length) * 1000) / 10 : 100
    },
    attendance
  });
});

// POST /api/hr/attendance - Mark staff attendance
router.post('/attendance', (req, res) => {
  if (req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ success: false, error: 'Forbidden: Only Super Admin can mark staff attendance.' });
  }

  const { teacherId, date, status, checkInTime, checkOutTime, remarks } = req.body;
  if (!teacherId || !status) {
    return res.status(400).json({ success: false, error: 'Teacher ID and status are required.' });
  }

  const targetDate = date || new Date().toISOString().split('T')[0];

  db.run(
    `INSERT INTO staff_attendance (teacher_id, date, status, check_in_time, check_out_time, remarks)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(teacher_id, date) DO UPDATE SET
       status = excluded.status,
       check_in_time = COALESCE(excluded.check_in_time, check_in_time),
       check_out_time = COALESCE(excluded.check_out_time, check_out_time),
       remarks = excluded.remarks`,
    [teacherId, targetDate, status.toUpperCase(), checkInTime || '08:20 AM', checkOutTime || '03:45 PM', remarks || null]
  );

  return res.json({ success: true, message: 'Staff attendance recorded successfully.' });
});

// ----------------------------------------------------------------------------
// 2. STAFF LEAVE MANAGEMENT
// ----------------------------------------------------------------------------

// GET /api/hr/leaves
router.get('/leaves', (req, res) => {
  if (req.user.role === 'PARENT') {
    return res.status(403).json({ success: false, error: 'Forbidden: Staff leave access restricted.' });
  }

  let sql = `
    SELECT sl.*, t.name as teacher_name, t.employee_id, t.department
    FROM staff_leaves sl
    JOIN teachers t ON sl.teacher_id = t.id
    WHERE 1=1
  `;
  const params = [];

  // Teachers see only their own leave requests
  if (req.user.role === 'TEACHER') {
    if (!req.teacher) return res.status(403).json({ success: false, error: 'Teacher profile not found.' });
    sql += ` AND sl.teacher_id = ?`;
    params.push(req.teacher.id);
  }

  sql += ` ORDER BY sl.id DESC`;
  const leaves = db.query(sql, params);
  return res.json({ success: true, count: leaves.length, leaves });
});

// POST /api/hr/leaves - Apply leave
router.post('/leaves', (req, res) => {
  if (req.user.role === 'PARENT') {
    return res.status(403).json({ success: false, error: 'Forbidden: Parents cannot apply for staff leave.' });
  }

  const teacherId = req.teacher ? req.teacher.id : req.body.teacherId;
  const { leaveType, startDate, endDate, reason } = req.body;

  if (!teacherId || !leaveType || !startDate || !endDate || !reason) {
    return res.status(400).json({ success: false, error: 'Leave type, dates, and reason are required.' });
  }

  const result = db.run(
    `INSERT INTO staff_leaves (teacher_id, leave_type, start_date, end_date, reason, status)
     VALUES (?, ?, ?, ?, ?, 'PENDING')`,
    [teacherId, leaveType.toUpperCase(), startDate, endDate, reason.trim()]
  );

  return res.status(201).json({ success: true, message: 'Leave application submitted.', leaveId: result.lastInsertRowid });
});

// PUT /api/hr/leaves/:id - Review leave (Approve/Reject)
router.put('/leaves/:id', (req, res) => {
  if (req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ success: false, error: 'Forbidden: Only Super Admin can approve/reject staff leave.' });
  }

  const { status, rejectionReason } = req.body;
  if (!['APPROVED', 'REJECTED'].includes(status?.toUpperCase())) {
    return res.status(400).json({ success: false, error: 'Status must be APPROVED or REJECTED.' });
  }

  db.run(
    `UPDATE staff_leaves SET status = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP, rejection_reason = ? WHERE id = ?`,
    [status.toUpperCase(), req.user.id, rejectionReason || null, req.params.id]
  );

  return res.json({ success: true, message: `Leave request marked as ${status}.` });
});

// ----------------------------------------------------------------------------
// 3. PAYROLL & SALARY MANAGEMENT
// ----------------------------------------------------------------------------

// GET /api/hr/payroll - List payroll records
router.get('/payroll', (req, res) => {
  if (req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ success: false, error: 'Forbidden: Payroll access restricted.' });
  }

  const { month } = req.query;
  const targetMonth = month || '2026-09';

  const payroll = db.query(
    `SELECT pr.*, t.name as teacher_name, t.employee_id, t.department
     FROM payroll_records pr
     JOIN teachers t ON pr.teacher_id = t.id
     WHERE pr.month_year = ?
     ORDER BY t.name ASC`,
    [targetMonth]
  );

  const totalDisbursed = payroll.reduce((sum, p) => sum + (p.net_amount || 0), 0);

  return res.json({
    success: true,
    month: targetMonth,
    totalDisbursed,
    count: payroll.length,
    payroll
  });
});

// GET /api/hr/payroll/payslip/:id - View single detailed payslip
router.get('/payroll/payslip/:id', (req, res) => {
  const payslip = db.get(
    `SELECT pr.*, t.name as teacher_name, t.employee_id, t.department, t.mobile, t.email,
            ss.basic_salary, ss.hra, ss.da, ss.special_allowance, ss.provident_fund, ss.tax_deduction
     FROM payroll_records pr
     JOIN teachers t ON pr.teacher_id = t.id
     LEFT JOIN salary_structures ss ON t.id = ss.teacher_id
     WHERE pr.id = ?`,
    [req.params.id]
  );

  if (!payslip) return res.status(404).json({ success: false, error: 'Payslip record not found.' });

  // Teacher can only view their own payslip
  if (req.user.role === 'TEACHER' && req.teacher?.id !== payslip.teacher_id) {
    return res.status(403).json({ success: false, error: 'Forbidden: Cannot access other staff payslips.' });
  }

  return res.json({
    success: true,
    school: 'Rex Senior Secondary School, Ootacamund',
    payslip: {
      payslipRef: payslip.payslip_ref,
      employeeName: payslip.teacher_name,
      employeeId: payslip.employee_id,
      department: payslip.department,
      monthYear: payslip.month_year,
      paymentDate: payslip.payment_date,
      status: payslip.payment_status,
      earnings: {
        basicSalary: payslip.basic_salary || payslip.basic_salary,
        hra: payslip.hra || 0,
        da: payslip.da || 0,
        specialAllowance: payslip.special_allowance || 0,
        totalEarnings: (payslip.basic_salary || 0) + (payslip.allowances || 0)
      },
      deductions: {
        providentFund: payslip.provident_fund || 0,
        taxDeduction: payslip.tax_deduction || 0,
        totalDeductions: payslip.deductions || 0
      },
      netSalary: payslip.net_amount
    }
  });
});

// ----------------------------------------------------------------------------
// 4. STAFF PERFORMANCE REVIEWS
// ----------------------------------------------------------------------------

// GET /api/hr/evaluations
router.get('/evaluations', (req, res) => {
  if (req.user.role === 'PARENT') {
    return res.status(403).json({ success: false, error: 'Forbidden: Staff performance access restricted.' });
  }

  let sql = `
    SELECT se.*, t.name as teacher_name, t.employee_id, t.department
    FROM staff_evaluations se
    JOIN teachers t ON se.teacher_id = t.id
    WHERE 1=1
  `;
  const params = [];

  if (req.user.role === 'TEACHER') {
    sql += ` AND se.teacher_id = ?`;
    params.push(req.teacher.id);
  }

  sql += ` ORDER BY se.id DESC`;
  const evaluations = db.query(sql, params);
  return res.json({ success: true, count: evaluations.length, evaluations });
});

module.exports = router;
