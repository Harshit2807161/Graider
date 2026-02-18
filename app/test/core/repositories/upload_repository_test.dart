import 'dart:io';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:graider/core/repositories/upload_repository.dart';

class MockDio extends Mock implements Dio {}

class FakeRequestOptions extends Fake implements RequestOptions {}

void main() {
  late MockDio mockDio;
  late UploadRepository repo;
  late Directory tempDir;

  setUpAll(() {
    registerFallbackValue(FakeRequestOptions());
    registerFallbackValue(FormData());
    registerFallbackValue(Options());
  });

  setUp(() async {
    mockDio = MockDio();
    repo = UploadRepository(dio: mockDio);
    tempDir = await Directory.systemTemp.createTemp('upload_test_');
  });

  tearDown(() async {
    if (await tempDir.exists()) {
      await tempDir.delete(recursive: true);
    }
  });

  group('UploadRepository.uploadQuestionPaper', () {
    test('posts to /upload/questions with file', () async {
      // Create a real temp file so MultipartFile.fromFile can read it
      final testFile = File('${tempDir.path}/test.jpg');
      await testFile.writeAsBytes([0xFF, 0xD8, 0xFF]); // minimal JPEG header

      when(() => mockDio.post(
            '/upload/questions',
            data: any(named: 'data'),
            options: any(named: 'options'),
          )).thenAnswer((_) async => Response(
            data: {'session_id': 'sess-123', 'message': 'OK'},
            statusCode: 200,
            requestOptions: RequestOptions(path: '/upload/questions'),
          ));

      final result = await repo.uploadQuestionPaper(filePaths: [testFile.path]);

      expect(result.sessionId, 'sess-123');
      expect(result.message, 'OK');
    });
  });

  group('UploadRepository.submitForGrading', () {
    test('posts to legacy /grade route', () async {
      when(() => mockDio.post(
            any(),
            data: any(named: 'data'),
          )).thenAnswer((_) async => Response(
            data: {
              'session_id': 'sess-123',
              'status': 'processing',
              'message': 'Grading started',
            },
            statusCode: 200,
            requestOptions: RequestOptions(path: '/grade'),
          ));

      final result = await repo.submitForGrading(sessionId: 'sess-123');

      expect(result.sessionId, 'sess-123');
      expect(result.status, 'processing');
    });
  });

  group('UploadResponse.fromJson', () {
    test('parses session_id and message', () {
      final response = UploadResponse.fromJson({
        'session_id': 'abc-123',
        'message': 'Upload complete',
      });

      expect(response.sessionId, 'abc-123');
      expect(response.message, 'Upload complete');
    });
  });

  group('GradeResponse.fromJson', () {
    test('parses all fields', () {
      final response = GradeResponse.fromJson({
        'session_id': 'abc-123',
        'status': 'processing',
        'message': 'Grading queued',
      });

      expect(response.sessionId, 'abc-123');
      expect(response.status, 'processing');
      expect(response.message, 'Grading queued');
    });
  });
}
