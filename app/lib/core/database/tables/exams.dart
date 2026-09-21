import 'package:drift/drift.dart';

/// Exams table -- represents an exam within a course.
///
/// Offline-first: UUID primary key generated client-side, sync_status tracks
/// synchronization state with the backend.
class Exams extends Table {
  /// Client-generated UUID primary key.
  TextColumn get id => text()();

  /// Server-assigned ID after sync. Null means created offline.
  TextColumn get serverId => text().nullable()();

  /// Sync status: 0=synced, 1=pending_create, 2=pending_update,
  /// 3=pending_delete, 4=conflict.
  IntColumn get syncStatus => integer().withDefault(const Constant(0))();

  /// Foreign key to courses table.
  TextColumn get courseId => text()();

  /// Exam title.
  TextColumn get title => text()();

  /// Total marks for the exam.
  IntColumn get totalMarks => integer().withDefault(const Constant(100))();

  /// Local file path for the question paper image/PDF.
  TextColumn get questionPaperPath => text().nullable()();

  /// Local file path for the answer key image/PDF.
  TextColumn get answerKeyPath => text().nullable()();

  /// Row creation timestamp.
  DateTimeColumn get createdAt =>
      dateTime().withDefault(currentDateAndTime)();

  /// Row last-updated timestamp.
  DateTimeColumn get updatedAt =>
      dateTime().withDefault(currentDateAndTime)();

  @override
  Set<Column> get primaryKey => {id};
}
