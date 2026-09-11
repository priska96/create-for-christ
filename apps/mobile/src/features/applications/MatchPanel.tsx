import { type ApplicationRecord } from '@create-for-christ/contracts';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar, Icon } from '../../ui';
import { colors, fontSize, fontWeight, radii, spacing } from '../../ui/theme';
export function MatchPanel({
  application,
  onClose,
}: {
  application: ApplicationRecord;
  onClose: () => void;
}) {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Icon
          name="sparkles-outline"
          color={colors.avatar}
          size={fontSize.discoveryTitle}
        />
        <Text style={styles.title}>It’s a Match!</Text>
        <Text style={styles.body}>
          Eure Ideen passen zusammen. Die Bewerbung für{' '}
          {application.campaign.title} wurde angenommen.
        </Text>
        <View style={styles.avatars}>
          <Avatar large name={application.creator.displayName} />
          <Icon name="heart" color={colors.success} />
          <Avatar large name={application.campaign.brandName} />
        </View>
        <Text style={styles.names}>
          {application.creator.displayName} × {application.campaign.brandName}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={onClose}
          style={styles.button}
        >
          <Text style={styles.buttonText}>Zurück zur Bewerbung</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.matchBackground },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.xl,
  },
  title: {
    fontSize: fontSize.discoveryTitle,
    fontStyle: 'italic',
    color: colors.white,
  },
  body: {
    color: colors.white,
    fontSize: fontSize.body,
    textAlign: 'center',
    lineHeight: fontSize.section,
  },
  avatars: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginVertical: spacing.xl,
  },
  names: {
    color: colors.avatar,
    fontSize: fontSize.label,
    textAlign: 'center',
  },
  button: {
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    padding: spacing.lg,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  buttonText: { color: colors.text, fontWeight: fontWeight.semibold },
});
