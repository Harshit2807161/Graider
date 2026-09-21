import 'package:dio/dio.dart';
import 'package:dio_smart_retry/dio_smart_retry.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../constants/api_constants.dart';
import 'api_interceptors.dart';

/// Shared [AuthInterceptor] instance exposed as a Riverpod provider.
///
/// Both [dioProvider] and token management (Phase 2) read this same instance.
/// Calling `ref.read(authInterceptorProvider).setToken(jwt)` injects the
/// token into the exact interceptor that Dio uses for every request.
final authInterceptorProvider = Provider<AuthInterceptor>((ref) {
  return AuthInterceptor();
});

/// Configured [Dio] HTTP client exposed as a Riverpod provider.
///
/// - Base URL: FastAPI v1 API (`http://10.0.2.2:8000/api/v1`)
/// - Timeouts: 15s connect, 30s receive, 30s send
/// - Interceptors: [AuthInterceptor] (always), [LoggingInterceptor] (debug)
final dioProvider = Provider<Dio>((ref) {
  final authInterceptor = ref.watch(authInterceptorProvider);

  final dio = Dio(BaseOptions(
    baseUrl: ApiConstants.apiBaseUrl,
    connectTimeout: ApiConstants.connectTimeout,
    receiveTimeout: ApiConstants.receiveTimeout,
    sendTimeout: ApiConstants.sendTimeout,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  ));

  dio.interceptors.addAll([
    RetryInterceptor(
      dio: dio,
      retries: 5,
      retryDelays: const [
        Duration(seconds: 1),
        Duration(seconds: 2),
        Duration(seconds: 4),
        Duration(seconds: 8),
        Duration(seconds: 16),
      ],
      retryableExtraStatuses: {408, 429},
    ),
    authInterceptor,
    if (kDebugMode) LoggingInterceptor(),
  ]);

  return dio;
});
