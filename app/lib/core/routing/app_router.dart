import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/course_detail/course_detail_screen.dart';
import '../../features/course_detail/student_detail_screen.dart';
import '../../features/history/history_screen.dart';
import '../../features/home/home_screen.dart';
import '../../features/login/login_screen.dart';
import '../../features/results/student_results_screen.dart';
import '../../features/scanner/review_screen.dart';
import '../../features/scanner/scan_flow_screen.dart';
import '../../features/settings/settings_screen.dart';
import '../auth/auth_state.dart';
import '../navigation/app_shell.dart';
import '../splash/splash_screen.dart';

/// Global key for the root navigator (used by go_router).
final _rootNavigatorKey = GlobalKey<NavigatorState>();

/// Listens to [authNotifierProvider] and notifies [GoRouter] to re-evaluate
/// its `redirect` callback whenever the auth state changes.
///
/// This avoids recreating the entire [GoRouter] instance on auth state
/// transitions -- instead go_router re-runs the redirect logic in place.
class _GoRouterAuthRefresh extends ChangeNotifier {
  _GoRouterAuthRefresh(Ref ref) {
    ref.listen<AuthStatus>(authNotifierProvider, (_, __) {
      notifyListeners();
    });
  }
}

/// Riverpod provider for the app-level [GoRouter] instance.
///
/// Configures:
/// - `/splash` as the initial route (entry point).
/// - `/login` for the authentication screen.
/// - A [StatefulShellRoute.indexedStack] for the 3 bottom-nav tabs,
///   preserving each tab's state independently.
/// - [NoTransitionPage] on tab routes to prevent animation on tab switches.
/// - Auth-aware redirect that sends unauthenticated users to `/login` and
///   prevents authenticated users from seeing the login screen.
final goRouterProvider = Provider<GoRouter>((ref) {
  final refreshNotifier = _GoRouterAuthRefresh(ref);

  return GoRouter(
    navigatorKey: _rootNavigatorKey,
    initialLocation: '/splash',
    refreshListenable: refreshNotifier,
    redirect: (context, state) {
      final authStatus = ref.read(authNotifierProvider);
      final isOnSplash = state.matchedLocation == '/splash';
      final isOnLogin = state.matchedLocation == '/login';
      final isAuthenticated = authStatus == AuthStatus.authenticated;

      // Treat anything other than authenticated/unknown as "needs login".
      final needsLogin = authStatus == AuthStatus.unauthenticated ||
          authStatus == AuthStatus.sessionExpired;

      // Let splash handle its own navigation (it checks auth itself).
      if (isOnSplash) return null;

      // If unauthenticated (or session expired) and not on login, redirect.
      if (needsLogin && !isOnLogin) return '/login';

      // If authenticated and on login, redirect to home.
      if (isAuthenticated && isOnLogin) return '/';

      // No redirect needed.
      return null;
    },
    routes: [
      // -- Splash entry point --
      GoRoute(
        path: '/splash',
        builder: (context, state) => const SplashScreen(),
      ),

      // -- Login screen --
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginScreen(),
      ),

      // -- Tab navigation shell --
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) {
          return AppShell(navigationShell: navigationShell);
        },
        branches: [
          // Branch 0: Home tab
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/',
                pageBuilder: (context, state) => const NoTransitionPage(
                  child: HomeScreen(),
                ),
                routes: [
                  GoRoute(
                    path: 'course/:courseId',
                    builder: (context, state) {
                      final courseId = state.pathParameters['courseId']!;
                      return CourseDetailScreen(courseId: courseId);
                    },
                    routes: [
                      GoRoute(
                        path: 'scan',
                        builder: (context, state) {
                          final courseId =
                              state.pathParameters['courseId']!;
                          return ScanFlowScreen(courseId: courseId);
                        },
                        routes: [
                          GoRoute(
                            path: 'review',
                            builder: (context, state) {
                              final courseId =
                                  state.pathParameters['courseId']!;
                              return ReviewScreen(courseId: courseId);
                            },
                          ),
                        ],
                      ),
                      GoRoute(
                        path: 'results',
                        builder: (context, state) {
                          final courseId =
                              state.pathParameters['courseId']!;
                          final studentId =
                              state.uri.queryParameters['studentId'] ??
                                  '';
                          return StudentResultsScreen(
                            courseId: courseId,
                            initialStudentId: studentId,
                          );
                        },
                      ),
                      GoRoute(
                        path: 'student/:studentId',
                        builder: (context, state) {
                          final courseId =
                              state.pathParameters['courseId']!;
                          final studentId =
                              state.pathParameters['studentId']!;
                          return StudentDetailScreen(
                            courseId: courseId,
                            studentId: studentId,
                          );
                        },
                      ),
                    ],
                  ),
                ],
              ),
            ],
          ),

          // Branch 1: History tab
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/history',
                pageBuilder: (context, state) => const NoTransitionPage(
                  child: HistoryScreen(),
                ),
              ),
            ],
          ),

          // Branch 2: Settings tab
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/settings',
                pageBuilder: (context, state) => const NoTransitionPage(
                  child: SettingsScreen(),
                ),
              ),
            ],
          ),
        ],
      ),
    ],
  );
});
