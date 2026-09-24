import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/app_state.dart';
import 'home_screen.dart';
import 'message_center_screen.dart';
import 'attendance_screen.dart';
import 'fees_screen.dart';
import 'bus_tracker_screen.dart';

class MainNavigationScreen extends StatefulWidget {
  const MainNavigationScreen({super.key});

  @override
  State<MainNavigationScreen> createState() => _MainNavigationScreenState();
}

class _MainNavigationScreenState extends State<MainNavigationScreen> {
  int _currentIndex = 0;

  final List<Widget> _screens = [
    const HomeScreen(),
    const MessageCenterScreen(),
    const AttendanceScreen(),
    const FeesScreen(),
    const BusTrackerScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    final appState = context.watch<AppState>();
    return Scaffold(
      body: IndexedStack(
        index: _currentIndex,
        children: _screens,
      ),
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.1),
              blurRadius: 20,
              offset: const Offset(0, -5),
            ),
          ],
        ),
        child: NavigationBar(
          selectedIndex: _currentIndex,
          onDestinationSelected: (i) => setState(() => _currentIndex = i),
          backgroundColor: Colors.white,
          indicatorColor: const Color(0xFF1A2980).withOpacity(0.12),
          labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
          destinations: [
            const NavigationDestination(
              icon: Icon(Icons.home_outlined),
              selectedIcon: Icon(Icons.home, color: Color(0xFF1A2980)),
              label: 'Home',
            ),
            NavigationDestination(
              icon: Badge(
                isLabelVisible: appState.unreadMessages > 0,
                label: Text('${appState.unreadMessages}'),
                child: const Icon(Icons.message_outlined),
              ),
              selectedIcon: Badge(
                isLabelVisible: appState.unreadMessages > 0,
                label: Text('${appState.unreadMessages}'),
                child: const Icon(Icons.message, color: Color(0xFF1A2980)),
              ),
              label: 'Messages',
            ),
            const NavigationDestination(
              icon: Icon(Icons.people_outline),
              selectedIcon: Icon(Icons.people, color: Color(0xFF1A2980)),
              label: 'Attendance',
            ),
            const NavigationDestination(
              icon: Icon(Icons.account_balance_wallet_outlined),
              selectedIcon: Icon(Icons.account_balance_wallet, color: Color(0xFF1A2980)),
              label: 'Fees',
            ),
            const NavigationDestination(
              icon: Icon(Icons.directions_bus_outlined),
              selectedIcon: Icon(Icons.directions_bus, color: Color(0xFF1A2980)),
              label: 'Bus GPS',
            ),
          ],
        ),
      ),
    );
  }
}
