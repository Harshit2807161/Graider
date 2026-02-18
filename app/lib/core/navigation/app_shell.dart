import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

/// Navigation shell wrapping tab content with a bottom [NavigationBar].
///
/// Receives the [StatefulNavigationShell] child from go_router's
/// [StatefulShellRoute] and renders it inside a [Scaffold] with
/// a 3-destination bottom navigation bar (Home, History, Settings).
///
/// Theme styling (indicator pill, colors, label behavior) is inherited
/// from [AppTheme.darkTheme]'s `navigationBarTheme`.
class AppShell extends StatelessWidget {
  const AppShell({
    required this.navigationShell,
    super.key,
  });

  /// The navigation shell child provided by [StatefulShellRoute].
  final StatefulNavigationShell navigationShell;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: navigationShell,
      bottomNavigationBar: NavigationBar(
        selectedIndex: navigationShell.currentIndex,
        onDestinationSelected: (index) => navigationShell.goBranch(index),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.home_outlined),
            selectedIcon: Icon(Icons.home),
            label: 'Home',
          ),
          NavigationDestination(
            icon: Icon(Icons.history_outlined),
            selectedIcon: Icon(Icons.history),
            label: 'History',
          ),
          NavigationDestination(
            icon: Icon(Icons.settings_outlined),
            selectedIcon: Icon(Icons.settings),
            label: 'Settings',
          ),
        ],
      ),
    );
  }
}
