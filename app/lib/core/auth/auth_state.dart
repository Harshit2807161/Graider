import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../network/api_client.dart';
import '../network/api_interceptors.dart';
import 'auth_repository.dart';

/// Possible authentication states for the app.
enum AuthStatus {
  /// User is authenticated with a valid JWT.
  authenticated,

  /// User is not authenticated (no token or explicitly logged out).
  unauthenticated,

  /// An auth operation (login, session check) is in progress.
  loading,

  /// Initial state before the first session check has completed.
  unknown,

  /// A 401 response was received -- token expired server-side.
  ///
  /// Treated like [unauthenticated] for routing purposes, but the login
  /// screen shows a "Session expired" dialog before resetting to
  /// [unauthenticated].
  sessionExpired,
}

/// Manages authentication state and coordinates between [AuthRepository]
/// (data layer) and [AuthInterceptor] (network layer).
///
/// Exposes [login], [logout], [checkSession], and [onSessionExpired] for
/// the login screen, settings screen, splash screen, and 401 handler
/// respectively.
class AuthNotifier extends StateNotifier<AuthStatus> {
  AuthNotifier({
    required AuthRepository authRepository,
    required AuthInterceptor authInterceptor,
  })  : _authRepository = authRepository,
        _authInterceptor = authInterceptor,
        super(AuthStatus.unknown) {
    // Wire 401 callback so the interceptor can trigger session expiry.
    _authInterceptor.onSessionExpired = _handleSessionExpired;
  }

  final AuthRepository _authRepository;
  final AuthInterceptor _authInterceptor;

  /// Called by [AuthInterceptor] when a 401 is received.
  ///
  /// Only triggers if currently authenticated (avoids duplicate handling
  /// when multiple 401s arrive simultaneously).
  void _handleSessionExpired() {
    if (state == AuthStatus.authenticated) {
      onSessionExpired();
    }
  }

  /// Check for a persisted JWT at app start.
  ///
  /// Called from the splash screen. If a valid token exists, the user is
  /// routed directly to the dashboard; otherwise they land on the login screen.
  Future<void> checkSession() async {
    state = AuthStatus.loading;

    final token = await _authRepository.getStoredToken();

    if (token != null && token.isNotEmpty) {
      _authInterceptor.setToken(token);
      state = AuthStatus.authenticated;
    } else {
      state = AuthStatus.unauthenticated;
    }
  }

  /// Authenticate with [email] and [password].
  ///
  /// On success: wires the JWT into the auth interceptor and transitions to
  /// [AuthStatus.authenticated]. On failure: reverts to
  /// [AuthStatus.unauthenticated] and rethrows so the login screen can
  /// display a user-facing error.
  Future<void> login(String email, String password) async {
    state = AuthStatus.loading;

    try {
      final token = await _authRepository.login(email, password);
      _authInterceptor.setToken(token);
      state = AuthStatus.authenticated;
    } catch (_) {
      state = AuthStatus.unauthenticated;
      rethrow;
    }
  }

  /// Log the user out.
  ///
  /// Clears the interceptor token and removes the JWT from secure storage.
  /// The email is kept for pre-fill on next login (per user decision).
  Future<void> logout() async {
    _authInterceptor.setToken(null);
    await _authRepository.clearToken();
    state = AuthStatus.unauthenticated;
  }

  /// Handle a 401 response received mid-use (token expired server-side).
  ///
  /// Clears the token from both the interceptor and secure storage, then
  /// transitions to [AuthStatus.sessionExpired]. The router treats this the
  /// same as [AuthStatus.unauthenticated] (redirects to `/login`), but the
  /// login screen detects the `sessionExpired` status and shows a dialog
  /// before resetting to [AuthStatus.unauthenticated].
  Future<void> onSessionExpired() async {
    _authInterceptor.setToken(null);
    await _authRepository.clearToken();
    state = AuthStatus.sessionExpired;
  }

  /// Reset the expired flag after the login screen has shown the dialog.
  ///
  /// Transitions from [AuthStatus.sessionExpired] to
  /// [AuthStatus.unauthenticated] so normal login flow can proceed.
  void clearExpiredFlag() {
    if (state == AuthStatus.sessionExpired) {
      state = AuthStatus.unauthenticated;
    }
  }
}

/// Provides the [AuthNotifier] and its current [AuthStatus].
///
/// Usage:
/// - Read state: `ref.watch(authNotifierProvider)` returns [AuthStatus]
/// - Call methods: `ref.read(authNotifierProvider.notifier).login(email, pw)`
final authNotifierProvider =
    StateNotifierProvider<AuthNotifier, AuthStatus>((ref) {
  return AuthNotifier(
    authRepository: ref.watch(authRepositoryProvider),
    authInterceptor: ref.watch(authInterceptorProvider),
  );
});
