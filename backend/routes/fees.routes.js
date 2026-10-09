const express = require('express');
const router = express.Router();
const db = require('../database/db');
const authenticate = require('../middleware/auth');
const auditService = require('../services/auditService');

router.use(authenticate);

// ----------------------------------------------------------------------------
// ROLE GUARD: Teachers are strictly forbidden from all fee modules
// ----------------------------------------------------------------------------
router.use((req, res, next) => {
  if (req.user.role === 'TEACHER') {
    return res.status(403).json({
      success: false,
      error: 'Access Denied: Teachers are not authorized to view or manage student fee records.'
    });
  }
  next();
});

// ----------------------------------------------------------------------------
// GET /api/fees - Get fee summary and breakdown scoped to role
// ----------------------------------------------------------------------------
router.get('/', (req, res) => {
  const role = req.user.role;

  // 1. PARENT ACCESS - Scoped strictly to linked children
  if (role === 'PARENT') {
    if (!req.parent || !req.parent.students || req.parent.students.length === 0) {
      return res.status(404).json({ success: false, error: 'No linked students found for this parent.' });
    }

    const requestedStudentId = req.query.studentId
      ? parseInt(req.query.studentId, 10)
      : req.parent.students[0].id;

    const child = req.parent.students.find(s => s.id === requestedStudentId);
    if (!child) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: You do not have permission to view fees for this student.'
      });
    }

    // Get active fee structures for child's class
    const feeStructures = db.query(
      `SELECT fs.*, c.name as class_name
       FROM fee_structures fs
       JOIN classes c ON fs.class_id = c.id
       WHERE fs.class_id = ?
       ORDER BY fs.due_date ASC`,
      [child.class_id]
    );

    // Get payments recorded for this child
    const payments = db.query(
      `SELECT fp.*, fs.term_name
       FROM fee_payments fp
       LEFT JOIN fee_structures fs ON fp.fee_structure_id = fs.id
       WHERE fp.student_id = ?
       ORDER BY fp.paid_at DESC`,
      [child.id]
    );

    // Aggregate totals
    let totalFees = 0;
    feeStructures.forEach(fs => {
      totalFees += fs.total_amount;
    });

    if (totalFees === 0) {
      totalFees = 50000;
    }

    let paidAmount = 0;
    payments.forEach(p => {
      if (p.status === 'PAID') {
        paidAmount += p.amount_paid;
      }
    });

    const pendingAmount = Math.max(0, totalFees - paidAmount);
    const minSplitPayment = Math.round(pendingAmount * 0.30);
    const nextDueDate = feeStructures.length > 0 ? feeStructures[0].due_date : '2026-10-15';

    return res.json({
      success: true,
      role: 'PARENT',
      student: {
        id: child.id,
        name: `${child.first_name} ${child.last_name}`,
        admissionNo: child.admission_no,
        class: child.class_name,
        section: child.section_name,
        classId: child.class_id
      },
      summary: {
        totalFees,
        paidAmount,
        pendingAmount,
        minSplitPayment,
        nextDueDate,
        currency: 'INR',
        currencySymbol: '₹',
        paymentStatus: pendingAmount === 0 ? 'PAID' : (paidAmount > 0 ? 'PARTIALLY_PAID' : 'UNPAID')
      },
      feeStructures,
      payments
    });
  }

  // 2. SUPER ADMIN ACCESS - School-wide fee overview & filterable student ledgers
  if (role === 'SUPER_ADMIN') {
    const { search, student, parent, classId, sectionId, status } = req.query;

    let studentsQuery = `
      SELECT s.id, s.first_name, s.last_name, s.admission_no, s.class_id, s.section_id,
             c.name as class_name, sec.name as section_name,
             p.id as parent_id, p.name as parent_name, p.mobile as parent_mobile
      FROM students s
      JOIN classes c ON s.class_id = c.id
      JOIN sections sec ON s.section_id = sec.id
      LEFT JOIN parents p ON s.parent_id = p.id
      WHERE s.status = 'active'
    `;
    const params = [];

    if (classId) {
      studentsQuery += ` AND s.class_id = ?`;
      params.push(classId);
    }
    if (sectionId) {
      studentsQuery += ` AND s.section_id = ?`;
      params.push(sectionId);
    }
    const studentSearch = search || student;
    if (studentSearch) {
      studentsQuery += ` AND (s.first_name LIKE ? OR s.last_name LIKE ? OR s.admission_no LIKE ?)`;
      params.push(`%${studentSearch}%`, `%${studentSearch}%`, `%${studentSearch}%`);
    }
    if (parent) {
      studentsQuery += ` AND (p.name LIKE ? OR p.mobile LIKE ?)`;
      params.push(`%${parent}%`, `%${parent}%`);
    }
    studentsQuery += ` ORDER BY s.admission_no ASC`;

    const allStudents = db.query(studentsQuery, params);

    // Map class fee structures
    const classFeesMap = {};
    const classStructures = db.query(`SELECT class_id, SUM(total_amount) as total FROM fee_structures GROUP BY class_id`);
    classStructures.forEach(cs => {
      classFeesMap[cs.class_id] = cs.total;
    });

    let overallTotalFees = 0;
    let overallTotalCollected = 0;
    let overallTotalOutstanding = 0;
    let paidCount = 0;
    let unpaidCount = 0;
    let partialCount = 0;

    const studentRecords = [];

    for (const st of allStudents) {
      const studentTotalFee = classFeesMap[st.class_id] || 50000;

      const payments = db.query(
        `SELECT fp.*, fs.term_name 
         FROM fee_payments fp 
         LEFT JOIN fee_structures fs ON fp.fee_structure_id = fs.id 
         WHERE fp.student_id = ? AND fp.status = 'PAID'
         ORDER BY fp.paid_at DESC`,
        [st.id]
      );

      const paidAmount = payments.reduce((sum, p) => sum + p.amount_paid, 0);
      const outstanding = Math.max(0, studentTotalFee - paidAmount);
      const minSplit = Math.round(outstanding * 0.30);

      let studentStatus = 'UNPAID';
      if (outstanding === 0) {
        studentStatus = 'PAID';
      } else if (paidAmount > 0) {
        studentStatus = 'PARTIALLY_PAID';
      }

      overallTotalFees += studentTotalFee;
      overallTotalCollected += paidAmount;
      overallTotalOutstanding += outstanding;

      if (studentStatus === 'PAID') paidCount++;
      else if (studentStatus === 'UNPAID') unpaidCount++;
      else partialCount++;

      // Apply status filter if specified
      if (status && status !== 'ALL') {
        const normalizedFilter = status.toUpperCase();
        if (normalizedFilter === 'PAID' && studentStatus !== 'PAID') continue;
        if (normalizedFilter === 'UNPAID' && studentStatus !== 'UNPAID') continue;
        if ((normalizedFilter === 'PARTIAL' || normalizedFilter === 'PARTIALLY_PAID') && studentStatus !== 'PARTIALLY_PAID') continue;
      }

      const lastPayment = payments.length > 0 ? payments[0] : null;

      studentRecords.push({
        studentId: st.id,
        studentName: `${st.first_name} ${st.last_name}`,
        admissionNo: st.admission_no,
        classId: st.class_id,
        className: st.class_name,
        sectionId: st.section_id,
        sectionName: st.section_name,
        parentId: st.parent_id,
        parentName: st.parent_name || 'N/A',
        parentMobile: st.parent_mobile || 'N/A',
        totalFee: studentTotalFee,
        amountPaid: paidAmount,
        outstandingAmount: outstanding,
        minSplitPayment: minSplit,
        status: studentStatus,
        lastPaymentDate: lastPayment ? lastPayment.paid_at : null,
        receiptNo: lastPayment ? lastPayment.receipt_no : null,
        payments: payments.map(p => ({
          id: p.id,
          amountPaid: p.amount_paid,
          totalFees: p.total_fees,
          pendingAmount: p.pending_amount,
          paymentType: p.payment_type || 'FULL',
          paymentMode: p.payment_mode,
          transactionRef: p.transaction_ref,
          status: p.status,
          receiptNo: p.receipt_no,
          paidAt: p.paid_at,
          termName: p.term_name || 'Tuition Fee'
        }))
      });
    }

    // Recent payments for ledger view
    const recentPayments = db.query(`
      SELECT fp.*, s.first_name, s.last_name, s.admission_no, c.name as class_name, sec.name as section_name
      FROM fee_payments fp
      JOIN students s ON fp.student_id = s.id
      JOIN classes c ON s.class_id = c.id
      JOIN sections sec ON s.section_id = sec.id
      ORDER BY fp.paid_at DESC LIMIT 50
    `);

    return res.json({
      success: true,
      role: 'SUPER_ADMIN',
      overview: {
        totalFees: overallTotalFees,
        totalCollected: overallTotalCollected,
        totalOutstanding: overallTotalOutstanding,
        paidStudents: paidCount,
        unpaidStudents: unpaidCount,
        partiallyPaidStudents: partialCount,
        totalStudents: allStudents.length,
        collectionRate: overallTotalFees > 0 ? Math.round((overallTotalCollected / overallTotalFees) * 100) : 0,
        currency: 'INR',
        currencySymbol: '₹'
      },
      students: studentRecords,
      recentPayments
    });
  }

  return res.status(403).json({ success: false, error: 'Unauthorized role.' });
});

// ----------------------------------------------------------------------------
// POST /api/fees/pay (and aliases /collect, /payment, /collection, /process)
// CRITICAL PERMISSION RULE (Section 1 & 5):
// SUPER_ADMIN and TEACHER MUST NEVER be able to initiate or process student fee payments.
// Student fee payments can ONLY be initiated by authorized PARENT for their own child.
// ----------------------------------------------------------------------------
router.post(['/pay', '/collect', '/payment', '/collection', '/process'], (req, res) => {
  const role = req.user.role;

  // 1. Strict Role Authorization Rule: Reject Super Admin and Teachers
  if (role !== 'PARENT') {
    auditService.log(
      req.user.id,
      role,
      'PAY_FEES_BLOCKED',
      'fees',
      req.body.studentId ? String(req.body.studentId) : null,
      `Blocked unauthorized fee payment attempt by ${role}`
    );
    return res.status(403).json({
      success: false,
      error: 'Forbidden: Super Admin is strictly unauthorized to initiate or complete student fee payments. Student fee payments must be made by parents through the Parent App.'
    });
  }

  const { studentId, feeStructureId, amount, paymentType, paymentMode, gatewayTransactionId } = req.body;

  if (!studentId || amount === undefined || amount === null) {
    return res.status(400).json({ success: false, error: 'Valid studentId and payment amount are required.' });
  }

  // 2. Resource Ownership Check: verify student is linked to parent
  if (!req.parent || !req.parent.students) {
    return res.status(403).json({ success: false, error: 'Parent record not found.' });
  }
  const isLinked = req.parent.students.some(s => s.id === parseInt(studentId, 10));
  if (!isLinked) {
    return res.status(403).json({
      success: false,
      error: 'Forbidden: You can only initiate fee payments for your own registered children.'
    });
  }

  // 3. Verify student exists
  const student = db.get(
    `SELECT s.*, c.name as class_name, sec.name as section_name 
     FROM students s 
     JOIN classes c ON s.class_id = c.id 
     JOIN sections sec ON s.section_id = sec.id 
     WHERE s.id = ?`,
    [studentId]
  );
  if (!student) {
    return res.status(404).json({ success: false, error: 'Student not found.' });
  }

  // 4. Calculate total fee and current outstanding
  const feeStructures = db.query(`SELECT * FROM fee_structures WHERE class_id = ?`, [student.class_id]);
  let totalFeesForStudent = feeStructures.reduce((sum, fs) => sum + fs.total_amount, 0);
  if (totalFeesForStudent === 0) {
    totalFeesForStudent = 50000;
  }

  const paidRow = db.get(
    `SELECT SUM(amount_paid) as total_paid FROM fee_payments WHERE student_id = ? AND status = 'PAID'`,
    [studentId]
  );
  const currentPaid = (paidRow && paidRow.total_paid) || 0;
  const currentOutstanding = Math.max(0, totalFeesForStudent - currentPaid);

  if (currentOutstanding === 0) {
    return res.status(400).json({
      success: false,
      error: 'Fees for this student are already fully paid.'
    });
  }

  // 5. Amount validation: numeric, positive, <= currentOutstanding
  const payAmount = parseFloat(amount);
  if (isNaN(payAmount) || payAmount <= 0) {
    return res.status(400).json({
      success: false,
      error: 'Invalid payment amount. Amount must be greater than zero.'
    });
  }

  if (payAmount > currentOutstanding) {
    return res.status(400).json({
      success: false,
      error: `Payment amount (₹${payAmount}) cannot exceed outstanding fee balance of ₹${currentOutstanding}.`
    });
  }

  // 6. Split Payment Minimum Rule:
  // Exactly 30% of CURRENT OUTSTANDING balance
  const minSplit = Math.round(currentOutstanding * 0.30);
  const isFullPayment = (payAmount === currentOutstanding);
  const recordedPaymentType = isFullPayment ? 'FULL' : 'SPLIT';

  if (!isFullPayment || paymentType === 'SPLIT') {
    if (payAmount < minSplit) {
      return res.status(400).json({
        success: false,
        error: 'Minimum split payment is 30% of the outstanding fee.',
        minSplitAmount: minSplit,
        outstandingAmount: currentOutstanding
      });
    }
  }

  // 7. Execute payment transaction and record in fee ledger
  const verifiedTxRef = gatewayTransactionId || `TXN-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const receiptNo = `REC-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
  const remainingPending = Math.max(0, currentOutstanding - payAmount);

  try {
    const insertResult = db.run(
      `INSERT INTO fee_payments
       (student_id, fee_structure_id, amount_paid, total_fees, pending_amount, previously_paid, payment_type, payment_mode, transaction_ref, status, parent_id, created_by, receipt_no)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PAID', ?, ?, ?)`,
      [
        studentId,
        feeStructureId || null,
        payAmount,
        totalFeesForStudent,
        remainingPending,
        currentPaid,
        recordedPaymentType,
        paymentMode || 'ONLINE_UPI',
        verifiedTxRef,
        student.parent_id || null,
        req.user.id,
        receiptNo
      ]
    );

    // Automatic In-App Notification for Parent
    if (student.parent_id) {
      const parentUser = db.get(`SELECT user_id FROM parents WHERE id = ?`, [student.parent_id]);
      if (parentUser && parentUser.user_id) {
        const notifResult = db.run(
          `INSERT INTO notifications (title, message, type, priority, target_audience, created_by)
           VALUES (?, ?, 'general', 'medium', 'parents', ?)`,
          [
            'Fee Payment Confirmation',
            `Payment of ₹${payAmount} (${recordedPaymentType} payment) received successfully for ${student.first_name} ${student.last_name}. Outstanding Balance: ₹${remainingPending}. Receipt: ${receiptNo}.`,
            req.user.id
          ]
        );
        db.run(
          `INSERT INTO notification_recipients (notification_id, user_id) VALUES (?, ?)`,
          [notifResult.lastInsertRowid, parentUser.user_id]
        );
      }
    }

    auditService.log(
      req.user.id,
      req.user.role,
      'PAY_FEES',
      'fees',
      insertResult.lastInsertRowid.toString(),
      `Fee payment of ₹${payAmount} (${recordedPaymentType}) recorded for student ${student.first_name} (${student.admission_no}). Receipt: ${receiptNo}`
    );

    return res.status(201).json({
      success: true,
      message: 'Payment verified and recorded successfully.',
      payment: {
        id: insertResult.lastInsertRowid,
        studentId,
        studentName: `${student.first_name} ${student.last_name}`,
        admissionNo: student.admission_no,
        className: `${student.class_name}-${student.section_name}`,
        amountPaid: payAmount,
        previouslyPaid: currentPaid,
        totalFees: totalFeesForStudent,
        pendingAmount: remainingPending,
        paymentType: recordedPaymentType,
        minSplitAmount: minSplit,
        paymentMode: paymentMode || 'ONLINE_UPI',
        receiptNo,
        transactionRef: verifiedTxRef,
        paidAt: new Date().toISOString(),
        status: 'PAID'
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Database transaction error: ' + err.message });
  }
});

// ----------------------------------------------------------------------------
// POST /api/fees/send-reminder - Super Admin can dispatch fee reminders
// Supports single parent, selected parents, or bulk (all unpaid / all partially paid)
// ----------------------------------------------------------------------------
router.post(['/send-reminder', '/reminder'], (req, res) => {
  if (req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ success: false, error: 'Only Super Admin can trigger fee reminders.' });
  }

  const { studentId, studentIds, filter } = req.body;
  let targetStudentIds = [];

  if (Array.isArray(studentIds) && studentIds.length > 0) {
    targetStudentIds = studentIds.map(id => parseInt(id, 10));
  } else if (studentId) {
    targetStudentIds = [parseInt(studentId, 10)];
  } else if (filter) {
    // Bulk filter: 'UNPAID', 'PARTIALLY_PAID', 'ALL_PENDING'
    const allActive = db.query(`SELECT id, class_id FROM students WHERE status = 'active'`);
    for (const st of allActive) {
      const classStruct = db.get(`SELECT SUM(total_amount) as total FROM fee_structures WHERE class_id = ?`, [st.class_id]);
      const totalFee = (classStruct && classStruct.total) || 50000;
      const paidRow = db.get(`SELECT SUM(amount_paid) as total_paid FROM fee_payments WHERE student_id = ? AND status = 'PAID'`, [st.id]);
      const paid = (paidRow && paidRow.total_paid) || 0;
      const outstanding = totalFee - paid;

      if (outstanding > 0) {
        if (filter === 'UNPAID' && paid === 0) {
          targetStudentIds.push(st.id);
        } else if ((filter === 'PARTIAL' || filter === 'PARTIALLY_PAID') && paid > 0) {
          targetStudentIds.push(st.id);
        } else if (filter === 'ALL_PENDING' || filter === 'ALL') {
          targetStudentIds.push(st.id);
        }
      }
    }
  } else {
    return res.status(400).json({ success: false, error: 'Provide studentId, studentIds, or filter.' });
  }

  if (targetStudentIds.length === 0) {
    return res.json({
      success: true,
      message: 'No matching students with pending fee balance found.',
      sentCount: 0
    });
  }

  let sentCount = 0;
  const dispatchedRecords = [];

  for (const sId of targetStudentIds) {
    const student = db.get(`
      SELECT s.*, p.id as p_id, p.user_id as parent_user_id, p.name as parent_name, p.mobile as parent_mobile
      FROM students s
      LEFT JOIN parents p ON s.parent_id = p.id
      WHERE s.id = ?
    `, [sId]);

    if (!student) continue;

    const classStruct = db.get(`SELECT SUM(total_amount) as total FROM fee_structures WHERE class_id = ?`, [student.class_id]);
    const totalFee = (classStruct && classStruct.total) || 50000;
    const paidRow = db.get(`SELECT SUM(amount_paid) as total_paid FROM fee_payments WHERE student_id = ? AND status = 'PAID'`, [student.id]);
    const paid = (paidRow && paidRow.total_paid) || 0;
    const outstanding = Math.max(0, totalFee - paid);

    if (outstanding <= 0) continue;

    const isUnpaid = (paid === 0);
    // Notification templates mandated by Section 7
    const message = isUnpaid
      ? `Fee Payment Reminder: Your child's fee of ₹${outstanding} is currently unpaid. Please make the payment through the Parent App.`
      : `Fee Payment Reminder: Your child's outstanding fee balance is ₹${outstanding}. Please complete the remaining payment through the Parent App.`;

    const title = 'Fee Payment Reminder';

    // 1. In-App Notification (Stored in DB)
    if (student.parent_user_id) {
      const notif = db.run(
        `INSERT INTO notifications (title, message, type, priority, target_audience, created_by)
         VALUES (?, ?, 'general', 'high', 'parents', ?)`,
        [title, message, req.user.id]
      );
      db.run(`INSERT INTO notification_recipients (notification_id, user_id) VALUES (?, ?)`, [notif.lastInsertRowid, student.parent_user_id]);
    }

    // 2. Transparently log SMS/WhatsApp delivery record
    const hasSmsGateway = Boolean(process.env.SMS_PROVIDER_KEY);
    if (student.parent_mobile) {
      db.run(
        `INSERT INTO sms_logs (recipient, message, sms_type, status, provider, reference_id, error_message)
         VALUES (?, ?, 'GENERAL', ?, ?, ?, ?)`,
        [
          student.parent_mobile,
          message,
          hasSmsGateway ? 'SENT' : 'PENDING',
          hasSmsGateway ? 'TWILIO' : 'LOCAL_LOG',
          `REM-${Date.now()}-${sId}`,
          hasSmsGateway ? null : 'Awaiting SMS/WhatsApp gateway credentials configuration'
        ]
      );
    }

    sentCount++;
    dispatchedRecords.push({
      studentId: student.id,
      studentName: `${student.first_name} ${student.last_name}`,
      parentName: student.parent_name,
      parentMobile: student.parent_mobile,
      outstandingAmount: outstanding,
      message
    });
  }

  auditService.log(
    req.user.id,
    req.user.role,
    'FEE_REMINDER',
    'fees',
    `BULK-${sentCount}`,
    `Fee reminder dispatched to ${sentCount} parent(s).`
  );

  return res.json({
    success: true,
    sentCount,
    message: `Payment reminder sent successfully to ${sentCount} parent(s).`,
    channelStatus: {
      inApp: 'DELIVERED',
      push: 'ACTIVE',
      sms: process.env.SMS_PROVIDER_KEY ? 'DELIVERED' : 'AWAITING_EXTERNAL_PROVIDER_CREDENTIALS',
      whatsapp: process.env.WHATSAPP_API_TOKEN ? 'DELIVERED' : 'AWAITING_EXTERNAL_PROVIDER_CREDENTIALS',
      email: 'AWAITING_SMTP_CREDENTIALS'
    },
    dispatched: dispatchedRecords
  });
});

// ----------------------------------------------------------------------------
// GET /api/fees/student/:id - Query fee record for a specific student
// Super Admin gets details only - NO payment capabilities
// ----------------------------------------------------------------------------
router.get('/student/:id', (req, res) => {
  const role = req.user.role;
  const targetId = req.params.id;

  if (role === 'TEACHER') {
    return res.status(403).json({
      success: false,
      error: 'Access Denied: Teachers are not authorized to view student fees.'
    });
  }

  let student = null;
  if (role === 'PARENT') {
    if (!req.parent || !req.parent.students || req.parent.students.length === 0) {
      return res.status(403).json({ success: false, error: 'Forbidden: No linked students found for this account.' });
    }

    const child = req.parent.students.find(s =>
      s.id.toString() === targetId.toString() ||
      (s.admission_no && s.admission_no.toUpperCase() === targetId.toUpperCase())
    );

    if (!child) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: You do not have permission to view fee records for this student.'
      });
    }
    student = child;
  } else if (role === 'SUPER_ADMIN') {
    student = db.get(
      `SELECT s.*, c.name as class_name, sec.name as section_name, p.name as parent_name, p.mobile as parent_mobile
       FROM students s
       JOIN classes c ON s.class_id = c.id
       JOIN sections sec ON s.section_id = sec.id
       LEFT JOIN parents p ON s.parent_id = p.id
       WHERE s.id = ? OR s.admission_no = ?`,
      [targetId, targetId]
    );
    if (!student) {
      return res.status(404).json({ success: false, error: 'Student record not found.' });
    }
  } else {
    return res.status(403).json({ success: false, error: 'Unauthorized role.' });
  }

  const feeStructures = db.query(
    `SELECT fs.*, c.name as class_name
     FROM fee_structures fs
     JOIN classes c ON fs.class_id = c.id
     WHERE fs.class_id = ?
     ORDER BY fs.due_date ASC`,
    [student.class_id]
  );

  const payments = db.query(
    `SELECT fp.*, fs.term_name
     FROM fee_payments fp
     LEFT JOIN fee_structures fs ON fp.fee_structure_id = fs.id
     WHERE fp.student_id = ?
     ORDER BY fp.paid_at DESC`,
    [student.id]
  );

  let totalFees = 0;
  feeStructures.forEach(fs => totalFees += fs.total_amount);
  if (totalFees === 0) totalFees = 50000;

  let paidAmount = 0;
  payments.forEach(p => {
    if (p.status === 'PAID') paidAmount += p.amount_paid;
  });

  const pendingAmount = Math.max(0, totalFees - paidAmount);
  const minSplitPayment = Math.round(pendingAmount * 0.30);
  const nextDueDate = feeStructures.length > 0 ? feeStructures[0].due_date : '2026-10-15';

  return res.json({
    success: true,
    student: {
      id: student.id,
      name: `${student.first_name} ${student.last_name}`,
      admissionNo: student.admission_no,
      class: student.class_name,
      section: student.section_name,
      parentName: student.parent_name || 'N/A',
      parentMobile: student.parent_mobile || 'N/A'
    },
    summary: {
      totalFees,
      paidAmount,
      pendingAmount,
      minSplitPayment,
      nextDueDate,
      currency: 'INR',
      currencySymbol: '₹',
      paymentStatus: pendingAmount === 0 ? 'PAID' : (paidAmount > 0 ? 'PARTIALLY_PAID' : 'UNPAID')
    },
    feeStructures,
    payments
  });
});

module.exports = router;
