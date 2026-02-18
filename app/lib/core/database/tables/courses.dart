import 'package:drift/drift.dart';

/// Courses table -- represents a grading session (course + exam combination).
///
/// Offline-first: UUID primary key generated client-side, sync_status tracks
/// synchronization state with the backend.
class Courses extends Table {
  /// Client-generated UUID primary key (allows offline creation).
  TextColumn get id => text()();

  /// Server-assigned ID after sync. Null means created offline, not yet synced.
  TextColumn get serverId => text().nullable()();

  /// Sync status: 0=synced, 1=pending_create, 2=pending_update,
  /// 3=pending_delete, 4=conflict.
  IntColumn get syncStatus => integer().withDefault(const Constant(0))();

  /// Course name (e.g., "CS101").
  TextColumn get name => text()();

  /// Exam title (e.g., "Midterm").
  TextColumn get examTitle => text()();

  /// Department name, optional.
  TextColumn get department => text().nullable()();

  /// Course status: active, processing, completed, stopped.
  TextColumn get status => text().withDefault(const Constant('active'))();

  /// Total number of students enrolled.
  IntColumn get totalStudents => integer().withDefault(const Constant(0))();

  /// Number of students graded so far.
  IntColumn get gradedCount => integer().withDefault(const Constant(0))();

  /// Local path to the question paper file (scan or uploaded).
  TextColumn get questionPaperPath => text().nullable()();

  /// Local path to the answer key file (scan or uploaded).
  TextColumn get answerKeyPath => text().nullable()();

  /// How the question paper was provided: "scan" or "upload".
  TextColumn get questionPaperType => text().nullable()();

  /// How the answer key was provided: "scan" or "upload".
  TextColumn get answerKeyType => text().nullable()();

  /// Row creation timestamp.
  DateTimeColumn get createdAt =>
      dateTime().withDefault(currentDateAndTime)();

  /// Row last-updated timestamp.
  DateTimeColumn get updatedAt =>
      dateTime().withDefault(currentDateAndTime)();

  @override
  Set<Column> get primaryKey => {id};
}
