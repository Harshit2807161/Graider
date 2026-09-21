import 'package:dio/dio.dart';
import 'package:drift/drift.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../database/app_database.dart';
import '../models/course_dto.dart';
import '../network/api_client.dart';
import '../providers/user_profile_provider.dart';

/// Repository providing course CRUD with API calls and Drift caching.
///
/// Data flow: API -> [CourseDto] -> Drift cache -> UI.
/// On API failure, falls back to cached data in Drift.
class CourseRepository {
  CourseRepository({required Dio dio, required AppDatabase db})
      : _dio = dio,
        _db = db;

  final Dio _dio;
  final AppDatabase _db;

  /// Fetches courses from the backend API and caches them in Drift.
  ///
  /// On success: clears stale local data and inserts fresh API results.
  /// On failure: falls back to [getCachedCourses].
  Future<List<CourseDto>> fetchCourses(String orgId) async {
    try {
      final response = await _dio.get<List<dynamic>>(
        '/batches',
        queryParameters: {'org_id': orgId},
      );

      final courses = (response.data ?? [])
          .map((e) => CourseDto.fromJson(e as Map<String, dynamic>))
          .toList();

      // Cache fresh data to Drift
      await _db.transaction(() async {
        // Clear existing cached courses and re-insert from API
        await _db.delete(_db.courses).go();
        for (final course in courses) {
          await _db.into(_db.courses).insertOnConflictUpdate(
                course.toDriftCompanion(),
              );
        }
      });

      return courses;
    } on DioException {
      // Network error -- fall back to cached data
      return getCachedCourses();
    } catch (_) {
      // Any other error -- fall back to cached data
      return getCachedCourses();
    }
  }

  /// Returns courses from the local Drift cache, ordered by most recent.
  Future<List<CourseDto>> getCachedCourses() async {
    final rows = await (_db.select(_db.courses)
          ..orderBy([(t) => OrderingTerm.desc(t.updatedAt)]))
        .get();
    return rows.map(CourseDto.fromDrift).toList();
  }

  /// Creates a new course via the backend API (online only).
  ///
  /// On success: inserts the new course into Drift cache and returns it.
  /// Throws on failure so callers can display an error.
  Future<CourseDto> createCourse(String orgId, String name) async {
    final response = await _dio.post<Map<String, dynamic>>(
      '/batches/',
      data: {
        'org_id': orgId,
        'name': name,
      },
    );

    final course = CourseDto.fromJson(response.data!);

    // Cache the newly created course
    await _db.into(_db.courses).insertOnConflictUpdate(
          course.toDriftCompanion(),
        );

    return course;
  }

  /// Computes the total number of papers pending grading across all courses.
  ///
  /// Calculates from cached course data: sum of (totalStudents - gradedCount)
  /// for courses that are not stopped.
  Future<int> getPendingGradingCount() async {
    final rows = await (_db.select(_db.courses)
          ..where((t) => t.status.isNotValue('stopped')))
        .get();
    return rows.fold<int>(
      0,
      (sum, row) => sum + (row.totalStudents - row.gradedCount),
    );
  }
}

// ---------------------------------------------------------------------------
// Riverpod providers
// ---------------------------------------------------------------------------

/// Provides a singleton [CourseRepository] wired to the app's Dio and database.
final courseRepositoryProvider = Provider<CourseRepository>((ref) {
  return CourseRepository(
    dio: ref.watch(dioProvider),
    db: ref.watch(appDatabaseProvider),
  );
});

/// Provides the list of courses as an [AsyncValue], auto-refreshing on
/// invalidation.
///
/// If the user has an org_id, fetches from the API (with Drift fallback).
/// If org_id is null (e.g., offline with no stored org), returns cached data.
final courseListProvider = FutureProvider<List<CourseDto>>((ref) async {
  final repo = ref.watch(courseRepositoryProvider);
  final profile = await ref.watch(userProfileProvider.future);
  if (profile?.orgId == null) {
    // No org resolved -- return cached data (graceful degradation)
    return repo.getCachedCourses();
  }
  return repo.fetchCourses(profile!.orgId!);
});

/// Provides the pending grading count across all cached courses.
///
/// Derived from [courseListProvider] to stay consistent with displayed data.
final pendingGradingCountProvider = FutureProvider<int>((ref) async {
  final courses = await ref.watch(courseListProvider.future);
  return courses.fold<int>(
    0,
    (sum, c) => sum + (c.totalStudents - c.gradedCount).clamp(0, 999999),
  );
});
