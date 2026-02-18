import 'package:drift/drift.dart';

/// Students table -- represents a student enrolled in a course.
///
/// Offline-first: UUID primary key generated client-side, sync_status tracks
/// synchronization state with the backend.
class Students extends Table {
  /// Client-generated UUID primary key.
  TextColumn get id => text()();

  /// Server-assigned ID after sync. Null means created offline.
  TextColumn get serverId => text().nullable()();

  /// Sync status: 0=synced, 1=pending_create, 2=pending_update,
  /// 3=pending_delete, 4=conflict.
  IntColumn get syncStatus => integer().withDefault(const Constant(0))();

  /// Foreign key to courses table.
  TextColumn get courseId => text()();

  /// Student's full name.
  TextColumn get name => text()();

  /// Student's roll number / identifier.
  TextColumn get rollNumber => text()();

  /// Grading status: pending, processing, graded.
  TextColumn get gradingStatus =>
      text().withDefault(const Constant('pending'))();

  /// Total score achieved. Null until graded.
  RealColumn get totalScore => real().nullable()();

  /// Maximum possible score. Null until graded.
  RealColumn get maxScore => real().nullable()();

  /// Row creation timestamp.
  DateTimeColumn get createdAt =>
      dateTime().withDefault(currentDateAndTime)();

  /// Row last-updated timestamp.
  DateTimeColumn get updatedAt =>
      dateTime().withDefault(currentDateAndTime)();

  @override
  Set<Column> get primaryKey => {id};
}
