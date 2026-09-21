# 🏫 Rex Senior Secondary School - ERP & Management Portal

> **Christus Rex Senior Secondary School, Ootacamund (Ooty), The Nilgiris, Tamil Nadu**  
> *Affiliated to CBSE, New Delhi (Affiliation No: 1930142) • Virtus Scientia Character*

A modern, fast, and interactive School Management & ERP web application designed for administrators, faculty, parents, and scholars.

---

## ✨ Features

- **🏛️ Executive Dashboard (Rex SSS Pulse)**: Live KPI analytics, 7-day attendance trend SVG line chart, Q2 fee recovery donut chart, quick action shortcuts, and real-time operational log.
- **👨‍🎓 Student Information System (SIS 360°)**: Search, multi-grade filters, Table and Grid views, and comprehensive **360° Scholar Profile Drawer** with a 30-day interactive attendance heatmap and financial balance ledger.
- **📅 Smart Attendance Manager**: Grade & section selector, fast keyboard shortcuts, one-click **"Mark All Present"**, and **WhatsApp Absentee Alert Dispatcher** to instantly queue alerts for parents.
- **💳 Fee Management & Cashier Counter**: Due tracking, student search, Cashier Modal with dynamic UPI / QR code simulation, Card, NetBanking, and **Instant Official A4 Printable Stamped Fee Receipts**.
- **📊 Examination & CBSE Report Cards**: Marks entry matrix, 9-point CBSE grading scale, and **CBSE Progress Report Card Generator** complete with scholastic marks, co-scholastic grading, teacher remarks, and Rev. Fr. Principal signature stamp.
- **🗓️ Class Timetable & Substitution Assistant**: Weekly schedule grid (Monday to Saturday, Periods 1 to 8) with color-coded subjects and automated substitute teacher assignment with conflict avoidance.
- **📱 Notice Board & WhatsApp Broadcast Simulator**: Nilgiris weather advisories, circular composer, and an interactive smartphone preview rendering official WhatsApp template messages with dynamic student placeholders.
- **👥 Multi-Stakeholder Role Simulator**: Switch perspectives between:
  - **Principal / Super Admin**
  - **Class Teacher (Grade 10-A Mentor)**
  - **Parent (Aarav Sharma - Grade 10-A)** featuring live school bus GPS tracking on the Coonoor-Ooty route and daily digital diary.
- **🌙 Dark / Light Mode**: Smooth theme transitions with persistent user preferences stored in `localStorage`.

---

## 🚀 Running Locally

No external database or complex build setup required! The app runs cleanly on modern browsers with zero external npm dependencies.

1. **Clone the repository**:
   ```bash
   git clone https://github.com/<your-username>/rex-school-erp.git
   cd rex-school-erp
   ```

2. **Start the local server**:
   ```bash
   node server.js
   ```
   *(or double-click `index.html` to open directly in your browser)*

3. **Open in browser**:
   ```
   http://localhost:3000
   ```

---

## 🌐 Deploying to GitHub Pages (Share with Anyone!)

Because this application uses standard client-side HTML5, CSS3, and modern JavaScript with `localStorage` persistence, you can deploy it directly onto **GitHub Pages** in under 1 minute for free:

1. Create a new public repository on [GitHub](https://github.com/new) named `rex-school-erp`.
2. Push your code:
   ```bash
   git remote add origin https://github.com/<your-username>/rex-school-erp.git
   git branch -M main
   git push -u origin main
   ```
3. In your GitHub repository:
   - Go to **Settings** > **Pages** (in the left sidebar).
   - Under **Build and deployment** > **Source**, select **Deploy from a branch**.
   - Under **Branch**, select `main` and `/ (root)`.
   - Click **Save**.
4. Your live link will be ready at:
   ```
   https://<your-username>.github.io/rex-school-erp/
   ```

---

## 📁 Project Structure

```
├── assets/
│   └── logo.png              # Christus Rex Senior Secondary School crest logo
├── css/
│   ├── design-system.css     # Theme tokens, dark/light variables, typography
│   ├── layout.css            # App shell, sidebar, topbar, responsive layout
│   ├── components.css        # Buttons, cards, badges, modals, drawers, toasts
│   ├── modules.css           # Module-specific styles (SIS, Attendance, Fees, WhatsApp)
│   └── print.css             # Official print CSS for receipts and report cards
├── js/
│   ├── data.js               # Seed datasets, school info, and localStorage repository
│   ├── app.js                # App router, role switcher, theme manager, toasts
│   ├── dashboard.js          # KPI metrics calculation and SVG charts
│   ├── students.js           # SIS directory, filters, 360 profile drawer
│   ├── attendance.js         # Daily attendance matrix & absentee alert queue
│   ├── fees.js               # Fee management, cashier, and receipt generator
│   ├── exams.js              # Exam marks, CBSE grading, report card modal
│   ├── timetable.js          # Weekly timetable grid & teacher substitution
│   └── communication.js      # Notice board & WhatsApp broadcast simulator
├── index.html                # Single Page Application entry point
├── package.json              # NPM manifest
├── server.js                 # Zero-dependency Node.js HTTP server
└── README.md
```

---

## 📜 License & Accreditation
Built for **Christus Rex Senior Secondary School, Ootacamund**.
All rights reserved.
