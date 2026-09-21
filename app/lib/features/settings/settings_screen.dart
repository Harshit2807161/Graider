import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/auth/auth_state.dart';
import '../../core/providers/notification_preferences.dart';
import '../../core/providers/user_profile_provider.dart';
import '../../core/theme/app_colors.dart';

/// Settings tab screen.
///
/// Displays a profile header (name, email, role), notification toggle,
/// app version, and log-out button. Profile data is pulled from
/// [userProfileProvider]; notification preference is stored locally
/// via [SharedPreferences].
class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Settings'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const SizedBox(height: 20),

            // -- Profile section --
            _buildProfileSection(ref),

            const SizedBox(height: 24),

            // -- Notifications section header --
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 16),
              child: Text(
                'NOTIFICATIONS',
                style: TextStyle(
                  color: AppColors.onSurfaceVariant,
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 1.0,
                ),
              ),
            ),

            const SizedBox(height: 8),

            // -- Notification toggle --
            _buildNotificationTile(ref),

            const SizedBox(height: 40),

            // -- Version --
            const Center(
              child: Text(
                'Version 1.0.0 (MVP)',
                style: TextStyle(
                  color: AppColors.onSurfaceVariant,
                  fontSize: 12,
                ),
              ),
            ),

            const SizedBox(height: 16),

            // -- Log Out button --
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8),
              child: SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: () => _handleLogout(context, ref),
                  icon: const Icon(Icons.logout),
                  label: const Text('Log out'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.error,
                    side: BorderSide(
                      color: AppColors.error.withValues(alpha: 0.5),
                    ),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(28),
                    ),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                  ),
                ),
              ),
            ),

            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }

  /// Profile header showing initials avatar, name, email, and role.
  Widget _buildProfileSection(WidgetRef ref) {
    final profileAsync = ref.watch(userProfileProvider);

    return profileAsync.when(
      data: (profile) {
        if (profile == null) {
          return Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(16),
            ),
            child: const Center(
              child: Text(
                'Unable to load profile',
                style: TextStyle(
                  color: AppColors.onSurfaceVariant,
                  fontSize: 14,
                ),
              ),
            ),
          );
        }

        // Deterministic color from name hash (same palette as course avatars).
        const colors = [
          AppColors.primary,
          AppColors.success,
          AppColors.warning,
          Color(0xFF8B5CF6), // Purple
          Color(0xFFEC4899), // Pink
          Color(0xFF06B6D4), // Cyan
        ];
        final colorIndex = profile.fullName.hashCode.abs() % colors.length;
        final avatarColor = colors[colorIndex];

        return Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(16),
          ),
          child: Row(
            children: [
              CircleAvatar(
                radius: 32,
                backgroundColor: avatarColor.withValues(alpha: 0.15),
                child: Text(
                  profile.initials,
                  style: TextStyle(
                    color: avatarColor,
                    fontSize: 20,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      profile.fullName,
                      style: const TextStyle(
                        color: AppColors.onBackground,
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 2),
                    Text(
                      profile.email,
                      style: const TextStyle(
                        color: AppColors.onSurfaceVariant,
                        fontSize: 14,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 2),
                    const Text(
                      'Professor',
                      style: TextStyle(
                        color: AppColors.onSurfaceVariant,
                        fontSize: 13,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
      loading: () => Container(
        height: 80,
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(16),
        ),
      ),
      error: (_, __) => Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(16),
        ),
        child: const Center(
          child: Text(
            'Unable to load profile',
            style: TextStyle(
              color: AppColors.onSurfaceVariant,
              fontSize: 14,
            ),
          ),
        ),
      ),
    );
  }

  /// Notification toggle tile with SharedPreferences-backed state.
  Widget _buildNotificationTile(WidgetRef ref) {
    final enabled = ref.watch(notificationEnabledProvider);

    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
      ),
      child: ListTile(
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
        leading: const Icon(
          Icons.notifications_outlined,
          color: AppColors.onSurfaceVariant,
        ),
        title: const Text(
          'Grading complete',
          style: TextStyle(color: AppColors.onSurface),
        ),
        subtitle: const Text(
          'Notify when grading finishes',
          style: TextStyle(
            color: AppColors.onSurfaceVariant,
            fontSize: 13,
          ),
        ),
        trailing: Switch.adaptive(
          value: enabled,
          activeTrackColor: AppColors.primary,
          activeThumbColor: AppColors.onBackground,
          onChanged: (_) =>
              ref.read(notificationEnabledProvider.notifier).toggle(),
        ),
      ),
    );
  }

  /// Show confirmation dialog, then log out on confirm.
  Future<void> _handleLogout(BuildContext context, WidgetRef ref) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Log out'),
        content: const Text('Are you sure you want to log out?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: Text(
              'Log Out',
              style: TextStyle(color: AppColors.error),
            ),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      await ref.read(authNotifierProvider.notifier).logout();
      // Navigation happens automatically via route guard redirect
      // (auth state -> unauthenticated -> redirect to /login).
    }
  }
}
