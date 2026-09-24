# Rex Senior Secondary School ERP & School Bus GPS Tracker (Flutter)

[![Flutter](https://img.shields.io/badge/Flutter-3.x-02569B?logo=flutter)](https://flutter.dev)
[![CBSE Affiliation](https://img.shields.io/badge/CBSE-Affiliation%20%231930000-1E3A8A)](https://cbse.gov.in)
[![Safe Campus](https://img.shields.io/badge/Safe%20Campus-Nilgiris%20Transit-16A34A)](#)

A cross-platform mobile, desktop, and web application built with Flutter for **Rex Senior Secondary School (Christus Rex, Catholic Diocese of Ootacamund, Nilgiris, Tamil Nadu)**.

---

## 🌟 Key Features

### 1. Live School Bus GPS Tracker & 500m Geofencing Alarm
- **Real-Time Nilgiris Route Telematics**: Covers 4 active bus fleets (Coonoor Road, Ooty Town, Lovedale, Kotagiri).
- **Morning vs. Evening Schedules**: Instant toggle between morning pickup runs and evening return runs with dynamic transit milestones.
- **Automated 500-Meter Geofence Alarm**:
  - Triggers visual radar wave animation on `CustomPainter`.
  - Triggers audible alert chime (`SystemSound.play`) and haptic vibration (`HapticFeedback.heavyImpact`).
  - Proximity alert dialog showing *"Bus TN-43-A-2104 is 480 meters away from your stop (Charring Cross Junction)"*.
  - One-tap Driver Call dialer (`url_launcher` `tel:`) and automated WhatsApp message copy.

### 2. Official Digital Student ID Card & Gate Pass
- **CBSE Standard Layout**: Featuring official Rex SSS crest, photo portrait, roll number, blood group, guardian contact, and principal seal.
- **Scannable QR Code**: Powered by `qr_flutter`, encodes student ID, security token, and pickup clearance timestamp.
- **Parent Pickup Verification**: Digital authorization badge for school security personnel at campus departure gates.

### 3. Smart Attendance Register & Absentee Alert Engine
- **RFID Gate Integration**: Real-time roll call with check-in time badges (`08:05 AM RFID Gate A`).
- **Interactive Toggles**: Instant single-tap toggling between *Present*, *Late*, and *Absent*.
- **Emergency Absentee Broadcast**: One-tap automated dispatch of SMS & WhatsApp notifications to guardians of unaccounted students.

### 4. Fee Cashier & Ledger Desk
- **Installment Tracking**: Term II fee realization summary (collected vs. target).
- **Payment Recording**: Support for UPI / GPay, Cash, NetBanking, and Bank Challan.
- **Official Stamped Receipt Voucher**: Breakdown of Tuition, Lab, Smart Classroom, and Bus Transit passes with diocesan seal and print export.

### 5. Official CBSE Grade 10 Marksheet & Performance Card
- **CBSE Format**: Affiliation No. 1930000, School Code 55120.
- **Scholastic Performance Table**: Theory, Internal Assessment, Total Marks, and Letter Grades (A1) across all subjects including Artificial Intelligence.
- **Co-Scholastic & Discipline**: 3-point grading scale with official Class Teacher and Principal digital signature blocks.

### 6. Digital Homework Diary & Online Student Leave Desk
- **Homework Diary**: Interactive subject filter chips (All, Math, Science, English, AI) with completion toggles and homework composer modal.
- **Leave Desk**: Category selector (Medical, Family, Sports), date range pickers, principal approval/rejection audit trail.

### 7. Multi-Role Perspective Switcher
- Switch instantly between **Principal (Administrator)**, **Teacher (Class 10-A)**, and **Parent (Aarav Sharma)** right from the navigation bar.

---

## 📁 Project Architecture

```
rex_school_erp_flutter/
├── assets/
│   └── logo.png                        # Rex Senior Secondary School Emblem
├── pubspec.yaml                        # Dependencies (provider, google_fonts, qr_flutter, url_launcher, intl)
├── web/
│   └── index.html                      # Flutter Web Runner configuration
└── lib/
    ├── main.dart                       # App entry point, MultiProvider & Material 3 Theme
    ├── models/
    │   ├── student.dart                # Student model with attendance & fee calculations
    │   ├── bus_route.dart              # BusRoute, BusSchedule, and BusStop models
    │   ├── homework.dart               # HomeworkItem model
    │   └── leave_request.dart          # LeaveRequest model
    ├── services/
    │   ├── audio_service.dart          # Native audio chime & haptic feedback engine
    │   └── erp_provider.dart           # Global ChangeNotifier state store with Nilgiris seed data
    ├── widgets/
    │   ├── bus_map_painter.dart        # CustomPainter map with route path & 500m radar ring
    │   ├── proximity_alert_dialog.dart # 500m proximity alarm modal with driver dialer
    │   ├── student_id_card.dart        # Digital Student ID with QrImageView gate pass
    │   └── metric_card.dart            # Reusable KPI card with trend indicator
    └── screens/
        ├── main_navigation_screen.dart # Root shell with BottomNavigationBar & Drawer
        ├── dashboard_screen.dart       # Principal pulse dashboard & activity stream
        ├── attendance_screen.dart      # Smart attendance register
        ├── fees_screen.dart            # Fee cashier & stamped receipt modal
        ├── bus_tracker_screen.dart     # Full fleet tracker with 4 Nilgiris routes
        ├── parent_portal_screen.dart   # Parent dashboard, 500m radar, and homework preview
        ├── homework_screen.dart        # Digital homework management
        ├── leave_screen.dart           # Student leave request desk
        └── report_card_screen.dart     # Official CBSE Grade 10 marksheet
```

---

## 🚀 How to Run the App

### Prerequisites
Make sure you have Flutter installed on your computer.

#### Installing Flutter on Windows (if not already installed):
1. Open PowerShell as Administrator and run:
   ```powershell
   winget install Google.Flutter
   ```
2. Or download the Flutter Windows SDK from [flutter.dev/docs/get-started/install/windows](https://flutter.dev/docs/get-started/install/windows) and extract it to `C:\src\flutter`.
3. Add `C:\src\flutter\bin` to your System Environment `PATH`.
4. Verify by opening a new terminal and running:
   ```powershell
   flutter doctor
   ```

---

### Running the App

Navigate to the project directory:
```powershell
cd C:\Users\prave\.gemini\antigravity-ide\scratch\rex_school_erp_flutter
```

#### 1. Fetch Dependencies
```powershell
flutter pub get
```

#### 2. Run on Web (Chrome / Edge)
```powershell
flutter run -d chrome
```

#### 3. Run on Desktop (Windows Native)
```powershell
flutter run -d windows
```

#### 4. Run on Mobile (Android / iOS)
Connect your physical device via USB (or start an Android Emulator) and run:
```powershell
flutter run
```

---

## 🛠️ Testing the 500m Proximity Alarm
1. Open the app and navigate to the **Parent Portal** tab (or select **Parent** from the top role switcher).
2. Tap the blue button: **"Simulate 500m Proximity Alarm"**.
3. You will hear an audible chime, the bus map will display the animated green 500m radar zone, and a proximity modal will pop up with:
   - Distance: **480 Meters Away**
   - Bus details: **Tata Starbus Ultra (TN-43-A-2104)**
   - Driver contact: **Joseph Selvaraj (+91 94432 10045)**
   - Buttons to **Call Driver** or **Copy WhatsApp Alert**.
