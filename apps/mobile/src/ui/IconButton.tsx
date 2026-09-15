import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { Icon, type IconName } from './Icon';
import { colors, layout, radii, spacing } from './theme';
export function IconButton({
  icon,
  label,
  onPress,
  tone = 'neutral',
  disabled = false,
  busy = false,
  small = false,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  tone?: 'neutral' | 'positive' | 'negative';
  disabled?: boolean;
  busy?: boolean;
  small?: boolean;
}) {
  const color =
    tone === 'positive'
      ? colors.success
      : tone === 'negative'
        ? colors.danger
        : colors.text;
  return (
    <Pressable
      hitSlop={spacing.small}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || busy, busy }}
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        small && styles.small,
        tone === 'positive' && styles.positive,
        tone === 'negative' && styles.negative,
        (pressed || disabled || busy) && styles.dim,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={color} />
      ) : (
        <Icon name={icon} color={color} />
      )}
    </Pressable>
  );
}
const styles = StyleSheet.create({
  button: {
    width: layout.roundActionSize,
    height: layout.roundActionSize,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: spacing.hairline,
    borderColor: colors.border,
  },
  small: {
    width: layout.minimumTouchSize,
    height: layout.minimumTouchSize,
  },
  positive: {
    backgroundColor: colors.successSoft,
    borderColor: colors.successSoft,
  },
  negative: {
    backgroundColor: colors.dangerSoft,
    borderColor: colors.dangerSoft,
  },
  dim: { opacity: 0.5 },
});
