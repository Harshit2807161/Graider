import 'package:drift/drift.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:graider/core/database/app_database.dart';
import 'package:graider/core/models/submission_dto.dart';

void main() {
  group('SubmissionDto', () {
    final now = DateTime(2026, 2, 18, 12, 0, 0);

    test('toDriftCompanion creates valid companion with defaults', () {
      final dto = SubmissionDto(
        id: 'sub-1',
        studentId: 'stu-1',
        courseId: 'crs-1',
        status: 'pending',
        createdAt: now,
        updatedAt: now,
      );

      final companion = dto.toDriftCompanion();

      expect(companion.id.value, 'sub-1');
      expect(companion.syncStatus.value, 1); // default pending_create
      expect(companion.studentId.value, 'stu-1');
      expect(companion.courseId.value, 'crs-1');
      expect(companion.status.value, 'pending');
      expect(companion.gradingRequested.value, false);
    });

    test('toDriftCompanion respects custom syncStatus', () {
      final dto = SubmissionDto(
        id: 'sub-1',
        studentId: 'stu-1',
        courseId: 'crs-1',
        status: 'synced',
        createdAt: now,
        updatedAt: now,
      );

      final companion = dto.toDriftCompanion(syncStatus: 0);
      expect(companion.syncStatus.value, 0);
    });

    test('gradingRequested defaults to false', () {
      final dto = SubmissionDto(
        id: 'sub-1',
        studentId: 'stu-1',
        courseId: 'crs-1',
        status: 'pending',
        createdAt: now,
        updatedAt: now,
      );

      expect(dto.gradingRequested, false);
    });

    test('preserves serverId when present', () {
      final dto = SubmissionDto(
        id: 'sub-1',
        serverId: 'server-abc',
        studentId: 'stu-1',
        courseId: 'crs-1',
        status: 'synced',
        createdAt: now,
        updatedAt: now,
      );

      final companion = dto.toDriftCompanion();
      expect(companion.serverId.value, 'server-abc');
    });
  });
}
