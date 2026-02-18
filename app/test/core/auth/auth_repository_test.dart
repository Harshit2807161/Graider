import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:graider/core/auth/auth_repository.dart';

class MockDio extends Mock implements Dio {}

class MockSecureStorage extends Mock implements FlutterSecureStorage {}

void main() {
  late MockDio mockDio;
  late MockSecureStorage mockStorage;
  late AuthRepository repo;

  setUp(() {
    mockDio = MockDio();
    mockStorage = MockSecureStorage();
    repo = AuthRepository(dio: mockDio, secureStorage: mockStorage);
  });

  group('AuthRepository.login', () {
    test('sends form-encoded POST and persists token + email', () async {
      when(() => mockDio.post<Map<String, dynamic>>(
            '/auth/login',
            data: any(named: 'data'),
            options: any(named: 'options'),
          )).thenAnswer((_) async => Response(
            data: {'access_token': 'jwt-abc-123'},
            statusCode: 200,
            requestOptions: RequestOptions(path: '/auth/login'),
          ));

      when(() => mockStorage.write(key: any(named: 'key'), value: any(named: 'value')))
          .thenAnswer((_) async {});

      final token = await repo.login('user@test.com', 'pass123');

      expect(token, 'jwt-abc-123');

      verify(() => mockStorage.write(key: 'auth_jwt_token', value: 'jwt-abc-123'))
          .called(1);
      verify(() => mockStorage.write(key: 'auth_last_email', value: 'user@test.com'))
          .called(1);
    });

    test('rethrows DioException on login failure', () async {
      when(() => mockDio.post<Map<String, dynamic>>(
            '/auth/login',
            data: any(named: 'data'),
            options: any(named: 'options'),
          )).thenThrow(DioException(
            type: DioExceptionType.badResponse,
            response: Response(
              statusCode: 401,
              requestOptions: RequestOptions(path: '/auth/login'),
            ),
            requestOptions: RequestOptions(path: '/auth/login'),
          ));

      expect(
        () => repo.login('bad@test.com', 'wrong'),
        throwsA(isA<DioException>()),
      );
    });
  });

  group('AuthRepository.getStoredToken', () {
    test('returns stored token', () async {
      when(() => mockStorage.read(key: 'auth_jwt_token'))
          .thenAnswer((_) async => 'stored-token');

      final token = await repo.getStoredToken();
      expect(token, 'stored-token');
    });

    test('returns null when no token stored', () async {
      when(() => mockStorage.read(key: 'auth_jwt_token'))
          .thenAnswer((_) async => null);

      final token = await repo.getStoredToken();
      expect(token, isNull);
    });
  });

  group('AuthRepository.clearToken', () {
    test('deletes only token, keeps email', () async {
      when(() => mockStorage.delete(key: 'auth_jwt_token'))
          .thenAnswer((_) async {});

      await repo.clearToken();

      verify(() => mockStorage.delete(key: 'auth_jwt_token')).called(1);
      verifyNever(() => mockStorage.delete(key: 'auth_last_email'));
    });
  });

  group('AuthRepository.clearAll', () {
    test('deletes both token and email', () async {
      when(() => mockStorage.delete(key: any(named: 'key')))
          .thenAnswer((_) async {});

      await repo.clearAll();

      verify(() => mockStorage.delete(key: 'auth_jwt_token')).called(1);
      verify(() => mockStorage.delete(key: 'auth_last_email')).called(1);
    });
  });
}
