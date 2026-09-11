import { useState } from 'react';
import { Image, Text, View, StyleSheet } from 'react-native';
import { apiUrl } from '../authClient';
import { colors, fontSize, fontWeight, layout, radii, spacing } from './theme';
export function CampaignCover({
  url,
  label,
}: {
  url: string | null;
  label: string;
}) {
  const [failed, setFailed] = useState(false);
  return url && !failed ? (
    <Image
      source={{ uri: new URL(url, apiUrl).href }}
      accessibilityLabel={label}
      style={styles.cover}
      resizeMode="cover"
      onError={() => setFailed(true)}
    />
  ) : (
    <View style={[styles.cover, styles.placeholder]}>
      <Text style={styles.name}>{label}</Text>
      <Text style={styles.caption}>CREATE FOR CHRIST</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  cover: {
    width: '100%',
    height: layout.imageHeight,
    borderRadius: radii.image,
    backgroundColor: colors.avatar,
  },
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  name: {
    fontSize: fontSize.title,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    textAlign: 'center',
  },
  caption: {
    fontSize: fontSize.tiny,
    color: colors.muted,
    letterSpacing: spacing.tiny,
  },
});
