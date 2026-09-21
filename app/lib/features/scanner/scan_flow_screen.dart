import 'dart:io';

import 'package:cunning_document_scanner/cunning_document_scanner.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:uuid/uuid.dart';

import '../../core/models/scan_session.dart';
import '../../core/services/blur_detection_service.dart';
import '../../core/services/ocr_service.dart';
import '../../core/theme/app_colors.dart';
import 'widgets/continuous_capture_overlay.dart';
import 'widgets/identity_verification_sheet.dart';

/// Full scanning flow screen: cover page capture -> OCR -> identity
/// verification -> continuous answer page capture -> complete.
///
/// Manages the scanning pipeline through states tracked by
/// [ScanSessionNotifier]. Each capture invokes [CunningDocumentScanner] for
/// native document scanning with edge detection and perspective correction.
class ScanFlowScreen extends ConsumerStatefulWidget {
  const ScanFlowScreen({super.key, required this.courseId});

  /// The course this scan session belongs to.
  final String courseId;

  @override
  ConsumerState<ScanFlowScreen> createState() => _ScanFlowScreenState();
}

class _ScanFlowScreenState extends ConsumerState<ScanFlowScreen> {
  /// Unique submission ID for organizing scan files.
  final String _submissionId = const Uuid().v4();

  /// Current phase of the scanning flow.
  _ScanPhase _phase = _ScanPhase.coverPage;

  /// Whether a scanner operation is in progress.
  bool _isProcessing = false;

  /// Index of the page being retaken (for blur retake).
  int? _blurryPageIndex;

  @override
  void initState() {
    super.initState();
    // Ensure a session exists (safety net if caller forgot to start one).
    final session = ref.read(scanSessionProvider);
    if (session == null) {
      ref.read(scanSessionProvider.notifier).startSession(widget.courseId);
    }
  }

  /// Returns the scan directory for this session.
  Future<Directory> _getScanDir() async {
    final appDir = await getApplicationDocumentsDirectory();
    final dir = Directory(
      p.join(appDir.path, 'scans', widget.courseId, _submissionId),
    );
    if (!await dir.exists()) {
      await dir.create(recursive: true);
    }
    return dir;
  }

  // ---------------------------------------------------------------------------
  // Cover Page Capture
  // ---------------------------------------------------------------------------

  /// Launches the document scanner for cover page capture.
  Future<void> _captureCoverPage() async {
    if (_isProcessing) return;
    setState(() => _isProcessing = true);

    try {
      final pictures = await CunningDocumentScanner.getPictures(
        noOfPages: 1,
        isGalleryImportAllowed: true,
      );

      if (!mounted) return;

      if (pictures == null || pictures.isEmpty) {
        // User cancelled -- stay in current state.
        setState(() => _isProcessing = false);
        return;
      }

      final sourcePath = pictures.first;
      final scanDir = await _getScanDir();
      final ext = p.extension(sourcePath);
      final destPath = p.join(scanDir.path, 'cover${ext.isNotEmpty ? ext : '.jpg'}');

      // Copy image to app storage.
      await File(sourcePath).copy(destPath);

      // Run blur detection.
      final blurService = ref.read(blurDetectionServiceProvider);
      final blurResult = await blurService.checkBlur(destPath);

      if (!mounted) return;

      if (blurResult.isBlurry) {
        // Show blur warning with retake/keep options.
        final shouldRetake = await _showCoverBlurWarning();
        if (shouldRetake == true) {
          setState(() => _isProcessing = false);
          _captureCoverPage();
          return;
        }
      }

      // Update scan session with cover page path.
      ref.read(scanSessionProvider.notifier).setCoverPage(destPath);

      // Call OCR service.
      final ocrService = ref.read(ocrServiceProvider);
      final ocrResult = await ocrService.extractIdentity(destPath);

      if (!mounted) return;
      setState(() {
        _isProcessing = false;
        _phase = _ScanPhase.identityVerification;
      });

      // Show identity verification sheet.
      _showIdentitySheet(ocrResult, destPath);
    } on PlatformException catch (e) {
      if (!mounted) return;
      setState(() => _isProcessing = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Camera error: ${e.message}'),
          backgroundColor: AppColors.error,
        ),
      );
    } catch (e) {
      if (!mounted) return;
      setState(() => _isProcessing = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error: $e'),
          backgroundColor: AppColors.error,
        ),
      );
    }
  }

  /// Shows a blur warning SnackBar for the cover page.
  /// Returns true if the user chose to retake.
  Future<bool?> _showCoverBlurWarning() async {
    if (!mounted) return false;

    final result = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.surface,
        title: const Text(
          'Cover Page Appears Blurry',
          style: TextStyle(
            color: AppColors.onBackground,
            fontSize: 18,
            fontWeight: FontWeight.w600,
          ),
        ),
        content: const Text(
          'The captured cover page may be blurry. Would you like to retake it?',
          style: TextStyle(
            color: AppColors.onSurface,
            fontSize: 14,
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text(
              'Keep',
              style: TextStyle(color: AppColors.onSurfaceVariant),
            ),
          ),
          FilledButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            style: FilledButton.styleFrom(
              backgroundColor: AppColors.primary,
            ),
            child: const Text('Retake'),
          ),
        ],
      ),
    );

    return result;
  }

  // ---------------------------------------------------------------------------
  // Identity Verification
  // ---------------------------------------------------------------------------

  /// Shows the identity verification bottom sheet.
  void _showIdentitySheet(OcrResult ocrResult, String coverPagePath) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      isDismissible: false,
      enableDrag: false,
      builder: (ctx) => IdentityVerificationSheet(
        courseId: widget.courseId,
        ocrResult: ocrResult,
        coverPagePath: coverPagePath,
        onConfirmed: () {
          if (mounted) {
            setState(() {
              _phase = _ScanPhase.continuousCapture;
            });
          }
        },
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // Continuous Capture
  // ---------------------------------------------------------------------------

  /// Launches the document scanner for the next answer page.
  Future<void> _captureNextPage() async {
    if (_isProcessing) return;
    setState(() => _isProcessing = true);

    try {
      final pictures = await CunningDocumentScanner.getPictures(
        isGalleryImportAllowed: true,
      );

      if (!mounted) return;

      if (pictures == null || pictures.isEmpty) {
        setState(() => _isProcessing = false);
        return;
      }

      final session = ref.read(scanSessionProvider);
      final pageNumber = (session?.answerPages.length ?? 0) + 1;

      final sourcePath = pictures.first;
      final scanDir = await _getScanDir();
      final ext = p.extension(sourcePath);
      final destPath = p.join(
        scanDir.path,
        'page_$pageNumber${ext.isNotEmpty ? ext : '.jpg'}',
      );

      // Copy image to app storage.
      await File(sourcePath).copy(destPath);

      // Run blur detection immediately.
      final blurService = ref.read(blurDetectionServiceProvider);
      final blurResult = await blurService.checkBlur(destPath);

      if (!mounted) return;

      // Add page to session.
      ref.read(scanSessionProvider.notifier).addAnswerPage(
            ScannedPageInfo(
              path: destPath,
              isBlurry: blurResult.isBlurry,
              blurVariance: blurResult.variance,
            ),
          );

      setState(() => _isProcessing = false);

      if (blurResult.isBlurry) {
        await _showPageBlurDialog(pageNumber - 1);
      }
    } on PlatformException catch (e) {
      if (!mounted) return;
      setState(() => _isProcessing = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Camera error: ${e.message}'),
          backgroundColor: AppColors.error,
        ),
      );
    } catch (e) {
      if (!mounted) return;
      setState(() => _isProcessing = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error: $e'),
          backgroundColor: AppColors.error,
        ),
      );
    }
  }

  /// Shows a blur warning dialog for a captured answer page.
  /// User can choose "Keep" or "Retake".
  Future<void> _showPageBlurDialog(int pageIndex) async {
    if (!mounted) return;

    final shouldRetake = await showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.surface,
        title: Text(
          'Page ${pageIndex + 1} Appears Blurry',
          style: const TextStyle(
            color: AppColors.onBackground,
            fontSize: 18,
            fontWeight: FontWeight.w600,
          ),
        ),
        content: const Text(
          'The captured page may be blurry. Would you like to retake it or keep it?',
          style: TextStyle(
            color: AppColors.onSurface,
            fontSize: 14,
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text(
              'Keep',
              style: TextStyle(color: AppColors.onSurfaceVariant),
            ),
          ),
          FilledButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            style: FilledButton.styleFrom(
              backgroundColor: AppColors.primary,
            ),
            child: const Text('Retake'),
          ),
        ],
      ),
    );

    if (shouldRetake == true) {
      _blurryPageIndex = pageIndex;
      await _retakeBlurryPage();
    }
  }

  /// Handles retake of a blurry page.
  Future<void> _retakeBlurryPage() async {
    final index = _blurryPageIndex;
    if (index == null) return;

    setState(() {
      _blurryPageIndex = null;
      _isProcessing = true;
    });

    try {
      final pictures = await CunningDocumentScanner.getPictures(
        isGalleryImportAllowed: true,
      );

      if (!mounted) return;

      if (pictures == null || pictures.isEmpty) {
        setState(() => _isProcessing = false);
        return;
      }

      final sourcePath = pictures.first;
      final scanDir = await _getScanDir();
      final ext = p.extension(sourcePath);
      final pageNumber = index + 1;
      final destPath = p.join(
        scanDir.path,
        'page_$pageNumber${ext.isNotEmpty ? ext : '.jpg'}',
      );

      await File(sourcePath).copy(destPath);

      final blurService = ref.read(blurDetectionServiceProvider);
      final blurResult = await blurService.checkBlur(destPath);

      if (!mounted) return;

      // Replace the page.
      ref.read(scanSessionProvider.notifier).replacePage(
            index,
            ScannedPageInfo(
              path: destPath,
              isBlurry: blurResult.isBlurry,
              blurVariance: blurResult.variance,
            ),
          );

      setState(() => _isProcessing = false);

      if (blurResult.isBlurry) {
        await _showPageBlurDialog(index);
      }
    } catch (e) {
      if (!mounted) return;
      setState(() => _isProcessing = false);
    }
  }

  /// Completes the scanning flow and navigates to review.
  void _completeScan() {
    ref.read(scanSessionProvider.notifier).completeSession();

    // Navigate to review screen (placeholder added by this plan).
    // If review route exists, push to it; otherwise pop back.
    try {
      context.push('/course/${widget.courseId}/scan/review');
    } catch (_) {
      // Review route not available yet -- pop back to course detail.
      if (mounted) context.pop();
    }
  }

  @override
  Widget build(BuildContext context) {
    final session = ref.watch(scanSessionProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text(
          _phase.title,
          style: const TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w600,
          ),
        ),
        centerTitle: true,
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: () {
            _showExitConfirmation();
          },
        ),
      ),
      body: Stack(
        children: [
          // Main content based on current phase.
          _buildPhaseContent(session),

          // Loading overlay.
          if (_isProcessing) _buildLoadingOverlay(),
        ],
      ),
    );
  }

  Widget _buildPhaseContent(ScanSession? session) {
    switch (_phase) {
      case _ScanPhase.coverPage:
        return _buildCoverPagePrompt();
      case _ScanPhase.identityVerification:
        // Identity verification is handled by the bottom sheet.
        // Show a waiting state.
        return _buildWaitingForIdentity();
      case _ScanPhase.continuousCapture:
        return ContinuousCaptureOverlay(
          onScanNext: _captureNextPage,
          onDone: _completeScan,
        );
    }
  }

  /// Cover page capture prompt screen.
  Widget _buildCoverPagePrompt() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // Camera icon
            Container(
              width: 100,
              height: 100,
              decoration: BoxDecoration(
                color: AppColors.primaryContainer,
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.document_scanner_outlined,
                size: 48,
                color: AppColors.primary,
              ),
            ),
            const SizedBox(height: 32),

            // Title
            const Text(
              'Scan Cover Page',
              style: TextStyle(
                color: AppColors.onBackground,
                fontSize: 24,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 12),

            // Subtitle
            Text(
              "Position the student's cover page in the frame",
              style: TextStyle(
                color: AppColors.onSurfaceVariant.withValues(alpha: 0.8),
                fontSize: 15,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 48),

            // Scan button
            SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                onPressed: _isProcessing ? null : _captureCoverPage,
                icon: const Icon(Icons.camera_alt, size: 22),
                label: const Text(
                  'Scan',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                style: FilledButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 18),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(28),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// Waiting state while identity verification sheet is shown.
  Widget _buildWaitingForIdentity() {
    return const Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.person_search,
            size: 48,
            color: AppColors.primary,
          ),
          SizedBox(height: 16),
          Text(
            'Verifying student identity...',
            style: TextStyle(
              color: AppColors.onSurfaceVariant,
              fontSize: 16,
            ),
          ),
        ],
      ),
    );
  }

  /// Loading overlay during scanner and processing operations.
  Widget _buildLoadingOverlay() {
    return Container(
      color: Colors.black.withValues(alpha: 0.3),
      child: const Center(
        child: CircularProgressIndicator(
          color: AppColors.primary,
        ),
      ),
    );
  }

  /// Shows exit confirmation dialog.
  Future<void> _showExitConfirmation() async {
    final session = ref.read(scanSessionProvider);
    final hasProgress = session != null &&
        (session.coverPageCaptured || session.answerPages.isNotEmpty);

    if (!hasProgress) {
      ref.read(scanSessionProvider.notifier).clearSession();
      if (mounted) context.pop();
      return;
    }

    final shouldExit = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.surface,
        title: const Text(
          'Exit Scanning?',
          style: TextStyle(
            color: AppColors.onBackground,
            fontSize: 18,
            fontWeight: FontWeight.w600,
          ),
        ),
        content: Text(
          session.answerPages.isNotEmpty
              ? 'You have ${session.answerPages.length} pages captured. '
                  'Exiting will discard all progress.'
              : 'Exiting will discard the captured cover page.',
          style: const TextStyle(
            color: AppColors.onSurface,
            fontSize: 14,
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text(
              'Continue Scanning',
              style: TextStyle(color: AppColors.primary),
            ),
          ),
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text(
              'Exit',
              style: TextStyle(color: AppColors.error),
            ),
          ),
        ],
      ),
    );

    if (shouldExit == true && mounted) {
      ref.read(scanSessionProvider.notifier).clearSession();
      context.pop();
    }
  }
}

/// Scanning flow phases.
enum _ScanPhase {
  coverPage('Scan Cover Page'),
  identityVerification('Verify Identity'),
  continuousCapture('Capture Pages');

  const _ScanPhase(this.title);
  final String title;
}
