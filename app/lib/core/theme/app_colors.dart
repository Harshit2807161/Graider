import 'dart:ui';

/// Graider color palette -- warm navy/charcoal dark theme with electric blue accent.
///
/// Inspired by Linear/Notion dark mode. Not true black, not cold gray --
/// a warm dark navy that feels modern and trustworthy.
sealed class AppColors {
  // -- Backgrounds --

  /// Deep navy background. Warm-tinted, not true black.
  static const background = Color(0xFF0D1520);

  /// Slightly lighter surface for cards and elevated elements.
  static const surface = Color(0xFF162130);

  /// Card surface variant for containers, inputs, and elevated chips.
  static const surfaceContainer = Color(0xFF1E2D3F);

  // -- Brand --

  /// Electric blue accent. Trust, intelligence, tech-forward.
  static const primary = Color(0xFF3B82F6);

  /// Muted blue for filled indicators and subtle highlights.
  static const primaryContainer = Color(0xFF1E3A5F);

  // -- Text --

  /// Primary text on dark backgrounds.
  static const onBackground = Color(0xFFE8ECF1);

  /// Text on card surfaces.
  static const onSurface = Color(0xFFCDD5DF);

  /// Secondary/label text, muted.
  static const onSurfaceVariant = Color(0xFF8899A6);

  // -- Status --

  /// Error / stopped state.
  static const error = Color(0xFFEF4444);

  /// Success / active / completed state.
  static const success = Color(0xFF22C55E);

  /// Warning / processing state.
  static const warning = Color(0xFFEAB308);

  // -- Structural --

  /// Subtle border and divider color.
  static const outline = Color(0xFF2A3A4A);
}
