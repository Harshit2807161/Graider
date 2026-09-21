import 'dart:io';
import 'dart:math';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/models/scan_session.dart';
import '../../../core/models/student_dto.dart';
import '../../../core/repositories/scan_repository.dart';
import '../../../core/repositories/student_repository.dart';
import '../../../core/services/ocr_service.dart';
import '../../../core/theme/app_colors.dart';

/// Bottom sheet for student identity verification after cover page capture.
///
/// Shows OCR-extracted student name and roll number with auto-matching against
/// the course student list. Professor can edit fields, select a different
/// student from the list, or manually enter information before confirming.
class IdentityVerificationSheet extends ConsumerStatefulWidget {
  const IdentityVerificationSheet({
    super.key,
    required this.courseId,
    required this.ocrResult,
    required this.coverPagePath,
    required this.onConfirmed,
  });

  /// The course this scan belongs to.
  final String courseId;

  /// OCR extraction result from the cover page.
  final OcrResult ocrResult;

  /// Local path to the captured cover page image.
  final String coverPagePath;

  /// Called after the professor confirms the student identity.
  final VoidCallback onConfirmed;

  @override
  ConsumerState<IdentityVerificationSheet> createState() =>
      _IdentityVerificationSheetState();
}

class _IdentityVerificationSheetState
    extends ConsumerState<IdentityVerificationSheet> {
  late final TextEditingController _nameController;
  late final TextEditingController _rollNumberController;
  final _formKey = GlobalKey<FormState>();

  List<StudentDto> _students = [];
  _MatchResult? _bestMatch;
  bool _isLoadingStudents = true;
  bool _showStudentList = false;
  bool _isChecking = false;

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController(
      text: widget.ocrResult.name ?? '',
    );
    _rollNumberController = TextEditingController(
      text: widget.ocrResult.rollNumber ?? '',
    );

    // Focus name field if OCR failed entirely
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadStudentsAndMatch();
    });
  }

  @override
  void dispose() {
    _nameController.dispose();
    _rollNumberController.dispose();
    super.dispose();
  }

  /// Loads students for the course and finds the best match.
  Future<void> _loadStudentsAndMatch() async {
    try {
      final studentsAsync =
          await ref.read(studentListProvider(widget.courseId).future);
      if (!mounted) return;

      setState(() {
        _students = studentsAsync;
        _isLoadingStudents = false;
        _bestMatch = _findBestMatch();

        // Show student list if OCR confidence is low or no match found
        if (!widget.ocrResult.hasResult ||
            (_bestMatch != null && _bestMatch!.confidence < 0.3)) {
          _showStudentList = true;
        }
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _isLoadingStudents = false;
        _showStudentList = true;
      });
    }
  }

  /// Finds the best matching student from the course list based on OCR result.
  ///
  /// Uses fuzzy matching: lowercase contains or starts-with on both name and
  /// roll number. Returns the match with the highest combined confidence.
  _MatchResult? _findBestMatch() {
    if (_students.isEmpty) return null;

    final ocrName = (widget.ocrResult.name ?? '').toLowerCase().trim();
    final ocrRoll = (widget.ocrResult.rollNumber ?? '').toLowerCase().trim();

    if (ocrName.isEmpty && ocrRoll.isEmpty) return null;

    _MatchResult? best;

    for (final student in _students) {
      double score = 0.0;
      final studentName = student.name.toLowerCase();
      final studentRoll = student.rollNumber.toLowerCase();

      // Name matching
      if (ocrName.isNotEmpty) {
        if (studentName == ocrName) {
          score += 0.5;
        } else if (studentName.contains(ocrName) ||
            ocrName.contains(studentName)) {
          score += 0.3;
        } else if (studentName.startsWith(ocrName.substring(
            0, min(3, ocrName.length)))) {
          score += 0.15;
        }
      }

      // Roll number matching
      if (ocrRoll.isNotEmpty) {
        if (studentRoll == ocrRoll) {
          score += 0.5;
        } else if (studentRoll.contains(ocrRoll) ||
            ocrRoll.contains(studentRoll)) {
          score += 0.3;
        } else if (studentRoll.startsWith(ocrRoll.substring(
            0, min(3, ocrRoll.length)))) {
          score += 0.15;
        }
      }

      if (score > 0 && (best == null || score > best.confidence)) {
        best = _MatchResult(student: student, confidence: score);
      }
    }

    return best;
  }

  /// Fills the text fields from a selected student.
  void _selectStudent(StudentDto student) {
    setState(() {
      _nameController.text = student.name;
      _rollNumberController.text = student.rollNumber;
      _bestMatch = _MatchResult(student: student, confidence: 1.0);
      _showStudentList = false;
    });
  }

  /// Confirms the student identity and updates the scan session.
  ///
  /// Performs an async duplicate roll number check against the Drift DB
  /// before proceeding. Blocks the scan if a submission already exists
  /// for the same roll number in this course.
  Future<void> _confirm() async {
    final name = _nameController.text.trim();
    final rollNumber = _rollNumberController.text.trim();

    if (name.isEmpty && rollNumber.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please enter student name or roll number'),
          backgroundColor: AppColors.error,
        ),
      );
      return;
    }

    // Prevent double-tap during async check
    if (_isChecking) return;
    setState(() => _isChecking = true);

    try {
      // Check for duplicate roll number in this course
      if (rollNumber.isNotEmpty) {
        final scanRepo = ref.read(scanRepositoryProvider);
        final isDuplicate = await scanRepo.hasSubmissionForRollNumber(
          widget.courseId,
          rollNumber,
        );

        if (!mounted) return;

        if (isDuplicate) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(
                'A submission already exists for roll number $rollNumber in this course',
              ),
              backgroundColor: AppColors.error,
            ),
          );
          setState(() => _isChecking = false);
          return;
        }
      }

      // Determine student ID: use matched student or generate placeholder
      final studentId = _bestMatch?.student.id ?? 'manual_$rollNumber';

      ref.read(scanSessionProvider.notifier).confirmStudent(
            studentId: studentId,
            name: name,
            rollNumber: rollNumber,
          );

      if (!mounted) return;
      Navigator.of(context).pop();
      widget.onConfirmed();
    } finally {
      if (mounted) {
        setState(() => _isChecking = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
      ),
      child: Container(
        constraints: BoxConstraints(
          maxHeight: MediaQuery.of(context).size.height * 0.85,
        ),
        padding: const EdgeInsets.all(24),
        child: Form(
          key: _formKey,
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Handle bar
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                      color: AppColors.outline,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                const SizedBox(height: 16),

                // Title
                const Text(
                  'Verify Student Identity',
                  style: TextStyle(
                    color: AppColors.onBackground,
                    fontSize: 20,
                    fontWeight: FontWeight.w600,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 20),

                // Cover page thumbnail
                ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: SizedBox(
                    height: 80,
                    child: Image.file(
                      File(widget.coverPagePath),
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => Container(
                        height: 80,
                        color: AppColors.surfaceContainer,
                        child: const Center(
                          child: Icon(
                            Icons.image_not_supported_outlined,
                            color: AppColors.onSurfaceVariant,
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 16),

                // OCR failure message
                if (!widget.ocrResult.hasResult) ...[
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppColors.warning.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                        color: AppColors.warning.withValues(alpha: 0.3),
                      ),
                    ),
                    child: const Row(
                      children: [
                        Icon(Icons.info_outline,
                            color: AppColors.warning, size: 20),
                        SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'Could not read student info from cover page. '
                            'Please enter manually or select from the list.',
                            style: TextStyle(
                              color: AppColors.warning,
                              fontSize: 13,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                ],

                // Confidence match indicator chip
                if (_bestMatch != null && !_isLoadingStudents)
                  _buildMatchChip(),

                if (_bestMatch != null && !_isLoadingStudents)
                  const SizedBox(height: 16),

                // Student Name field
                TextFormField(
                  controller: _nameController,
                  autofocus: !widget.ocrResult.hasResult,
                  style: const TextStyle(color: AppColors.onBackground),
                  decoration: InputDecoration(
                    labelText: 'Student Name',
                    labelStyle: const TextStyle(
                      color: AppColors.onSurfaceVariant,
                    ),
                    filled: true,
                    fillColor: AppColors.surfaceContainer,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(color: AppColors.outline),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(color: AppColors.outline),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(color: AppColors.primary),
                    ),
                  ),
                ),
                const SizedBox(height: 12),

                // Roll Number field
                TextFormField(
                  controller: _rollNumberController,
                  style: const TextStyle(color: AppColors.onBackground),
                  decoration: InputDecoration(
                    labelText: 'Roll Number',
                    labelStyle: const TextStyle(
                      color: AppColors.onSurfaceVariant,
                    ),
                    filled: true,
                    fillColor: AppColors.surfaceContainer,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(color: AppColors.outline),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(color: AppColors.outline),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(color: AppColors.primary),
                    ),
                  ),
                ),
                const SizedBox(height: 16),

                // Student list section
                if (_isLoadingStudents)
                  const Center(
                    child: Padding(
                      padding: EdgeInsets.all(16),
                      child: SizedBox(
                        width: 24,
                        height: 24,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: AppColors.primary,
                        ),
                      ),
                    ),
                  )
                else if (_students.isNotEmpty) ...[
                  // Toggle student list
                  GestureDetector(
                    onTap: () {
                      setState(() => _showStudentList = !_showStudentList);
                    },
                    child: Row(
                      children: [
                        Icon(
                          _showStudentList
                              ? Icons.expand_less
                              : Icons.expand_more,
                          color: AppColors.primary,
                          size: 20,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          _showStudentList
                              ? 'Hide student list'
                              : 'Or select from list',
                          style: const TextStyle(
                            color: AppColors.primary,
                            fontSize: 14,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          '(${_students.length} students)',
                          style: TextStyle(
                            color:
                                AppColors.onSurfaceVariant.withValues(alpha: 0.7),
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ),
                  if (_showStudentList) ...[
                    const SizedBox(height: 8),
                    ConstrainedBox(
                      constraints: const BoxConstraints(maxHeight: 180),
                      child: ListView.separated(
                        shrinkWrap: true,
                        itemCount: _students.length,
                        separatorBuilder: (_, __) =>
                            const SizedBox(height: 4),
                        itemBuilder: (context, index) {
                          final student = _students[index];
                          final isSelected =
                              _bestMatch?.student.id == student.id &&
                                  _bestMatch!.confidence >= 1.0;
                          return _StudentTile(
                            student: student,
                            isSelected: isSelected,
                            onTap: () => _selectStudent(student),
                          );
                        },
                      ),
                    ),
                  ],
                ],

                const SizedBox(height: 24),

                // Confirm button (disabled during duplicate check)
                FilledButton(
                  onPressed: _isChecking ? null : _confirm,
                  style: FilledButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    disabledBackgroundColor:
                        AppColors.primary.withValues(alpha: 0.4),
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(28),
                    ),
                  ),
                  child: _isChecking
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : const Text(
                          'Confirm',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  /// Builds the confidence match indicator chip.
  Widget _buildMatchChip() {
    final match = _bestMatch!;
    final confidence = match.confidence;

    Color chipColor;
    Color textColor;
    IconData icon;
    String label;

    if (confidence > 0.7) {
      chipColor = AppColors.success.withValues(alpha: 0.15);
      textColor = AppColors.success;
      icon = Icons.check_circle;
      label =
          'Match: ${match.student.name} (${match.student.rollNumber})';
    } else if (confidence >= 0.3) {
      chipColor = AppColors.warning.withValues(alpha: 0.15);
      textColor = AppColors.warning;
      icon = Icons.help_outline;
      label =
          'Possible: ${match.student.name} (${match.student.rollNumber})';
    } else {
      chipColor = AppColors.error.withValues(alpha: 0.15);
      textColor = AppColors.error;
      icon = Icons.error_outline;
      label = 'No match found';
    }

    return GestureDetector(
      onTap: () {
        if (confidence > 0.3) {
          _selectStudent(match.student);
        }
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: chipColor,
          borderRadius: BorderRadius.circular(8),
        ),
        child: Row(
          children: [
            Icon(icon, color: textColor, size: 18),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                label,
                style: TextStyle(
                  color: textColor,
                  fontSize: 13,
                  fontWeight: FontWeight.w500,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
            if (confidence > 0.3)
              Icon(Icons.touch_app, color: textColor, size: 16),
          ],
        ),
      ),
    );
  }
}

/// Internal match result for student auto-matching.
class _MatchResult {
  const _MatchResult({required this.student, required this.confidence});

  final StudentDto student;
  final double confidence;
}

/// A selectable student tile for the student list.
class _StudentTile extends StatelessWidget {
  const _StudentTile({
    required this.student,
    required this.isSelected,
    required this.onTap,
  });

  final StudentDto student;
  final bool isSelected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: isSelected
          ? AppColors.primaryContainer
          : AppColors.surfaceContainer,
      borderRadius: BorderRadius.circular(8),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(8),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          child: Row(
            children: [
              // Avatar
              CircleAvatar(
                radius: 16,
                backgroundColor: isSelected
                    ? AppColors.primary
                    : AppColors.outline,
                child: Text(
                  student.name.isNotEmpty
                      ? student.name[0].toUpperCase()
                      : '?',
                  style: TextStyle(
                    color: isSelected
                        ? Colors.white
                        : AppColors.onSurfaceVariant,
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              const SizedBox(width: 10),
              // Name and roll
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      student.name,
                      style: TextStyle(
                        color: isSelected
                            ? AppColors.onBackground
                            : AppColors.onSurface,
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    Text(
                      student.rollNumber,
                      style: TextStyle(
                        color: AppColors.onSurfaceVariant
                            .withValues(alpha: 0.8),
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
              if (isSelected)
                const Icon(
                  Icons.check_circle,
                  color: AppColors.primary,
                  size: 18,
                ),
            ],
          ),
        ),
      ),
    );
  }
}
