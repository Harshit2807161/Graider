import 'dart:developer' as developer;

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';

/// Interceptor that attaches a Bearer token to outgoing requests and handles
/// 401 responses by clearing the token and notifying the auth layer.
///
/// The [onSessionExpired] callback is wired by [AuthNotifier] at construction
/// time so that a 401 response triggers the session-expired flow (clear token,
/// show dialog, redirect to login).
class AuthInterceptor extends Interceptor {
  String? _token;

  /// Callback invoked when a 401 response is received.
  ///
  /// Set by [AuthNotifier] to trigger the session expiry flow.
  void Function()? onSessionExpired;

  /// Inject an auth token. Pass `null` to clear.
  void setToken(String? token) {
    _token = token;
  }

  /// The currently stored auth token, or `null` if none is set.
  String? get currentToken => _token;

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    if (_token != null && _token!.isNotEmpty) {
      options.headers['Authorization'] = 'Bearer $_token';
    }
    handler.next(options);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    if (err.response?.statusCode == 401) {
      _token = null;
      onSessionExpired?.call();
      developer.log(
        'Received 401 -- session expired',
        name: 'AuthInterceptor',
      );
    }
    handler.next(err);
  }
}

/// Debug-only interceptor that logs HTTP request/response details.
///
/// Only active when [kDebugMode] is `true` (automatically stripped in
/// release builds).
class LoggingInterceptor extends Interceptor {
  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    if (kDebugMode) {
      developer.log(
        '--> ${options.method} ${options.uri}',
        name: 'HTTP',
      );
    }
    handler.next(options);
  }

  @override
  void onResponse(Response response, ResponseInterceptorHandler handler) {
    if (kDebugMode) {
      developer.log(
        '<-- ${response.statusCode} ${response.requestOptions.uri}',
        name: 'HTTP',
      );
    }
    handler.next(response);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    if (kDebugMode) {
      developer.log(
        '<-- ERROR ${err.message} ${err.requestOptions.uri}',
        name: 'HTTP',
      );
    }
    handler.next(err);
  }
}
