import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../auth/auth_state.dart';
import '../theme/app_colors.dart';

/// Branded splash screen shown on app launch.
///
/// Displays "Graider" with a fade-in animation, checks for a persisted JWT,
/// then navigates to the dashboard (authenticated) or login screen
/// (unauthenticated).
class SplashScreen extends ConsumerStatefulWidget {
  const SplashScreen({super.key});

  @override
  ConsumerState<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends ConsumerState<SplashScreen>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final Animation<double> _fadeAnimation;
  bool _navigated = false;

  @override
  void initState() {
    super.initState();

    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    );

    _fadeAnimation = CurvedAnimation(
      parent: _controller,
      curve: Curves.easeIn,
    );

    // Start fade-in after a brief pause.
    Future.delayed(const Duration(milliseconds: 200), () {
      if (mounted) _controller.forward();
    });

    // Check auth and navigate accordingly.
    _checkAuthAndNavigate();
  }

  /// Wait for splash animation to show briefly, then check JWT and route.
  Future<void> _checkAuthAndNavigate() async {
    // Minimum splash display time (1.5s).
    await Future.delayed(const Duration(milliseconds: 1500));
    if (!mounted) return;

    await ref.read(authNotifierProvider.notifier).checkSession();
    if (!mounted) return;

    final authStatus = ref.read(authNotifierProvider);
    if (_navigated) return;
    _navigated = true;

    if (authStatus == AuthStatus.authenticated) {
      context.go('/'); // Go to dashboard (home tab).
    } else {
      context.go('/login'); // Go to login screen.
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: Center(
        child: FadeTransition(
          opacity: _fadeAnimation,
          child: const Text(
            'Graider',
            style: TextStyle(
              color: AppColors.onBackground,
              fontSize: 36,
              fontWeight: FontWeight.bold,
              letterSpacing: 1.5,
            ),
          ),
        ),
      ),
    );
  }
}
