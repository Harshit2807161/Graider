import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../database/app_database.dart';
import '../network/api_client.dart';

/// Response from an upload endpoint (questions, answers, or rubric).
class UploadResponse {
  const UploadResponse({
    required this.sessionId,
    required this.message,
  });

  /// Server-assigned session ID for this upload batch.
  final String sessionId;

  /// Human-readable status message from the backend.
  final String message;

  factory UploadResponse.fromJson(Map<String, dynamic> json) {
    return UploadResponse(
      sessionId: json['session_id'] as String,
      message: json['message'] as String,
    );
  }
}

/// Response from the grading submission endpoint.
class GradeResponse {
  const GradeResponse({
    required this.sessionId,
    required this.status,
    required this.message,
  });

  /// Session ID being graded.
  final String sessionId;

  /// Grading status (e.g., "processing").
  final String status;

  /// Human-readable message.
  final String message;

  factory GradeResponse.fromJson(Map<String, dynamic> json) {
    return GradeResponse(
      sessionId: json['session_id'] as String,
      status: json['status'] as String,
      message: json['message'] as String,
    );
  }
}

/// Repository handling HTTP file uploads to the Graider backend.
///
/// Uses multipart form data for image uploads with extended timeouts to
/// accommodate large files over slow connections.
class UploadRepository {
  UploadRepository({required Dio dio}) : _dio = dio;

  final Dio _dio;

  /// Uploads scanned answer pages for a submission.
  ///
  /// Sends all [pages] as multipart file entries under the key `'files'`.
  /// If [existingSessionId] is provided, the upload is treated as an
  /// idempotent retry for that session.
  Future<UploadResponse> uploadSubmission({
    required String submissionId,
    required List<ScannedPage> pages,
    String? existingSessionId,
  }) async {
    final formData = FormData();

    for (final page in pages) {
      formData.files.add(MapEntry(
        'files',
        await MultipartFile.fromFile(page.localPath),
      ));
    }

    if (existingSessionId != null) {
      formData.fields.add(MapEntry('session_id', existingSessionId));
    }

    final response = await _dio.post(
      '/mock/upload/answers',
      data: formData,
      options: Options(
        sendTimeout: const Duration(seconds: 180),
        receiveTimeout: const Duration(seconds: 60),
      ),
    );

    return UploadResponse.fromJson(response.data as Map<String, dynamic>);
  }

  /// Uploads question paper image(s).
  ///
  /// Accepts a list of file paths to support multi-page scanned documents.
  Future<UploadResponse> uploadQuestionPaper({
    required List<String> filePaths,
  }) async {
    final formData = FormData();
    for (final path in filePaths) {
      formData.files.add(MapEntry(
        'files',
        await MultipartFile.fromFile(path),
      ));
    }

    final response = await _dio.post(
      '/mock/upload/questions',
      data: formData,
      options: Options(
        sendTimeout: const Duration(seconds: 180),
        receiveTimeout: const Duration(seconds: 60),
      ),
    );

    return UploadResponse.fromJson(response.data as Map<String, dynamic>);
  }

  /// Uploads answer key / rubric image(s).
  ///
  /// Accepts a list of file paths to support multi-page scanned documents.
  Future<UploadResponse> uploadAnswerKey({
    required List<String> filePaths,
  }) async {
    final formData = FormData();
    for (final path in filePaths) {
      formData.files.add(MapEntry(
        'files',
        await MultipartFile.fromFile(path),
      ));
    }

    final response = await _dio.post(
      '/mock/upload/rubric',
      data: formData,
      options: Options(
        sendTimeout: const Duration(seconds: 180),
        receiveTimeout: const Duration(seconds: 60),
      ),
    );

    return UploadResponse.fromJson(response.data as Map<String, dynamic>);
  }

  /// Submits a synced session for AI grading.
  ///
  /// Uses the mock grade endpoint during development.
  Future<GradeResponse> submitForGrading({
    required String sessionId,
  }) async {
    final response = await _dio.post(
      '/mock/grade',
      data: {'session_id': sessionId},
    );

    return GradeResponse.fromJson(response.data as Map<String, dynamic>);
  }
}

/// Provides a singleton [UploadRepository] wired to the app's Dio client.
final uploadRepositoryProvider = Provider<UploadRepository>((ref) {
  return UploadRepository(dio: ref.watch(dioProvider));
});
