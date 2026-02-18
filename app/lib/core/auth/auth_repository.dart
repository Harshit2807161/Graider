import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../network/api_client.dart';

/// Repository that handles authentication API calls and secure JWT storage.
///
/// Two concerns:
/// 1. **Login API call** -- POST to `/auth/login` via [Dio].
/// 2. **Secure token persistence** -- read/write JWT and email via
///    [FlutterSecureStorage].
class AuthRepository {
  AuthRepository({
    required Dio dio,
    required FlutterSecureStorage secureStorage,
  })  : _dio = dio,
        _secureStorage = secureStorage;

  final Dio _dio;
  final FlutterSecureStorage _secureStorage;

  static const _tokenKey = 'auth_jwt_token';
  static const _emailKey = 'auth_last_email';

  /// Authenticate with [email] and [password] against the backend.
  ///
  /// Sends a `POST` to `/auth/login` with `application/x-www-form-urlencoded`
  /// body (FastAPI's `OAuth2PasswordRequestForm` expects `username` + `password`).
  ///
  /// On success, persists the JWT and email to secure storage, then returns
  /// the raw token string. On failure, rethrows the [DioException] so callers
  /// can handle it (e.g. show error messages in the UI).
  Future<String> login(String email, String password) async {
    final response = await _dio.post<Map<String, dynamic>>(
      '/auth/login',
      data: {
        'username': email,
        'password': password,
      },
      options: Options(
        contentType: 'application/x-www-form-urlencoded',
      ),
    );

    final token = response.data!['access_token'] as String;

    await Future.wait([
      _secureStorage.write(key: _tokenKey, value: token),
      _secureStorage.write(key: _emailKey, value: email),
    ]);

    return token;
  }

  /// Retrieve the persisted JWT, or `null` if none is stored.
  Future<String?> getStoredToken() {
    return _secureStorage.read(key: _tokenKey);
  }

  /// Retrieve the last-used email for pre-filling the login form, or `null`.
  Future<String?> getLastEmail() {
    return _secureStorage.read(key: _emailKey);
  }

  /// Remove the JWT from secure storage.
  ///
  /// Keeps the email for pre-fill on next login (per user decision).
  Future<void> clearToken() {
    return _secureStorage.delete(key: _tokenKey);
  }

  /// Remove both the JWT and email from secure storage.
  Future<void> clearAll() async {
    await Future.wait([
      _secureStorage.delete(key: _tokenKey),
      _secureStorage.delete(key: _emailKey),
    ]);
  }
}

/// Provides a singleton [AuthRepository] wired to the app's [Dio] instance
/// and [FlutterSecureStorage].
final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository(
    dio: ref.watch(dioProvider),
    secureStorage: const FlutterSecureStorage(),
  );
});
