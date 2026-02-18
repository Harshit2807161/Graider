import 'package:drift/drift.dart';

import '../database/app_database.dart';

/// Data transfer object bridging the Drift [Submissions] table and
/// application code for student answer submissions.
///
/// Each submission links a student to a course and tracks the scanning
/// and grading lifecycle.
class SubmissionDto {
  const SubmissionDto({
    required this.id,
    this.serverId,
    required this.studentId,
    required this.courseId,
    required this.status,
    this.coverPagePath,
    this.gradingRequested = false,
    required this.createdAt,
    required this.updatedAt,
  });

  /// Client-generated UUID (or Drift row id).
  final String id;

  /// Backend-assigned UUID. Null if created offline and not yet synced.
  final String? serverId;

  /// Foreign key to the student who owns this submission.
  final String studentId;

  /// Foreign key to the course this submission belongs to.
  final String courseId;

  /// Submission status: "pending", "uploading", "processing", "graded", "error".
  final String status;

  /// Local path to the cover page scan image. Null if not yet captured.
  final String? coverPagePath;

  /// Whether the professor has requested grading before upload completed.
  final bool gradingRequested;

  /// Row creation timestamp.
  final DateTime createdAt;

  /// Row last-updated timestamp.
  final DateTime updatedAt;

  /// Maps from a Drift-generated [Submission] data class.
  ///
  /// Fields map 1:1 from the Submissions table columns.
  factory SubmissionDto.fromDrift(Submission row) {
    return SubmissionDto(
      id: row.id,
      serverId: row.serverId,
      studentId: row.studentId,
      courseId: row.courseId,
      status: row.status,
      coverPagePath: row.coverPagePath,
      gradingRequested: row.gradingRequested,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    );
  }

  /// Converts to a Drift [SubmissionsCompanion] for database inserts.
  ///
  /// Sets [syncStatus] to the provided value (default 1 for pending_create,
  /// since submissions are created locally during scanning).
  SubmissionsCompanion toDriftCompanion({int syncStatus = 1}) {
    return SubmissionsCompanion(
      id: Value(id),
      serverId: Value(serverId),
      syncStatus: Value(syncStatus),
      studentId: Value(studentId),
      courseId: Value(courseId),
      status: Value(status),
      coverPagePath: Value(coverPagePath),
      gradingRequested: Value(gradingRequested),
      createdAt: Value(createdAt),
      updatedAt: Value(updatedAt),
    );
  }
}
