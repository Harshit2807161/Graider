import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// SharedPreferences key for the grading-complete notification toggle.
const _kGradingCompleteNotification = 'grading_complete_notification';

/// Provides local notification preference state (enabled/disabled).
///
/// Uses [SharedPreferences] for persistence -- no backend sync (MVP).
/// Default is `true` (notifications enabled).
final notificationEnabledProvider =
    StateNotifierProvider<NotificationPrefsNotifier, bool>((ref) {
  return NotificationPrefsNotifier();
});

/// Manages the grading-complete notification preference.
///
/// Reads the initial value from [SharedPreferences] on first access via
/// [init]. Subsequent [toggle] calls flip the value and persist it.
class NotificationPrefsNotifier extends StateNotifier<bool> {
  NotificationPrefsNotifier() : super(true) {
    _loadFromPrefs();
  }

  /// Load persisted preference from SharedPreferences.
  Future<void> _loadFromPrefs() async {
    final prefs = await SharedPreferences.getInstance();
    state = prefs.getBool(_kGradingCompleteNotification) ?? true;
  }

  /// Toggle the notification preference and persist to SharedPreferences.
  Future<void> toggle() async {
    state = !state;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_kGradingCompleteNotification, state);
  }
}
