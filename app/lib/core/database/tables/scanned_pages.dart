import 'package:drift/drift.dart';

/// ScannedPages table -- individual scanned page images for a submission.
///
/// Offline-first: UUID primary key generated client-side, sync_status tracks
/// synchronization state with the backend.
class ScannedPages extends Table {
  /// Client-generated UUID primary key.
  TextColumn get id => text()();

  /// Server-assigned ID after sync. Null means created offline.
  TextColumn get serverId => text().nullable()();

  /// Sync status: 0=synced, 1=pending_create, 2=pending_update,
  /// 3=pending_delete, 4=conflict.
  IntColumn get syncStatus => integer().withDefault(const Constant(0))();

  /// Foreign key to submissions table.
  TextColumn get submissionId => text()();

  /// Sequential page number within the submission.
  IntColumn get pageNumber => integer()();

  /// Local file path to the scanned image.
  TextColumn get localPath => text()();

  /// Server URL after upload. Null means not yet uploaded.
  TextColumn get uploadedUrl => text().nullable()();

  /// Quality flag -- true if the scan was detected as blurry.
  BoolColumn get isBlurry => boolean().withDefault(const Constant(false))();

  /// Page type: "cover", "answer", "question_paper", "answer_key".
  TextColumn get type => text().withDefault(const Constant('answer'))();

  /// Row creation timestamp.
  DateTimeColumn get createdAt =>
      dateTime().withDefault(currentDateAndTime)();

  /// Row last-updated timestamp.
  DateTimeColumn get updatedAt =>
      dateTime().withDefault(currentDateAndTime)();

  @override
  Set<Column> get primaryKey => {id};
}
