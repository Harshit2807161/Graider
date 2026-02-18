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
import '../../core/repositories/scan_repository.dart';
import '../../core/repositories/student_repository.dart';
import '../../core/services/blur_detection_service.dart';
import '../../core/services/upload_queue_service.dart';
import '../../core/theme/app_colors.dart';
import 'widgets/page_detail_sheet.dart';
import 'widgets/page_thumbnail.dart';

/// Review screen showing all scanned pages in a grid with drag-and-drop
/// reorder, blur badges, add/remove/retake actions, and Finish to persist.
///
/// Reads page data from [scanSessionProvider]. On "Finish", saves the
/// submission and all pages to Drift via [ScanRepository], then navigates
/// back to the course detail screen.
class ReviewScreen extends ConsumerStatefulWidget {
  const ReviewScreen({super.key, required this.courseId});

  /// The course this review belongs to.
  final String courseId;

  @override
  ConsumerState<ReviewScreen> createState() => _ReviewScreenState();
}

class _ReviewScreenState extends ConsumerState<ReviewScreen> {
  /// Index currently being dragged (for visual feedback).
  int? _draggingIndex;

  /// Whether a save or scanner operation is in progress.
  bool _isProcessing = false;

  // ---------------------------------------------------------------------------
  // Add page
  // ---------------------------------------------------------------------------

  /// Launches the scanner to capture one additional page.
  Future<void> _addPage() async {
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
      final destPath = await _copyToScanDir(sourcePath, pageNumber);

      final blurService = ref.read(blurDetectionServiceProvider);
      final blurResult = await blurService.checkBlur(destPath);

      if (!mounted) return;

      ref.read(scanSessionProvider.notifier).addAnswerPage(
            ScannedPageInfo(
              path: destPath,
              isBlurry: blurResult.isBlurry,
              blurVariance: blurResult.variance,
            ),
          );

      setState(() => _isProcessing = false);
    } on PlatformException catch (e) {
      if (!mounted) return;
      setState(() => _isProcessing = false);
      _showError('Camera error: ${e.message}');
    } catch (e) {
      if (!mounted) return;
      setState(() => _isProcessing = false);
      _showError('Error: $e');
    }
  }

  // ---------------------------------------------------------------------------
  // Retake page
  // ---------------------------------------------------------------------------

  /// Launches the scanner and replaces the page at [index] with the new scan.
  Future<void> _retakePage(int index) async {
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
      final oldPage = session?.answerPages[index];
      final pageNumber = index + 1;

      final sourcePath = pictures.first;
      final destPath = await _copyToScanDir(sourcePath, pageNumber);

      final blurService = ref.read(blurDetectionServiceProvider);
      final blurResult = await blurService.checkBlur(destPath);

      if (!mounted) return;

      ref.read(scanSessionProvider.notifier).replacePage(
            index,
            ScannedPageInfo(
              path: destPath,
              isBlurry: blurResult.isBlurry,
              blurVariance: blurResult.variance,
            ),
          );

      // Delete old image file.
      if (oldPage != null) {
        try {
          await File(oldPage.path).delete();
        } catch (_) {
          // Best-effort cleanup.
        }
      }

      setState(() => _isProcessing = false);
    } on PlatformException catch (e) {
      if (!mounted) return;
      setState(() => _isProcessing = false);
      _showError('Camera error: ${e.message}');
    } catch (e) {
      if (!mounted) return;
      setState(() => _isProcessing = false);
      _showError('Error: $e');
    }
  }

  // ---------------------------------------------------------------------------
  // Remove page
  // ---------------------------------------------------------------------------

  /// Removes the page at [index] and deletes the image file.
  Future<void> _removePage(int index) async {
    final session = ref.read(scanSessionProvider);
    final page = session?.answerPages[index];

    ref.read(scanSessionProvider.notifier).removePage(index);

    if (page != null) {
      try {
        await File(page.path).delete();
      } catch (_) {
        // Best-effort cleanup.
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Finish -- persist to Drift
  // ---------------------------------------------------------------------------

  /// Saves the submission and all pages to Drift, clears the session,
  /// shows success, and navigates back to the course detail screen.
  Future<void> _finish() async {
    final session = ref.read(scanSessionProvider);
    if (session == null) return;

    if (session.matchedStudentId == null) {
      _showError('No student matched. Cannot save.');
      return;
    }

    setState(() => _isProcessing = true);

    try {
      final scanRepo = ref.read(scanRepositoryProvider);

      // 1a. If student ID is a manual placeholder, create a real student record.
      var studentId = session.matchedStudentId!;
      if (studentId.startsWith('manual_')) {
        final studentRepo = ref.read(studentRepositoryProvider);
        final newStudent = await studentRepo.addStudent(
          widget.courseId,
          session.matchedStudentName ?? 'Unknown',
          session.matchedRollNumber ?? studentId.replaceFirst('manual_', ''),
        );
        studentId = newStudent.id;
      }

      // 1b. Create submission record.
      final submissionId = await scanRepo.createSubmission(
        studentId: studentId,
        courseId: widget.courseId,
        coverPagePath: session.coverPagePath,
      );

      // 2. Save cover page as page 0 with type "cover".
      if (session.coverPagePath != null) {
        await scanRepo.addScannedPage(
          submissionId: submissionId,
          pageNumber: 0,
          localPath: session.coverPagePath!,
          isBlurry: false,
          type: 'cover',
        );
      }

      // 3. Save each answer page.
      for (int i = 0; i < session.answerPages.length; i++) {
        final page = session.answerPages[i];
        await scanRepo.addScannedPage(
          submissionId: submissionId,
          pageNumber: i + 1,
          localPath: page.path,
          isBlurry: page.isBlurry,
        );
      }

      // 4. Clear the scan session.
      ref.read(scanSessionProvider.notifier).clearSession();

      // 5. Kick the upload queue to process the new submission.
      ref.read(uploadQueueServiceProvider).processQueue();

      // 6. Invalidate the student list so it refreshes on the course detail.
      ref.invalidate(studentListProvider(widget.courseId));

      if (!mounted) return;

      // 7. Show success SnackBar.
      final studentName = session.matchedStudentName ?? 'student';
      final pageCount = session.answerPages.length;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Scan saved! $pageCount ${pageCount == 1 ? 'page' : 'pages'} captured for $studentName',
          ),
          backgroundColor: AppColors.success,
          behavior: SnackBarBehavior.floating,
        ),
      );

      // 8. Navigate back to course detail.
      context.go('/course/${widget.courseId}');
    } catch (e) {
      if (!mounted) return;
      setState(() => _isProcessing = false);
      _showError('Failed to save scan: $e');
    }
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /// Copies a scanned image to the scan directory with a page-numbered name.
  Future<String> _copyToScanDir(String sourcePath, int pageNumber) async {
    final session = ref.read(scanSessionProvider);
    final appDir = await getApplicationDocumentsDirectory();
    final scanDir = Directory(
      p.join(appDir.path, 'scans', widget.courseId, _submissionDirName(session)),
    );
    if (!await scanDir.exists()) {
      await scanDir.create(recursive: true);
    }

    final ext = p.extension(sourcePath);
    final destPath = p.join(
      scanDir.path,
      'page_$pageNumber${ext.isNotEmpty ? ext : '.jpg'}',
    );
    await File(sourcePath).copy(destPath);
    return destPath;
  }

  /// Derives a stable directory name for this session's scans.
  String _submissionDirName(ScanSession? session) {
    // Use a portion of the matched student ID or a UUID.
    final studentId = session?.matchedStudentId;
    if (studentId != null && studentId.length >= 8) {
      return studentId.substring(0, 8);
    }
    return const Uuid().v4().substring(0, 8);
  }

  void _showError(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: AppColors.error,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  /// Opens the [PageDetailSheet] for the page at [index].
  void _openPageDetail(int index) {
    final session = ref.read(scanSessionProvider);
    if (session == null) return;
    final page = session.answerPages[index];

    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => PageDetailSheet(
        pageIndex: index,
        page: page,
        onRetake: () => _retakePage(index),
        onRemove: () => _removePage(index),
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // Build
  // ---------------------------------------------------------------------------

  @override
  Widget build(BuildContext context) {
    final session = ref.watch(scanSessionProvider);
    final pages = session?.answerPages ?? [];
    final blurryCount = pages.where((p) => p.isBlurry).length;

    // Empty state
    if (session == null || pages.isEmpty) {
      return Scaffold(
        backgroundColor: AppColors.background,
        appBar: AppBar(
          title: const Text(
            'Review',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
          ),
          centerTitle: true,
        ),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                Icons.photo_library_outlined,
                size: 64,
                color: AppColors.onSurfaceVariant.withValues(alpha: 0.4),
              ),
              const SizedBox(height: 16),
              const Text(
                'No pages scanned',
                style: TextStyle(
                  color: AppColors.onSurfaceVariant,
                  fontSize: 16,
                ),
              ),
              const SizedBox(height: 24),
              OutlinedButton.icon(
                onPressed: () {
                  if (mounted) context.pop();
                },
                icon: const Icon(Icons.arrow_back, size: 18),
                label: const Text('Go Back'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.onBackground,
                  side: const BorderSide(color: AppColors.outline),
                ),
              ),
            ],
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text(
          'Review (${pages.length} ${pages.length == 1 ? 'page' : 'pages'})',
          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
        ),
        centerTitle: true,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () {
            if (mounted) context.pop();
          },
        ),
        actions: [
          // Add page button
          IconButton(
            icon: const Icon(Icons.add_photo_alternate),
            tooltip: 'Add page',
            onPressed: _isProcessing ? null : _addPage,
          ),
        ],
      ),
      body: Stack(
        children: [
          // Grid of page thumbnails with drag-and-drop
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 8, 12, 100),
            child: GridView.builder(
              itemCount: pages.length,
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 3,
                crossAxisSpacing: 8,
                mainAxisSpacing: 8,
                childAspectRatio: 0.75,
              ),
              itemBuilder: (context, index) {
                final page = pages[index];
                return _buildDraggableCell(index, page);
              },
            ),
          ),

          // Bottom bar with summary and Finish button
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            child: _buildBottomBar(pages.length, blurryCount),
          ),

          // Loading overlay
          if (_isProcessing)
            Container(
              color: Colors.black.withValues(alpha: 0.3),
              child: const Center(
                child: CircularProgressIndicator(color: AppColors.primary),
              ),
            ),
        ],
      ),
    );
  }

  /// Wraps a [PageThumbnail] in [LongPressDraggable] + [DragTarget] for
  /// reorder support via long press and drag.
  Widget _buildDraggableCell(int index, ScannedPageInfo page) {
    return DragTarget<int>(
      onWillAcceptWithDetails: (details) => details.data != index,
      onAcceptWithDetails: (details) {
        ref
            .read(scanSessionProvider.notifier)
            .reorderPages(details.data, index);
        setState(() => _draggingIndex = null);
      },
      builder: (context, candidateData, rejectedData) {
        final isHoveredTarget = candidateData.isNotEmpty;

        return LongPressDraggable<int>(
          data: index,
          onDragStarted: () => setState(() => _draggingIndex = index),
          onDragEnd: (_) => setState(() => _draggingIndex = null),
          onDraggableCanceled: (_, __) =>
              setState(() => _draggingIndex = null),
          feedback: Material(
            color: Colors.transparent,
            child: SizedBox(
              width: 110,
              height: 147,
              child: Opacity(
                opacity: 0.85,
                child: PageThumbnail(
                  page: page,
                  pageIndex: index,
                  onTap: () {},
                  isDragging: true,
                ),
              ),
            ),
          ),
          childWhenDragging: Opacity(
            opacity: 0.3,
            child: PageThumbnail(
              page: page,
              pageIndex: index,
              onTap: () {},
            ),
          ),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(12),
              border: isHoveredTarget
                  ? Border.all(color: AppColors.primary, width: 2)
                  : null,
            ),
            child: PageThumbnail(
              page: page,
              pageIndex: index,
              onTap: () => _openPageDetail(index),
              isDragging: _draggingIndex == index,
            ),
          ),
        );
      },
    );
  }

  /// Persistent bottom bar with page summary and Finish button.
  Widget _buildBottomBar(int pageCount, int blurryCount) {
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
      decoration: BoxDecoration(
        color: AppColors.surface,
        border: Border(
          top: BorderSide(
            color: AppColors.outline.withValues(alpha: 0.5),
          ),
        ),
      ),
      child: SafeArea(
        top: false,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Summary text
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  '$pageCount ${pageCount == 1 ? 'page' : 'pages'}',
                  style: const TextStyle(
                    color: AppColors.onSurface,
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                if (blurryCount > 0) ...[
                  const SizedBox(width: 12),
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(
                        Icons.warning_amber_rounded,
                        color: AppColors.warning,
                        size: 14,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        '$blurryCount blurry',
                        style: const TextStyle(
                          color: AppColors.warning,
                          fontSize: 13,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ],
              ],
            ),
            const SizedBox(height: 12),

            // Finish button
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: _isProcessing ? null : _finish,
                style: FilledButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(28),
                  ),
                ),
                child: const Text(
                  'Finish',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
