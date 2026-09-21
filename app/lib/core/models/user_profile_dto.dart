/// Data transfer object for the current user's profile.
///
/// Maps from the `/users/me` endpoint response. The [orgId] field is
/// resolved separately since `/users/me` does not include membership info.
class UserProfileDto {
  const UserProfileDto({
    required this.id,
    required this.email,
    required this.fullName,
    required this.isSuperuser,
    this.orgId,
  });

  /// Backend user UUID.
  final String id;

  /// User email address.
  final String email;

  /// Display name.
  final String fullName;

  /// Whether the user has superuser privileges.
  final bool isSuperuser;

  /// The user's organization ID. Null if not yet resolved.
  ///
  /// The backend `/users/me` does not return org info directly.
  /// This is populated from secure storage or a separate API call.
  final String? orgId;

  /// Maps from the `/users/me` JSON response.
  ///
  /// Note: `orgId` is set to null here since `/users/me` does not include it.
  /// The [userProfileProvider] resolves orgId from secure storage.
  factory UserProfileDto.fromJson(Map<String, dynamic> json) {
    return UserProfileDto(
      id: json['id'] as String? ?? '',
      email: json['email'] as String? ?? '',
      fullName: json['full_name'] as String? ?? '',
      isSuperuser: json['is_superuser'] as bool? ?? false,
      orgId: json['org_id'] as String?,
    );
  }

  /// Returns a copy with the given fields replaced.
  UserProfileDto copyWith({
    String? id,
    String? email,
    String? fullName,
    bool? isSuperuser,
    String? orgId,
  }) {
    return UserProfileDto(
      id: id ?? this.id,
      email: email ?? this.email,
      fullName: fullName ?? this.fullName,
      isSuperuser: isSuperuser ?? this.isSuperuser,
      orgId: orgId ?? this.orgId,
    );
  }

  /// User's initials derived from [fullName] for avatar display.
  ///
  /// Returns up to 2 characters (first letter of first and last name).
  /// Falls back to first character of email if fullName is empty.
  String get initials {
    if (fullName.isNotEmpty) {
      final parts = fullName.trim().split(RegExp(r'\s+'));
      if (parts.length >= 2) {
        return '${parts.first[0]}${parts.last[0]}'.toUpperCase();
      }
      return parts.first[0].toUpperCase();
    }
    if (email.isNotEmpty) {
      return email[0].toUpperCase();
    }
    return '?';
  }
}
