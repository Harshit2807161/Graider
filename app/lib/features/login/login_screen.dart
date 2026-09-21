import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/auth/auth_repository.dart';
import '../../core/auth/auth_state.dart';
import '../../core/theme/app_colors.dart';

/// Login screen matching the Figma mockup.
///
/// Layout (top to bottom):
/// 1. Branding area (icon + "Graider" + subtitle)
/// 2. Email / Password fields with blur validation
/// 3. "Forgot Password?" link (disabled -- coming soon)
/// 4. "Log In" button with loading spinner
/// 5. "OR" divider
/// 6. SSO button (disabled -- coming soon)
class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _emailFocus = FocusNode();
  final _passwordFocus = FocusNode();

  bool _obscurePassword = true;
  bool _isLoading = false;
  String? _emailError;
  String? _passwordError;

  @override
  void initState() {
    super.initState();
    _emailFocus.addListener(_onEmailFocusChange);
    _passwordFocus.addListener(_onPasswordFocusChange);

    // Pre-fill email from last login (per user decision).
    // Also check for session expiry and show dialog if needed.
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      final lastEmail = await ref.read(authRepositoryProvider).getLastEmail();
      if (lastEmail != null && mounted) {
        _emailController.text = lastEmail;
      }

      if (!mounted) return;
      _checkSessionExpired();
    });
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _emailFocus.removeListener(_onEmailFocusChange);
    _passwordFocus.removeListener(_onPasswordFocusChange);
    _emailFocus.dispose();
    _passwordFocus.dispose();
    super.dispose();
  }

  // -- Session expiry dialog --

  /// If the user arrived here because of a 401 (session expired),
  /// show an informational dialog before they can log in again.
  void _checkSessionExpired() {
    final authStatus = ref.read(authNotifierProvider);
    if (authStatus == AuthStatus.sessionExpired) {
      showDialog<void>(
        context: context,
        barrierDismissible: false,
        builder: (context) => AlertDialog(
          title: const Text('Session Expired'),
          content: const Text(
            'Your session has expired. Please log in again.',
          ),
          actions: [
            TextButton(
              onPressed: () {
                Navigator.of(context).pop();
                ref.read(authNotifierProvider.notifier).clearExpiredFlag();
              },
              child: const Text('OK'),
            ),
          ],
        ),
      );
    }
  }

  // -- Focus listeners for blur validation --

  void _onEmailFocusChange() {
    if (!_emailFocus.hasFocus) {
      _validateEmail();
    }
  }

  void _onPasswordFocusChange() {
    if (!_passwordFocus.hasFocus) {
      _validatePassword();
    }
  }

  // -- Validation --

  void _validateEmail() {
    final email = _emailController.text.trim();
    setState(() {
      if (email.isEmpty) {
        _emailError = 'Email is required';
      } else if (!email.contains('@') || !email.contains('.')) {
        _emailError = 'Enter a valid email address';
      } else {
        _emailError = null;
      }
    });
  }

  void _validatePassword() {
    final password = _passwordController.text;
    setState(() {
      if (password.isEmpty) {
        _passwordError = 'Password is required';
      } else {
        _passwordError = null;
      }
    });
  }

  bool _validateAll() {
    _validateEmail();
    _validatePassword();
    return _emailError == null && _passwordError == null;
  }

  // -- Login handler --

  Future<void> _handleLogin() async {
    if (!_validateAll()) return;

    final email = _emailController.text.trim();
    final password = _passwordController.text;

    setState(() => _isLoading = true);

    try {
      await ref.read(authNotifierProvider.notifier).login(email, password);
      // Navigation handled by auth-aware router (Plan 02).
    } on DioException catch (e) {
      if (!mounted) return;

      final String message;
      if (e.response?.statusCode == 400) {
        message = 'Incorrect email or password';
      } else if (e.type == DioExceptionType.connectionError ||
          e.type == DioExceptionType.connectionTimeout ||
          e.type == DioExceptionType.sendTimeout ||
          e.type == DioExceptionType.receiveTimeout) {
        message = 'Network error. Please check your connection.';
        _showRetrySnackBar(message);
        return;
      } else {
        message = 'Something went wrong. Please try again.';
      }

      ScaffoldMessenger.of(context)
        ..hideCurrentSnackBar()
        ..showSnackBar(SnackBar(content: Text(message)));
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
        ..hideCurrentSnackBar()
        ..showSnackBar(
          const SnackBar(content: Text('Something went wrong. Please try again.')),
        );
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  void _showRetrySnackBar(String message) {
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          content: Text(message),
          action: SnackBarAction(
            label: 'Retry',
            onPressed: _handleLogin,
          ),
          duration: const Duration(seconds: 8),
        ),
      );
  }

  void _showComingSoon() {
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        const SnackBar(content: Text('Coming soon')),
      );
  }

  // -- Build --

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 32),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const SizedBox(height: 80),

                // -- Branding --
                _buildBranding(),

                const SizedBox(height: 48),

                // -- Form fields --
                _buildEmailField(),
                const SizedBox(height: 16),
                _buildPasswordField(),

                // -- Forgot Password --
                Align(
                  alignment: Alignment.centerRight,
                  child: TextButton(
                    onPressed: _showComingSoon,
                    child: const Text(
                      'Forgot Password?',
                      style: TextStyle(color: AppColors.primary),
                    ),
                  ),
                ),

                const SizedBox(height: 16),

                // -- Login button --
                _buildLoginButton(),

                const SizedBox(height: 24),

                // -- OR divider --
                _buildDivider(),

                const SizedBox(height: 24),

                // -- SSO button --
                _buildSsoButton(),

                const SizedBox(height: 48),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildBranding() {
    return Column(
      children: [
        Container(
          width: 64,
          height: 64,
          decoration: BoxDecoration(
            color: AppColors.surfaceContainer,
            borderRadius: BorderRadius.circular(16),
          ),
          child: const Icon(
            Icons.auto_stories,
            color: AppColors.primary,
            size: 36,
          ),
        ),
        const SizedBox(height: 24),
        const Text(
          'Graider',
          style: TextStyle(
            fontSize: 32,
            fontWeight: FontWeight.bold,
            color: AppColors.onBackground,
            letterSpacing: 1.0,
          ),
        ),
        const SizedBox(height: 8),
        const Text(
          'AI-Powered Exam Grading',
          style: TextStyle(
            fontSize: 14,
            color: AppColors.onSurfaceVariant,
          ),
        ),
      ],
    );
  }

  Widget _buildEmailField() {
    return TextFormField(
      controller: _emailController,
      focusNode: _emailFocus,
      keyboardType: TextInputType.emailAddress,
      textInputAction: TextInputAction.next,
      decoration: InputDecoration(
        hintText: 'Email Address',
        errorText: _emailError,
      ),
    );
  }

  Widget _buildPasswordField() {
    return TextFormField(
      controller: _passwordController,
      focusNode: _passwordFocus,
      obscureText: _obscurePassword,
      textInputAction: TextInputAction.done,
      onFieldSubmitted: (_) => _handleLogin(),
      decoration: InputDecoration(
        hintText: 'Password',
        errorText: _passwordError,
        suffixIcon: IconButton(
          onPressed: () {
            setState(() => _obscurePassword = !_obscurePassword);
          },
          icon: Icon(
            _obscurePassword ? Icons.visibility : Icons.visibility_off,
            color: AppColors.onSurfaceVariant,
          ),
        ),
      ),
    );
  }

  Widget _buildLoginButton() {
    return SizedBox(
      width: double.infinity,
      child: FilledButton(
        onPressed: _isLoading ? null : _handleLogin,
        style: FilledButton.styleFrom(
          backgroundColor: AppColors.primary,
          foregroundColor: Colors.white,
          disabledBackgroundColor: AppColors.primary.withValues(alpha: 0.6),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(28),
          ),
          padding: const EdgeInsets.symmetric(vertical: 16),
        ),
        child: _isLoading
            ? const SizedBox(
                height: 20,
                width: 20,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: Colors.white,
                ),
              )
            : const Text(
                'Log In',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                ),
              ),
      ),
    );
  }

  Widget _buildDivider() {
    return const Row(
      children: [
        Expanded(child: Divider()),
        Padding(
          padding: EdgeInsets.symmetric(horizontal: 16),
          child: Text(
            'OR',
            style: TextStyle(
              color: AppColors.onSurfaceVariant,
              fontSize: 12,
            ),
          ),
        ),
        Expanded(child: Divider()),
      ],
    );
  }

  Widget _buildSsoButton() {
    return SizedBox(
      width: double.infinity,
      child: OutlinedButton.icon(
        onPressed: _showComingSoon,
        icon: const Icon(Icons.account_balance),
        label: const Text('Log in with University ID (SSO)'),
        style: OutlinedButton.styleFrom(
          foregroundColor: AppColors.onSurface,
          side: const BorderSide(color: AppColors.outline),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(28),
          ),
          padding: const EdgeInsets.symmetric(vertical: 16),
        ),
      ),
    );
  }
}
