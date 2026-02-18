import 'package:drift/drift.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';

import '../database/app_database.dart';
import '../models/scanned_page_dto.dart';
import '../models/submission_dto.dart';

/// Repository providing CRUD operations for submissions and scanned pages.
///
/// Handles persistence of scan data to the local Drift database. All data is
/// created with `syncStatus = 1` (pending_create) since scanning happens
/// offline-first. The sync layer (Phase 5) will handle uploading.
class ScanRepository {
  ScanRepository({required AppDatabase db}) : _db = db;

  final AppDatabase _db;

  static const _uuid = Uuid();

  // ---------------------------------------------------------------------------
  // Submissions
  // ---------------------------------------------------------------------------

  /// Creates a new submission row linking a student to a course.
  ///
  /// Returns the generated UUID for the new submission. The submission is
  /// created with `syncStatus = 1` (pending_create) and status "pending".
  Future<String> createSubmission({
    required String studentId,
    required String courseId,
    String? coverPagePath,
  }) async {
    final id = _uuid.v4();
    final now = DateTime.now();

    await _db.into(_db.submissions).insert(
          SubmissionsCompanion(
            id: Value(id),
            syncStatus: const Value(1),
            studentId: Value(studentId),
            courseId: Value(courseId),
            status: const Value('pending'),
            coverPagePath: Value(coverPagePath),
            createdAt: Value(now),
            updatedAt: Value(now),
          ),
        );

    return id;
  }

  // ---------------------------------------------------------------------------
  // Scanned Pages
  // ---------------------------------------------------------------------------

  /// Inserts a scanned page row for a submission.
  ///
  /// Each page has a sequential [pageNumber], a [localPath] to the image file,
  /// a blur detection flag, and a [type] ("cover", "answer", etc.).
  Future<void> addScannedPage({
    required String submissionId,
    required int pageNumber,
    required String localPath,
    required bool isBlurry,
    String type = 'answer',
  }) async {
    final now = DateTime.now();

    await _db.into(_db.scannedPages).insert(
          ScannedPagesCompanion(
            id: Value(_uuid.v4()),
            syncStatus: const Value(1),
            submissionId: Value(submissionId),
            pageNumber: Value(pageNumber),
            localPath: Value(localPath),
            isBlurry: Value(isBlurry),
            type: Value(type),
            createdAt: Value(now),
            updatedAt: Value(now),
          ),
        );
  }

  /// Returns all scanned pages for a submission, ordered by page number.
  Future<List<ScannedPageDto>> getPages(String submissionId) async {
    final rows = await (_db.select(_db.scannedPages)
          ..where((t) => t.submissionId.equals(submissionId))
          ..orderBy([(t) => OrderingTerm.asc(t.pageNumber)]))
        .get();
    return rows.map(ScannedPageDto.fromDrift).toList();
  }

  /// Deletes a scanned page by its ID.
  Future<void> deletePage(String pageId) async {
    await (_db.delete(_db.scannedPages)
          ..where((t) => t.id.equals(pageId)))
        .go();
  }

  /// Updates the page number for a scanned page (used after reorder).
  Future<void> updatePageOrder(String pageId, int newPageNumber) async {
    await (_db.update(_db.scannedPages)
          ..where((t) => t.id.equals(pageId)))
        .write(ScannedPagesCompanion(
      pageNumber: Value(newPageNumber),
      updatedAt: Value(DateTime.now()),
    ));
  }

  // ---------------------------------------------------------------------------
  // Course-level documents (Q-paper / Answer Key)
  // ---------------------------------------------------------------------------

  /// Saves the question paper path and type on the course row.
  ///
  /// [type] is "scan" or "upload" depending on how it was provided.
  Future<void> saveQuestionPaper(
    String courseId,
    String path,
    String type,
  ) async {
    await (_db.update(_db.courses)..where((t) => t.id.equals(courseId))).write(
      CoursesCompanion(
        questionPaperPath: Value(path),
        questionPaperType: Value(type),
        updatedAt: Value(DateTime.now()),
      ),
    );
  }

  /// Saves the answer key path and type on the course row.
  ///
  /// [type] is "scan" or "upload" depending on how it was provided.
  Future<void> saveAnswerKey(
    String courseId,
    String path,
    String type,
  ) async {
    await (_db.update(_db.courses)..where((t) => t.id.equals(courseId))).write(
      CoursesCompanion(
        answerKeyPath: Value(path),
        answerKeyType: Value(type),
        updatedAt: Value(DateTime.now()),
      ),
    );
  }

  /// Returns the question paper local path for a course, or null if not set.
  Future<String?> getQuestionPaperPath(String courseId) async {
    final row = await (_db.select(_db.courses)
          ..where((t) => t.id.equals(courseId)))
        .getSingleOrNull();
    return row?.questionPaperPath;
  }

  /// Returns the answer key local path for a course, or null if not set.
  Future<String?> getAnswerKeyPath(String courseId) async {
    final row = await (_db.select(_db.courses)
          ..where((t) => t.id.equals(courseId)))
        .getSingleOrNull();
    return row?.answerKeyPath;
  }

  // ---------------------------------------------------------------------------
  // Sync query methods (Phase 5)
  // ---------------------------------------------------------------------------

  /// Watches submissions pending upload (syncStatus=1, status='pending') in
  /// FIFO order by creation time. Returns a reactive Drift stream.
  Stream<List<Submission>> watchPendingUploads() {
    return (_db.select(_db.submissions)
          ..where(
              (t) => t.syncStatus.equals(1) & t.status.equals('pending'))
          ..orderBy([(t) => OrderingTerm.asc(t.createdAt)]))
        .watch();
  }

  /// Watches all submissions for a course, ordered newest first.
  /// Used by the UI to display sync status per-submission.
  Stream<List<Submission>> watchSubmissionsForCourse(String courseId) {
    return (_db.select(_db.submissions)
          ..where((t) => t.courseId.equals(courseId))
          ..orderBy([(t) => OrderingTerm.desc(t.createdAt)]))
        .watch();
  }

  /// Marks a submission as currently uploading.
  Future<void> markSubmissionUploading(String submissionId) async {
    await (_db.update(_db.submissions)
          ..where((t) => t.id.equals(submissionId)))
        .write(SubmissionsCompanion(
      status: const Value('uploading'),
      updatedAt: Value(DateTime.now()),
    ));
  }

  /// Marks a submission and all its pages as synced.
  ///
  /// Runs in a Drift transaction so the submission and its scanned pages
  /// are updated atomically.
  Future<void> markSubmissionSynced(
    String submissionId,
    String serverSessionId,
  ) async {
    await _db.transaction(() async {
      final now = DateTime.now();

      await (_db.update(_db.submissions)
            ..where((t) => t.id.equals(submissionId)))
          .write(SubmissionsCompanion(
        syncStatus: const Value(0),
        status: const Value('synced'),
        serverId: Value(serverSessionId),
        updatedAt: Value(now),
      ));

      await (_db.update(_db.scannedPages)
            ..where((t) => t.submissionId.equals(submissionId)))
          .write(ScannedPagesCompanion(
        syncStatus: const Value(0),
        updatedAt: Value(now),
      ));
    });
  }

  /// Marks a submission as failed after an upload error.
  Future<void> markSubmissionFailed(String submissionId) async {
    await (_db.update(_db.submissions)
          ..where((t) => t.id.equals(submissionId)))
        .write(SubmissionsCompanion(
      status: const Value('failed'),
      updatedAt: Value(DateTime.now()),
    ));
  }

  /// Resets submissions stuck in 'uploading' state back to 'pending'.
  ///
  /// Called on app startup to recover from app kill during upload.
  Future<void> resetOrphanedUploads() async {
    await (_db.update(_db.submissions)
          ..where((t) => t.status.equals('uploading')))
        .write(SubmissionsCompanion(
      status: const Value('pending'),
      syncStatus: const Value(1),
      updatedAt: Value(DateTime.now()),
    ));
  }

  /// Returns scanned pages for a submission that have not yet been uploaded.
  Future<List<ScannedPage>> getUnuploadedPages(String submissionId) async {
    return (_db.select(_db.scannedPages)
          ..where((t) =>
              t.submissionId.equals(submissionId) & t.uploadedUrl.isNull())
          ..orderBy([(t) => OrderingTerm.asc(t.pageNumber)]))
        .get();
  }

  /// Sets the grading requested flag on a submission.
  Future<void> setGradingRequested(String submissionId, bool requested) async {
    await (_db.update(_db.submissions)
          ..where((t) => t.id.equals(submissionId)))
        .write(SubmissionsCompanion(
      gradingRequested: Value(requested),
      updatedAt: Value(DateTime.now()),
    ));
  }

  /// Checks if a submission already exists for a student's roll number in a
  /// given course. Used for duplicate prevention during identity verification.
  ///
  /// Performs a case-insensitive match on the student's roll number by joining
  /// the submissions and students tables.
  Future<bool> hasSubmissionForRollNumber(
    String courseId,
    String rollNumber,
  ) async {
    final query = _db.select(_db.submissions).join([
      innerJoin(
        _db.students,
        _db.students.id.equalsExp(_db.submissions.studentId),
      ),
    ]);
    query.where(
      _db.submissions.courseId.equals(courseId) &
          _db.students.rollNumber.lower().equals(rollNumber.toLowerCase()),
    );

    final results = await query.get();
    return results.isNotEmpty;
  }
}

/// Provides a singleton [ScanRepository] wired to the app's database.
final scanRepositoryProvider = Provider<ScanRepository>((ref) {
  return ScanRepository(db: ref.watch(appDatabaseProvider));
});

/// Watches all submissions for a course with their sync status.
///
/// Returns a reactive `Map<String, SubmissionDto>` keyed by studentId.
/// When UploadQueueService changes a submission's status in the DB, this
/// stream automatically re-fires and the UI updates in real-time.
final submissionStatusProvider =
    StreamProvider.family<Map<String, SubmissionDto>, String>(
        (ref, courseId) {
  final db = ref.watch(appDatabaseProvider);
  return (db.select(db.submissions)
        ..where((t) => t.courseId.equals(courseId))
        ..orderBy([(t) => OrderingTerm.desc(t.createdAt)]))
      .watch()
      .map((rows) {
    final map = <String, SubmissionDto>{};
    for (final row in rows) {
      // Use first submission per student (most recent due to DESC order)
      final dto = SubmissionDto.fromDrift(row);
      map.putIfAbsent(dto.studentId, () => dto);
    }
    return map;
  });
});
