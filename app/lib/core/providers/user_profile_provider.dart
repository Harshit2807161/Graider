import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../models/user_profile_dto.dart';
import '../network/api_client.dart';

/// Secure storage key for the user's organization ID.
///
/// Stored separately because `/users/me` does not return org membership info.
/// This can be seeded from a future onboarding step or backend endpoint.
const _orgIdStorageKey = 'user_org_id';

/// Provides the current user's profile with org_id resolution.
///
/// Fetches `/users/me` for basic user info, then attempts to resolve the
/// org_id from secure storage. If the API call fails (e.g., offline),
/// returns null so the dashboard can show cached data gracefully.
///
/// **Known limitation:** The backend `/users/me` does not return org
/// membership info. The org_id must be stored in secure storage via a
/// separate mechanism (future onboarding step or backend enhancement).
final userProfileProvider = FutureProvider<UserProfileDto?>((ref) async {
  final dio = ref.watch(dioProvider);
  const storage = FlutterSecureStorage();

  try {
    final response = await dio.get<Map<String, dynamic>>('/users/me');
    var profile = UserProfileDto.fromJson(response.data!);

    // Resolve org_id from secure storage if not in the API response
    if (profile.orgId == null) {
      final storedOrgId = await storage.read(key: _orgIdStorageKey);
      if (storedOrgId != null) {
        profile = profile.copyWith(orgId: storedOrgId);
      }
    } else {
      // Persist org_id for offline use if the API returned it
      await storage.write(key: _orgIdStorageKey, value: profile.orgId);
    }

    return profile;
  } on DioException {
    // Offline -- return null, dashboard will show cached data
    return null;
  }
});

/// Stores an org_id in secure storage for future use.
///
/// Call this when the org_id is first resolved (e.g., from an onboarding
/// step or a backend endpoint that returns membership info).
Future<void> storeOrgId(String orgId) async {
  const storage = FlutterSecureStorage();
  await storage.write(key: _orgIdStorageKey, value: orgId);
}
