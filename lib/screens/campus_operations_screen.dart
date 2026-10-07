import 'package:flutter/material.dart';
import '../services/api_service.dart';

class CampusOperationsScreen extends StatefulWidget {
  final int initialTab;
  const CampusOperationsScreen({super.key, this.initialTab = 0});

  @override
  State<CampusOperationsScreen> createState() => _CampusOperationsScreenState();
}

class _CampusOperationsScreenState extends State<CampusOperationsScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  // Library State
  List<dynamic> _books = [];
  bool _loadingLibrary = true;

  // Inventory State
  List<dynamic> _inventory = [];
  bool _loadingInventory = true;

  // Visitor State
  List<dynamic> _visitors = [];
  bool _loadingVisitors = true;

  // Hostel State
  List<dynamic> _hostels = [];
  bool _loadingHostels = true;

  // ID Card State
  Map<String, dynamic>? _activeIdCard;
  bool _loadingIdCard = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 5, vsync: this, initialIndex: widget.initialTab);
    _loadAllData();
  }

  void _loadAllData() {
    _fetchLibrary();
    _fetchInventory();
    _fetchVisitors();
    _fetchHostels();
    _fetchIdCard();
  }

  Future<void> _fetchLibrary() async {
    final res = await ApiService.getLibraryBooks();
    if (mounted) {
      setState(() {
        _loadingLibrary = false;
        if (res['success'] == true) _books = res['books'] ?? [];
      });
    }
  }

  Future<void> _fetchInventory() async {
    final res = await ApiService.getInventoryItems();
    if (mounted) {
      setState(() {
        _loadingInventory = false;
        if (res['success'] == true) _inventory = res['items'] ?? [];
      });
    }
  }

  Future<void> _fetchVisitors() async {
    final res = await ApiService.getVisitors();
    if (mounted) {
      setState(() {
        _loadingVisitors = false;
        if (res['success'] == true) _visitors = res['visitors'] ?? [];
      });
    }
  }

  Future<void> _fetchHostels() async {
    final res = await ApiService.getHostels();
    if (mounted) {
      setState(() {
        _loadingHostels = false;
        if (res['success'] == true) _hostels = res['buildings'] ?? [];
      });
    }
  }

  Future<void> _fetchIdCard() async {
    final studentId = ApiService.activeStudent?['id'] ?? 1;
    setState(() => _loadingIdCard = true);
    final res = await ApiService.getStudentIdCard(studentId);
    if (mounted) {
      setState(() {
        _loadingIdCard = false;
        if (res['success'] == true) _activeIdCard = res['idCard'];
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text(
          "Campus Operations Hub",
          style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white, fontSize: 17),
        ),
        backgroundColor: const Color(0xFF1E3A8A),
        iconTheme: const IconThemeData(color: Colors.white),
        bottom: TabBar(
          controller: _tabController,
          isScrollable: true,
          indicatorColor: const Color(0xFFF59E0B),
          indicatorWeight: 3,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white70,
          tabs: const [
            Tab(icon: Icon(Icons.menu_book_rounded, size: 18), text: "Library"),
            Tab(icon: Icon(Icons.inventory_2_rounded, size: 18), text: "Inventory"),
            Tab(icon: Icon(Icons.badge_rounded, size: 18), text: "Visitors"),
            Tab(icon: Icon(Icons.hotel_rounded, size: 18), text: "Hostel"),
            Tab(icon: Icon(Icons.qr_code_2_rounded, size: 18), text: "ID Cards"),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildLibraryTab(),
          _buildInventoryTab(),
          _buildVisitorsTab(),
          _buildHostelTab(),
          _buildIdCardsTab(),
        ],
      ),
    );
  }

  // --------------------------------------------------------------------------
  // 1. Library Tab
  // --------------------------------------------------------------------------
  Widget _buildLibraryTab() {
    if (_loadingLibrary) {
      return const Center(child: CircularProgressIndicator(color: Color(0xFF1E3A8A)));
    }
    return RefreshIndicator(
      onRefresh: _fetchLibrary,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                "Catalog & Book Circulation (${_books.length})",
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Color(0xFF0F172A)),
              ),
              ElevatedButton.icon(
                onPressed: () => _showIssueBookDialog(),
                icon: const Icon(Icons.add, size: 16),
                label: const Text("Issue Book", style: TextStyle(fontSize: 12)),
                style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF1E3A8A), foregroundColor: Colors.white),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ..._books.map((b) => Card(
                margin: const EdgeInsets.only(bottom: 10),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                child: ListTile(
                  leading: CircleAvatar(
                    backgroundColor: const Color(0xFFEEF2FF),
                    child: const Icon(Icons.book, color: Color(0xFF1E3A8A)),
                  ),
                  title: Text(b['title'] ?? '', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                  subtitle: Text(
                    "Author: ${b['author']} • ISBN: ${b['isbn']} • Category: ${b['category']}",
                    style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                  ),
                  trailing: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: (b['availableCopies'] ?? 0) > 0 ? const Color(0xFFDCFCE7) : const Color(0xFFFEE2E2),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      "${b['availableCopies']} / ${b['totalCopies']} Left",
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        color: (b['availableCopies'] ?? 0) > 0 ? const Color(0xFF166534) : const Color(0xFF991B1B),
                      ),
                    ),
                  ),
                ),
              )),
        ],
      ),
    );
  }

  void _showIssueBookDialog() {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text("Scan barcode or select student to issue catalog book.")),
    );
  }

  // --------------------------------------------------------------------------
  // 2. Inventory Tab
  // --------------------------------------------------------------------------
  Widget _buildInventoryTab() {
    if (_loadingInventory) {
      return const Center(child: CircularProgressIndicator(color: Color(0xFF1E3A8A)));
    }
    return RefreshIndicator(
      onRefresh: _fetchInventory,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                "School Stock & Assets (${_inventory.length})",
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Color(0xFF0F172A)),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(color: const Color(0xFFF1F5F9), borderRadius: BorderRadius.circular(8)),
                child: const Text("Track Stock", style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600)),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ..._inventory.map((item) {
            final isLow = (item['quantity'] ?? 0) <= (item['reorderLevel'] ?? 5);
            return Card(
              margin: const EdgeInsets.only(bottom: 10),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              child: ListTile(
                leading: CircleAvatar(
                  backgroundColor: isLow ? const Color(0xFFFEE2E2) : const Color(0xFFF0FDF4),
                  child: Icon(Icons.inventory, color: isLow ? const Color(0xFFDC2626) : const Color(0xFF16A34A)),
                ),
                title: Text(item['name'] ?? '', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                subtitle: Text(
                  "SKU: ${item['itemCode']} • Category: ${item['category']} • Location: ${item['location'] ?? 'Main Store'}",
                  style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                ),
                trailing: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text("${item['quantity']} ${item['unit']}", style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                    if (isLow)
                      const Text("Low Stock Alert", style: TextStyle(fontSize: 9, color: Color(0xFFDC2626), fontWeight: FontWeight.bold)),
                  ],
                ),
              ),
            );
          }),
        ],
      ),
    );
  }

  // --------------------------------------------------------------------------
  // 3. Visitors Tab
  // --------------------------------------------------------------------------
  Widget _buildVisitorsTab() {
    if (_loadingVisitors) {
      return const Center(child: CircularProgressIndicator(color: Color(0xFF1E3A8A)));
    }
    return RefreshIndicator(
      onRefresh: _fetchVisitors,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                "Visitor Gate Register (${_visitors.length})",
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Color(0xFF0F172A)),
              ),
              ElevatedButton.icon(
                onPressed: () => _showNewVisitorDialog(),
                icon: const Icon(Icons.person_add, size: 16),
                label: const Text("New Pass", style: TextStyle(fontSize: 12)),
                style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF1E3A8A), foregroundColor: Colors.white),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ..._visitors.map((v) {
            final isCheckedIn = v['status'] == 'CHECKED_IN';
            return Card(
              margin: const EdgeInsets.only(bottom: 10),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              child: ListTile(
                leading: CircleAvatar(
                  backgroundColor: isCheckedIn ? const Color(0xFFDCFCE7) : const Color(0xFFF1F5F9),
                  child: Icon(Icons.person_pin, color: isCheckedIn ? const Color(0xFF16A34A) : const Color(0xFF64748B)),
                ),
                title: Text(v['name'] ?? '', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                subtitle: Text(
                  "Pass: ${v['passNumber']} • To Meet: ${v['whomToMeet']} (${v['purpose']})\nIn: ${v['inTime'] ?? ''}",
                  style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                ),
                trailing: isCheckedIn
                    ? ElevatedButton(
                        onPressed: () async {
                          await ApiService.checkoutVisitor(v['id']);
                          _fetchVisitors();
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFFDC2626),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          minimumSize: Size.zero,
                        ),
                        child: const Text("Check Out", style: TextStyle(fontSize: 10)),
                      )
                    : Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(color: const Color(0xFFF1F5F9), borderRadius: BorderRadius.circular(6)),
                        child: const Text("Exited", style: TextStyle(fontSize: 10, color: Color(0xFF64748B))),
                      ),
              ),
            );
          }),
        ],
      ),
    );
  }

  void _showNewVisitorDialog() {
    final nameCtrl = TextEditingController();
    final mobileCtrl = TextEditingController();
    final meetCtrl = TextEditingController();
    final purposeCtrl = TextEditingController();

    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text("Register Campus Visitor", style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(controller: nameCtrl, decoration: const InputDecoration(labelText: "Visitor Name")),
            TextField(controller: mobileCtrl, decoration: const InputDecoration(labelText: "Mobile Number")),
            TextField(controller: meetCtrl, decoration: const InputDecoration(labelText: "Whom To Meet")),
            TextField(controller: purposeCtrl, decoration: const InputDecoration(labelText: "Purpose")),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text("Cancel")),
          ElevatedButton(
            onPressed: () async {
              if (nameCtrl.text.isEmpty || mobileCtrl.text.isEmpty) return;
              await ApiService.registerVisitor({
                'name': nameCtrl.text.trim(),
                'mobile': mobileCtrl.text.trim(),
                'whomToMeet': meetCtrl.text.trim(),
                'purpose': purposeCtrl.text.trim(),
              });
              Navigator.pop(context);
              _fetchVisitors();
            },
            child: const Text("Issue Pass"),
          ),
        ],
      ),
    );
  }

  // --------------------------------------------------------------------------
  // 4. Hostel Tab
  // --------------------------------------------------------------------------
  Widget _buildHostelTab() {
    if (_loadingHostels) {
      return const Center(child: CircularProgressIndicator(color: Color(0xFF1E3A8A)));
    }
    return RefreshIndicator(
      onRefresh: _fetchHostels,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text(
            "Hostel Infrastructure (${_hostels.length} Buildings)",
            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Color(0xFF0F172A)),
          ),
          const SizedBox(height: 12),
          ..._hostels.map((h) => Card(
                margin: const EdgeInsets.only(bottom: 12),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(h['name'] ?? '', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(color: const Color(0xFFEEF2FF), borderRadius: BorderRadius.circular(8)),
                            child: Text(h['type'] ?? 'BOYS', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF1E3A8A))),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Text("Warden: ${h['wardenName']} • Contact: ${h['wardenContact']}", style: const TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                      const Divider(height: 20),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceAround,
                        children: [
                          _buildHostelStat("Total Rooms", "${h['totalRooms'] ?? 0}"),
                          _buildHostelStat("Capacity", "${h['capacity'] ?? 0} Beds"),
                          _buildHostelStat("Occupancy", "${h['currentOccupancy'] ?? 0} Boarders"),
                        ],
                      ),
                    ],
                  ),
                ),
              )),
        ],
      ),
    );
  }

  Widget _buildHostelStat(String label, String value) {
    return Column(
      children: [
        Text(value, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF0F172A))),
        const SizedBox(height: 2),
        Text(label, style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
      ],
    );
  }

  // --------------------------------------------------------------------------
  // 5. ID Cards Tab
  // --------------------------------------------------------------------------
  Widget _buildIdCardsTab() {
    if (_loadingIdCard) {
      return const Center(child: CircularProgressIndicator(color: Color(0xFF1E3A8A)));
    }
    final card = _activeIdCard;
    if (card == null) {
      return const Center(child: Text("No ID Card generated for current student."));
    }

    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Container(
          width: 320,
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [Color(0xFF1E3A8A), Color(0xFF172554)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(20),
            boxShadow: [
              BoxShadow(color: Colors.black.withOpacity(0.2), blurRadius: 16, offset: const Offset(0, 6)),
            ],
          ),
          child: Column(
            children: [
              // Header
              const Text(
                "CHRISTUS REX SR. SEC. SCHOOL",
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFFF59E0B), letterSpacing: 0.8),
              ),
              const Text("Ootacamund, Nilgiris • CBSE", style: TextStyle(fontSize: 9, color: Colors.white70)),
              const SizedBox(height: 16),

              // Photo & QR
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  CircleAvatar(
                    radius: 38,
                    backgroundColor: Colors.white,
                    child: CircleAvatar(
                      radius: 35,
                      backgroundColor: const Color(0xFFE2E8F0),
                      child: const Icon(Icons.person, size: 45, color: Color(0xFF1E3A8A)),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),

              Text(
                card['studentName'] ?? '',
                style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold, color: Colors.white),
              ),
              const SizedBox(height: 4),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(color: const Color(0xFFF59E0B), borderRadius: BorderRadius.circular(12)),
                child: Text(
                  "Adm No: ${card['admissionNo']}",
                  style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                ),
              ),
              const SizedBox(height: 14),

              _buildIdCardRow("Class & Section", "${card['class']} - ${card['section']}"),
              _buildIdCardRow("Emergency Contact", "${card['emergencyContact']}"),
              _buildIdCardRow("Valid Through", "${card['validAcademicYear']}"),
              const SizedBox(height: 14),

              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12)),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: const [
                    Icon(Icons.qr_code, size: 28, color: Color(0xFF1E3A8A)),
                    SizedBox(width: 8),
                    Text("Digital Verified Identity", style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF1E3A8A))),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildIdCardRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(fontSize: 11, color: Colors.white70)),
          Text(value, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.white)),
        ],
      ),
    );
  }
}
