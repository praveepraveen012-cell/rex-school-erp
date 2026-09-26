import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/erp_provider.dart';
import '../services/api_service.dart';
import 'dashboards/super_admin_dashboard_view.dart';
import 'dashboards/teacher_dashboard_view.dart';
import 'dashboards/parent_dashboard_view.dart';

/// Central Role-Based Dashboard Router
/// Instantly renders the role-tailored dashboard:
/// - SUPER ADMIN -> SuperAdminDashboardView
/// - TEACHER     -> TeacherDashboardView
/// - PARENT      -> ParentDashboardView
class DashboardScreen extends StatelessWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final erp = Provider.of<ERPProvider>(context);
    final role = ApiService.activeRole.toUpperCase();
    final erpRole = erp.currentRole.toLowerCase();

    if (role == 'SUPER_ADMIN' || erpRole == 'admin') {
      return const SuperAdminDashboardView();
    } else if (role == 'TEACHER' || erpRole == 'teacher') {
      return const TeacherDashboardView();
    } else {
      return const ParentDashboardView();
    }
  }
}
