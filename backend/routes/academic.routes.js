const express = require('express');
const router = express.Router();
const db = require('../database/db');
const authenticate = require('../middleware/auth');
const auditService = require('../services/auditService');

router.use(authenticate);

// ----------------------------------------------------------------------------
// 1. QUESTION BANK
// ----------------------------------------------------------------------------

// GET /api/academic/questions - List question bank items
router.get('/questions', (req, res) => {
  const { subjectId, classId, difficulty, questionType } = req.query;
  let sql = `
    SELECT qb.*, s.name as subject_name, c.name as class_name, t.name as teacher_name
    FROM question_bank qb
    JOIN subjects s ON qb.subject_id = s.id
    JOIN classes c ON qb.class_id = c.id
    LEFT JOIN teachers t ON qb.created_by_teacher_id = t.id
    WHERE 1=1
  `;
  const params = [];

  if (subjectId) {
    sql += ` AND qb.subject_id = ?`;
    params.push(subjectId);
  }
  if (classId) {
    sql += ` AND qb.class_id = ?`;
    params.push(classId);
  }
  if (difficulty) {
    sql += ` AND qb.difficulty = ?`;
    params.push(difficulty.toUpperCase());
  }
  if (questionType) {
    sql += ` AND qb.question_type = ?`;
    params.push(questionType.toUpperCase());
  }

  sql += ` ORDER BY qb.id DESC`;
  const questions = db.query(sql, params).map(q => ({
    ...q,
    options: q.options_json ? JSON.parse(q.options_json) : []
  }));

  return res.json({ success: true, count: questions.length, questions });
});

// POST /api/academic/questions - Add question to bank
router.post('/questions', (req, res) => {
  if (req.user.role === 'PARENT') {
    return res.status(403).json({ success: false, error: 'Forbidden: Parents cannot create questions.' });
  }

  const { subjectId, classId, questionType, difficulty, questionText, options, correctAnswer, explanation, marks } = req.body;
  if (!subjectId || !classId || !questionText || !correctAnswer) {
    return res.status(400).json({ success: false, error: 'Subject, class, question text, and correct answer are required.' });
  }

  const teacherId = req.teacher ? req.teacher.id : null;
  const result = db.run(
    `INSERT INTO question_bank (
      subject_id, class_id, question_type, difficulty, question_text,
      options_json, correct_answer, explanation, marks, created_by_teacher_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      subjectId,
      classId,
      questionType || 'MCQ',
      difficulty || 'MEDIUM',
      questionText.trim(),
      options ? JSON.stringify(options) : '[]',
      correctAnswer.trim(),
      explanation || null,
      marks || 1.0,
      teacherId
    ]
  );

  return res.status(201).json({
    success: true,
    message: 'Question added to Question Bank.',
    questionId: result.lastInsertRowid
  });
});

// DELETE /api/academic/questions/:id - Delete question
router.delete('/questions/:id', (req, res) => {
  if (req.user.role === 'PARENT') {
    return res.status(403).json({ success: false, error: 'Forbidden: Parents cannot delete questions.' });
  }

  db.run(`DELETE FROM question_bank WHERE id = ?`, [req.params.id]);
  return res.json({ success: true, message: 'Question removed from Question Bank.' });
});

// ----------------------------------------------------------------------------
// 2. EXAMINATIONS & ASSESSMENTS
// ----------------------------------------------------------------------------

// GET /api/academic/exams - List exams
router.get('/exams', (req, res) => {
  let sql = `
    SELECT e.*, c.name as class_name, s.name as subject_name,
           (SELECT COUNT(*) FROM exam_questions eq WHERE eq.exam_id = e.id) as question_count
    FROM exams e
    JOIN classes c ON e.class_id = c.id
    JOIN subjects s ON e.subject_id = s.id
    WHERE 1=1
  `;
  const params = [];

  // Scoping: If parent, restrict to child's class
  if (req.user.role === 'PARENT') {
    if (!req.parent || !req.parent.students || req.parent.students.length === 0) {
      return res.json({ success: true, exams: [] });
    }
    const studentClassIds = req.parent.students.map(s => s.class_id);
    sql += ` AND e.class_id IN (${studentClassIds.join(',')}) AND e.status IN ('SCHEDULED', 'PUBLISHED')`;
  } else if (req.query.classId) {
    sql += ` AND e.class_id = ?`;
    params.push(req.query.classId);
  }

  sql += ` ORDER BY e.exam_date DESC, e.start_time ASC`;
  const exams = db.query(sql, params);

  return res.json({ success: true, count: exams.length, exams });
});

// POST /api/academic/exams - Create an exam (optionally pull questions from bank)
router.post('/exams', (req, res) => {
  if (req.user.role === 'PARENT') {
    return res.status(403).json({ success: false, error: 'Forbidden: Parents cannot schedule examinations.' });
  }

  const { title, examType, classId, subjectId, examDate, startTime, endTime, durationMinutes, totalMarks, passingMarks, questions } = req.body;
  if (!title || !classId || !subjectId || !examDate) {
    return res.status(400).json({ success: false, error: 'Title, class, subject, and exam date are required.' });
  }

  const examRes = db.run(
    `INSERT INTO exams (
      title, exam_type, class_id, subject_id, exam_date,
      start_time, end_time, duration_minutes, total_marks, passing_marks, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      title.trim(),
      examType || 'FORMATIVE',
      classId,
      subjectId,
      examDate,
      startTime || '09:30 AM',
      endTime || '11:00 AM',
      durationMinutes || 90,
      totalMarks || 100,
      passingMarks || 40,
      req.user.id
    ]
  );

  const examId = examRes.lastInsertRowid;

  // Insert questions if provided
  if (Array.isArray(questions) && questions.length > 0) {
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      db.run(
        `INSERT INTO exam_questions (exam_id, question_id, question_text, question_type, options_json, correct_answer, marks, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          examId,
          q.questionId || null,
          q.questionText,
          q.questionType || 'MCQ',
          q.options ? JSON.stringify(q.options) : '[]',
          q.correctAnswer || null,
          q.marks || 1.0,
          i + 1
        ]
      );
    }
  }

  return res.status(201).json({
    success: true,
    message: 'Examination scheduled successfully.',
    examId
  });
});

// GET /api/academic/exams/:id/results - Get exam results with role isolation
router.get('/exams/:id/results', (req, res) => {
  const exam = db.get(`SELECT * FROM exams WHERE id = ?`, [req.params.id]);
  if (!exam) {
    return res.status(404).json({ success: false, error: 'Exam not found.' });
  }

  let sql = `
    SELECT er.*, s.first_name, s.last_name, s.admission_no, s.roll_no,
           c.name as class_name, sec.name as section_name
    FROM exam_results er
    JOIN students s ON er.student_id = s.id
    JOIN classes c ON s.class_id = c.id
    JOIN sections sec ON s.section_id = sec.id
    WHERE er.exam_id = ?
  `;
  const params = [req.params.id];

  // Parent isolation: Parent can only view their active linked student's result
  if (req.user.role === 'PARENT') {
    if (!req.parent || !req.parent.students || req.parent.students.length === 0) {
      return res.status(403).json({ success: false, error: 'Forbidden: No linked children found.' });
    }
    const studentIds = req.parent.students.map(s => s.id);
    sql += ` AND er.student_id IN (${studentIds.join(',')})`;
  }

  sql += ` ORDER BY er.marks_obtained DESC`;
  const results = db.query(sql, params);

  return res.json({ success: true, examTitle: exam.title, totalMarks: exam.total_marks, results });
});

// POST /api/academic/exams/:id/results - Enter student marks
router.post('/exams/:id/results', (req, res) => {
  if (req.user.role === 'PARENT') {
    return res.status(403).json({ success: false, error: 'Forbidden: Parents cannot enter marks.' });
  }

  const { studentId, marksObtained, remarks } = req.body;
  if (!studentId || marksObtained === undefined) {
    return res.status(400).json({ success: false, error: 'Student ID and marks obtained are required.' });
  }

  const exam = db.get(`SELECT * FROM exams WHERE id = ?`, [req.params.id]);
  if (!exam) {
    return res.status(404).json({ success: false, error: 'Exam not found.' });
  }

  const maxMarks = exam.total_marks || 100;
  const percentage = Math.round(((marksObtained / maxMarks) * 100) * 10) / 10;
  
  // Grade calculation
  let grade = 'E';
  if (percentage >= 91) grade = 'A1';
  else if (percentage >= 81) grade = 'A2';
  else if (percentage >= 71) grade = 'B1';
  else if (percentage >= 61) grade = 'B2';
  else if (percentage >= 51) grade = 'C1';
  else if (percentage >= 41) grade = 'C2';
  else if (percentage >= 33) grade = 'D';

  const passStatus = marksObtained >= (exam.passing_marks || 33) ? 'PASS' : 'FAIL';

  db.run(
    `INSERT INTO exam_results (exam_id, student_id, marks_obtained, max_marks, percentage, grade, pass_status, remarks, evaluated_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(exam_id, student_id) DO UPDATE SET
       marks_obtained = excluded.marks_obtained,
       percentage = excluded.percentage,
       grade = excluded.grade,
       pass_status = excluded.pass_status,
       remarks = excluded.remarks,
       evaluated_at = CURRENT_TIMESTAMP`,
    [req.params.id, studentId, marksObtained, maxMarks, percentage, grade, passStatus, remarks || null, req.user.id]
  );

  return res.json({
    success: true,
    message: 'Student marks and grade recorded.',
    evaluation: { marksObtained, maxMarks, percentage, grade, passStatus }
  });
});

module.exports = router;
