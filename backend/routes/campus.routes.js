const express = require('express');
const router = express.Router();
const db = require('../database/db');
const authenticate = require('../middleware/auth');
const auditService = require('../services/auditService');

router.use(authenticate);

// ----------------------------------------------------------------------------
// 1. LIBRARY MANAGEMENT
// ----------------------------------------------------------------------------

// GET /api/campus/library/books - List catalog
router.get('/library/books', (req, res) => {
  const { search, category, status } = req.query;
  let sql = `SELECT * FROM library_books WHERE 1=1`;
  const params = [];

  if (search) {
    sql += ` AND (title LIKE ? OR author LIKE ? OR isbn LIKE ?)`;
    const q = `%${search}%`;
    params.push(q, q, q);
  }
  if (category) {
    sql += ` AND category = ?`;
    params.push(category);
  }
  if (status) {
    sql += ` AND status = ?`;
    params.push(status.toUpperCase());
  }

  sql += ` ORDER BY title ASC`;
  const books = db.query(sql, params);
  return res.json({ success: true, count: books.length, books });
});

// POST /api/campus/library/books - Add book (Admin)
router.post('/library/books', (req, res) => {
  if (req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ success: false, error: 'Forbidden: Super Admin access required.' });
  }

  const { title, author, category, isbn, publisher, totalCopies, rackLocation } = req.body;
  if (!title || !author || !category) {
    return res.status(400).json({ success: false, error: 'Title, author, and category are required.' });
  }

  const copies = parseInt(totalCopies, 10) || 1;
  const result = db.run(
    `INSERT INTO library_books (title, author, category, isbn, publisher, total_copies, available_copies, rack_location, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'AVAILABLE')`,
    [title.trim(), author.trim(), category.trim(), isbn || null, publisher || null, copies, copies, rackLocation || 'Main Stacks']
  );

  return res.status(201).json({ success: true, message: 'Book added to Library Catalog.', bookId: result.lastInsertRowid });
});

// GET /api/campus/library/transactions - Active transactions with parent isolation
router.get('/library/transactions', (req, res) => {
  let sql = `
    SELECT lt.*, lb.title as book_title, lb.author, s.first_name, s.last_name, s.admission_no
    FROM library_transactions lt
    JOIN library_books lb ON lt.book_id = lb.id
    LEFT JOIN students s ON lt.student_id = s.id
    WHERE 1=1
  `;
  const params = [];

  if (req.user.role === 'PARENT') {
    if (!req.parent || !req.parent.students || req.parent.students.length === 0) {
      return res.json({ success: true, transactions: [] });
    }
    const studentIds = req.parent.students.map(s => s.id);
    sql += ` AND lt.student_id IN (${studentIds.join(',')})`;
  } else if (req.query.studentId) {
    sql += ` AND lt.student_id = ?`;
    params.push(req.query.studentId);
  }

  sql += ` ORDER BY lt.id DESC`;
  const transactions = db.query(sql, params);
  return res.json({ success: true, count: transactions.length, transactions });
});

// POST /api/campus/library/issue - Issue book
router.post('/library/issue', (req, res) => {
  if (req.user.role === 'PARENT') {
    return res.status(403).json({ success: false, error: 'Forbidden: Parents cannot issue books.' });
  }

  const { bookId, studentId, teacherId, borrowerType, dueDate, remarks } = req.body;
  const book = db.get(`SELECT * FROM library_books WHERE id = ?`, [bookId]);
  if (!book) return res.status(404).json({ success: false, error: 'Book not found.' });
  if (book.available_copies <= 0) return res.status(400).json({ success: false, error: 'No copies available for issue.' });

  const due = dueDate || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  db.transaction(() => {
    db.run(
      `INSERT INTO library_transactions (book_id, student_id, teacher_id, borrower_type, issue_date, due_date, status, remarks)
       VALUES (?, ?, ?, ?, DATE('now'), ?, 'ISSUED', ?)`,
      [bookId, studentId || null, teacherId || null, borrowerType || 'STUDENT', due, remarks || null]
    );

    db.run(
      `UPDATE library_books SET available_copies = available_copies - 1,
       status = CASE WHEN available_copies - 1 <= 0 THEN 'OUT_OF_STOCK' ELSE 'AVAILABLE' END
       WHERE id = ?`,
      [bookId]
    );
  });

  return res.status(201).json({ success: true, message: `Book '${book.title}' issued successfully until ${due}.` });
});

// POST /api/campus/library/return - Return book
router.post('/library/return', (req, res) => {
  if (req.user.role === 'PARENT') {
    return res.status(403).json({ success: false, error: 'Forbidden: Parents cannot record returns.' });
  }

  const { transactionId } = req.body;
  const trans = db.get(`SELECT * FROM library_transactions WHERE id = ?`, [transactionId]);
  if (!trans || trans.status === 'RETURNED') {
    return res.status(400).json({ success: false, error: 'Invalid or already returned transaction.' });
  }

  db.transaction(() => {
    db.run(`UPDATE library_transactions SET status = 'RETURNED', return_date = DATE('now') WHERE id = ?`, [transactionId]);
    db.run(`UPDATE library_books SET available_copies = available_copies + 1, status = 'AVAILABLE' WHERE id = ?`, [trans.book_id]);
  });

  return res.json({ success: true, message: 'Book returned successfully.' });
});

// ----------------------------------------------------------------------------
// 2. INVENTORY MANAGEMENT
// ----------------------------------------------------------------------------

// GET /api/campus/inventory/items
router.get('/inventory/items', (req, res) => {
  if (req.user.role === 'PARENT') {
    return res.status(403).json({ success: false, error: 'Forbidden: Inventory access restricted.' });
  }

  const items = db.query(`SELECT * FROM inventory_items ORDER BY category ASC, name ASC`);
  return res.json({ success: true, count: items.length, items });
});

// POST /api/campus/inventory/items
router.post('/inventory/items', (req, res) => {
  if (req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ success: false, error: 'Forbidden: Super Admin access required.' });
  }

  const { itemCode, name, category, description, quantityInStock, unit, minStockLevel, unitPrice, supplierName } = req.body;
  if (!itemCode || !name || !category) {
    return res.status(400).json({ success: false, error: 'Item code, name, and category are required.' });
  }

  const qty = parseInt(quantityInStock, 10) || 0;
  const minStock = parseInt(minStockLevel, 10) || 5;
  const status = qty <= 0 ? 'OUT_OF_STOCK' : (qty <= minStock ? 'LOW_STOCK' : 'IN_STOCK');

  const result = db.run(
    `INSERT INTO inventory_items (item_code, name, category, description, quantity_in_stock, unit, min_stock_level, unit_price, supplier_name, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [itemCode.trim(), name.trim(), category.trim(), description || null, qty, unit || 'units', minStock, unitPrice || 0.0, supplierName || null, status]
  );

  return res.status(201).json({ success: true, message: 'Inventory item created.', itemId: result.lastInsertRowid });
});

// ----------------------------------------------------------------------------
// 3. VISITOR MANAGEMENT
// ----------------------------------------------------------------------------

// GET /api/campus/visitors
router.get('/visitors', (req, res) => {
  if (req.user.role === 'PARENT') {
    return res.status(403).json({ success: false, error: 'Forbidden: Visitor log restricted.' });
  }

  const visitors = db.query(`SELECT * FROM visitors ORDER BY entry_time DESC LIMIT 100`);
  return res.json({ success: true, count: visitors.length, visitors });
});

// POST /api/campus/visitors - Check in
router.post('/visitors', (req, res) => {
  if (req.user.role === 'PARENT') {
    return res.status(403).json({ success: false, error: 'Forbidden: Cannot create visitor passes.' });
  }

  const { visitorName, mobile, purpose, whomToMeet, idProofType, idProofNumber } = req.body;
  if (!visitorName || !mobile || !purpose || !whomToMeet) {
    return res.status(400).json({ success: false, error: 'Visitor name, mobile, purpose, and person to meet are required.' });
  }

  const count = db.get(`SELECT COUNT(*) as count FROM visitors`);
  const passNumber = `VIS-2026-${String((count?.count || 0) + 101).padStart(4, '0')}`;

  const result = db.run(
    `INSERT INTO visitors (visitor_name, mobile, purpose, whom_to_meet, pass_number, id_proof_type, id_proof_number, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'CHECKED_IN')`,
    [visitorName.trim(), mobile.trim(), purpose.trim(), whomToMeet.trim(), passNumber, idProofType || 'Aadhar', idProofNumber || null]
  );

  return res.status(201).json({
    success: true,
    message: 'Visitor pass generated.',
    visitor: { id: result.lastInsertRowid, passNumber, visitorName, entryTime: new Date().toISOString() }
  });
});

// PUT /api/campus/visitors/:id/checkout - Check out
router.put('/visitors/:id/checkout', (req, res) => {
  db.run(`UPDATE visitors SET status = 'CHECKED_OUT', exit_time = CURRENT_TIMESTAMP WHERE id = ?`, [req.params.id]);
  return res.json({ success: true, message: 'Visitor marked as checked out.' });
});

// ----------------------------------------------------------------------------
// 4. HOSTEL MANAGEMENT
// ----------------------------------------------------------------------------

// GET /api/campus/hostel
router.get('/hostel', (req, res) => {
  const hostels = db.query(`SELECT * FROM hostels ORDER BY name ASC`);
  const rooms = db.query(`
    SELECT hr.*, h.name as hostel_name, h.type as hostel_type
    FROM hostel_rooms hr
    JOIN hostels h ON hr.hostel_id = h.id
    ORDER BY hr.hostel_id, hr.room_number ASC
  `);
  return res.json({ success: true, hostels, rooms });
});

// GET /api/campus/hostel/allocations
router.get('/hostel/allocations', (req, res) => {
  let sql = `
    SELECT ha.*, hr.room_number, h.name as hostel_name, s.first_name, s.last_name, s.admission_no,
           c.name as class_name, sec.name as section_name
    FROM hostel_allocations ha
    JOIN hostel_rooms hr ON ha.room_id = hr.id
    JOIN hostels h ON hr.hostel_id = h.id
    JOIN students s ON ha.student_id = s.id
    JOIN classes c ON s.class_id = c.id
    JOIN sections sec ON s.section_id = sec.id
    WHERE 1=1
  `;
  const params = [];

  if (req.user.role === 'PARENT') {
    if (!req.parent || !req.parent.students || req.parent.students.length === 0) {
      return res.json({ success: true, allocations: [] });
    }
    const studentIds = req.parent.students.map(s => s.id);
    sql += ` AND ha.student_id IN (${studentIds.join(',')})`;
  }

  sql += ` ORDER BY ha.id DESC`;
  const allocations = db.query(sql, params);
  return res.json({ success: true, count: allocations.length, allocations });
});

// ----------------------------------------------------------------------------
// 5. DIGITAL ID CARDS
// ----------------------------------------------------------------------------

// GET /api/campus/id-cards/:type/:id
router.get('/id-cards/:type/:id', (req, res) => {
  const { type, id } = req.params;

  if (type === 'student') {
    const student = db.get(
      `SELECT s.*, c.name as class_name, sec.name as section_name, ay.name as academic_year
       FROM students s
       JOIN classes c ON s.class_id = c.id
       JOIN sections sec ON s.section_id = sec.id
       LEFT JOIN academic_years ay ON s.academic_year_id = ay.id
       WHERE s.id = ?`,
      [id]
    );

    if (!student) return res.status(404).json({ success: false, error: 'Student not found.' });

    // Parent security check
    if (req.user.role === 'PARENT') {
      const isLinked = req.parent?.students?.some(s => s.id === student.id);
      if (!isLinked) {
        return res.status(403).json({ success: false, error: 'Forbidden: You cannot access ID cards of other students.' });
      }
    }

    return res.json({
      success: true,
      cardType: 'STUDENT_DIGITAL_ID',
      school: 'Rex Senior Secondary School',
      affiliation: 'CBSE Affiliation #1930000',
      idCard: {
        id: student.id,
        name: `${student.first_name} ${student.last_name}`,
        admissionNo: student.admission_no,
        rollNo: student.roll_no,
        classSection: `${student.class_name} - ${student.section_name}`,
        dob: student.dob,
        bloodGroup: student.blood_group || 'O+',
        parentMobile: student.parent_mobile,
        emergencyContact: student.emergency_contact || student.parent_mobile,
        address: student.address || 'Ootacamund, Nilgiris',
        qrPayload: `REX-STU:${student.admission_no}:${student.first_name}_${student.last_name}`,
        barcodeValue: student.admission_no
      }
    });
  } else if (type === 'staff') {
    if (req.user.role === 'PARENT') {
      return res.status(403).json({ success: false, error: 'Forbidden: Staff ID cards restricted.' });
    }

    const teacher = db.get(`SELECT * FROM teachers WHERE id = ?`, [id]);
    if (!teacher) return res.status(404).json({ success: false, error: 'Staff member not found.' });

    return res.json({
      success: true,
      cardType: 'STAFF_DIGITAL_ID',
      school: 'Rex Senior Secondary School',
      idCard: {
        id: teacher.id,
        name: teacher.name,
        employeeId: teacher.employee_id,
        department: teacher.department,
        designation: teacher.qualification ? `Faculty (${teacher.qualification})` : 'Senior Teacher',
        mobile: teacher.mobile,
        email: teacher.email,
        qrPayload: `REX-EMP:${teacher.employee_id}:${teacher.name}`,
        barcodeValue: teacher.employee_id
      }
    });
  }

  return res.status(400).json({ success: false, error: 'Invalid card type. Expected "student" or "staff".' });
});

module.exports = router;
