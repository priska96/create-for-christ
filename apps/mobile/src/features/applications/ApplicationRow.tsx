import {
  APPLICATION_STATUS,
  type ApplicationRecord,
} from '@create-for-christ/contracts';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Avatar, Icon, IconButton } from '../../ui';
import { colors, fontSize, fontWeight, spacing } from '../../ui/theme';
import { STATUS_LABEL } from './constants';
export function ApplicationRow({
  application,
  brandView,
  busy,
  onOpen,
  onAccept,
  onReject,
}: {
  application: ApplicationRecord;
  brandView: boolean;
  busy: boolean;
  onOpen: () => void;
  onAccept: () => void;
  onReject: () => void;
}) {
  const name = brandView
    ? application.creator.displayName
    : application.campaign.brandName;
  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Bewerbung ansehen: ${name} · ${application.campaign.title}`}
        onPress={onOpen}
        style={styles.person}
      >
        <Avatar name={name} />
        <View style={styles.text}>
          <Text style={styles.name}>{name}</Text>
          <Text numberOfLines={1} style={styles.caption}>
            {brandView
              ? application.creator.location || 'Standort nicht angegeben'
              : application.campaign.title}
          </Text>
          <Text numberOfLines={1} style={styles.caption}>
            {brandView
              ? application.campaign.title
              : STATUS_LABEL[application.status]}
          </Text>
        </View>
      </Pressable>
      {brandView && application.status === APPLICATION_STATUS.pending ? (
        <View style={styles.actions}>
          <IconButton
            small
            icon="checkmark"
            label={`Annehmen: ${name}`}
            tone="positive"
            disabled={busy}
            onPress={onAccept}
          />
          <IconButton
            small
            icon="close"
            label={`Ablehnen: ${name}`}
            tone="negative"
            disabled={busy}
            onPress={onReject}
          />
        </View>
      ) : (
        <Icon
          name={
            application.status === APPLICATION_STATUS.accepted
              ? 'checkmark-circle'
              : 'chevron-forward'
          }
          color={
            application.status === APPLICATION_STATUS.accepted
              ? colors.success
              : colors.muted
          }
        />
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    borderBottomWidth: spacing.hairline,
    borderBottomColor: colors.border,
  },
  person: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  text: { flex: 1, gap: spacing.xs },
  name: {
    fontWeight: fontWeight.bold,
    fontSize: fontSize.label,
    color: colors.text,
  },
  caption: { fontSize: fontSize.caption, color: colors.muted },
  actions: { flexDirection: 'row', gap: spacing.xs },
});
