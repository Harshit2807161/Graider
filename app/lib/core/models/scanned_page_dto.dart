import 'package:drift/drift.dart';

import '../database/app_database.dart';

/// Data transfer object bridging the Drift [ScannedPages] table and
/// application code for individual scanned page images.
///
/// Each scanned page belongs to a submission and stores the local image
/// path, upload status, and quality metadata.
class ScannedPageDto {
  const ScannedPageDto({
    required this.id,
    this.serverId,
    required this.submissionId,
    required this.pageNumber,
    required this.localPath,
    this.uploadedUrl,
    required this.isBlurry,
    required this.type,
    required this.createdAt,
    required this.updatedAt,
  });

  /// Client-generated UUID (or Drift row id).
  final String id;

  /// Backend-assigned UUID. Null if created offline and not yet synced.
  final String? serverId;

  /// Foreign key to the submission this page belongs to.
  final String submissionId;

  /// Sequential page number within the submission.
  final int pageNumber;

  /// Local file path to the scanned image.
  final String localPath;

  /// Server URL after upload. Null means not yet uploaded.
  final String? uploadedUrl;

  /// Whether the scan was detected as blurry.
  final bool isBlurry;

  /// Page type: "cover", "answer", "question_paper", "answer_key".
  final String type;

  /// Row creation timestamp.
  final DateTime createdAt;

  /// Row last-updated timestamp.
  final DateTime updatedAt;

  /// Maps from a Drift-generated [ScannedPage] data class.
  ///
  /// Fields map 1:1 from the ScannedPages table columns.
  factory ScannedPageDto.fromDrift(ScannedPage row) {
    return ScannedPageDto(
      id: row.id,
      serverId: row.serverId,
      submissionId: row.submissionId,
      pageNumber: row.pageNumber,
      localPath: row.localPath,
      uploadedUrl: row.uploadedUrl,
      isBlurry: row.isBlurry,
      type: row.type,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    );
  }

  /// Converts to a Drift [ScannedPagesCompanion] for database inserts.
  ///
  /// Sets [syncStatus] to the provided value (default 1 for pending_create,
  /// since pages are created locally during scanning).
  ScannedPagesCompanion toDriftCompanion({int syncStatus = 1}) {
    return ScannedPagesCompanion(
      id: Value(id),
      serverId: Value(serverId),
      syncStatus: Value(syncStatus),
      submissionId: Value(submissionId),
      pageNumber: Value(pageNumber),
      localPath: Value(localPath),
      uploadedUrl: Value(uploadedUrl),
      isBlurry: Value(isBlurry),
      type: Value(type),
      createdAt: Value(createdAt),
      updatedAt: Value(updatedAt),
    );
  }
}
