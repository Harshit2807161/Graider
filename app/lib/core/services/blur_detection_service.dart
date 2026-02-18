import 'dart:io';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image/image.dart' as img;

/// On-device blur detection using Laplacian variance.
///
/// Warns but does not block. Called both immediately after capture and in
/// the review screen. Runs entirely on-device using the `image` package --
/// no network dependency, works offline.
class BlurDetectionService {
  /// Default Laplacian variance threshold below which an image is considered
  /// blurry. Empirically, blurry documents score under 50; sharp documents
  /// score 200+. 100.0 is a reasonable starting point.
  static const double defaultThreshold = 100.0;

  /// Analyzes an image file for blur using Laplacian variance.
  ///
  /// Reads the image at [imagePath], converts to grayscale, computes the
  /// Laplacian variance (sum of squared second derivatives divided by pixel
  /// count), and compares against [threshold].
  ///
  /// Returns a [BlurResult] with the computed variance, whether the image
  /// is considered blurry, and an optional human-readable message.
  Future<BlurResult> checkBlur(
    String imagePath, {
    double threshold = defaultThreshold,
  }) async {
    try {
      final bytes = await File(imagePath).readAsBytes();
      final decoded = img.decodeImage(bytes);

      if (decoded == null) {
        return BlurResult(
          variance: 0.0,
          isBlurry: true,
          message: 'Could not decode image',
        );
      }

      final grayscale = img.grayscale(decoded);
      final width = grayscale.width;
      final height = grayscale.height;

      if (width < 3 || height < 3) {
        return BlurResult(
          variance: 0.0,
          isBlurry: true,
          message: 'Image too small for blur detection',
        );
      }

      // Compute Laplacian variance.
      // For each interior pixel, the discrete Laplacian is:
      //   L = p(x+1,y) + p(x-1,y) + p(x,y+1) + p(x,y-1) - 4*p(x,y)
      // We accumulate L^2 and divide by pixel count for the variance.
      double sumSquared = 0.0;
      int count = 0;

      for (int y = 1; y < height - 1; y++) {
        for (int x = 1; x < width - 1; x++) {
          final center = grayscale.getPixel(x, y).r.toDouble();
          final left = grayscale.getPixel(x - 1, y).r.toDouble();
          final right = grayscale.getPixel(x + 1, y).r.toDouble();
          final top = grayscale.getPixel(x, y - 1).r.toDouble();
          final bottom = grayscale.getPixel(x, y + 1).r.toDouble();

          final laplacian = right + left + bottom + top - 4.0 * center;
          sumSquared += laplacian * laplacian;
          count++;
        }
      }

      final variance = count > 0 ? sumSquared / count : 0.0;
      final isBlurry = variance < threshold;

      return BlurResult(
        variance: variance,
        isBlurry: isBlurry,
        message: isBlurry
            ? 'Image appears blurry (variance: ${variance.toStringAsFixed(1)})'
            : null,
      );
    } catch (e) {
      return BlurResult(
        variance: 0.0,
        isBlurry: true,
        message: 'Blur detection failed: $e',
      );
    }
  }
}

/// Result of blur detection analysis on a single image.
class BlurResult {
  const BlurResult({
    required this.variance,
    required this.isBlurry,
    this.message,
  });

  /// Laplacian variance score. Higher means sharper.
  final double variance;

  /// Whether the image is considered blurry (variance below threshold).
  final bool isBlurry;

  /// Human-readable message when blurry or on error. Null when sharp.
  final String? message;
}

/// Provides a singleton [BlurDetectionService] instance.
final blurDetectionServiceProvider = Provider<BlurDetectionService>((ref) {
  return BlurDetectionService();
});
