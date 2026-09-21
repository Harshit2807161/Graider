import 'dart:io';

import 'package:drift/drift.dart';
import 'package:drift/native.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';

import 'tables/courses.dart';
import 'tables/exams.dart';
import 'tables/grading_results.dart';
import 'tables/scanned_pages.dart';
import 'tables/students.dart';
import 'tables/submissions.dart';

part 'app_database.g.dart';

/// The main Drift database for Graider.
///
/// Contains all offline-first tables with UUID primary keys, sync status
/// tracking, and timestamp columns. Code generation produces companion
/// classes and compiled queries in `app_database.g.dart`.
@DriftDatabase(tables: [Courses, Exams, Students, Submissions, ScannedPages, GradingResults])
class AppDatabase extends _$AppDatabase {
  AppDatabase() : super(_openConnection());

  /// Allows injecting a custom [QueryExecutor] for testing.
  AppDatabase.forTesting(super.e);

  @override
  int get schemaVersion => 4;

  @override
  MigrationStrategy get migration => MigrationStrategy(
        onCreate: (Migrator m) async {
          await m.createAll();
        },
        onUpgrade: (Migrator m, int from, int to) async {
          if (from < 2) {
            await m.addColumn(courses, courses.questionPaperPath);
            await m.addColumn(courses, courses.answerKeyPath);
            await m.addColumn(courses, courses.questionPaperType);
            await m.addColumn(courses, courses.answerKeyType);
            await m.addColumn(scannedPages, scannedPages.type);
          }
          if (from < 3) {
            await m.addColumn(submissions, submissions.gradingRequested);
          }
          if (from < 4) {
            await m.createTable(gradingResults);
          }
        },
      );
}

/// Opens a [LazyDatabase] connection to `graider.db` in the app's documents
/// directory.
LazyDatabase _openConnection() {
  return LazyDatabase(() async {
    final dbFolder = await getApplicationDocumentsDirectory();
    final file = File(p.join(dbFolder.path, 'graider.db'));
    return NativeDatabase.createInBackground(file);
  });
}

/// Riverpod provider exposing the singleton [AppDatabase] instance.
///
/// The database is closed when the provider is disposed (e.g., app shutdown).
final appDatabaseProvider = Provider<AppDatabase>((ref) {
  final db = AppDatabase();
  ref.onDispose(() => db.close());
  return db;
});
