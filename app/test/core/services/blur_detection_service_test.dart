import 'dart:io';
import 'dart:typed_data';

import 'package:flutter_test/flutter_test.dart';
import 'package:image/image.dart' as img;

import 'package:graider/core/services/blur_detection_service.dart';

void main() {
  late BlurDetectionService service;
  late Directory tempDir;

  setUp(() async {
    service = BlurDetectionService();
    tempDir = await Directory.systemTemp.createTemp('blur_test_');
  });

  tearDown(() async {
    if (await tempDir.exists()) {
      await tempDir.delete(recursive: true);
    }
  });

  String _createTestImage(int width, int height, {bool sharp = true}) {
    final image = img.Image(width: width, height: height);

    if (sharp) {
      // Sharp image: high-contrast edges
      for (int y = 0; y < height; y++) {
        for (int x = 0; x < width; x++) {
          final value = ((x + y) % 2 == 0) ? 255 : 0;
          image.setPixelRgb(x, y, value, value, value);
        }
      }
    } else {
      // Blurry image: uniform gray
      for (int y = 0; y < height; y++) {
        for (int x = 0; x < width; x++) {
          image.setPixelRgb(x, y, 128, 128, 128);
        }
      }
    }

    final path = '${tempDir.path}/${sharp ? "sharp" : "blurry"}.png';
    File(path).writeAsBytesSync(img.encodePng(image));
    return path;
  }

  group('BlurDetectionService.checkBlur', () {
    test('detects sharp checkerboard image as not blurry', () async {
      final path = _createTestImage(100, 100, sharp: true);
      final result = await service.checkBlur(path);

      expect(result.isBlurry, false);
      expect(result.variance, greaterThan(100.0));
      expect(result.message, isNull);
    });

    test('detects uniform gray image as blurry', () async {
      final path = _createTestImage(100, 100, sharp: false);
      final result = await service.checkBlur(path);

      expect(result.isBlurry, true);
      expect(result.variance, lessThan(100.0));
      expect(result.message, isNotNull);
    });

    test('returns blurry for very small images', () async {
      final path = _createTestImage(2, 2, sharp: true);
      final result = await service.checkBlur(path);

      expect(result.isBlurry, true);
      expect(result.message, contains('too small'));
    });

    test('returns blurry on file read error', () async {
      final result = await service.checkBlur('/nonexistent/path.png');

      expect(result.isBlurry, true);
      expect(result.variance, 0.0);
      expect(result.message, contains('failed'));
    });

    test('respects custom threshold', () async {
      // Use the uniform gray image (variance ~0) with a low threshold
      final path = _createTestImage(100, 100, sharp: false);

      // With threshold 0.0, even a perfectly uniform image passes
      // (variance is 0.0 which is not < 0.0)
      // Actually test: high threshold on blurry image should still be blurry
      final result = await service.checkBlur(path, threshold: 1.0);
      expect(result.isBlurry, true); // variance ~0 < threshold 1.0

      // And with threshold 0, it should not be blurry (0 is not < 0)
      final result2 = await service.checkBlur(path, threshold: 0.0);
      expect(result2.isBlurry, false);
    });
  });

  group('BlurResult', () {
    test('constructor stores values correctly', () {
      const result = BlurResult(
        variance: 150.5,
        isBlurry: false,
        message: null,
      );

      expect(result.variance, 150.5);
      expect(result.isBlurry, false);
      expect(result.message, isNull);
    });
  });
}
