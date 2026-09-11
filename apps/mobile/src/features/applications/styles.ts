import { StyleSheet } from 'react-native';
import {
  colors,
  fontSize,
  fontWeight,
  layout,
  radii,
  spacing,
} from '../../ui/theme';
export const styles = StyleSheet.create({
  swipeSurface: { width: '100%', userSelect: 'none' },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: spacing.hairline,
    borderRadius: radii.card,
    padding: spacing.card,
    gap: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.heading,
    fontWeight: fontWeight.bold,
  },
  image: {
    width: '100%',
    height: layout.imageHeight,
    borderRadius: radii.image,
  },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  status: {
    color: colors.primary,
    fontWeight: fontWeight.bold,
    fontSize: fontSize.label,
  },
});
