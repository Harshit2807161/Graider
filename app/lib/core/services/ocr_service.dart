import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../network/api_client.dart';

/// Calls backend OCR for cover page identity extraction. Returns empty result
/// on failure -- caller handles fallback UX.
///
/// Sends the cover page image to `POST /ocr/cover-page` as multipart form data
/// and parses the response into an [OcrResult]. On any error (network, server,
/// or unexpected response), returns a graceful empty result so the scanning
/// flow can continue with manual entry.
class OcrService {
  OcrService({required Dio dio}) : _dio = dio;

  final Dio _dio;

  /// Extracts student name and roll number from a cover page image.
  ///
  /// Sends the image at [imagePath] to the backend OCR endpoint. Expected
  /// response: `{"student_name": "...", "roll_number": "...", "confidence": 0.85}`.
  ///
  /// Returns an [OcrResult] with extracted fields. On any error, returns an
  /// empty result with `confidence: 0.0` and null fields.
  Future<OcrResult> extractIdentity(String imagePath) async {
    try {
      final formData = FormData.fromMap({
        'file': await MultipartFile.fromFile(
          imagePath,
          filename: 'cover_page${_extension(imagePath)}',
        ),
      });

      final response = await _dio.post<Map<String, dynamic>>(
        '/ocr/cover-page',
        data: formData,
        options: Options(
          contentType: 'multipart/form-data',
        ),
      );

      final data = response.data;
      if (data == null) {
        return OcrResult.empty();
      }

      return OcrResult(
        name: data['student_name'] as String?,
        rollNumber: data['roll_number'] as String?,
        confidence: (data['confidence'] as num?)?.toDouble() ?? 0.0,
      );
    } on DioException {
      // Network error, 404, timeout, etc. -- graceful failure.
      return OcrResult.empty();
    } catch (_) {
      // Any unexpected error -- graceful failure.
      return OcrResult.empty();
    }
  }

  /// Returns the file extension including the dot, or `.jpg` as fallback.
  String _extension(String path) {
    final lastDot = path.lastIndexOf('.');
    if (lastDot == -1 || lastDot == path.length - 1) return '.jpg';
    return path.substring(lastDot);
  }
}

/// Result of OCR identity extraction from a cover page.
class OcrResult {
  const OcrResult({
    required this.name,
    required this.rollNumber,
    required this.confidence,
  });

  /// Creates an empty result representing OCR failure.
  factory OcrResult.empty() => const OcrResult(
        name: null,
        rollNumber: null,
        confidence: 0.0,
      );

  /// Extracted student name, or null if OCR failed or could not read it.
  final String? name;

  /// Extracted roll number, or null if OCR failed or could not read it.
  final String? rollNumber;

  /// Confidence score from 0.0 to 1.0. 0.0 indicates OCR failure.
  final double confidence;

  /// Whether OCR produced any usable result.
  bool get hasResult => name != null || rollNumber != null;
}

/// Provides a singleton [OcrService] wired to the app's Dio HTTP client.
final ocrServiceProvider = Provider<OcrService>((ref) {
  return OcrService(dio: ref.watch(dioProvider));
});
