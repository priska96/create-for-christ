import { DEAL, type CampaignSnapshot } from '@create-for-christ/contracts';
import { Image, Text, View } from 'react-native';
import { apiUrl } from '../../authClient';
import { MONEY } from '../../constants';
import { ui } from '../../ui';
import { styles } from './styles';
const dateLabel = (date: string) => new Date(date).toLocaleString(MONEY.locale);
export function CampaignBrief({
  campaign,
  showImage = true,
  compact = false,
}: {
  campaign: CampaignSnapshot;
  showImage?: boolean;
  compact?: boolean;
}) {
  const deal = campaign.compensation;
  const amount =
    (deal.type === DEAL.paid
      ? deal.amountPerReelMinor
      : deal.productValueMinor) / MONEY.minorPerUnit;
  const compensation = new Intl.NumberFormat(MONEY.locale, {
    style: 'currency',
    currency: campaign.currency,
  }).format(amount);
  return (
    <View style={ui.field}>
      <Text style={ui.label}>{campaign.brandName}</Text>
      <Text style={styles.title}>{campaign.title}</Text>
      {showImage && campaign.productImageUrl && (
        <Image
          accessibilityLabel={campaign.productName}
          source={{ uri: new URL(campaign.productImageUrl, apiUrl).href }}
          style={styles.image}
          resizeMode="cover"
        />
      )}
      <Text style={ui.label}>{campaign.productName}</Text>
      <Text style={styles.status}>
        {deal.type === DEAL.paid
          ? `${compensation} pro Reel`
          : `Barter · Produkt im Wert von ${compensation}`}
      </Text>
      <Text style={ui.body}>
        {campaign.reelCount} Reel(s) auf deinem eigenen Instagram-Kanal
        {campaign.reelLengthSeconds
          ? ` · je ${campaign.reelLengthSeconds} Sekunden`
          : ''}
      </Text>
      {!compact && (
        <>
          <Text style={ui.body}>{campaign.description}</Text>
          <Text style={ui.body}>
            Veröffentlichung:{' '}
            {campaign.contentDeadline
              ? dateLabel(campaign.contentDeadline)
              : 'Termin nach Absprache'}
          </Text>
          {campaign.applicationDeadline && (
            <Text style={ui.body}>
              Bewerbungsfrist: {dateLabel(campaign.applicationDeadline)}
            </Text>
          )}
          <Text style={ui.body}>
            Versand:{' '}
            {campaign.shippingRequired
              ? 'Produkt wird versendet'
              : 'Nicht erforderlich'}
            {campaign.shippingNotes ? ` · ${campaign.shippingNotes}` : ''}
          </Text>
          <Text style={ui.body}>
            Erwähnungen:{' '}
            {campaign.requiredMentions
              .map((handle) => `@${handle}`)
              .join(', ') || 'Keine angegeben'}
          </Text>
          <Text style={ui.body}>
            Online-Dauer:{' '}
            {campaign.minPostingDurationDays
              ? `${campaign.minPostingDurationDays} Tage`
              : 'Nach Absprache'}
          </Text>
          <Text style={ui.body}>
            Nutzung durch die Brand:{' '}
            {campaign.usageChannels.join(', ') || 'Keine Kanäle angegeben'} ·{' '}
            {campaign.usageDurationDays
              ? `${campaign.usageDurationDays} Tage`
              : 'Dauer nach Absprache'}{' '}
            · Bezahlte Anzeigen:{' '}
            {campaign.usagePaidAdsAllowed ? 'Erlaubt' : 'Nicht erlaubt'}
          </Text>
        </>
      )}
    </View>
  );
}
