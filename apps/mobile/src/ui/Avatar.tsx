import { Text, View, StyleSheet } from 'react-native';
import { colors, fontSize, fontWeight, layout, radii } from './theme';
export function Avatar({
  name,
  large = false,
}: {
  name: string;
  large?: boolean;
}) {
  const initials =
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || 'C';
  return (
    <View
      accessibilityLabel={name}
      style={[styles.avatar, large && styles.large]}
    >
      <Text style={[styles.text, large && styles.largeText]}>{initials}</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  avatar: {
    width: layout.avatarSize,
    height: layout.avatarSize,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.avatar,
  },
  large: { width: layout.largeAvatarSize, height: layout.largeAvatarSize },
  text: {
    color: colors.text,
    fontWeight: fontWeight.semibold,
    fontSize: fontSize.card,
  },
  largeText: { fontSize: fontSize.title },
});
