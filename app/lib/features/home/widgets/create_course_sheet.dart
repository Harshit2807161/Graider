import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/providers/user_profile_provider.dart';
import '../../../core/repositories/course_repository.dart';
import '../../../core/theme/app_colors.dart';

/// Bottom sheet for creating a new course.
///
/// Single field (course name), online only per locked decision.
/// On submit: checks connectivity, calls [CourseRepository.createCourse],
/// dismisses sheet, and invalidates [courseListProvider] to refresh dashboard.
class CreateCourseSheet extends ConsumerStatefulWidget {
  const CreateCourseSheet({super.key});

  @override
  ConsumerState<CreateCourseSheet> createState() => _CreateCourseSheetState();
}

class _CreateCourseSheetState extends ConsumerState<CreateCourseSheet> {
  final _nameController = TextEditingController();
  final _focusNode = FocusNode();
  final _formKey = GlobalKey<FormState>();
  bool _isSubmitting = false;

  @override
  void initState() {
    super.initState();
    // Auto-focus the name field when sheet opens
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _focusNode.requestFocus();
    });
  }

  @override
  void dispose() {
    _nameController.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  Future<void> _onSubmit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_isSubmitting) return;

    setState(() => _isSubmitting = true);

    try {
      // Check connectivity
      final connectivity = await Connectivity().checkConnectivity();
      final isOffline = connectivity.contains(ConnectivityResult.none);
      if (isOffline) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Course creation requires internet connectivity'),
            ),
          );
        }
        setState(() => _isSubmitting = false);
        return;
      }

      // Resolve org_id
      final profile = ref.read(userProfileProvider).value;
      if (profile?.orgId == null) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text(
                'Unable to create course. Please check your connection.',
              ),
            ),
          );
        }
        setState(() => _isSubmitting = false);
        return;
      }

      // Create course via API
      final repo = ref.read(courseRepositoryProvider);
      await repo.createCourse(profile!.orgId!, _nameController.text.trim());

      // Refresh dashboard
      ref.invalidate(courseListProvider);

      // Dismiss sheet
      if (mounted) {
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to create course: $e'),
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isSubmitting = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        left: 24,
        right: 24,
        top: 12,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      child: Form(
        key: _formKey,
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
                  borderRadius: BorderRadius.circular(2),
                  color: AppColors.outline,
                ),
              ),
            ),

            const SizedBox(height: 20),

            // Title
            const Text(
              'New Course',
              style: TextStyle(
                color: AppColors.onBackground,
                fontSize: 20,
                fontWeight: FontWeight.bold,
              ),
            ),

            const SizedBox(height: 16),

            // Course name field
            TextFormField(
              controller: _nameController,
              focusNode: _focusNode,
              enabled: !_isSubmitting,
              textCapitalization: TextCapitalization.words,
              decoration: const InputDecoration(
                hintText: 'Course name (e.g., CS101 Midterm)',
              ),
              validator: (value) {
                if (value == null || value.trim().isEmpty) {
                  return 'Please enter a course name';
                }
                return null;
              },
              onFieldSubmitted: (_) => _onSubmit(),
            ),

            const SizedBox(height: 20),

            // Create button
            FilledButton(
              onPressed: _isSubmitting ? null : _onSubmit,
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(28),
                ),
              ),
              child: _isSubmitting
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        valueColor:
                            AlwaysStoppedAnimation<Color>(Colors.white),
                      ),
                    )
                  : const Text(
                      'Create Course',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
            ),
          ],
        ),
      ),
    );
  }
}
