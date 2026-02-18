/// Centralized API configuration constants.
///
/// Base URL targets the FastAPI backend. In development, `10.0.2.2` is the
/// Android emulator alias for the host machine's `localhost`. For real-device
/// testing, replace with the host's local IP address.
sealed class ApiConstants {
  /// Base URL for the FastAPI backend.
  /// Android emulator: 10.0.2.2 maps to host localhost.
  /// Override via environment or build flavor for production.
  static const String baseUrl = 'http://100.107.18.73:8000';

  /// API version prefix.
  static const String apiPrefix = '/api/v1';

  /// Full base URL with API prefix.
  static String get apiBaseUrl => '$baseUrl$apiPrefix';

  /// Connection timeout.
  static const Duration connectTimeout = Duration(seconds: 15);

  /// Response receive timeout.
  static const Duration receiveTimeout = Duration(seconds: 30);

  /// Request send timeout.
  static const Duration sendTimeout = Duration(seconds: 30);
}
