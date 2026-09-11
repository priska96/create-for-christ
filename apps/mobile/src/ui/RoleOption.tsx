import { ROLE, type ProfileInput } from '@create-for-christ/contracts';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from './Icon';
import { ui } from './styles';
import { colors, fontSize, radii, spacing } from './theme';
export function RoleOption({
  role,
  selected,
  disabled,
  onPress,
}: {
  role: ProfileInput['role'];
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const creator = role === ROLE.creator;
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={creator ? 'Ich bin Creator' : 'Ich bin eine Brand'}
      accessibilityState={{ checked: selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.option, selected && styles.selected]}
    >
      <Icon
        name={creator ? 'person-outline' : 'briefcase-outline'}
        size={fontSize.title}
      />
      <View style={styles.text}>
        <Text style={ui.label}>
          {creator ? 'Ich bin UGC Creator' : 'Ich bin eine Brand'}
        </Text>
        <Text style={ui.body}>
          {creator
            ? 'und möchte mit Brands zusammenarbeiten.'
            : 'und suche nach kreativen Menschen.'}
        </Text>
      </View>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    padding: spacing.section,
    borderRadius: radii.small,
    backgroundColor: colors.notice,
  },
  selected: { backgroundColor: colors.selected },
  text: { flex: 1, gap: spacing.xs },
});
