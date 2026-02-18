import 'package:drift/drift.dart';
import 'package:uuid/uuid.dart';

import '../database/app_database.dart';

/// Data transfer object bridging the backend enrollment/member JSON response
/// and the Drift [Students] table for offline caching.
///
/// Each student belongs to a course (courseId FK) and tracks grading status.
class StudentDto {
  const StudentDto({
    required this.id,
    this.serverId,
    required this.courseId,
    required this.name,
    required this.rollNumber,
    required this.gradingStatus,
    this.totalScore,
    this.maxScore,
    required this.createdAt,
    required this.updatedAt,
  });

  /// Client-generated UUID (or Drift row id).
  final String id;

  /// Backend-assigned UUID. Null if created offline and not yet synced.
  final String? serverId;

  /// Foreign key to the course this student belongs to.
  final String courseId;

  /// Student's full name.
  final String name;

  /// Student's roll number / identifier.
  final String rollNumber;

  /// Grading status: "pending", "processing", "graded".
  final String gradingStatus;

  /// Total score achieved. Null until graded.
  final double? totalScore;

  /// Maximum possible score. Null until graded.
  final double? maxScore;

  /// Row creation timestamp.
  final DateTime createdAt;

  /// Row last-updated timestamp.
  final DateTime updatedAt;

  /// Maps from the backend enrollment/member API response.
  ///
  /// The backend returns membership data with user info. Maps:
  /// - `name` from user's `full_name`
  /// - `rollNumber` from membership's `profile_data.roll_number` or email prefix
  /// - `gradingStatus` defaults to "pending", scores null
  ///
  /// **Known API gap:** Backend does not have a "list enrolled students"
  /// endpoint. This factory is prepared for when one exists.
  factory StudentDto.fromJson(Map<String, dynamic> json, String courseId) {
    final fullName = json['full_name'] as String? ??
        json['name'] as String? ??
        'Unknown';

    final profileData = json['profile_data'] as Map<String, dynamic>?;
    final rollNumber = profileData?['roll_number'] as String? ??
        json['roll_number'] as String? ??
        (json['email'] as String?)?.split('@').first ??
        '';

    return StudentDto(
      id: const Uuid().v4(),
      serverId: json['id'] as String?,
      courseId: courseId,
      name: fullName,
      rollNumber: rollNumber,
      gradingStatus: json['grading_status'] as String? ?? 'pending',
      totalScore: (json['total_score'] as num?)?.toDouble(),
      maxScore: (json['max_score'] as num?)?.toDouble(),
      createdAt: json['created_at'] != null
          ? DateTime.parse(json['created_at'] as String)
          : DateTime.now(),
      updatedAt: json['updated_at'] != null
          ? DateTime.parse(json['updated_at'] as String)
          : DateTime.now(),
    );
  }

  /// Maps from a Drift-generated [Student] data class.
  ///
  /// Fields map 1:1 from the Students table columns.
  factory StudentDto.fromDrift(Student row) {
    return StudentDto(
      id: row.id,
      serverId: row.serverId,
      courseId: row.courseId,
      name: row.name,
      rollNumber: row.rollNumber,
      gradingStatus: row.gradingStatus,
      totalScore: row.totalScore,
      maxScore: row.maxScore,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    );
  }

  /// Converts to a Drift [StudentsCompanion] for database inserts.
  ///
  /// Uses the existing [id] field. Sets [syncStatus] to the provided value
  /// (default 0 for synced API data).
  StudentsCompanion toDriftCompanion({int syncStatus = 0}) {
    return StudentsCompanion(
      id: Value(id),
      serverId: Value(serverId),
      syncStatus: Value(syncStatus),
      courseId: Value(courseId),
      name: Value(name),
      rollNumber: Value(rollNumber),
      gradingStatus: Value(gradingStatus),
      totalScore: Value(totalScore),
      maxScore: Value(maxScore),
      createdAt: Value(createdAt),
      updatedAt: Value(updatedAt),
    );
  }
}
