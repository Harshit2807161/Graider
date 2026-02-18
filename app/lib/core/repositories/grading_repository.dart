import 'dart:async';

import 'package:dio/dio.dart';
import 'package:drift/drift.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../constants/api_constants.dart';
import '../database/app_database.dart';
import '../models/grading_result_dto.dart';
import '../network/api_client.dart';

// ---------------------------------------------------------------------------
// Response models
// ---------------------------------------------------------------------------

/// Response from the grading status endpoint.
class GradingStatusResponse {
  const GradingStatusResponse({
    required this.status,
    this.progress = 0,
    this.currentStep,
    this.errorMessage,
  });

  /// Pipeline status: pending, uploading, ocr_processing, triplet_forming,
  /// grading, completed, failed, error.
  final String status;

  /// Progress percentage (0-100).
  final double progress;

  /// Human-readable description of the current step.
  final String? currentStep;

  /// Error message if status is 'failed' or 'error'.
  final String? errorMessage;

  factory GradingStatusResponse.fromJson(Map<String, dynamic> json) {
    return GradingStatusResponse(
      status: json['status'] as String? ?? 'unknown',
      progress: (json['progress'] as num?)?.toDouble() ?? 0,
      currentStep: json['current_step'] as String?,
      errorMessage: json['error_message'] as String?,
    );
  }

  /// Creates an error response for when the API call itself fails.
  factory GradingStatusResponse.error(String message) {
    return GradingStatusResponse(
      status: 'error',
      errorMessage: message,
    );
  }
}

// ---------------------------------------------------------------------------
// GradingRepository
// ---------------------------------------------------------------------------

/// Repository handling grading result fetching, local persistence, and
/// professor overrides.
///
/// Backend API methods target the legacy routes (`/api/status/` and
/// `/api/results/`) which are NOT under the v1 prefix. These endpoints
/// gracefully degrade -- returning error/empty when unavailable.
///
/// **Known backend gap:** The legacy status and results routes may not be
/// mounted in main.py. The repository handles this by catching DioExceptions
/// and returning safe defaults. See STATE.md for details.
class GradingRepository {
  GradingRepository({required Dio dio, required AppDatabase db})
      : _dio = dio,
        _db = db;

  final Dio _dio;
  final AppDatabase _db;

  // -------------------------------------------------------------------------
  // Backend API methods (legacy routes)
  // -------------------------------------------------------------------------

  /// Fetches the grading pipeline status for a session.
  ///
  /// GET /api/status/{sessionId} -- legacy route, NOT v1 prefix.
  /// On failure, returns a [GradingStatusResponse] with status='error'.
  Future<GradingStatusResponse> fetchStatus(String sessionId) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '${ApiConstants.baseUrl}/api/status/$sessionId',
      );

      return GradingStatusResponse.fromJson(
        response.data ?? <String, dynamic>{},
      );
    } on DioException catch (e) {
      return GradingStatusResponse.error(
        e.message ?? 'Failed to fetch grading status',
      );
    } catch (e) {
      return GradingStatusResponse.error(e.toString());
    }
  }

  /// Fetches per-question grading results for a completed session.
  ///
  /// GET /api/results/{sessionId} -- legacy route, NOT v1 prefix.
  /// On failure, returns an empty list.
  ///
  /// Returns a record containing the list of per-question results and
  /// the overall totals from the response.
  Future<({List<GradingResultDto> results, double totalScore, double maxTotalScore, double overallPercentage})>
      fetchResults(
    String sessionId, {
    required String submissionId,
    required String studentId,
    required String courseId,
  }) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '${ApiConstants.baseUrl}/api/results/$sessionId',
      );

      final data = response.data ?? <String, dynamic>{};
      final resultsJson = data['results'] as List<dynamic>? ?? [];

      final results = resultsJson
          .map((e) => GradingResultDto.fromJson(
                e as Map<String, dynamic>,
                submissionId: submissionId,
                studentId: studentId,
                courseId: courseId,
              ))
          .toList();

      return (
        results: results,
        totalScore: (data['total_score'] as num?)?.toDouble() ?? 0,
        maxTotalScore: (data['max_total_score'] as num?)?.toDouble() ?? 0,
        overallPercentage:
            (data['overall_percentage'] as num?)?.toDouble() ?? 0,
      );
    } on DioException {
      return (
        results: <GradingResultDto>[],
        totalScore: 0.0,
        maxTotalScore: 0.0,
        overallPercentage: 0.0,
      );
    } catch (_) {
      return (
        results: <GradingResultDto>[],
        totalScore: 0.0,
        maxTotalScore: 0.0,
        overallPercentage: 0.0,
      );
    }
  }

  // -------------------------------------------------------------------------
  // Local persistence methods
  // -------------------------------------------------------------------------

  /// Saves grading results to the local Drift database.
  ///
  /// Uses insertOnConflictUpdate for upsert behavior by id.
  Future<void> saveResults(List<GradingResultDto> results) async {
    await _db.batch((batch) {
      for (final result in results) {
        batch.insert(
          _db.gradingResults,
          result.toDriftCompanion(),
          onConflict: DoUpdate((_) => result.toDriftCompanion()),
        );
      }
    });
  }

  /// Returns locally cached grading results for a submission.
  ///
  /// Ordered by questionId ascending for consistent display.
  Future<List<GradingResultDto>> getLocalResults(String submissionId) async {
    final rows = await (_db.select(_db.gradingResults)
          ..where((t) => t.submissionId.equals(submissionId))
          ..orderBy([(t) => OrderingTerm.asc(t.questionId)]))
        .get();
    return rows.map(GradingResultDto.fromDrift).toList();
  }

  /// Watches locally cached grading results for reactive UI updates.
  ///
  /// Same query as [getLocalResults] but returns a Drift stream.
  Stream<List<GradingResultDto>> watchLocalResults(String submissionId) {
    return (_db.select(_db.gradingResults)
          ..where((t) => t.submissionId.equals(submissionId))
          ..orderBy([(t) => OrderingTerm.asc(t.questionId)]))
        .watch()
        .map((rows) => rows.map(GradingResultDto.fromDrift).toList());
  }

  // -------------------------------------------------------------------------
  // Override methods
  // -------------------------------------------------------------------------

  /// Saves a professor's score override for a grading result.
  ///
  /// Sets isOverridden=true, overrideScore, and optional overrideNote.
  /// The original AI score in the `score` column is never modified.
  Future<void> saveOverride(
    String resultId,
    double newScore,
    String? note,
  ) async {
    await (_db.update(_db.gradingResults)
          ..where((t) => t.id.equals(resultId)))
        .write(GradingResultsCompanion(
      isOverridden: const Value(true),
      overrideScore: Value(newScore),
      overrideNote: Value(note),
      updatedAt: Value(DateTime.now()),
    ));
  }

  /// Reverts a professor's override, restoring the original AI score.
  Future<void> revertOverride(String resultId) async {
    await (_db.update(_db.gradingResults)
          ..where((t) => t.id.equals(resultId)))
        .write(GradingResultsCompanion(
      isOverridden: const Value(false),
      overrideScore: const Value(null),
      overrideNote: const Value(null),
      updatedAt: Value(DateTime.now()),
    ));
  }

  // -------------------------------------------------------------------------
  // Student status update
  // -------------------------------------------------------------------------

  /// Updates a student's grading status and optional total scores.
  ///
  /// Called when polling detects grading completion or failure.
  Future<void> updateStudentGradingStatus(
    String studentId,
    String status, {
    double? totalScore,
    double? maxScore,
  }) async {
    await (_db.update(_db.students)
          ..where((t) => t.id.equals(studentId)))
        .write(StudentsCompanion(
      gradingStatus: Value(status),
      totalScore: Value(totalScore),
      maxScore: Value(maxScore),
      updatedAt: Value(DateTime.now()),
    ));
  }
}

// ---------------------------------------------------------------------------
// Riverpod providers
// ---------------------------------------------------------------------------

/// Provides a singleton [GradingRepository] wired to Dio and AppDatabase.
final gradingRepositoryProvider = Provider<GradingRepository>((ref) {
  return GradingRepository(
    dio: ref.watch(dioProvider),
    db: ref.watch(appDatabaseProvider),
  );
});

/// Polls the backend for grading status updates on a submission.
///
/// Emits status strings ('pending', 'processing', 'grading', 'graded',
/// 'failed', 'error'). When status is 'completed', fetches full results,
/// saves them locally, updates the student's grading status, and stops.
///
/// Only polls if the submission is synced and grading was requested.
final gradingStatusPollerProvider =
    StreamProvider.family<String, String>((ref, submissionId) async* {
  final db = ref.watch(appDatabaseProvider);
  final repo = ref.watch(gradingRepositoryProvider);

  // Look up the submission to get its serverId (backend session_id)
  final submission = await (_db(db).select(db.submissions)
        ..where((t) => t.id.equals(submissionId)))
      .getSingleOrNull();

  if (submission == null) {
    yield 'pending';
    return;
  }

  // Only poll if grading was requested and submission is synced
  if (!submission.gradingRequested || submission.status != 'synced') {
    yield submission.status;
    return;
  }

  final sessionId = submission.serverId;
  if (sessionId == null) {
    yield 'pending';
    return;
  }

  // Poll every 5 seconds
  await for (final _ in Stream.periodic(const Duration(seconds: 5))) {
    final statusResponse = await repo.fetchStatus(sessionId);

    if (statusResponse.status == 'completed') {
      // Fetch full results
      final resultData = await repo.fetchResults(
        sessionId,
        submissionId: submissionId,
        studentId: submission.studentId,
        courseId: submission.courseId,
      );

      // Save results locally
      if (resultData.results.isNotEmpty) {
        await repo.saveResults(resultData.results);
      }

      // Update student grading status
      await repo.updateStudentGradingStatus(
        submission.studentId,
        'graded',
        totalScore: resultData.totalScore,
        maxScore: resultData.maxTotalScore,
      );

      yield 'graded';
      return; // Stop polling
    } else if (statusResponse.status == 'failed') {
      await repo.updateStudentGradingStatus(
        submission.studentId,
        'failed',
      );
      yield 'failed';
      return; // Stop polling
    } else if (statusResponse.status == 'error') {
      // Network/API error -- continue polling (transient failure)
      yield 'error';
    } else {
      yield statusResponse.status;
    }
  }
});

/// Provides grading results for a submission (local-first with backend fallback).
///
/// First checks the local Drift cache. If results exist locally, returns them.
/// If not, attempts to fetch from the backend using the submission's serverId.
final studentGradingResultsProvider =
    FutureProvider.family<List<GradingResultDto>, String>(
        (ref, submissionId) async {
  final repo = ref.watch(gradingRepositoryProvider);
  final db = ref.watch(appDatabaseProvider);

  // Try local results first
  final localResults = await repo.getLocalResults(submissionId);
  if (localResults.isNotEmpty) {
    return localResults;
  }

  // No local results -- try fetching from backend
  final submission = await (db.select(db.submissions)
        ..where((t) => t.id.equals(submissionId)))
      .getSingleOrNull();

  if (submission == null || submission.serverId == null) {
    return [];
  }

  final resultData = await repo.fetchResults(
    submission.serverId!,
    submissionId: submissionId,
    studentId: submission.studentId,
    courseId: submission.courseId,
  );

  // Cache locally for future access
  if (resultData.results.isNotEmpty) {
    await repo.saveResults(resultData.results);
  }

  return resultData.results;
});

// ---------------------------------------------------------------------------
// Internal helper
// ---------------------------------------------------------------------------

/// Helper to get a reference to [AppDatabase] for use in provider callbacks
/// where we need both the database instance and to use it for select queries.
AppDatabase _db(AppDatabase db) => db;
