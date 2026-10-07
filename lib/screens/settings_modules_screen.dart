import 'package:flutter/material.dart';
import '../services/api_service.dart';

class SettingsModulesScreen extends StatefulWidget {
  const SettingsModulesScreen({super.key});

  @override
  State<SettingsModulesScreen> createState() => _SettingsModulesScreenState();
}

class _SettingsModulesScreenState extends State<SettingsModulesScreen> {
  Map<String, dynamic> _modules = {
    'module_library': true,
    'module_hostel': true,
    'module_transport': true,
    'module_inventory': true,
    'module_hr': true,
    'module_payroll': true,
    'module_ai': true,
    'module_exams': true,
  };
  List<dynamic> _campuses = [];
  bool _isLoading = true;
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    _fetchSettings();
  }

  Future<void> _fetchSettings() async {
    final res = await ApiService.getModuleSettings();
    if (mounted) {
      setState(() {
        _isLoading = false;
        if (res['success'] == true) {
          if (res['modules'] != null) {
            _modules = Map<String, dynamic>.from(res['modules']);
          }
          if (res['campuses'] != null) {
            _campuses = res['campuses'];
          }
        }
      });
    }
  }

  Future<void> _toggleModule(String key, bool val) async {
    setState(() {
      _modules[key] = val;
      _isSaving = true;
    });
    await ApiService.updateModuleSettings(_modules);
    if (mounted) {
      setState(() => _isSaving = false);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Module settings saved & updated instantly.")),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text(
          "Configurable Modules & Campus",
          style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white, fontSize: 16),
        ),
        backgroundColor: const Color(0xFF1E3A8A),
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF1E3A8A)))
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                const Text(
                  "Platform Modular Architecture",
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                ),
                const SizedBox(height: 4),
                const Text(
                  "Enable or disable entire functional modules according to institution requirements.",
                  style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                ),
                const SizedBox(height: 16),
                Card(
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  child: Column(
                    children: [
                      _buildModuleSwitch("AI School Intelligence", "module_ai", Icons.auto_awesome, "Principal, Teacher & Parent AI Copilots"),
                      const Divider(height: 1),
                      _buildModuleSwitch("Library Management", "module_library", Icons.menu_book, "Catalog, barcode circulation & book dues"),
                      const Divider(height: 1),
                      _buildModuleSwitch("Campus Inventory", "module_inventory", Icons.inventory_2, "Stock levels, replenishment alerts & requisitions"),
                      const Divider(height: 1),
                      _buildModuleSwitch("Hostel Management", "module_hostel", Icons.hotel, "Dormitories, room capacity & boarding roster"),
                      const Divider(height: 1),
                      _buildModuleSwitch("GPS Fleet & Transport", "module_transport", Icons.directions_bus, "Live bus telematics, stop geofences & parent tracking"),
                      const Divider(height: 1),
                      _buildModuleSwitch("HR & Staff Operations", "module_hr", Icons.people_alt, "Faculty biometric attendance & leave approvals"),
                      const Divider(height: 1),
                      _buildModuleSwitch("Automated Payroll", "module_payroll", Icons.payments, "Configurable allowances, deductions & digital payslips"),
                      const Divider(height: 1),
                      _buildModuleSwitch("Online Assessments", "module_exams", Icons.quiz, "Question bank, term examinations & online tests"),
                    ],
                  ),
                ),
                const SizedBox(height: 24),
                const Text(
                  "Multi-Campus & Tenant Hierarchy",
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                ),
                const SizedBox(height: 4),
                const Text(
                  "Strict data isolation across diocesan schools and institutional campuses.",
                  style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                ),
                const SizedBox(height: 12),
                ..._campuses.map((c) => Card(
                      margin: const EdgeInsets.only(bottom: 10),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      child: ListTile(
                        leading: const CircleAvatar(
                          backgroundColor: Color(0xFFEEF2FF),
                          child: Icon(Icons.apartment, color: Color(0xFF1E3A8A)),
                        ),
                        title: Text(c['name'] ?? '', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                        subtitle: Text("Code: ${c['code']} • City: ${c['city'] ?? 'Ooty'}", style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                        trailing: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(color: const Color(0xFFDCFCE7), borderRadius: BorderRadius.circular(6)),
                          child: const Text("Active Campus", style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF166534))),
                        ),
                      ),
                    )),
              ],
            ),
    );
  }

  Widget _buildModuleSwitch(String title, String key, IconData icon, String subtitle) {
    final isEnabled = _modules[key] == true || _modules[key] == 1 || _modules[key] == 'true';
    return SwitchListTile(
      value: isEnabled,
      onChanged: (val) => _toggleModule(key, val),
      activeColor: const Color(0xFF1E3A8A),
      secondary: CircleAvatar(
        backgroundColor: isEnabled ? const Color(0xFFEEF2FF) : const Color(0xFFF1F5F9),
        child: Icon(icon, color: isEnabled ? const Color(0xFF1E3A8A) : const Color(0xFF94A3B8), size: 20),
      ),
      title: Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
      subtitle: Text(subtitle, style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
    );
  }
}
