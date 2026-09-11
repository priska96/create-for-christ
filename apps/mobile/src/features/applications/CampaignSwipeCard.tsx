import { DEAL, type FeedCampaign } from '@create-for-christ/contracts';
import { Text, View, StyleSheet } from 'react-native';
import { MONEY } from '../../constants';
import { CampaignCover, Icon, ui } from '../../ui';
import { colors, fontSize, fontWeight, radii, spacing } from '../../ui/theme';
export function CampaignSwipeCard({ campaign }: { campaign: FeedCampaign }) {
  const paid = campaign.compensation.type === DEAL.paid;
  const amount =
    campaign.compensation.type === DEAL.paid
      ? campaign.compensation.amountPerReelMinor
      : campaign.compensation.productValueMinor;
  const money = new Intl.NumberFormat(MONEY.locale, {
    style: 'currency',
    currency: campaign.currency,
  }).format(amount / MONEY.minorPerUnit);
  return (
    <View style={styles.card}>
      <CampaignCover
        key={campaign.productImageUrl}
        url={campaign.productImageUrl}
        label={campaign.productName}
      />
      <View style={styles.content}>
        <Text style={styles.brand}>{campaign.brandName}</Text>
        <Text style={ui.body}>{campaign.title}</Text>
        <View style={styles.meta}>
          <Icon
            name="gift-outline"
            size={fontSize.card}
            color={colors.accent}
          />
          <Text style={styles.compensation}>
            {paid ? `${money} pro Reel` : `Barter · Produktwert ${money}`}
          </Text>
        </View>
        <Text numberOfLines={3} style={ui.body}>
          {campaign.description}
        </Text>
        <View style={styles.tags}>
          {[
            `${campaign.reelCount} Reel(s)`,
            'Instagram',
            paid ? 'Paid' : 'Barter',
          ].map((label) => (
            <Text key={label} style={styles.tag}>
              {label}
            </Text>
          ))}
        </View>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  card: {
    borderRadius: radii.card,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    borderWidth: spacing.hairline,
    borderColor: colors.border,
  },
  content: {
    padding: spacing.card,
    gap: spacing.sm,
    marginTop: -spacing.md,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.card,
    borderTopRightRadius: radii.card,
  },
  brand: {
    fontSize: fontSize.section,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  meta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  compensation: {
    fontSize: fontSize.label,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tag: {
    fontSize: fontSize.caption,
    paddingHorizontal: spacing.row,
    paddingVertical: spacing.compact,
    borderRadius: radii.pill,
    backgroundColor: colors.notice,
    color: colors.muted,
  },
});
