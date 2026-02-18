import 'dart:async';
import 'dart:developer' as developer;

import 'package:drift/drift.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../database/app_database.dart';
import '../repositories/scan_repository.dart';
import '../repositories/upload_repository.dart';
import 'connectivity_service.dart';

/// Manages the upload queue for pending submissions.
///
/// Listens for connectivity changes and automatically processes the queue
/// when online. Supports concurrency control (max 3 parallel uploads),
/// startup recovery from app kill, and per-submission error isolation.
class UploadQueueService {
  UploadQueueService({
    required AppDatabase db,
    required ScanRepository scanRepo,
    required UploadRepository uploadRepo,
  })  : _db = db,
        _scanRepo = scanRepo,
        _uploadRepo = uploadRepo;

  final AppDatabase _db;
  final ScanRepository _scanRepo;
  final UploadRepository _uploadRepo;

  static const int _maxConcurrency = 3;
  int _activeUploads = 0;
  bool _isProcessing = false;

  /// Initializes the upload queue service on app startup.
  ///
  /// Resets orphaned uploads (stuck in 'uploading' state from app kill)
  /// back to 'pending', then immediately attempts to process the queue.
  Future<void> initialize() async {
    developer.log('Initializing upload queue service', name: 'UploadQueue');
    await _scanRepo.resetOrphanedUploads();
    await processQueue();
  }

  /// Processes all pending submissions in FIFO order.
  ///
  /// Uses a batch approach (10 at a time) with a concurrency limiter of
  /// [_maxConcurrency] parallel uploads. Re-entrant calls are ignored.
  Future<void> processQueue() async {
    if (_isProcessing) return;
    _isProcessing = true;

    try {
      final pending = await (_db.select(_db.submissions)
            ..where(
                (t) => t.syncStatus.equals(1) & t.status.equals('pending'))
            ..orderBy([(t) => OrderingTerm.asc(t.createdAt)])
            ..limit(10))
          .get();

      if (pending.isEmpty) {
        developer.log('No pending uploads', name: 'UploadQueue');
        return;
      }

      developer.log(
        'Processing ${pending.length} pending uploads',
        name: 'UploadQueue',
      );

      final futures = <Future<void>>[];

      for (final submission in pending) {
        // Wait for a slot to open if at max concurrency
        while (_activeUploads >= _maxConcurrency) {
          await Future.any(futures);
        }

        _activeUploads++;
        final future = _uploadSingleSubmission(submission)
            .whenComplete(() => _activeUploads--);
        futures.add(future);
      }

      // Wait for all uploads in this batch to complete
      await Future.wait(futures);

      // Check for more pending submissions (next batch)
      _isProcessing = false;
      final morePending = await (_db.select(_db.submissions)
            ..where(
                (t) => t.syncStatus.equals(1) & t.status.equals('pending'))
            ..limit(1))
          .get();

      if (morePending.isNotEmpty) {
        await processQueue();
      }
    } finally {
      _isProcessing = false;
    }
  }

  /// Uploads a single submission's pages to the backend.
  ///
  /// On success, marks the submission as synced. If the professor had
  /// requested grading, automatically submits for grading (failure to
  /// submit for grading does NOT revert the upload).
  ///
  /// On failure, marks the submission as failed without rethrowing --
  /// one failed upload should not block the rest of the queue.
  Future<void> _uploadSingleSubmission(Submission submission) async {
    try {
      await _scanRepo.markSubmissionUploading(submission.id);

      final pages = await _scanRepo.getUnuploadedPages(submission.id);

      if (pages.isEmpty) {
        // Edge case: all pages already uploaded or none exist
        developer.log(
          'No unuploaded pages for submission ${submission.id}',
          name: 'UploadQueue',
        );
        await _scanRepo.markSubmissionSynced(submission.id, '');
        return;
      }

      final result = await _uploadRepo.uploadSubmission(
        submissionId: submission.id,
        pages: pages,
        existingSessionId: submission.serverId,
      );

      await _scanRepo.markSubmissionSynced(submission.id, result.sessionId);

      developer.log(
        'Uploaded submission ${submission.id} -> session ${result.sessionId}',
        name: 'UploadQueue',
      );

      // Auto-submit for grading if requested
      if (submission.gradingRequested) {
        try {
          await _uploadRepo.submitForGrading(sessionId: result.sessionId);
          developer.log(
            'Auto-submitted for grading: ${result.sessionId}',
            name: 'UploadQueue',
          );
        } catch (e) {
          // Grading submission failure should NOT revert upload success
          developer.log(
            'Failed to auto-submit for grading: $e',
            name: 'UploadQueue',
            level: 900, // WARNING
          );
        }
      }
    } catch (e) {
      developer.log(
        'Upload failed for submission ${submission.id}: $e',
        name: 'UploadQueue',
        level: 1000, // SEVERE
      );
      await _scanRepo.markSubmissionFailed(submission.id);
    }
  }

  /// Resets a failed submission back to pending and triggers queue processing.
  ///
  /// Called when the professor taps the failed sync badge for immediate retry.
  Future<void> retrySubmission(String submissionId) async {
    await (_db.update(_db.submissions)
          ..where((t) => t.id.equals(submissionId)))
        .write(SubmissionsCompanion(
      status: const Value('pending'),
      syncStatus: const Value(1),
      updatedAt: Value(DateTime.now()),
    ));

    await processQueue();
  }
}

/// Provides a singleton [UploadQueueService] wired to the app's database,
/// scan repository, and upload repository.
final uploadQueueServiceProvider = Provider<UploadQueueService>((ref) {
  return UploadQueueService(
    db: ref.watch(appDatabaseProvider),
    scanRepo: ref.watch(scanRepositoryProvider),
    uploadRepo: ref.watch(uploadRepositoryProvider),
  );
});

/// Initializes the upload queue service asynchronously on app startup.
///
/// Triggers [resetOrphanedUploads] and initial [processQueue] call.
/// Watch this provider from the app root to ensure startup recovery runs.
final uploadQueueInitProvider = FutureProvider<void>((ref) async {
  await ref.read(uploadQueueServiceProvider).initialize();
});

/// Watches connectivity and triggers upload queue processing when online.
///
/// Must be kept alive (listened to) at the app root level. When the device
/// transitions from offline to online, the upload queue is automatically
/// kicked to process pending submissions.
final syncTriggerProvider = Provider<void>((ref) {
  ref.listen<AsyncValue<bool>>(connectivityProvider, (prev, next) {
    final isOnline = next.valueOrNull ?? false;
    final wasOffline = !(prev?.valueOrNull ?? false);
    if (isOnline && wasOffline) {
      ref.read(uploadQueueServiceProvider).processQueue();
    }
  });
});
