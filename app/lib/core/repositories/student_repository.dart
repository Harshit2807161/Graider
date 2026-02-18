import 'package:dio/dio.dart';
import 'package:drift/drift.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';

import '../database/app_database.dart';
import '../models/student_dto.dart';
import '../network/api_client.dart';
import 'course_repository.dart';

/// Repository providing student CRUD with API calls and Drift caching.
///
/// Data flow: API -> [StudentDto] -> Drift cache -> UI.
/// On API failure (including 404 when endpoint doesn't exist), falls back
/// to cached data in Drift.
///
/// **Known API gap:** The backend does not have a "list enrolled students"
/// endpoint (`GET /batches/{batch_id}/members`). The repository handles
/// this gracefully by falling through to cached/locally-added students
/// on any API failure.
class StudentRepository {
  StudentRepository({required Dio dio, required AppDatabase db})
      : _dio = dio,
        _db = db;

  final Dio _dio;
  final AppDatabase _db;

  /// Fetches students for a course from the backend API and caches in Drift.
  ///
  /// On success: upserts students into Drift for this courseId.
  /// On failure (including 404 if endpoint doesn't exist): falls back to
  /// [getCachedStudents].
  ///
  /// If [serverId] is null (offline-created course), skips API and goes
  /// directly to cache.
  Future<List<StudentDto>> fetchStudents(
    String courseId, {
    String? serverId,
  }) async {
    if (serverId == null) {
      return getCachedStudents(courseId);
    }

    try {
      final response = await _dio.get<List<dynamic>>(
        '/batches/$serverId/members',
      );

      final students = (response.data ?? [])
          .map((e) =>
              StudentDto.fromJson(e as Map<String, dynamic>, courseId))
          .toList();

      // Cache fresh data to Drift
      await _db.transaction(() async {
        // Remove existing synced students for this course before re-insert
        await (_db.delete(_db.students)
              ..where((t) =>
                  t.courseId.equals(courseId) & t.syncStatus.equals(0)))
            .go();

        for (final student in students) {
          await _db
              .into(_db.students)
              .insertOnConflictUpdate(student.toDriftCompanion());
        }
      });

      // Return all students (synced + locally added)
      return getCachedStudents(courseId);
    } on DioException {
      // Network error or 404 -- fall back to cached data
      return getCachedStudents(courseId);
    } catch (_) {
      // Any other error -- fall back to cached data
      return getCachedStudents(courseId);
    }
  }

  /// Returns students from the local Drift cache for a course,
  /// ordered by roll number ascending.
  Future<List<StudentDto>> getCachedStudents(String courseId) async {
    final rows = await (_db.select(_db.students)
          ..where((t) => t.courseId.equals(courseId))
          ..orderBy([(t) => OrderingTerm.asc(t.rollNumber)]))
        .get();
    return rows.map(StudentDto.fromDrift).toList();
  }

  /// Adds a student to a course locally in Drift.
  ///
  /// Created with `syncStatus = 1` (pending_create) since manually added
  /// students from the app may not have backend accounts. The sync layer
  /// (Phase 5) will handle uploading.
  Future<StudentDto> addStudent(
    String courseId,
    String name,
    String rollNumber,
  ) async {
    final now = DateTime.now();
    final student = StudentDto(
      id: const Uuid().v4(),
      courseId: courseId,
      name: name,
      rollNumber: rollNumber,
      gradingStatus: 'pending',
      createdAt: now,
      updatedAt: now,
    );

    await _db
        .into(_db.students)
        .insert(student.toDriftCompanion(syncStatus: 1));

    return student;
  }

  /// Pure function: filters students by name or roll number.
  ///
  /// Returns students whose [name] or [rollNumber] contains [query]
  /// (case-insensitive).
  static List<StudentDto> filterStudents(
    List<StudentDto> students,
    String query,
  ) {
    if (query.isEmpty) return students;
    final lowerQuery = query.toLowerCase();
    return students
        .where((s) =>
            s.name.toLowerCase().contains(lowerQuery) ||
            s.rollNumber.toLowerCase().contains(lowerQuery))
        .toList();
  }
}

// ---------------------------------------------------------------------------
// Riverpod providers
// ---------------------------------------------------------------------------

/// Provides a singleton [StudentRepository] wired to the app's Dio and database.
final studentRepositoryProvider = Provider<StudentRepository>((ref) {
  return StudentRepository(
    dio: ref.watch(dioProvider),
    db: ref.watch(appDatabaseProvider),
  );
});

/// Family provider keyed by courseId for per-course student lists.
///
/// Fetches students from the API (with Drift fallback) using the course's
/// serverId. If the course has no serverId (offline-created), returns cached
/// data only.
final studentListProvider =
    FutureProvider.family<List<StudentDto>, String>((ref, courseId) async {
  final repo = ref.watch(studentRepositoryProvider);

  // Get the course to find its serverId for the API call
  final courseRepo = ref.watch(courseRepositoryProvider);
  final courses = await courseRepo.getCachedCourses();
  final course = courses.where((c) => c.id == courseId).firstOrNull;

  return repo.fetchStudents(courseId, serverId: course?.serverId);
});
