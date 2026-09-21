import 'package:drift/drift.dart';

/// Submissions table -- links a student to a course for grading.
///
/// Offline-first: UUID primary key generated client-side, sync_status tracks
/// synchronization state with the backend.
class Submissions extends Table {
  /// Client-generated UUID primary key.
  TextColumn get id => text()();

  /// Server-assigned ID after sync. Null means created offline.
  TextColumn get serverId => text().nullable()();

  /// Sync status: 0=synced, 1=pending_create, 2=pending_update,
  /// 3=pending_delete, 4=conflict.
  IntColumn get syncStatus => integer().withDefault(const Constant(0))();

  /// Foreign key to students table.
  TextColumn get studentId => text()();

  /// Foreign key to courses table.
  TextColumn get courseId => text()();

  /// Submission status: pending, uploading, processing, graded, error.
  TextColumn get status => text().withDefault(const Constant('pending'))();

  /// Local path to the cover page scan image.
  TextColumn get coverPagePath => text().nullable()();

  /// Whether the professor has requested grading before upload completed.
  /// When true, the sync engine will auto-submit for grading after upload.
  BoolColumn get gradingRequested =>
      boolean().withDefault(const Constant(false))();

  /// Row creation timestamp.
  DateTimeColumn get createdAt =>
      dateTime().withDefault(currentDateAndTime)();

  /// Row last-updated timestamp.
  DateTimeColumn get updatedAt =>
      dateTime().withDefault(currentDateAndTime)();

  @override
  Set<Column> get primaryKey => {id};
}
