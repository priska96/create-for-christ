import { StyleSheet } from 'react-native';
import { colors, spacing, radii, layout } from '../../ui/theme';
export const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.card,
    backgroundColor: colors.surface,
  },
  text: { flex: 1, gap: spacing.xs },
  unread: {
    color: colors.white,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
  },
  bubble: {
    alignSelf: 'flex-start',
    maxWidth: '90%',
    padding: spacing.md,
    borderRadius: radii.card,
    backgroundColor: colors.surface,
    gap: spacing.xs,
  },
  own: { alignSelf: 'flex-end', backgroundColor: colors.selected },
  composer: {
    padding: spacing.md,
    gap: spacing.sm,
    width: '100%',
    maxWidth: layout.pageWidth,
    alignSelf: 'center',
    backgroundColor: colors.background,
  },
});
