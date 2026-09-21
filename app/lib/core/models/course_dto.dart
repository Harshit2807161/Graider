import 'package:drift/drift.dart';
import 'package:uuid/uuid.dart';

import '../database/app_database.dart';

/// Data transfer object bridging the backend `BatchRead` JSON response
/// and the Drift [Courses] table for offline caching.
class CourseDto {
  const CourseDto({
    required this.id,
    this.serverId,
    required this.name,
    this.subtitle = '',
    required this.status,
    required this.totalStudents,
    required this.gradedCount,
    required this.createdAt,
    required this.updatedAt,
    this.questionPaperPath,
    this.answerKeyPath,
    this.questionPaperType,
    this.answerKeyType,
  });

  /// Client-generated UUID (or Drift row id).
  final String id;

  /// Backend-assigned UUID. Null if created offline and not yet synced.
  final String? serverId;

  /// Course display name (e.g., "CS101 Midterm").
  final String name;

  /// Secondary line for UI (e.g., department or exam context).
  final String subtitle;

  /// Status string: "active", "processing", "stopped".
  final String status;

  /// Total number of students enrolled.
  final int totalStudents;

  /// Number of students graded so far.
  final int gradedCount;

  /// Row creation timestamp.
  final DateTime createdAt;

  /// Row last-updated timestamp.
  final DateTime updatedAt;

  /// Local file path to the question paper (scan or uploaded). Null if not set.
  final String? questionPaperPath;

  /// Local file path to the answer key (scan or uploaded). Null if not set.
  final String? answerKeyPath;

  /// How the question paper was provided: "scan" or "upload". Null if not set.
  final String? questionPaperType;

  /// How the answer key was provided: "scan" or "upload". Null if not set.
  final String? answerKeyType;

  /// Maps from the backend `BatchRead` JSON response.
  ///
  /// The backend returns `{id, org_id, name}` only.
  /// Status, counts, and timestamps are filled with sensible defaults
  /// since the backend does not track them yet.
  factory CourseDto.fromJson(Map<String, dynamic> json) {
    return CourseDto(
      id: const Uuid().v4(),
      serverId: json['id'] as String?,
      name: json['name'] as String? ?? '',
      subtitle: '',
      status: 'active',
      totalStudents: 0,
      gradedCount: 0,
      createdAt: json['created_at'] != null
          ? DateTime.parse(json['created_at'] as String)
          : DateTime.now(),
      updatedAt: json['updated_at'] != null
          ? DateTime.parse(json['updated_at'] as String)
          : DateTime.now(),
    );
  }

  /// Maps from a Drift-generated [Course] data class.
  ///
  /// Combines [name] and [examTitle] into the display name when examTitle
  /// is non-empty (e.g., "CS101 - Midterm"), otherwise uses [name] alone.
  factory CourseDto.fromDrift(Course row) {
    final displayName = row.examTitle.isNotEmpty
        ? '${row.name} ${row.examTitle}'
        : row.name;

    return CourseDto(
      id: row.id,
      serverId: row.serverId,
      name: displayName,
      subtitle: row.department ?? '',
      status: row.status,
      totalStudents: row.totalStudents,
      gradedCount: row.gradedCount,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      questionPaperPath: row.questionPaperPath,
      answerKeyPath: row.answerKeyPath,
      questionPaperType: row.questionPaperType,
      answerKeyType: row.answerKeyType,
    );
  }

  /// Converts to a JSON map for API calls (e.g., create batch).
  Map<String, dynamic> toJson() {
    return {
      'name': name,
    };
  }

  /// Converts to a Drift [CoursesCompanion] for database inserts.
  ///
  /// Generates a new UUID for the primary key. Sets [syncStatus] to 0
  /// (synced) since this is typically used for API-sourced data.
  CoursesCompanion toDriftCompanion() {
    return CoursesCompanion(
      id: Value(id),
      serverId: Value(serverId),
      syncStatus: const Value(0),
      name: Value(name),
      examTitle: const Value(''),
      status: Value(status),
      totalStudents: Value(totalStudents),
      gradedCount: Value(gradedCount),
      createdAt: Value(createdAt),
      updatedAt: Value(updatedAt),
      questionPaperPath: Value(questionPaperPath),
      answerKeyPath: Value(answerKeyPath),
      questionPaperType: Value(questionPaperType),
      answerKeyType: Value(answerKeyType),
    );
  }
}
