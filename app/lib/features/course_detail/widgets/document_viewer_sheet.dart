import 'dart:io';

import 'package:cunning_document_scanner/cunning_document_scanner.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:open_filex/open_filex.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';

import '../../../core/repositories/scan_repository.dart';
import '../../../core/theme/app_colors.dart';
import 'document_slot.dart';

/// Separator used to store multiple file paths in a single DB column.
const _pathSeparator = ';';

/// Full-screen viewer/manager for a course document (Question Paper or
/// Answer Key).
///
/// **No document**: Shows scan/upload options.
/// **Scanned images**: Vertically scrollable list with reorder, delete, and
///   "add more pages" actions.
/// **Uploaded PDF**: Card with filename, size, and "Open" button.
class DocumentViewerScreen extends ConsumerStatefulWidget {
  const DocumentViewerScreen({
    super.key,
    required this.courseId,
    required this.documentType,
    this.existingPath,
  });

  final String courseId;
  final String documentType;
  final String? existingPath;

  @override
  ConsumerState<DocumentViewerScreen> createState() =>
      _DocumentViewerScreenState();
}

class _DocumentViewerScreenState extends ConsumerState<DocumentViewerScreen> {
  bool _isLoading = false;
  bool _showReplaceOptions = false;

  /// Mutable list of page paths for reorder/delete operations.
  /// Initialized from [widget.existingPath] or populated after scan.
  late List<String> _pages;

  /// Whether the document is a PDF (uploaded, not scanned).
  bool _isPdf = false;

  String get _displayTitle => widget.documentType == 'question_paper'
      ? 'Question Paper'
      : 'Answer Key';

  @override
  void initState() {
    super.initState();
    final raw = widget.existingPath;
    if (raw != null && raw.isNotEmpty) {
      _pages = raw.split(_pathSeparator).where((s) => s.isNotEmpty).toList();
      if (_pages.isNotEmpty) {
        _isPdf = p.extension(_pages.first).toLowerCase() == '.pdf';
      }
    } else {
      _pages = [];
    }
  }

  bool get _hasDocument => _pages.isNotEmpty;

  // ---------------------------------------------------------------------------
  // File helpers
  // ---------------------------------------------------------------------------

  Future<String> _getPagePath(int pageIndex, String extension) async {
    final appDir = await getApplicationDocumentsDirectory();
    final dir = Directory(
      p.join(appDir.path, 'courses', widget.courseId),
    );
    if (!await dir.exists()) await dir.create(recursive: true);
    return p.join(
        dir.path, '${widget.documentType}_page_$pageIndex.$extension');
  }

  Future<String> _getDocumentPath(String extension) async {
    final appDir = await getApplicationDocumentsDirectory();
    final dir = Directory(
      p.join(appDir.path, 'courses', widget.courseId),
    );
    if (!await dir.exists()) await dir.create(recursive: true);
    return p.join(dir.path, '${widget.documentType}.$extension');
  }

  Future<void> _saveDocument(String path, String type) async {
    final scanRepo = ref.read(scanRepositoryProvider);
    if (widget.documentType == 'question_paper') {
      await scanRepo.saveQuestionPaper(widget.courseId, path, type);
      ref.invalidate(questionPaperPathProvider(widget.courseId));
    } else {
      await scanRepo.saveAnswerKey(widget.courseId, path, type);
      ref.invalidate(answerKeyPathProvider(widget.courseId));
    }
  }

  /// Persists the current [_pages] list to the database.
  Future<void> _persistPages() async {
    final storedPath = _pages.join(_pathSeparator);
    await _saveDocument(storedPath, _isPdf ? 'upload' : 'scan');
  }

  // ---------------------------------------------------------------------------
  // Page actions
  // ---------------------------------------------------------------------------

  /// Delete a single page at [index] from the list and disk.
  Future<void> _deletePage(int index) async {
    final path = _pages[index];
    try {
      final file = File(path);
      if (await file.exists()) await file.delete();
    } catch (_) {}

    setState(() => _pages.removeAt(index));
    if (_pages.isEmpty) {
      // All pages removed — clear from DB and pop.
      await _removeDocument();
      if (mounted) Navigator.of(context).pop();
    } else {
      await _persistPages();
    }
  }

  /// Add more scanned pages to the existing list.
  Future<void> _addMorePages() async {
    setState(() => _isLoading = true);
    try {
      final pictures = await CunningDocumentScanner.getPictures(
        isGalleryImportAllowed: true,
      );
      if (pictures == null || pictures.isEmpty) {
        setState(() => _isLoading = false);
        return;
      }

      final startIndex = _pages.length;
      for (int i = 0; i < pictures.length; i++) {
        final sourcePath = pictures[i];
        final ext = p.extension(sourcePath).replaceFirst('.', '');
        final destPath =
            await _getPagePath(startIndex + i, ext.isNotEmpty ? ext : 'jpg');
        await File(sourcePath).copy(destPath);
        _pages.add(destPath);
      }

      await _persistPages();
      setState(() {});
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
              content: Text('Scan failed: $e'),
              backgroundColor: AppColors.error),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  /// Remove the entire document (all files + DB entry).
  Future<void> _removeDocument() async {
    for (final filePath in _pages) {
      try {
        final file = File(filePath);
        if (await file.exists()) await file.delete();
      } catch (_) {}
    }
    final scanRepo = ref.read(scanRepositoryProvider);
    if (widget.documentType == 'question_paper') {
      await scanRepo.saveQuestionPaper(widget.courseId, '', 'none');
      ref.invalidate(questionPaperPathProvider(widget.courseId));
    } else {
      await scanRepo.saveAnswerKey(widget.courseId, '', 'none');
      ref.invalidate(answerKeyPathProvider(widget.courseId));
    }
  }

  /// Scan a new document (replacing existing).
  Future<void> _scanDocument() async {
    setState(() => _isLoading = true);
    try {
      final pictures = await CunningDocumentScanner.getPictures(
        isGalleryImportAllowed: true,
      );
      if (pictures == null || pictures.isEmpty) {
        setState(() => _isLoading = false);
        return;
      }

      final savedPaths = <String>[];
      for (int i = 0; i < pictures.length; i++) {
        final sourcePath = pictures[i];
        final ext = p.extension(sourcePath).replaceFirst('.', '');
        final destPath = await _getPagePath(i, ext.isNotEmpty ? ext : 'jpg');
        await File(sourcePath).copy(destPath);
        savedPaths.add(destPath);
      }

      await _saveDocument(savedPaths.join(_pathSeparator), 'scan');
      if (mounted) Navigator.of(context).pop();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
              content: Text('Scan failed: $e'),
              backgroundColor: AppColors.error),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  /// Upload file(s) from the device.
  ///
  /// Supports multiple image selection. A single PDF is stored as-is;
  /// multiple images are stored as semicolon-separated paths.
  Future<void> _uploadDocument() async {
    setState(() => _isLoading = true);
    try {
      final result = await FilePicker.platform.pickFiles(
        type: FileType.custom,
        allowedExtensions: ['pdf', 'png', 'jpg', 'jpeg'],
        allowMultiple: true,
      );
      if (result == null || result.files.isEmpty) {
        setState(() => _isLoading = false);
        return;
      }

      // Single PDF — store as one file.
      if (result.files.length == 1) {
        final pickedFile = result.files.first;
        if (pickedFile.path == null) {
          setState(() => _isLoading = false);
          return;
        }
        final ext = p.extension(pickedFile.path!).replaceFirst('.', '');
        final destPath = await _getDocumentPath(ext.isNotEmpty ? ext : 'pdf');
        await File(pickedFile.path!).copy(destPath);

        final isPdfFile = ext.toLowerCase() == 'pdf';
        _pages = [destPath];
        _isPdf = isPdfFile;
        await _saveDocument(destPath, 'upload');
        if (mounted) Navigator.of(context).pop();
        return;
      }

      // Multiple images — save each as a page.
      final savedPaths = <String>[];
      for (int i = 0; i < result.files.length; i++) {
        final file = result.files[i];
        if (file.path == null) continue;
        final ext = p.extension(file.path!).replaceFirst('.', '');
        final destPath =
            await _getPagePath(i, ext.isNotEmpty ? ext : 'jpg');
        await File(file.path!).copy(destPath);
        savedPaths.add(destPath);
      }

      if (savedPaths.isEmpty) {
        setState(() => _isLoading = false);
        return;
      }

      _pages = savedPaths;
      _isPdf = false;
      await _saveDocument(savedPaths.join(_pathSeparator), 'upload');
      if (mounted) Navigator.of(context).pop();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
              content: Text('Upload failed: $e'),
              backgroundColor: AppColors.error),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  // ---------------------------------------------------------------------------
  // Build
  // ---------------------------------------------------------------------------

  @override
  Widget build(BuildContext context) {
    final showingDocument = _hasDocument && !_showReplaceOptions;

    return Scaffold(
      appBar: AppBar(
        title: Text(
          _displayTitle,
          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
        ),
        centerTitle: true,
        actions: [
          if (showingDocument && !_isPdf)
            IconButton(
              onPressed: _addMorePages,
              icon: const Icon(Icons.add_a_photo_outlined),
              tooltip: 'Add more pages',
            ),
        ],
      ),
      body: _isLoading
          ? const Center(
              child: CircularProgressIndicator(color: AppColors.primary))
          : showingDocument
              ? _buildDocumentView()
              : _buildAddOptions(),
      bottomNavigationBar: showingDocument ? _buildBottomActions() : null,
    );
  }

  // ---------------------------------------------------------------------------
  // Document view (images or PDF)
  // ---------------------------------------------------------------------------

  Widget _buildDocumentView() {
    if (_isPdf) return _buildPdfCard();
    return _buildReorderableImageList();
  }

  /// Reorderable list of scanned pages with delete and page indicators.
  Widget _buildReorderableImageList() {
    return ReorderableListView.builder(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 80),
      itemCount: _pages.length,
      onReorder: (oldIndex, newIndex) {
        setState(() {
          if (newIndex > oldIndex) newIndex--;
          final item = _pages.removeAt(oldIndex);
          _pages.insert(newIndex, item);
        });
        _persistPages();
      },
      itemBuilder: (context, index) {
        final path = _pages[index];
        return _PageCard(
          key: ValueKey(path),
          path: path,
          pageNumber: index + 1,
          totalPages: _pages.length,
          onDelete: () => _confirmDeletePage(index),
        );
      },
    );
  }

  /// Shows confirmation dialog before deleting a page.
  Future<void> _confirmDeletePage(int index) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.surface,
        title: const Text('Delete Page',
            style: TextStyle(color: AppColors.onBackground)),
        content: Text(
          'Remove page ${index + 1}? This cannot be undone.',
          style: const TextStyle(color: AppColors.onSurfaceVariant),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            style: FilledButton.styleFrom(
              backgroundColor: AppColors.error,
              foregroundColor: Colors.white,
            ),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    if (confirmed == true) await _deletePage(index);
  }

  /// Centered card for uploaded PDF with filename, size, and Open button.
  Widget _buildPdfCard() {
    final path = _pages.first;
    final fileName = p.basename(path);

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                color: AppColors.error.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(16),
              ),
              child: const Icon(
                Icons.picture_as_pdf,
                size: 48,
                color: AppColors.error,
              ),
            ),
            const SizedBox(height: 20),
            Text(
              fileName,
              style: const TextStyle(
                color: AppColors.onBackground,
                fontSize: 16,
                fontWeight: FontWeight.w600,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            FutureBuilder<FileStat>(
              future: File(path).stat(),
              builder: (context, snapshot) {
                if (!snapshot.hasData) return const SizedBox.shrink();
                final sizeKb = snapshot.data!.size / 1024;
                final sizeStr = sizeKb > 1024
                    ? '${(sizeKb / 1024).toStringAsFixed(1)} MB'
                    : '${sizeKb.toStringAsFixed(0)} KB';
                return Text(
                  sizeStr,
                  style: TextStyle(
                    color: AppColors.onSurfaceVariant.withValues(alpha: 0.7),
                    fontSize: 14,
                  ),
                );
              },
            ),
            const SizedBox(height: 24),
            FilledButton.icon(
              onPressed: () => OpenFilex.open(path),
              icon: const Icon(Icons.open_in_new, size: 18),
              label: const Text('Open PDF'),
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
                padding:
                    const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // Add / Replace options
  // ---------------------------------------------------------------------------

  Widget _buildAddOptions() {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            _showReplaceOptions
                ? 'Replace $_displayTitle'
                : 'Add $_displayTitle',
            style: const TextStyle(
              color: AppColors.onBackground,
              fontSize: 18,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            _showReplaceOptions
                ? 'Choose how to add the new document'
                : 'Choose how to add the document',
            style: TextStyle(
              color: AppColors.onSurfaceVariant.withValues(alpha: 0.7),
              fontSize: 14,
            ),
          ),
          const SizedBox(height: 32),
          _OptionTile(
            icon: Icons.document_scanner,
            label: 'Scan Document',
            subtitle: 'Use the camera to capture pages',
            onTap: _scanDocument,
          ),
          const SizedBox(height: 12),
          _OptionTile(
            icon: Icons.upload_file,
            label: 'Upload from Device',
            subtitle: 'PDF, PNG, JPG, or JPEG',
            onTap: _uploadDocument,
          ),
          if (_showReplaceOptions) ...[
            const SizedBox(height: 24),
            TextButton(
              onPressed: () => setState(() => _showReplaceOptions = false),
              child: const Text('Cancel'),
            ),
          ],
        ],
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // Bottom actions
  // ---------------------------------------------------------------------------

  Widget _buildBottomActions() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: const BoxDecoration(
        color: AppColors.surface,
        border: Border(
          top: BorderSide(color: AppColors.outline, width: 0.5),
        ),
      ),
      child: SafeArea(
        top: false,
        child: Row(
          children: [
            Expanded(
              child: FilledButton.icon(
                onPressed: () => setState(() => _showReplaceOptions = true),
                icon: const Icon(Icons.swap_horiz, size: 18),
                label: const Text('Replace'),
                style: FilledButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: OutlinedButton.icon(
                onPressed: () async {
                  await _removeDocument();
                  if (mounted) Navigator.of(context).pop();
                },
                icon: const Icon(Icons.delete_outline, size: 18),
                label: const Text('Remove'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.error,
                  side: BorderSide(
                    color: AppColors.error.withValues(alpha: 0.5),
                  ),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
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

// ---------------------------------------------------------------------------
// Page card widget for the reorderable list
// ---------------------------------------------------------------------------

/// Card showing a single scanned page image with page number badge,
/// drag handle, and delete button.
class _PageCard extends StatelessWidget {
  const _PageCard({
    super.key,
    required this.path,
    required this.pageNumber,
    required this.totalPages,
    required this.onDelete,
  });

  final String path;
  final int pageNumber;
  final int totalPages;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.outline.withValues(alpha: 0.5)),
        ),
        child: Column(
          children: [
            // Image
            ClipRRect(
              borderRadius:
                  const BorderRadius.vertical(top: Radius.circular(12)),
              child: Image.file(
                File(path),
                fit: BoxFit.contain,
                width: double.infinity,
                errorBuilder: (_, __, ___) => Container(
                  height: 200,
                  color: AppColors.surfaceContainer,
                  child: const Center(
                    child: Icon(Icons.broken_image_outlined,
                        size: 48, color: AppColors.onSurfaceVariant),
                  ),
                ),
              ),
            ),
            // Bottom bar: page label, drag handle, delete
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: const BoxDecoration(
                border:
                    Border(top: BorderSide(color: AppColors.outline, width: 0.5)),
              ),
              child: Row(
                children: [
                  // Page number
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: AppColors.primaryContainer,
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      'Page $pageNumber of $totalPages',
                      style: const TextStyle(
                        color: AppColors.primary,
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  const Spacer(),
                  // Drag handle
                  if (totalPages > 1)
                    ReorderableDragStartListener(
                      index: pageNumber - 1,
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 8),
                        child: Icon(
                          Icons.drag_handle,
                          color:
                              AppColors.onSurfaceVariant.withValues(alpha: 0.6),
                        ),
                      ),
                    ),
                  // Delete button
                  IconButton(
                    onPressed: onDelete,
                    icon: const Icon(Icons.delete_outline, size: 20),
                    color: AppColors.error,
                    visualDensity: VisualDensity.compact,
                    tooltip: 'Delete page',
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Option tile
// ---------------------------------------------------------------------------

/// A large tappable option tile for the scan/upload choice.
class _OptionTile extends StatelessWidget {
  const _OptionTile({
    required this.icon,
    required this.label,
    required this.subtitle,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.surfaceContainer,
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.outline),
          ),
          child: Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: AppColors.primaryContainer,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, color: AppColors.primary, size: 24),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      label,
                      style: const TextStyle(
                        color: AppColors.onBackground,
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      subtitle,
                      style: TextStyle(
                        color:
                            AppColors.onSurfaceVariant.withValues(alpha: 0.8),
                        fontSize: 13,
                      ),
                    ),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right, color: AppColors.onSurfaceVariant),
            ],
          ),
        ),
      ),
    );
  }
}
