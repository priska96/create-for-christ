import { StyleSheet, Text, View } from 'react-native';
import { Icon, type IconName } from './Icon';
import { ui } from './styles';
import { colors, layout, radii, spacing } from './theme';
export function EmptyState({
  icon,
  title,
  description,
}: {
  icon: IconName;
  title: string;
  description: string;
}) {
  return (
    <View style={styles.container}>
      <View style={styles.symbol}>
        <Icon name={icon} size={layout.roundActionSize} color={colors.accent} />
      </View>
      <Text style={ui.title}>{title}</Text>
      <Text style={[ui.body, styles.center]}>{description}</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.pageBottom,
  },
  symbol: {
    backgroundColor: colors.notice,
    borderRadius: radii.pill,
    padding: spacing.xl,
  },
  center: { textAlign: 'center' },
});
